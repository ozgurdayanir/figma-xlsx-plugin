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
  // Match even if there are leading/trailing spaces (e.g. "  ROW_1")
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

function ensureDollarPrefix(value) {
  var s = String(value != null ? value : "").trim();
  if (!s) return "";
  if (s[0] === "$") return s;
  if (s.indexOf("-$") === 0 || s.indexOf("+$") === 0) return s;
  if (s[0] === "-") return "-$" + s.slice(1);
  if (s[0] === "+") return "+$" + s.slice(1);
  return "$" + s;
}

function ensureNegativePrefix(value) {
  var s = String(value != null ? value : "").trim();
  if (!s) return "";
  if (s[0] === "-") return s;
  if (s[0] === "+") return "-" + s.slice(1);
  return "-" + s;
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
    var rawPriceText = r && r.priceText != null ? String(r.priceText) : "";
    var priceText = ensureDollarPrefix(rawPriceText);
    var changeText = r && r.changeText != null ? String(r.changeText) : "";

    await setText(coinNode, coin);
    await setText(priceNode, priceText);
    await setText(changeNode, changeText);
  }
}

function getVariantsFromSelection(sel) {
  // If selection is a Component Set, treat its children as variants
  if (sel && sel.type === "COMPONENT_SET") return sel.children || [];

  // If selection is a single Component, treat it as one variant
  if (sel && sel.type === "COMPONENT") return [sel];

  // If selection is an Instance, also try its main component
  if (sel && sel.type === "INSTANCE") {
    var mc = null;
    try { mc = sel.mainComponent; } catch (e) {}
    var arr = [sel];
    if (mc) arr.push(mc);
    return arr;
  }

  // If a Frame/group is selected, try inner components as variants
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
  // Matches names like "Status=Gainers" / "Status=Losers"
  if (name.indexOf("Gainers") !== -1) return "GAINERS";
  if (name.indexOf("Losers") !== -1) return "LOSERS";
  return "UNKNOWN";
}

figma.ui.onmessage = async function (msg) {
  if (msg.type === "APPLY_DATA") {
    var selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Please select a component set, variant, or instance first.");
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
        var normalizedLosersRows = [];
        for (var j = 0; j < losersRows.length; j++) {
          var row = losersRows[j] || {};
          normalizedLosersRows.push({
            coin: row.coin,
            priceText: row.priceText,
            changeText: ensureNegativePrefix(row.changeText)
          });
        }
        await updateVariant(v, normalizedLosersRows);
        didSomething = true;
      }
    }

    if (!didSomething) {
      figma.notify("No variant name was found for 'Gainers/Losers'. The variant name must include either 'Gainers' or 'Losers'.");
      return;
    }

    figma.notify("XLSX data was successfully transferred. ✅");
  }

  if (msg.type === "CLOSE") figma.closePlugin();
};
