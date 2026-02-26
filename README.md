# 📊 XLSX → Figma Gainers/Losers Plugin

A Figma plugin that automatically binds Excel (.xlsx) data to structured Figma components.

This plugin reads a predefined Excel file format and updates coin **Name, Price, and 24h Change** fields inside a Figma component set (Gainers / Losers variants).

---

## ✨ Features

- 📂 Import local `.xlsx` file
- 📊 Read Top Gainers & Top Losers data
- 🔄 Automatically update:
  - Coin Name
  - Price
  - 24h Change
- 🧠 Smart variant detection:
  - `Property 1=Gainers`
  - `Property 1=Losers`
- 🎯 Works with Component Sets & Variants
- 🔤 Handles trimmed layer names (`ROW_1`, etc.)

---

## 🗂 Expected Excel Structure

Sheet: `Page1`

### Top Gainers
| Cell Range | Description |
|------------|-------------|
| B3:B7 | Coin Name |
| C3:C7 | Price |
| D3:D7 | 24h Change |

### Top Losers
| Cell Range | Description |
|------------|-------------|
| G3:G7 | Coin Name |
| H3:H7 | Price |
| I3:I7 | 24h Change |

---

## 🏗 Required Figma Layer Structure

Component Set:
Gainers & Losers - List (Component Set)
├── Status=Gainers (Component)
│ ├── ROW_1
│ ├── ROW_2
│ ├── ROW_3
│ ├── ROW_4
│ ├── ROW_5
│
└── Status=Losers (Component)
├── ROW_1
├── ROW_2
├── ROW_3
├── ROW_4
├── ROW_5


Each `ROW_X` must contain:
data
├── Coin Name (TEXT)
├── Price (TEXT)
└── Change (TEXT)


---

## 🚀 How to Run (Development Mode)

1. Open Figma Desktop
2. Go to: Plugins → Development → Import plugin from manifest
3. Select `manifest.json`
4. Select the component set in Figma
5. Run plugin
6. Upload XLSX file
7. Click Apply

---

## 🛠 Tech Stack

- Figma Plugin API
- Vanilla JavaScript
- SheetJS (xlsx)

---

## 📌 Roadmap Ideas

- [ ] Auto color Change (green/red based on value)
- [ ] Auto logo mapping from coin name
- [ ] Support dynamic row count
- [ ] Publish to Figma Community
- [ ] Convert to TypeScript + bundler setup

---

## 👤 Author

Özgür Dayanır  
Senior Design Engineer  