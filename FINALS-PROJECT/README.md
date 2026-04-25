# Data Engine 📊

A browser-based CSV data analysis and visualization tool. Drop in a dataset and instantly explore it — no server, no setup.

---

## What It Does

**Data Engine** lets you load any CSV file and immediately get:

- **Dataset overview** — row/column counts, data types, completeness stats
- **Column profiling** — per-column type detection, null counts, and null percentage bars
- **Numeric statistics** — mean, std dev, min/max, quartiles for every numeric column
- **Summary cards** — mean score, top scorer, pass rate, and avg study hours (auto-detected or manually remapped)
- **Interactive table** — searchable, sortable, paginated view with column visibility toggles
- **Filter & sort panel** — filter rows by any column using contains / starts-with / exact match, sort ascending or descending
- **Snapshot system** — save named views of your filtered/sorted table and jump between them
- **Export options** — download the full dataset, current filtered view, or a statistics report as CSV or JSON

### Visualizations

For **student/generic CSVs**, it renders:
- Top 10 scores bar chart
- Attendance vs. score scatter plot with regression line
- Grade distribution doughnut chart

For **World Bank CSVs** (with country, series, and year columns), it activates a dedicated explorer with:
- Multi-country time series line chart
- Latest-year snapshot bar chart
- Country share doughnut chart
- Year range sliders and country picker
- Global KPI strip (population, life expectancy, fertility rate, urbanization, growth)

### Statistical Analysis

Every dataset gets:
- Descriptive statistics (variance, std dev, range)
- Pearson correlation between key columns
- Linear regression with R², slope, intercept, and prediction
- Auto-generated data-driven insights summary

---

## How to Use

1. Open `index.html` in any modern browser
2. Drag and drop a `.csv` file onto the upload zone (or click to browse)
3. Explore the dashboard — all analysis runs instantly in-browser

To load a new file, click **↩ Load New File** in the top bar.

---

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| [PapaParse](https://www.papaparse.com/) | 5.4.1 | CSV parsing with chunked streaming |
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | All charts and visualizations |
| Google Fonts | — | Space Mono + Syne typography |

No build step. No dependencies to install. Pure HTML/CSS/JS — just open the file.

---

## Project Structure

```
index.html          — entire application (single file)
  ├── loadDataset()         Student 1: CSV parsing → window.DS
  ├── renderDashboard()     Student 1: meta cards, column profile, stats table
  ├── renderSummaryCards()  Student 1: 4 KPI cards with remap controls
  ├── renderTable()         Student 1: interactive paginated data table
  ├── applyFilterSort()     Student 1: filter + sort panel → pushes to RT
  ├── resetTable()          Student 1: snapshot system + reset bar
  └── onDataReady()         Student 2: visualization + statistical analysis engine
        ├── initGeneric()         Generic CSV mode (student datasets)
        └── initWorldBank()       World Bank mode (auto-detected)
```

---

## Data Format

The tool works with any well-formed CSV. It auto-detects:

- **Numeric vs. string columns** by sampling values
- **Score, name, and study-hours columns** by matching header keywords
- **World Bank format** by checking for `Country Name`, `Series Name`, and 4-digit year headers

---

## Branches

| Branch | Contributor | Scope |
|---|---|---|
| `feature/data-engine` | Student 1 | Core parsing, table, filter/sort, export |
| `feature/viz-analysis` | Student 2 | Charts, KPIs, statistical analysis, insights |