# Data Engine

A single-file, browser-based CSV explorer. Drop any CSV, get an instant dashboard.

**Branch:** `feature/data-engine`

---

## Usage

```
open data-engine.html
```

Drag & drop a CSV (or click **Browse file**). Everything else is automatic.

---

## Functions

### `loadDataset(file)`
Parses a CSV `File` object and populates `window.DS`.

```js
window.DS = {
  filename, rowCount, colCount, loadedAt,
  headers, rows, preview,       // raw data
  columns,                       // [{ name, type, nonNull, nullPct }]
  stats,                         // { col: { mean, std, min, p25, median, p75, max } }
}
```

### `renderSummaryCards(data, options?)`
Four stat cards: **mean score**, **top scorer**, **pass rate**, **avg study hours**. Auto-detects which columns map to each card. All mappings and the pass threshold are editable live via a remap bar above the cards.

```js
window.SC.setThreshold(60)
window.SC.refresh(null, { scoreCol: 'math_score' })
```

### `renderTable(data, options?)`
Interactive data table with sortable columns, global search with highlight, column visibility toggle, and pagination.

```js
window.RT.getState()    // { sortCol, sortDir, searchTerm, currentPage, … }
```

### `applyFilterSort(ds, options?)`
Filter rows by a name field and sort by any column. Pushes results into `renderTable`. Includes live debounced filtering, three match modes (`contains` / `starts` / `exact`), and dismissable status chips.

```js
window.AFS.apply('Afghanistan', '2020 [YR2020]', 'desc')
window.AFS.clear()
```

### `resetTable(ds)`
Restores the original view — clears all filters, sorts, and searches. Also provides a named snapshot system for saving and jumping between views.

```js
window.RST.reset()
window.RST.saveSnapshot('My view')
window.RST.restoreSnapshot(1)
```

---

## Files

| File | Description |
|------|-------------|
| `data-engine.html` | The whole app — open directly in a browser |
| `data.csv` | Sample dataset (World Bank, 44 812 rows × 95 cols) |
| `README.md` | This file |