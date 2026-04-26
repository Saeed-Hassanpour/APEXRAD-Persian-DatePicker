# APEXRAD Persian (Jalali) Date Picker — v24.2.0

> A full-featured Persian (Jalali / Iranian Solar Hijri) date picker plugin for **Oracle APEX 24.2+**

**Author:** Saeed Hassanpour — Paya Shetaban Andisheh (APEXRAD)  
**Website:** [https://apexrad.info](https://apexrad.info)  
**Contact:** [info@apexrad.info](mailto:info@apexrad.info)  
**Telegram:** [@SaeedHassanpour](https://t.me/SaeedHassanpour) | [@apexrad](https://t.me/apexrad)  
**Plugin Internal Name:** `INFO.APEXRAD.PERSIANDATEPICKER`  
**Supported Components:** Page Items, Interactive Grid Columns

---

## Features

| Feature | Description |
|---|---|
| **Jalali Calendar** | Full Persian (Solar Hijri) date support with Jalali month/year names |
| **Imperial Year** | Optional display in Imperial (Shahanshai) year format (+1180) |
| **Display / Return Format** | Independent display and return formats (default `YYYY/MM/DD`). Falls back to item Format Mask |
| **Persian Digits** | Optionally render digits in Eastern Arabic numerals |
| **Time Picker** | Built-in HH:MM time selector. Session value format: `YYYY/MM/DD HH:MM` |
| **Manual Input** | User can type a date directly; validates against Min/Max/Holidays |
| **Show On** | `Button` (icon click) or `Focus` (tab or click on item) |
| **Min / Max Date** | `None` / `Item` (live page item) / `Static` (fixed value) |
| **Exception Dates** | Comma-separated dates shown in red. Supports `#P1_ITEM#` page item reference |
| **Holiday Dates** | JSON array of named holidays with tooltip. Supports `#P1_ITEM#` reference and REST API |
| **Disable Holiday** | Prevents selection of holidays and Fridays |
| **Year Range** | Restrict the year dropdown to specific years. Supports `#P1_ITEM#` reference |
| **Month Range** | Restrict the month dropdown to specific months. Supports `#P1_ITEM#` reference |
| **Display As** | `Popup` (floating) or `Inline` (always visible) |
| **Calendar Year** | `Jalali` or `Imperial` (Shahanshai) year display |
| **Interactive Grid** | Full IG column support with cascading LOV, Imperial display, MutationObserver post-save fix |
| **Security** | Plugin internal name verification — datepicker is disabled if the plugin is tampered with |

---

## Installation

1. Download `item_type_plugin_com_saeedhassanpour_persiandatepicker_v226.sql`
2. In your APEX workspace go to **Shared Components → Plug-ins → Import**
3. Upload the SQL file and click **Import Plug-in**
4. The plugin will appear as **APEXRAD Persian Date Picker(Jalali)**

---

## Usage

### Set NLS DATE

You must to change NLS_CALENDAR , NLS_DATE_FORMAT  [Application / Edit Security Attributes(Database Session)]

```
BEGIN
   EXECUTE immediate 'ALTER SESSION SET NLS_CALENDAR=PERSIAN';
   EXECUTE immediate 'ALTER SESSION SET NLS_DATE_FORMAT=''YYYY/MM/DD''';
END;
```

### Page Item

1. Create a page item
2. Set **Type** → `APEXRAD Persian Date Picker(Jalali)`
3. Configure attributes in the right panel

### Interactive Grid Column

1. Add a column to your IG region
2. Set **Type** → `APEXRAD Persian Date Picker(Jalali)`
3. For Imperial year display in read-only cells, add CSS class `persianDatepicker-ig-imperial` to the column's **CSS Classes** property

---

## Attribute Reference

### Core

| # | Attribute | Type | Description |
|---|---|---|---|
| 1 | Display Format | Select List | How the date is shown to the user |
| 2 | Return Format | Text | Format stored in session state (default: same as Display Format) |
| 3 | Show Persian Digits | Checkbox | Render digits as Eastern Arabic numerals |
| 4 | Show Today Button | Checkbox | Show a "Today" shortcut button |
| 5 | Show Clear Button | Checkbox | Show a clear/reset button |
| 6 | Placeholder Text | Text | Input placeholder (default: انتخاب تاریخ) |

### Date Constraints

| # | Attribute | Type | Description |
|---|---|---|---|
| 7 | Minimum Date | Select List | `None` / `Item` / `Static` |
| 8 | Minimum Item | Page Item | Page item holding the minimum date value |
| 9 | Minimum Static | Text | Fixed minimum date in Return Format |
| 10 | Maximum Date | Select List | `None` / `Item` / `Static` |
| 11 | Maximum Item | Page Item | Page item holding the maximum date value |
| 12 | Maximum Static | Text | Fixed maximum date in Return Format |

### Display Options

| # | Attribute | Type | Description |
|---|---|---|---|
| 13 | Show Time | Checkbox | Enable HH:MM time picker |
| 14 | Allow Manual Input | Checkbox | Allow the user to type a date |
| 15 | Show On | Select List | `Button` or `Focus` |
| 17 | Disable Holiday | Checkbox | Block selection of holidays and Fridays |
| 18 | Show Year | Checkbox | Show year spinner in header |
| 19 | Show Month | Checkbox | Show month label in header |
| 20 | Display As | Select List | `Popup` or `Inline` |
| 24 | Calendar Year | Select List | `Jalali` (جلالی) or `Imperial` (شاهنشاهی) |

### Exception & Holiday Dates

| # | Attribute | Type | Description |
|---|---|---|---|
| 16 | Exception Dates | Text | Comma-separated dates `YYYY-MM-DD`. Use `#P1_ITEM#` for a page item |
| 23 | Holiday Dates | Textarea | JSON array of `{"date":"YYYY-MM-DD","name":"..."}`. Use `#P1_ITEM#` for a page item |

### Year & Month Range

| # | Attribute | Type | Description |
|---|---|---|---|
| 21 | Year Range | Text | Comma-separated allowed years e.g. `1404,1405,1406`. Use `#P1_YEARS#` for a page item. When set, year navigation arrows are hidden |
| 22 | Month Range | Text | Comma-separated allowed months (1–12) e.g. `1,3,6`. Use `#P1_MONTHS#` for a page item. When set, month navigation arrows are hidden |

---

## Page Item Reference Syntax (`#P1_ITEM#`)

Several text attributes support a dynamic page item reference. Wrap the item name in `#`:

```
Exception Dates  →  #P1_EXCEPTIONS#
Holiday Dates    →  #P1_HOLIDAYS#
Year Range       →  #P1_YEARS#
Month Range      →  #P1_MONTHS#
```

The value is resolved via `apex.item('P1_YEARS').getValue()` **each time the datepicker opens**, so it always reflects the current session value — even if the item was set by a Dynamic Action after page load.

---

## Holiday Dates JSON Format

```json
[
  {"date": "1404-01-01", "name": "نوروز"},
  {"date": "1404-01-13", "name": "سیزده بدر"},
  {"date": "1404-03-14", "name": "رحلت امام خمینی"}
]
```

### Holiday API

Get official Iranian public holidays in JSON format:

```
https://service.apexrad.info/iran/holidays?year=1404&token=MY_SECRET_TOKEN
```

> To obtain an API token contact [info@apexrad.info](mailto:info@apexrad.info)

---

## Imperial (Shahanshai) Year Display

When **Calendar Year = Imperial**, the year is displayed as `Jalali + 1180`.  
Example: `1404` → `2584`

- The **session state value is always stored in Jalali** — only the display changes
- Works in both page items and Interactive Grid columns
- For IG read-only cells, add CSS class `persianDatepicker-ig-imperial` to the column

---

## Interactive Grid Notes

- Cascade LOV is supported via the **Cascade Column** attribute
- After saving a row, the plugin uses a `MutationObserver` to re-apply Imperial display
- Each IG column registers independently; multiple date picker columns per grid are supported

---

## Security

The plugin verifies its internal name (`INFO.APEXRAD.PERSIANDATEPICKER`) on every page render. If the plugin is copied and the internal name is altered, the datepicker will refuse to initialize and log a warning to the APEX debug console:

```
[apexrad.PDP] Security: plugin name mismatch. Datepicker disabled.
```

---

## License

This plugin is **free to use** in personal and commercial Oracle APEX projects. No purchase required.

For support, custom development, or enterprise services:

- **Email:** [info@apexrad.info](mailto:info@apexrad.info)
- **Website:** [https://apexrad.info](https://apexrad.info)
- **Telegram:** [@apexrad](https://t.me/apexrad)

---

## Changelog

### v24.2.0 (2026)
- Renamed to **APEXRAD Persian Date Picker(Jalali)**
- Added `#P1_ITEM#` dynamic page item reference for Exception Dates, Holiday Dates, Year Range, Month Range
- Year / Month navigation arrows automatically hidden when range is set via page item
- Imperial year display for Interactive Grid read-only cells
- Security check: plugin refuses to load if internal name is tampered with
- Holiday API support
- APEX 24.2 compatibility verified

### v2.2.6
- Min/Max Date: None / Item / Static pattern
- Holiday Dates JSON with tooltip
- Calendar Year: Jalali / Imperial
- Interactive Grid support with cascade LOV
- Popup positioning fix using `getBoundingClientRect`

### v2.1.0
- Initial public release
- Basic Jalali date picker with APEX plugin framework integration
