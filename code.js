figma.showUI(__html__, { width: 420, height: 520 });

function walk(node, cb) {
  cb(node);
  if ("children" in node && node.children) {
    for (var i = 0; i < node.children.length; i++) {
      walk(node.children[i], cb);
    }
  }
}

function nameEq(nodeName, expected) {
  // "  ROW_1" gibi başında boşluk varsa yakala
  return String(nodeName || "").trim() === expected;
}

function findFirstByTrimmedName(root, expectedName) {
  var found = null;
  walk(root, function (n) {
    if (found) return;
    if (n && typeof n.name === "string" && nameEq(n.name, expectedName)) found = n;
  });
  return found;
}

function findAllByTrimmedName(root, expectedName) {
  var found = [];
  walk(root, function (n) {
    if (n && typeof n.name === "string" && nameEq(n.name, expectedName)) found.push(n);
  });
  return found;
}

async function safeLoadFont(textNode) {
  var fontName = textNode.fontName;
  if (fontName === figma.mixed) {
    try { fontName = textNode.getRangeFontName(0, 1); }
    catch (e) { return; }
  }
  await figma.loadFontAsync(fontName);
}

async function setText(node, value) {
  if (!node || node.type !== "TEXT") return;
  await safeLoadFont(node);
  node.characters = value;
}

async function updateVariant(variantRoot, rows) {
  for (var i = 0; i < 5; i++) {
    var rowNode = findFirstByTrimmedName(variantRoot, "ROW_" + (i + 1));
    if (!rowNode) continue;

    var dataNode = findFirstByTrimmedName(rowNode, "data") || rowNode;

    var coinNode = findFirstByTrimmedName(dataNode, "Coin Name");
    var priceNode = findFirstByTrimmedName(dataNode, "Price");
    var changeNode = findFirstByTrimmedName(dataNode, "Change");

    var r = (rows && rows[i]) ? rows[i] : null;

    var coin = r && r.coin != null ? String(r.coin) : "";
    var priceText = r && r.priceText != null ? String(r.priceText) : "";
    var changeText = r && r.changeText != null ? String(r.changeText) : "";

    await setText(coinNode, coin);
    await setText(priceNode, priceText);
    await setText(changeNode, changeText);
  }
}

function getVariantsFromSelection(sel) {
  // Seçim Component Set ise: çocuk componentler variant’tır
  if (sel && sel.type === "COMPONENT_SET") return sel.children || [];

  // Seçim direkt component ise: tek variant gibi davran
  if (sel && sel.type === "COMPONENT") return [sel];

  // Instance seçildi ise: instance’ın main component’ini de deneyebiliriz
  if (sel && sel.type === "INSTANCE") {
    var mc = null;
    try { mc = sel.mainComponent; } catch (e) {}
    var arr = [sel];
    if (mc) arr.push(mc);
    return arr;
  }

  // Frame vs seçildiyse: içindeki componentleri variant gibi dene
  var comps = [];
  if (sel) {
    walk(sel, function (n) {
      if (n && n.type === "COMPONENT") comps.push(n);
    });
  }
  return comps.length ? comps : [sel];
}

function classifyVariantName(n) {
  var name = String(n || "");
  // "Property 1=Gainers" / "Property 1=Losers"
  if (name.indexOf("Gainers") !== -1) return "GAINERS";
  if (name.indexOf("Losers") !== -1) return "LOSERS";
  return "UNKNOWN";
}

figma.ui.onmessage = async function (msg) {
  if (msg.type === "APPLY_DATA") {
    var selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Önce component set/variant/instance seç.");
      return;
    }

    var payload = msg.payload || {};
    var gainersRows = payload.gainers || [];
    var losersRows = payload.losers || [];

    var selected = selection[0];
    var variants = getVariantsFromSelection(selected);

    var didSomething = false;

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (!v) continue;

      var kind = classifyVariantName(v.name);
      if (kind === "GAINERS") {
        await updateVariant(v, gainersRows);
        didSomething = true;
      } else if (kind === "LOSERS") {
        await updateVariant(v, losersRows);
        didSomething = true;
      }
    }

    if (!didSomething) {
      figma.notify("Gainers/Losers variant adı bulunamadı. Variant isimlerinde 'Gainers' veya 'Losers' geçmeli.");
      return;
    }

    figma.notify("XLSX verileri aktarıldı ✅");
  }

  if (msg.type === "CLOSE") figma.closePlugin();
};