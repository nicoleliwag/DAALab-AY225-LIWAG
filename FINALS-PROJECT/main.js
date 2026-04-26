/* ═══════════════════════════════════════════════
   DATA ENGINE  —  loadDataset() + window.DS
   ═══════════════════════════════════════════════ */

// EMBEDDED_CSV extracted to data.csv
const EMBEDDED_CSV = null;

window.DS = null;   // populated by loadDataset()

/**
 * loadDataset(file) — parse a CSV File object,
 * compute summary statistics, and store the result
 * in window.DS.
 *
 * window.DS shape:
 * {
 *   filename : string,
 *   rowCount : number,
 *   colCount : number,
 *   columns  : Array<{ name, type, nonNull, nullCount, nullPct }>,
 *   headers  : string[],
 *   rows     : object[],         // all rows as plain objects
 *   stats    : object,           // per-column descriptive stats
 *   loadedAt : ISO string,
 * }
 */
async function loadDataset(file) {
  return new Promise((resolve, reject) => {
    let allRows = [];
    let headers = [];
    let rowCount = 0;
    let chunkCount = 0;

    showProgress(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      chunk(results, parser) {
        if (rowCount === 0 && results.meta.fields) {
          headers = results.meta.fields;
        }
        allRows = allRows.concat(results.data);
        rowCount += results.data.length;
        chunkCount++;
        // Estimate progress via chunk count (PapaParse doesn't expose bytes easily)
        const pct = Math.min(chunkCount * 15, 90);
        setProgress(pct, `Parsing… ${rowCount.toLocaleString()} rows`);
      },
      complete() {
        setProgress(100, 'Processing…');

        const colCount = headers.length;
        const columns  = buildColumnProfile(headers, allRows);
        const stats    = buildStats(headers, allRows);

        const filename = (file && file.name) ? file.name : 'data.csv';

        window.DS = {
          filename,
          rowCount,
          colCount,
          columns,
          headers,
          rows    : allRows,
          preview : allRows.slice(0, 10),
          stats,
          loadedAt: new Date().toISOString(),
        };

        setTimeout(() => {
          showProgress(false);
          renderDashboard(filename);
          resolve(window.DS);
        }, 200);
      },
      error(err) {
        showError(err.message);
        showProgress(false);
        reject(err);
      }
    });
  });
}

/* ── Embedded dataset loader ─────────────────────────────────────
   Parses the built-in CSV string exactly like loadDataset(file)
   but without requiring a File object.
────────────────────────────────────────────────────────────────── */
function loadEmbeddedDataset() {
  fetch('./data.csv')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(csvText => {
      const blob = new Blob([csvText], { type: 'text/csv' });
      const pseudoFile = new File([blob], 'data.csv', { type: 'text/csv' });
      return loadDataset(pseudoFile);
    })
    .catch(err => {
      showError('Failed to load dataset: ' + err.message);
    });
}

/* ── Auto-load embedded dataset on page ready ── */
document.addEventListener('DOMContentLoaded', () => {
  loadEmbeddedDataset();
});

/* ── Column profile ───────────────────────────── */
function buildColumnProfile(headers, rows) {
  return headers.map(name => {
    let nonNull = 0;
    let isNumeric = true;

    for (const row of rows) {
      const v = row[name];
      if (v !== null && v !== undefined && v !== '') nonNull++;
      if (typeof v !== 'number' && v !== null && v !== undefined && v !== '') isNumeric = false;
    }

    const nullCount = rows.length - nonNull;
    const nullPct   = rows.length > 0 ? (nullCount / rows.length) * 100 : 0;

    return { name, type: isNumeric ? 'numeric' : 'string', nonNull, nullCount, nullPct };
  });
}

/* ── Descriptive statistics ───────────────────── */
function buildStats(headers, rows) {
  const stats = {};
  for (const col of headers) {
    const vals = rows
      .map(r => r[col])
      .filter(v => typeof v === 'number' && isFinite(v));

    if (vals.length === 0) continue;

    vals.sort((a, b) => a - b);

    const n    = vals.length;
    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

    stats[col] = {
      count : n,
      mean  : mean,
      std   : Math.sqrt(variance),
      min   : vals[0],
      p25   : percentile(vals, 25),
      median: percentile(vals, 50),
      p75   : percentile(vals, 75),
      max   : vals[n - 1],
    };
  }
  return stats;
}

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/* ── Render dashboard ─────────────────────────── */
function renderDashboard(filename) {
  const DS = window.DS;

  document.getElementById('filename-pill').textContent = filename;

  /* Meta cards */
  const numericCols  = DS.columns.filter(c => c.type === 'numeric').length;
  const totalNulls   = DS.columns.reduce((s, c) => s + c.nullCount, 0);
  const totalCells   = DS.rowCount * DS.colCount;
  const completeness = totalCells > 0 ? ((1 - totalNulls / totalCells) * 100).toFixed(1) : '—';

  document.getElementById('meta-grid').innerHTML = [
    { label: 'Rows',           value: DS.rowCount.toLocaleString(),  sub: 'total records'    },
    { label: 'Columns',        value: DS.colCount,                   sub: 'fields'           },
    { label: 'Numeric cols',   value: numericCols,                   sub: 'float / int'      },
    { label: 'String cols',    value: DS.colCount - numericCols,     sub: 'categorical / id' },
    { label: 'Completeness',   value: completeness + '%',            sub: 'non-null cells'   },
  ].map(c => `
    <div class="meta-card">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>
  `).join('');

  /* ── Completeness Timeline ─────────────────────────────────────── */
  (function buildCompletenessTimeline(rows, headers) {
    const mount = document.getElementById('ct-container');
    if (!mount) return;

    const yearCols = headers.filter(h => /^\d{4}/.test(h));
    if (!yearCols.length) { mount.style.display = 'none'; return; }

    const yearNums = yearCols.map(h => parseInt(h.match(/\d{4}/)[0]));
    const minYear  = Math.min(...yearNums);
    const maxYear  = Math.max(...yearNums);
    const span     = maxYear - minYear || 1;

    // Total unique country codes (excluding known aggregates)
    const EXCLUDE = new Set(['WLD','EAP','EAS','ECA','ECS','LCN','LAC','MEA','MNA','NAC','SAS','SSA','SSF','AFW','AFE','HIC','LIC','LMC','UMC','MIC','OED','EMU','EUU','FCS','HPC','LDC','LMY','LTE','PRE','PST','IBD','IBT','IDA','IDB','IDX','INX','OSS','PSS','CSS','ARB','CEB','EAR','TEC','TSA','TSS']);
    const allCountryCodes = new Set(rows.map(r => (r['Country Code']||'').trim()).filter(c => c.length === 3 && !EXCLUDE.has(c)));
    const totalCountries  = allCountryCodes.size || 1;

    // Build per-series per-year country coverage
    const seriesData = new Map(); // seriesName → Map(yearCol → Set of country codes)
    for (const row of rows) {
      const sn = (row['Series Name'] || '').trim();
      const cc = (row['Country Code'] || '').trim();
      if (!sn || !cc || EXCLUDE.has(cc) || cc.length !== 3) continue;
      if (!seriesData.has(sn)) seriesData.set(sn, new Map());
      const sm = seriesData.get(sn);
      for (const yc of yearCols) {
        const v = row[yc];
        if (typeof v === 'number' && isFinite(v)) {
          if (!sm.has(yc)) sm.set(yc, new Set());
          sm.get(yc).add(cc);
        }
      }
    }

    // Summarise each series: total coverage, year range with data, per-year counts
    const summaries = [];
    for (const [name, yearMap] of seriesData) {
      if (!yearMap.size) continue;
      let totalCells = 0, filledCells = 0;
      const perYear = yearCols.map(yc => {
        totalCells++;
        const count = yearMap.has(yc) ? yearMap.get(yc).size : 0;
        if (count > 0) filledCells++;
        return { yc, count };
      });
      // Contiguous data segments for rendering
      const dataYears = yearCols.filter(yc => yearMap.has(yc) && yearMap.get(yc).size > 0);
      const firstYr = parseInt(dataYears[0]?.match(/\d{4}/)?.[0]);
      const lastYr  = parseInt(dataYears[dataYears.length - 1]?.match(/\d{4}/)?.[0]);
      const overallCoverage = filledCells / totalCells; // fraction of year slots with any data
      const peakCountries = Math.max(...perYear.map(p => p.count));
      summaries.push({ name, perYear, firstYr, lastYr, overallCoverage, peakCountries, filledCells, totalCells });
    }

    // Sort modes
    function sorted(mode) {
      if (mode === 'coverage') return [...summaries].sort((a, b) => b.overallCoverage - a.overallCoverage);
      if (mode === 'span')     return [...summaries].sort((a, b) => (b.lastYr - b.firstYr) - (a.lastYr - a.firstYr));
      if (mode === 'alpha')    return [...summaries].sort((a, b) => a.name.localeCompare(b.name));
      return [...summaries].sort((a, b) => b.overallCoverage - a.overallCoverage);
    }

    let topN = 12;
    let sortMode = 'coverage';

    function pct(n) { return Math.round(n * 100); }

    function render() {
      const list = sorted(sortMode).slice(0, topN);
      const LABEL_W = 200;
      const SUMMARY_W = 64;

      // Build axis ticks — ~6 evenly spaced years
      const step  = Math.ceil(span / 5 / 10) * 10 || 5;
      const ticks  = [];
      for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) ticks.push(y);

      const rowsHTML = list.map(s => {
        // Build colour-coded segments: green = good (≥50% countries), yellow = sparse (<50%), gap = none
        let segsHTML = '';
        // Merge adjacent years into contiguous segments
        let segStart = null, segType = null, segMaxPct = 0;
        function flushSeg(endYr) {
          if (segStart === null) return;
          const x1 = (segStart - minYear) / span * 100;
          const x2 = (endYr   - minYear) / span * 100;
          const w  = Math.max(x2 - x1, 0.3);
          const color = segType === 'good'   ? 'rgba(77,255,180,.75)'
                      : segType === 'sparse' ? 'rgba(232,255,71,.55)'
                      : 'rgba(255,77,106,.35)';
          const label = segType === 'good' ? 'Good coverage' : segType === 'sparse' ? 'Sparse' : 'Gap';
          segsHTML += `<div class="ct-seg" style="left:${x1.toFixed(2)}%;width:${w.toFixed(2)}%;background:${color}">
            <div class="ct-seg-tooltip">${segStart}–${endYr} · ${label} · up to ${Math.round(segMaxPct * totalCountries)} countries</div>
          </div>`;
          segStart = null; segType = null; segMaxPct = 0;
        }

        for (const { yc, count } of s.perYear) {
          const yr   = parseInt(yc.match(/\d{4}/)?.[0]);
          const type = count === 0 ? 'gap' : count / totalCountries >= 0.4 ? 'good' : 'sparse';
          const cpct = count / totalCountries;
          if (type !== segType) { flushSeg(yr); segStart = yr; segType = type; segMaxPct = cpct; }
          else { segMaxPct = Math.max(segMaxPct, cpct); }
        }
        flushSeg(maxYear + 1);

        const coveragePct = pct(s.overallCoverage);
        const summaryColor = coveragePct >= 60 ? 'var(--accent)' : coveragePct >= 30 ? '#e8ff47aa' : 'var(--muted)';

        return `<div class="ct-row" style="grid-template-columns:${LABEL_W}px 1fr ${SUMMARY_W}px">
          <div class="ct-row-label" title="${esc(s.name)}">${esc(s.name)}</div>
          <div class="ct-track">${segsHTML}</div>
          <div class="ct-summary" style="color:${summaryColor}">${coveragePct}% · ${s.firstYr}–${s.lastYr}</div>
        </div>`;
      }).join('');

      // Axis row
      const axisHTML = `<div class="ct-row" style="grid-template-columns:${LABEL_W}px 1fr ${SUMMARY_W}px;margin-top:4px">
        <div></div>
        <div class="ct-axis">
          ${ticks.map(y => {
            const pos = ((y - minYear) / span * 100).toFixed(1);
            return `<span class="ct-axis-tick" style="position:absolute;left:${pos}%;transform:translateX(-50%)">${y}</span>`;
          }).join('')}
        </div>
        <div></div>
      </div>`;

      const topNOpts = [8,12,20,summaries.length].filter((v,i,a) => v <= summaries.length || i === 0)
        .map(n => `<option value="${n}" ${n===topN?'selected':''}>${n === summaries.length ? 'All' : n}</option>`).join('');
      const sortOpts = [['coverage','By coverage'],['span','By year span'],['alpha','A–Z']]
        .map(([v,l]) => `<option value="${v}" ${v===sortMode?'selected':''}>${l}</option>`).join('');

      mount.innerHTML = `
        <div class="ct-toolbar">
          <span class="ct-label">Show</span>
          <select class="ct-select" id="ct-topn">${topNOpts}</select>
          <span class="ct-label">Sort</span>
          <select class="ct-select" id="ct-sort">${sortOpts}</select>
          <div class="ct-legend">
            <div class="ct-legend-item"><div class="ct-legend-swatch" style="background:rgba(77,255,180,.75)"></div>Good (≥40% countries)</div>
            <div class="ct-legend-item"><div class="ct-legend-swatch" style="background:rgba(232,255,71,.55)"></div>Sparse</div>
            <div class="ct-legend-item"><div class="ct-legend-swatch" style="background:rgba(255,77,106,.35)"></div>Gap</div>
          </div>
        </div>
        <div class="ct-chart-area" style="position:relative">
          ${rowsHTML}
          <div style="position:relative;height:18px;margin-top:2px">
            <div style="margin-left:${LABEL_W}px;margin-right:${SUMMARY_W}px;position:relative">
              ${ticks.map(y => {
                const pos = ((y - minYear) / span * 100).toFixed(1);
                return `<span style="position:absolute;left:${pos}%;transform:translateX(-50%);font-family:var(--mono);font-size:9px;color:var(--muted)">${y}</span>`;
              }).join('')}
            </div>
          </div>
        </div>`;

      mount.querySelector('#ct-topn').addEventListener('change', e => { topN = +e.target.value; render(); });
      mount.querySelector('#ct-sort').addEventListener('change', e => { sortMode = e.target.value; render(); });
    }

    render();
  })(DS.rows, DS.headers);


  /* Top 10 Countries — linked to the Summary Cards selected year */
  (function buildTop10(rows, headers) {
    const yearCols = headers.filter(h => /^\d{4}/.test(h));

    // Find the name column
    const nameColHints = ['country name', 'country', 'name', 'nation', 'entity'];
    const nameCol = headers.find(h => nameColHints.some(hint => h.toLowerCase().includes(hint))) || headers[0];

    function renderTop10(yearCol) {
      const yearLabel = yearCol.match(/\d{4}/)?.[0] ?? yearCol;
      const pill = document.getElementById('top10-year-pill');
      if (pill) pill.textContent = `World Total metric · ${yearLabel}`;

      const tbody = document.getElementById('top10-tbody');
      if (!tbody) return;

      // Collect country rows (exclude WLD and regional aggregates — 3-letter codes only, not known aggregates)
      const EXCLUDE_CODES = new Set(['WLD','EAP','EAS','ECA','ECS','LCN','LAC','MEA','MNA','NAC','SAS','SSA','SSF','AFW','AFE','HIC','LIC','LMC','UMC','MIC','OED','EMU','EUU','FCS','HPC','LDC','LMY','LTE','PRE','PST','IBD','IBT','IDA','IDB','IDX','INX','OSS','PSS','CSS','ARB','CEB','EAR','ECA','ECS','TEC','TSA','TSS']);
      const countryRows = rows.filter(r => {
        const cc = (r['Country Code'] || '').trim();
        return cc.length === 3 && !EXCLUDE_CODES.has(cc);
      });

      // For multi-series: pick "Population, total" rows if available, else all
      let targetRows = countryRows;
      const popRows = countryRows.filter(r => (r['Series Name'] || '').trim() === 'Population, total');
      if (popRows.length > 0) targetRows = popRows;

      // Build top 10
      const ranked = targetRows
        .map(r => ({ name: r[nameCol] || r['Country Code'] || '—', val: r[yearCol] }))
        .filter(r => typeof r.val === 'number' && isFinite(r.val))
        .sort((a, b) => b.val - a.val)
        .slice(0, 10);

      if (!ranked.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:20px;font-family:var(--mono);font-size:12px">No data for ${yearLabel}</td></tr>`;
        return;
      }

      const maxVal = ranked[0].val;
      const fshort = n => {
        if (!isFinite(n)) return '—';
        const a = Math.abs(n);
        if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(2);
      };

      const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rankLabel = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

      tbody.innerHTML = ranked.map((r, i) => {
        const pct = maxVal > 0 ? (r.val / maxVal * 100).toFixed(1) : 0;
        return `<tr>
          <td class="top10-rank ${rankClass(i)}">${rankLabel(i)}</td>
          <td style="color:var(--text);font-family:var(--mono);font-size:12px">${esc(r.name)}</td>
          <td style="color:var(--accent2);font-family:var(--mono);font-size:12px;white-space:nowrap">${fshort(r.val)}</td>
          <td style="padding-top:6px;padding-bottom:6px">
            <div class="top10-bar-wrap">
              <div class="top10-bar" style="width:${pct}%"></div>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    // Initial render with whatever year SC currently has
    function getActiveYear() {
      const sel = document.getElementById('sc-primary-col');
      return sel ? sel.value : (yearCols[yearCols.length - 1] || '');
    }

    renderTop10(getActiveYear());

    // Re-render whenever the SC year selector changes
    const scSel = document.getElementById('sc-primary-col');
    if (scSel) {
      scSel.addEventListener('change', () => renderTop10(scSel.value));
    }

    // Expose updater globally so SC can trigger it
    window._renderTop10 = renderTop10;
  })(DS.rows, DS.headers);

  /* window.DS inspector is hidden — skip rendering it */
  // document.getElementById('ds-pre').innerHTML = renderDSInspector(DS);

  /* renderSummaryCards — 4 stat cards (WB-dataset aware) */
  window.SC  = renderSummaryCards(DS.rows, {
    headers: DS.headers,
    // World Bank dataset: primary "score" metric = Population, total
    // "name" = Country Name  |  "study hours" → Life Expectancy column
    // Auto-detection below uses WB-aware hints
    passThreshold: 70,  // Life expectancy ≥ 70 yrs = "pass" threshold
  });

  /* renderTable — full interactive data table */
  window.RT  = renderTable(DS.rows, { pageSize: 25 });

  /* applyFilterSort — filter by name, sort by column */
  window.AFS = applyFilterSort(DS);

  /* resetTable — restore original view, manage snapshots */
  window.RST = resetTable(DS);

  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('upload-zone').style.display = 'none';
  const az = document.getElementById('autoload-zone');
  if (az) az.style.display = 'none';

  /* Show the action bar (new file + export) */
  showDashActionBar(filename);

  /* ── Student 2 integration hook ── */
  onDataReady(DS.rows, DS.headers);

}

function renderDSInspector(DS) {
  const k = s => `<span class="key">"${s}"</span>`;
  const s = v => `<span class="str">"${esc(String(v))}"</span>`;
  const n = v => `<span class="num">${v}</span>`;
  const a = v => `<span class="arr">[Array(${v})]</span>`;

  const colSample = DS.columns.slice(0, 3).map(c =>
    `    { ${k('name')}: ${s(c.name)}, ${k('type')}: ${s(c.type)}, ${k('nullPct')}: ${n(c.nullPct.toFixed(1))} }`
  ).join(',\n');

  const statSample = Object.entries(DS.stats).slice(0, 2).map(([col, st]) =>
    `    ${k(col)}: { ${k('count')}: ${n(st.count)}, ${k('mean')}: ${n(st.mean.toFixed(4))}, ${k('median')}: ${n(st.median.toFixed(4))} }`
  ).join(',\n');

  return `window.DS = {
  ${k('filename')} : ${s(DS.filename)},
  ${k('rowCount')}  : ${n(DS.rowCount)},
  ${k('colCount')}  : ${n(DS.colCount)},
  ${k('loadedAt')}  : ${s(DS.loadedAt)},
  ${k('headers')}   : ${a(DS.headers.length)},
  ${k('rows')}      : ${a(DS.rows.length)},
  ${k('preview')}   : ${a(DS.preview.length)},
  ${k('columns')}   : [          // sample (first 3 of ${DS.columns.length})
${colSample},
    …
  ],
  ${k('stats')}     : {          // sample (first 2 of ${Object.keys(DS.stats).length} numeric cols)
${statSample},
    …
  },
}`;
}

/* ── renderSummaryCards ───────────────────────── */
/**
 * renderSummaryCards(data, options?) — renders 4 domain-aware stat cards
 * aligned to the World Bank Population Dataset (44,812 rows × 95 cols).
 *
 * Dataset structure:
 *   Identifier columns : Country Name, Country Code, Series Name, Series Code
 *   Value columns      : 1960 [YR1960] … 2050 [YR2050]  (91 year columns, float64)
 *
 * ── Variable Mapping ──────────────────────────────────────────────────────
 *   CARD 1 · Mean Value (primary metric)
 *     → primaryCol : any year column (default: most recent non-future year)
 *       Rationale : Year columns are the dataset's only numeric measures.
 *       The mean across all series/country rows for a given year gives a
 *       sense of scale for the loaded slice.
 *
 *   CARD 2 · Peak Record (top entity)
 *     → nameCol    : "Country Name"   — identifies geographic entities
 *     → seriesCol  : "Series Name"    — identifies the metric being measured
 *       Rationale : The WB dataset is in long format; the "name" is a
 *       combination of Country + Series. Card shows the country with the
 *       single highest value in the selected year column.
 *
 *   CARD 3 · Above-Threshold Rate
 *     → primaryCol : same year column as Card 1
 *     → threshold  : user-adjustable (default 70 — meaningful for life
 *       expectancy in years, a featured WB series)
 *       Rationale : "Pass rate" re-interpreted as the share of data rows
 *       whose selected-year value exceeds the threshold, enabling quick
 *       percentile inspection.
 *
 *   CARD 4 · Series Count / Coverage
 *     → seriesCol  : "Series Name"
 *       Rationale : Unlike a student dataset where "study hours" is a
 *       separate numeric column, the WB dataset's second dimension is
 *       the Series Name (metric type). Card 4 reports unique series and
 *       non-null coverage — a dataset health metric.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * All column mappings are overridable via a remap bar in the UI
 * or via the options object.
 *
 * @param {object[]} data          - Array of row objects (e.g. window.DS.rows)
 * @param {object}   [options]
 *   @param {string}   [options.target]        - CSS selector (default '#sc-container')
 *   @param {string}   [options.primaryCol]    - Year column for mean/peak/threshold (auto: latest year)
 *   @param {string}   [options.nameCol]       - Country/entity label column (auto: 'Country Name')
 *   @param {string}   [options.seriesCol]     - Series/metric name column (auto: 'Series Name')
 *   @param {number}   [options.passThreshold] - Value >= this counts as "above threshold" (default 70)
 *   @param {string[]} [options.headers]       - All column names (for remap dropdowns)
 *
 * Returns a controller:
 *   window.SC = { refresh(data, opts), getConfig(), setThreshold(n) }
 */
function renderSummaryCards(data, options = {}) {
  if (!data || !data.length) return;

  const mount = document.querySelector(options.target || '#sc-container');
  if (!mount) return;

  const allHeaders = options.headers || Object.keys(data[0]);

  /* ── column classification ── */
  // Year columns: match pattern "YYYY [YRYYYY]" or plain "YYYY"
  const yearCols = allHeaders.filter(h => /^\d{4}/.test(h));

  // Numeric columns (non-year, by sampling)
  const numericCols = allHeaders.filter(h => {
    const sample = data.slice(0, 80).map(r => r[h]).filter(v => v !== null && v !== undefined && v !== '');
    return sample.length > 0 && sample.filter(v => typeof v === 'number').length / sample.length > 0.6;
  });

  const stringCols = allHeaders.filter(h => !numericCols.includes(h) && !yearCols.includes(h));

  /* ── column auto-detection helpers ── */
  // WB-aware hints: prioritise exact semantic matches first
  function bestYearCol() {
    // Pick the most recent historical year column with reasonable non-null coverage
    const PREF_YEARS = ['2020', '2019', '2018', '2015', '2010', '2000'];
    for (const yr of PREF_YEARS) {
      const col = yearCols.find(h => h.startsWith(yr));
      if (col) return col;
    }
    // Fallback: last year column
    return yearCols[yearCols.length - 1] || numericCols[0] || allHeaders[0];
  }

  function bestNameCol() {
    if (options.nameCol) return options.nameCol;
    // WB dataset: "Country Name" is the primary identifier
    const COUNTRY_HINTS = ['country name', 'country', 'name', 'nation', 'entity', 'label', 'title'];
    for (const hint of COUNTRY_HINTS) {
      const m = allHeaders.find(h => h.toLowerCase().includes(hint));
      if (m) return m;
    }
    return stringCols[0] || allHeaders[0];
  }

  /* ── mutable config ── */
  let cfg = {
    primaryCol    : options.primaryCol || bestYearCol(),
    nameCol       : bestNameCol(),
  };

  /* ── stat computation ── */
  function compute(rows, c) {
    // Card 1: World Total — value of the WLD aggregate row for the selected year
    const wldRow     = rows.find(r => (r['Country Code'] || '').trim() === 'WLD');
    const worldTotal = wldRow ? (() => {
      const v = wldRow[c.primaryCol];
      return typeof v === 'number' && isFinite(v) ? v : null;
    })() : null;

    // Card 1 sub: year-on-year change
    const selectedYearIdx = yearCols.indexOf(c.primaryCol);
    const prevYearCol     = selectedYearIdx > 0 ? yearCols[selectedYearIdx - 1] : null;
    const worldPrev1      = (wldRow && prevYearCol) ? (() => {
      const v = wldRow[prevYearCol];
      return typeof v === 'number' && isFinite(v) ? v : null;
    })() : null;
    const worldYoY = (worldTotal !== null && worldPrev1 !== null && worldPrev1 !== 0)
      ? ((worldTotal - worldPrev1) / Math.abs(worldPrev1)) * 100 : null;

    // Card 2: peak record — country with the highest value in primaryCol
    let peakRow = null, peakVal = -Infinity;
    for (const row of rows) {
      const v = row[c.primaryCol];
      if (typeof v === 'number' && isFinite(v) && v > peakVal) {
        peakVal = v; peakRow = row;
      }
    }
    const peakCountry = peakRow ? (peakRow[c.nameCol] ?? '\u2014') : '\u2014';

    // Card 3: decade change — WLD value now vs 10 years ago
    const tenBackIdx  = selectedYearIdx - 10;
    const tenBackCol  = tenBackIdx >= 0 ? yearCols[tenBackIdx] : null;
    const worldTenAgo = (wldRow && tenBackCol) ? (() => {
      const v = wldRow[tenBackCol];
      return typeof v === 'number' && isFinite(v) ? v : null;
    })() : null;
    const tenBackYear   = tenBackCol ? tenBackCol.match(/\d{4}/)?.[0] : null;
    const decadeAbsDiff = (worldTotal !== null && worldTenAgo !== null)
      ? worldTotal - worldTenAgo : null;
    const decadePctDiff = (decadeAbsDiff !== null && worldTenAgo !== 0)
      ? (decadeAbsDiff / Math.abs(worldTenAgo)) * 100 : null;

    // Card 4: unique countries + non-null coverage in the primary year col
    const vals            = rows.map(r => r[c.primaryCol]).filter(v => typeof v === 'number' && isFinite(v));
    const uniqueCountries = new Set(rows.map(r => r[c.nameCol]).filter(Boolean)).size;
    const nonNullCount    = vals.length;
    const totalRows       = rows.length;
    const coveragePct     = totalRows > 0 ? (nonNullCount / totalRows) * 100 : 0;

    return {
      worldTotal, worldYoY,
      peakVal: peakVal === -Infinity ? null : peakVal,
      peakCountry,
      worldTenAgo, decadeAbsDiff, decadePctDiff, tenBackYear,
      totalVals: vals.length,
      uniqueCountries, coveragePct, totalRows, nonNullCount,
    };
  }


  /* ── number formatters ── */
  const f2   = n => (n == null ? '—' : (+n).toFixed(2));
  const f1   = n => (n == null ? '—' : (+n).toFixed(1));
  const fpct = n => (n == null ? '—' : (+n).toFixed(1) + '%');
  const fshort = n => {
    if (n == null || !isFinite(n)) return '—';
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return (+n).toFixed(2);
  };

  /* ── render ── */
  function render() {
    const stats = compute(data, cfg);

    // Derive a short readable year label from the column name
    const yearLabel = cfg.primaryCol.match(/\d{4}/)?.[0] ?? cfg.primaryCol;


    /* decade-change colour and arrow */
    const decadeColour = stats.decadePctDiff == null ? 'var(--muted)'
      : stats.decadePctDiff > 0 ? '#4dffb4'
      : stats.decadePctDiff < 0 ? 'var(--danger)'
      : 'var(--text-dim)';
    const decadeArrow  = stats.decadePctDiff == null ? ''
      : stats.decadePctDiff > 0 ? '▲' : stats.decadePctDiff < 0 ? '▼' : '≈';
    const decadeSign   = (stats.decadeAbsDiff > 0 ? '+' : '');

    /* world-total YoY arrow */
    const yoyArrow  = stats.worldYoY == null ? ''
      : stats.worldYoY > 0 ? '▲' : stats.worldYoY < 0 ? '▼' : '≈';
    const yoyColour = stats.worldYoY == null ? 'var(--muted)'
      : stats.worldYoY > 0 ? '#4dffb4' : 'var(--danger)';

    const peakCountryLabel = String(stats.peakCountry).slice(0, 22) +
      (String(stats.peakCountry).length > 22 ? '…' : '');

    /* Short 4-5 word description of what the peak value represents,
       derived from the selected year column and the Series Name rows */
    function derivePeakDesc() {
      // Try to infer the active series from the data rows
      const seriesNames = [...new Set(data.map(r => r['Series Name']).filter(Boolean))];
      const col = cfg.primaryCol;

      // Match against known World Bank series patterns
      const s = seriesNames.length === 1 ? seriesNames[0].toLowerCase() : '';
      if (s.includes('population, total') || (seriesNames.length > 1 && col.match(/\d{4}/))) {
        // Generic fallback for multi-series: describe by column year
        if (s.includes('life expectancy')) return 'highest life expectancy recorded';
        if (s.includes('fertility'))       return 'most births per woman';
        if (s.includes('urban'))           return 'most urbanised population share';
        if (s.includes('birth rate'))      return 'highest births per 1,000';
        if (s.includes('death rate'))      return 'highest deaths per 1,000';
        if (s.includes('growth'))          return 'fastest population growth rate';
        if (s.includes('dependency'))      return 'highest dependency ratio';
        if (s.includes('migration'))       return 'largest net migration flow';
        if (s.includes('mortality'))       return 'highest mortality rate recorded';
        if (s.includes('female'))          return 'largest female population count';
        if (s.includes('male'))            return 'largest male population count';
        return 'highest total population recorded';
      }
      // Multi-series dataset — describe generically by value magnitude
      const v = stats.peakVal;
      if (v == null) return 'highest value in dataset';
      if (v >= 1e9)  return 'highest total population recorded';
      if (v >= 1e6)  return 'largest count in dataset';
      if (v >= 100)  return 'highest recorded rate';
      if (v >= 1)    return 'highest value this year';
      return 'highest value in dataset';
    }
    const peakDesc = derivePeakDesc();

    /* remap selects — year cols only for primary; "Country Name" / "Country Code" only for name */
    const yearOpts    = (sel) => yearCols.map(h =>
      `<option value="${esc(h)}" ${h === sel ? 'selected' : ''}>${esc(h.slice(0,4))}</option>`
    ).join('');
    const countryOpts = (sel) => allHeaders
      .filter(h => /country\s*(name|code)/i.test(h))
      .map(h => {
        const label = /name/i.test(h) ? 'Country Name' : 'Country Code';
        return `<option value="${esc(h)}" ${h === sel ? 'selected' : ''}>${label}</option>`;
      })
      .join('');


    mount.innerHTML = `
      <!-- ── Remap bar ── -->
      <div class="sc-remap-bar">
        <span class="sc-remap-label">Year col:</span>
        <select class="sc-remap-select" id="sc-primary-col">${yearOpts(cfg.primaryCol)}</select>
        <span class="sc-remap-sep">|</span>
        <span>Country col:</span>
        <select class="sc-remap-select" id="sc-name-col">${countryOpts(cfg.nameCol)}</select>
      </div>

      <!-- ── 4 Cards ── -->
      <div class="sc-grid">

        <!-- CARD 1 · World Total -->
        <div class="sc-card" style="--sc-color: var(--accent)">
          <span class="sc-col-badge" title="${esc(cfg.primaryCol)}">${esc(yearLabel)}</span>
          <span class="sc-icon">🌐</span>
          <div class="sc-metric">World Total · ${esc(yearLabel)}</div>
          <div class="sc-value">${fshort(stats.worldTotal)}</div>
          <div class="sc-sub">
            global aggregate value · all countries
            ${stats.worldYoY != null
              ? `<br/><span style="color:${yoyColour}">${yoyArrow} ${Math.abs(stats.worldYoY).toFixed(2)}% vs prior year</span>`
              : ''}
          </div>
        </div>

        <!-- CARD 2 · Peak Record -->
        <div class="sc-card" style="--sc-color: #c084fc">
          <span class="sc-col-badge" title="${esc(cfg.nameCol)}">${esc(yearLabel)} peak</span>
          <span class="sc-icon">🌍</span>
          <div class="sc-metric">Peak Record · ${esc(yearLabel)}</div>
          <div class="sc-value">${fshort(stats.peakVal)}</div>
          <div class="sc-sub">
            <strong>${esc(peakCountryLabel)}</strong> · ${esc(peakDesc)}
          </div>
        </div>

        <!-- CARD 3 · Decade Change -->
        <div class="sc-card" style="--sc-color: ${decadeColour}">
          <span class="sc-col-badge">${stats.tenBackYear ?? '10yr'} → ${esc(yearLabel)}</span>
          <span class="sc-icon">📈</span>
          <div class="sc-metric">Decade Change · World</div>
          <div class="sc-value" style="color:${decadeColour}">
            ${stats.decadePctDiff != null ? decadeArrow + ' ' + Math.abs(stats.decadePctDiff).toFixed(1) + '%' : '—'}
          </div>
          <div class="sc-sub">
            ${stats.decadeAbsDiff != null
              ? `${decadeSign}${fshort(stats.decadeAbsDiff)} absolute change`
              : 'no decade data available'}<br/>
            ${stats.worldTenAgo != null ? fshort(stats.worldTenAgo) + ' → ' + fshort(stats.worldTotal) : ''}
          </div>
        </div>


        <!-- CARD 4 · Dataset Coverage -->
        <div class="sc-card" style="--sc-color: var(--accent2)">
          <span class="sc-col-badge">coverage</span>
          <span class="sc-icon">📋</span>
          <div class="sc-metric">Dataset Coverage · ${esc(yearLabel)}</div>
          <div class="sc-value">${fpct(stats.coveragePct)}</div>
          <div class="sc-sub">
            <strong>${stats.uniqueCountries.toLocaleString()}</strong> unique countries<br/>
            ${stats.nonNullCount.toLocaleString()} / ${stats.totalRows.toLocaleString()} non-null in year col
          </div>
        </div>

      </div><!-- /.sc-grid -->
    `;

    /* ── wire remap controls ── */
    mount.querySelector('#sc-primary-col').addEventListener('change', e => {
      cfg.primaryCol = e.target.value; render();
    });
    mount.querySelector('#sc-name-col').addEventListener('change', e => {
      cfg.nameCol = e.target.value; render();
    });
  }

  render();

  return {
    refresh      : (newData, opts = {}) => {
      if (newData) data = newData;
      Object.assign(cfg, opts);
      render();
    },
    getConfig    : () => ({ ...cfg }),
  };
}

/* ── resetTable ───────────────────────────────── */
/**
 * resetTable(ds) — restore the renderTable view to its original state,
 * clearing all filters, sorts, searches, and column visibility changes
 * applied by applyFilterSort() or manual table interaction.
 *
 * Also provides a named snapshot system so users can save and
 * jump between views without losing work.
 *
 * Integrates with:
 *   window.RT  (renderTable controller)
 *   window.AFS (applyFilterSort controller)
 *
 * Returns a controller:
 *   window.RST = {
 *     reset(silent?)       — full reset to original, clears AFS panel
 *     saveSnapshot(label?) — snapshot current RT + AFS state
 *     restoreSnapshot(id)  — jump back to a named snapshot
 *     listSnapshots()      — array of saved snapshots
 *     getHistory()         — ordered reset/apply history log
 *   }
 */
function resetTable(ds) {
  /* ── snapshot store ── */
  const snapshots = [];       // [{ id, label, ts, rtState, afsState }]
  const history   = [];       // [{ action, ts, detail }]
  let   snapIdSeq = 0;

  /* ── DOM refs (wired after RT + AFS are live) ── */
  const bar         = document.getElementById('rst-bar');
  const rstLabel    = document.getElementById('rst-label');
  const snapList    = document.getElementById('rst-snap-list');
  const saveBtn     = document.getElementById('rst-save-snap-btn');
  const resetBtn    = document.getElementById('rst-reset-btn');

  /* ── show/hide the reset bar ── */
  function setBarVisible(on, reason) {
    bar.classList.toggle('visible', on);
    if (on && reason) rstLabel.textContent = reason;
  }

  /* ── snapshot helpers ── */
  function captureState(label) {
    const rtState  = window.RT  ? window.RT.getState()  : null;
    const afsState = window.AFS ? window.AFS.getState() : null;
    // Also capture global search term from RT state
    const searchTerm = rtState ? rtState.searchTerm : '';
    return { id: ++snapIdSeq, label: label || `Snapshot ${snapIdSeq}`, ts: new Date(), rtState, afsState, searchTerm };
  }

  function renderSnapButtons() {
    snapList.innerHTML = snapshots.map(s =>
      `<button class="rst-snap-btn" data-id="${s.id}" title="${s.ts.toLocaleTimeString()}">
        ⊡ ${esc(s.label)}
      </button>`
    ).join('');
    snapList.querySelectorAll('.rst-snap-btn').forEach(btn => {
      btn.addEventListener('click', () => restoreSnapshot(+btn.dataset.id));
    });
  }

  /* ── core reset — clears all 5 pipeline stages ── */
  function reset(silent = false) {
    // Stage 4 — resetTable: wipe all pipeline state back to source

    // 1. Reset renderTable internal state (clears externalData → goes back to ds.rows)
    if (window.RT) {
      window.RT.resetData();
    }

    // 2. Reset applyFilterSort panel (name-filter, sort-by, mode chips)
    if (window.AFS) {
      window.AFS.clear();
    }

    // 3. Clear the global search box via the new setSearchTerm API
    if (window.RT && typeof window.RT.setSearchTerm === 'function') {
      window.RT.setSearchTerm('');
    } else {
      // fallback: directly clear the input value (no event dispatch)
      const searchInput = document.querySelector('#rt-search-input');
      if (searchInput) searchInput.value = '';
    }

    // 4. Hide the reset bar — back to baseline
    setBarVisible(false);

    // 5. Log
    if (!silent) {
      history.push({ action: 'reset', ts: new Date(), detail: 'Restored original view' });
    }
  }

  /* ── save snapshot ── */
  function saveSnapshot(label) {
    const snap = captureState(label);
    snapshots.push(snap);
    history.push({ action: 'snapshot', ts: snap.ts, detail: snap.label });
    renderSnapButtons();
    setBarVisible(true, `${snapshots.length} snapshot${snapshots.length > 1 ? 's' : ''} saved`);
    return snap.id;
  }

  /* ── restore snapshot — replays full pipeline through getPipelineResult() ── */
  function restoreSnapshot(id) {
    const snap = snapshots.find(s => s.id === id);
    if (!snap) return;

    const { afsState, rtState, searchTerm } = snap;

    // Stage 1+2+3: Replay AFS state (name-filter + sort-by → feeds pipeline base)
    if (window.AFS && afsState) {
      window.AFS.apply(
        afsState.filterVal,
        afsState.sortCol,
        afsState.sortDir,
        afsState.mode
      );
    }

    // Stage 3 (global search): Replay searchTerm through setSearchTerm
    // This runs AFTER AFS so the pipeline sees: AFS result → search filter
    if (window.RT && typeof window.RT.setSearchTerm === 'function') {
      window.RT.setSearchTerm(searchTerm || '');
    }

    history.push({ action: 'restore', ts: new Date(), detail: snap.label });
    setBarVisible(true, `Restored: "${snap.label}"`);
  }

  /* ── wire UI buttons ── */
  resetBtn.addEventListener('click', reset);

  saveBtn.addEventListener('click', () => {
    const label = prompt('Name this snapshot:', `View ${snapshots.length + 1}`) ?? '';
    if (label.trim()) saveSnapshot(label.trim());
    else if (label !== null) saveSnapshot();   // empty string → auto-label
  });

  /* ── watch for any modification to show the reset bar ── */
  // Proxy renderTable's applyExternal to auto-show bar whenever AFS pushes a view
  if (window.RT) {
    const origApply = window.RT.applyFilterSort.bind(window.RT);
    window.RT.applyFilterSort = function(rows, _sc, _sd) {
      origApply(rows, _sc, _sd);
      const filtered = rows?.length ?? 0;
      const total    = ds.rowCount;
      const label = filtered < total
        ? `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()} rows`
        : `Filter active · ${filtered.toLocaleString()} rows`;
      setBarVisible(true, label);
    };

    const origReset = window.RT.resetData.bind(window.RT);
    window.RT.resetData = function() {
      origReset();
      setBarVisible(false);
    };
  }

  return {
    reset,
    saveSnapshot,
    restoreSnapshot,
    listSnapshots : () => snapshots.map(s => ({ id: s.id, label: s.label, ts: s.ts })),
    getHistory    : () => [...history],
  };
}

/* ── applyFilterSort ──────────────────────────── */
/**
 * applyFilterSort(ds, options?) — unified "Data Explorer" filter bar.
 *
 * Injects a single slim bar into #afs-panel containing:
 *   • One search input (replaces both old AFS filter + RT global search)
 *   • "Filter by column" dropdown inline
 *   • contains / starts / exact match pills
 *
 * The RT toolbar's own search box is hidden (class de-rt-toolbar-nosearch).
 * Column visibility toggle and page-size stay on the RT toolbar as-is.
 *
 * Returns a controller:
 *   { getState(), apply(filterVal, sortCol, sortDir, mode), clear() }
 */
function applyFilterSort(ds, options = {}) {
  if (!ds || !ds.rows || !ds.rows.length) return;

  const panel = document.getElementById('afs-panel');
  if (!panel) return;

  /* ── auto-detect the "name" column ── */
  const NAME_HINTS = ['name', 'country', 'title', 'label', 'series', 'description', 'desc', 'id'];
  const autoNameCol = (() => {
    if (options.nameCol) return options.nameCol;
    const lower = ds.headers.map(h => ({ h, l: h.toLowerCase() }));
    for (const hint of NAME_HINTS) {
      const match = lower.find(({ l }) => l.includes(hint));
      if (match) return match.h;
    }
    return ds.headers[0];
  })();

  /* ── state ── */
  let nameCol   = autoNameCol;
  let filterVal = options.filterVal || '';
  let sortCol   = options.sortCol   || null;
  let sortDir   = options.sortDir   || 'asc';
  let mode      = options.mode      || 'contains';
  let lastResult = ds.rows;

  /* ── build slim filter bar ── */
  // Only include non-year columns for the column picker
  const filterCols = ds.headers.filter(h => !/^\d{4}/.test(h));

  panel.innerHTML = `
    <div class="de-filter-bar">
      <span class="afs-label">Filter</span>
      <select class="afs-select" id="afs-name-col">
        <option value="__all__">All columns</option>
        ${filterCols.map(h => `<option value="${esc(h)}" ${h === nameCol ? 'selected' : ''}>${esc(h)}</option>`).join('')}
      </select>
      <input class="de-search" id="afs-filter-input" type="text"
             placeholder="Search…" value="${esc(filterVal)}" />
      <div class="de-mode-group">
        ${['contains','starts','exact'].map(m =>
          `<button class="de-mode-pill${mode === m ? ' active' : ''}" data-mode="${m}">${
            m === 'contains' ? '⊃ contains' : m === 'starts' ? '⌖ starts' : '= exact'
          }</button>`
        ).join('')}
      </div>
    </div>
    <div id="afs-status" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:0;margin-top:0;"></div>
  `;

  /* ── hide RT's own search box — DE owns the search now ── */
  const rtMount = document.getElementById('rt-container');
  if (rtMount) rtMount.classList.add('de-rt-toolbar-nosearch');

  /* ── wire controls ── */
  const nameColSel  = panel.querySelector('#afs-name-col');
  const filterInput = panel.querySelector('#afs-filter-input');

  nameColSel.addEventListener('change', e => {
    nameCol = e.target.value;
    if (filterVal.trim()) runApply();
  });

  panel.querySelectorAll('.de-mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      panel.querySelectorAll('.de-mode-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (filterVal.trim()) runApply();
    });
  });

  /* Live filtering on each keystroke */
  filterInput.addEventListener('input', () => {
    filterVal = filterInput.value;
    runApply();
  });

  /* Also route Enter key */
  filterInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { filterVal = filterInput.value; runApply(); }
  });

  /* ── core: filter pipeline ── */
  function matchRow(row) {
    if (!filterVal.trim()) return true;
    const cell = row[nameCol];
    if (cell === null || cell === undefined) return false;
    const haystack = String(cell).toLowerCase();
    const needle   = filterVal.trim().toLowerCase();
    if (mode === 'exact')  return haystack === needle;
    if (mode === 'starts') return haystack.startsWith(needle);
    return haystack.includes(needle);
  }

  function sortRows(rows) {
    if (!sortCol) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
      return dir * String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  function runApply() {
    filterVal = filterInput.value;

    if (nameCol === '__all__') {
      // Cross-column search → use RT's built-in searchTerm pipeline
      if (window.RT && typeof window.RT.setSearchTerm === 'function') {
        window.RT.setSearchTerm(filterVal);
      }
      // Reset any column-specific external filter
      if (window.RT && typeof window.RT.applyFilterSort === 'function') {
        window.RT.applyFilterSort(ds.rows, null, 'asc');
      }
      lastResult = ds.rows;
      renderStatus(filterVal.trim() ? null : ds.rows.length);
    } else {
      // Column-specific filter → AFS pipeline
      const filtered = ds.rows.filter(matchRow);
      const sorted   = sortRows(filtered);
      lastResult     = sorted;

      // Also clear any cross-column search term
      if (window.RT && typeof window.RT.setSearchTerm === 'function') {
        window.RT.setSearchTerm('');
      }

      if (window.RT && typeof window.RT.applyFilterSort === 'function') {
        window.RT.applyFilterSort(sorted, sortCol, sortDir);
      }
      renderStatus(filtered.length);
    }
  }

  function runClear() {
    filterVal = '';  sortCol = null;  sortDir = 'asc';  mode = 'contains';
    filterInput.value = '';
    nameColSel.value  = nameCol;
    panel.querySelectorAll('.de-mode-pill').forEach((b, i) => b.classList.toggle('active', i === 0));
    lastResult = ds.rows;

    if (window.RT && typeof window.RT.setSearchTerm === 'function') {
      window.RT.setSearchTerm('');
    }
    if (window.RT && typeof window.RT.applyFilterSort === 'function') {
      window.RT.applyFilterSort(ds.rows, null, 'asc');
    }
    renderStatus(ds.rows.length, true);
  }

  function renderStatus(filteredCount, cleared = false) {
    const statusBar = panel.querySelector('#afs-status');
    if (cleared || (!filterVal.trim() && !sortCol)) { statusBar.innerHTML = ''; return; }

    const chips = [];
    if (filterVal.trim()) {
      const colLabel = nameCol === '__all__' ? 'all columns' : nameCol;
      chips.push(`<span class="afs-chip filter-chip">
        ⊃ <strong>${esc(colLabel)}</strong>${nameCol !== '__all__' ? ` ${mode}` : ''} "${esc(filterVal)}"
        <span class="afs-chip-x" id="afs-clear-filter">×</span>
      </span>`);
    }
    if (filteredCount !== null) {
      chips.push(`<span class="afs-chip result-chip">${filteredCount.toLocaleString()} / ${ds.rows.length.toLocaleString()} rows</span>`);
    }
    statusBar.innerHTML = chips.join('');

    statusBar.querySelector('#afs-clear-filter')?.addEventListener('click', () => {
      filterInput.value = ''; filterVal = ''; runApply();
    });
  }

  /* ── initial apply if options provided ── */
  if (filterVal || sortCol) runApply();

  /* ── return controller (API unchanged — resetTable + snapshots still work) ── */
  return {
    getState : () => ({ nameCol, filterVal, sortCol, sortDir, mode, resultCount: lastResult.length }),
    apply    : (fv, sc, sd, m) => {
      if (fv !== undefined) { filterVal = fv; filterInput.value = fv; }
      if (sc !== undefined) { sortCol   = sc; }
      if (sd !== undefined) { sortDir   = sd; }
      if (m  !== undefined) { mode      = m;  panel.querySelectorAll('.de-mode-pill').forEach(b => b.classList.toggle('active', b.dataset.mode === m)); }
      runApply();
    },
    clear : runClear,
    getResult: () => lastResult,
  };
}

/* ── renderTable ──────────────────────────────── */
/**
 * renderTable(data, options?) — renders an interactive HTML table
 * into #rt-container (or any container via options.target).
 *
 * @param {object[]} data       - Array of row objects (e.g. window.DS.rows)
 * @param {object}   [options]
 *   @param {string}   [options.target]    - CSS selector for mount element (default '#rt-container')
 *   @param {string[]} [options.columns]   - Which columns to show (default: all)
 *   @param {number}   [options.pageSize]  - Rows per page (default 25)
 *   @param {string}   [options.sortCol]   - Initial sort column
 *   @param {'asc'|'desc'} [options.sortDir] - Initial sort direction
 *
 * Features:
 *  - Click column headers to sort (asc → desc → none)
 *  - Global search across all visible columns
 *  - Toggle column visibility
 *  - Pagination with page-size selector
 *  - Numeric cells right-aligned + coloured
 *  - Null cells styled with italic placeholder
 *  - Search term highlighting
 */
function renderTable(data, options = {}) {
  if (!data || !data.length) return;

  const mountSel  = options.target   || '#rt-container';
  const mount     = document.querySelector(mountSel);
  if (!mount) return;

  const allCols   = Object.keys(data[0]);
  const colTypes  = detectColTypes(allCols, data);

  /* ── mutable state ── */
  let visibleCols = options.columns  ? [...options.columns] : [...allCols];
  let pageSize    = options.pageSize || 25;
  let currentPage = 1;
  let sortCol     = options.sortCol  || null;
  let sortDir     = options.sortDir  || 'asc';
  let searchTerm  = '';
  let externalData = null;  // set by applyFilterSort() to override internal filter

  /* ── build scaffold ── */
  mount.innerHTML = `
    <div class="rt-toolbar">
      <input class="rt-search" id="rt-search-input" type="text" placeholder="Search all columns…" style="display:none" />
      <button class="rt-btn" id="rt-search-btn" style="display:none">⌕ Search</button>
      <div class="rt-col-toggle-wrap">
        <button class="rt-btn" id="rt-col-btn">⊞ Columns</button>
        <div class="rt-col-dropdown" id="rt-col-dropdown"></div>
      </div>
      <span class="rt-count" id="rt-match-count"></span>
    </div>
    <div class="rt-scroll">
      <table class="rt-table" id="rt-main-table">
        <thead id="rt-thead"></thead>
        <tbody id="rt-tbody"></tbody>
      </table>
    </div>
    <div class="rt-pagination" id="rt-pagination"></div>
  `;

  /* ── column toggle dropdown ── */
  const dropdown = mount.querySelector('#rt-col-dropdown');
  dropdown.innerHTML = allCols.map(col => `
    <label class="rt-col-item">
      <input type="checkbox" data-col="${esc(col)}" ${visibleCols.includes(col) ? 'checked' : ''} />
      ${esc(col)}
    </label>
  `).join('');

  dropdown.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      visibleCols = allCols.filter(c => {
        const el = dropdown.querySelector(`input[data-col="${esc(c)}"]`);
        return el && el.checked;
      });
      currentPage = 1;
      redraw();
    });
  });

  const colBtn = mount.querySelector('#rt-col-btn');
  colBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    colBtn.classList.toggle('active');
  });
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
    colBtn.classList.remove('active');
  });

  /* ── search ONLY on button click — no reactive/input/keydown triggers ── */
  mount.querySelector('#rt-search-btn').addEventListener('click', () => {
    const si = mount.querySelector('#rt-search-input');
    searchTerm = si.value.trim().toLowerCase();
    currentPage = 1;
    redraw();
  });

  /* ── unified pipeline ── */
  /**
   * getPipelineResult() — single function all 5 pipeline stages flow through.
   *
   * Order of operations:
   *   1. loadDataset()     → populates window.DS (rows are the source of truth)
   *   2. renderTable()     → calls getPipelineResult() on every redraw
   *   3. applyFilterSort() → sets externalData (name-filter + sort) which
   *                          getPipelineResult() uses as its base
   *   4. resetTable()      → clears externalData + searchTerm, reruns pipeline
   *   5. Snapshot system   → captures / replays full pipeline state
   *
   * @returns {object[]}  The final array of rows to display (filtered + sorted + searched)
   */
  function getPipelineResult() {
    // Stage 1 — base: either AFS-filtered slice or the full dataset
    let base = externalData !== null ? externalData : data;

    // Stage 2 — global search (applied on top of whatever AFS produced)
    if (searchTerm) {
      base = base.filter(row =>
        visibleCols.some(col => {
          const v = row[col];
          return v !== null && v !== undefined && String(v).toLowerCase().includes(searchTerm);
        })
      );
    }

    // Stage 3 — table-header sort (applied last so it can override AFS sort)
    if (sortCol) {
      const dir = sortDir === 'asc' ? 1 : -1;
      base = [...base].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
        return dir * String(av).localeCompare(String(bv), undefined, { numeric: true });
      });
    }

    return base;
  }

  // Kept for AFS compatibility — AFS calls this after it produces its sorted slice
  function getFiltered() { return getPipelineResult(); }
  function getSorted(rows) { return rows; }  // sorting is now inside getPipelineResult

  function highlight(str) {
    if (!searchTerm) return esc(str);
    const escaped = esc(str);
    const idx = escaped.toLowerCase().indexOf(searchTerm);
    if (idx === -1) return escaped;
    return (
      escaped.slice(0, idx) +
      `<mark class="rt-highlight">${escaped.slice(idx, idx + searchTerm.length)}</mark>` +
      escaped.slice(idx + searchTerm.length)
    );
  }

  function redraw() {
    const sorted   = getPipelineResult();
    const total    = sorted.length;
    const pages    = Math.max(1, Math.ceil(total / pageSize));
    currentPage    = Math.min(currentPage, pages);

    const start    = (currentPage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    /* update pill */
    const pill = document.getElementById('rt-row-pill');
    if (pill) pill.textContent = `${total.toLocaleString()} rows`;
    mount.querySelector('#rt-match-count').textContent =
      searchTerm ? `${total.toLocaleString()} match${total !== 1 ? 'es' : ''}` : `${(externalData !== null ? externalData : data).length.toLocaleString()} rows`;

    /* thead */
    const thead = mount.querySelector('#rt-thead');
    thead.innerHTML = '<tr>' + visibleCols.map(col => {
      const isNum  = colTypes[col] === 'numeric';
      const active = sortCol === col;
      const icon   = active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅';
      const cls    = [isNum ? 'col-num' : '', active ? `sort-${sortDir}` : ''].filter(Boolean).join(' ');
      return `<th class="${cls}" data-col="${esc(col)}">
        <span class="rt-th-inner">${esc(col)} <span class="rt-sort-icon">${icon}</span></span>
      </th>`;
    }).join('') + '</tr>';

    thead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (sortCol === col) {
          if (sortDir === 'asc') sortDir = 'desc';
          else { sortCol = null; sortDir = 'asc'; }
        } else {
          sortCol = col; sortDir = 'asc';
        }
        redraw();
      });
    });

    /* tbody */
    const tbody = mount.querySelector('#rt-tbody');
    tbody.innerHTML = pageRows.map(row =>
      '<tr>' + visibleCols.map(col => {
        const v = row[col];
        if (v === null || v === undefined || v === '') return `<td class="cell-null">—</td>`;
        const isNum = colTypes[col] === 'numeric' && typeof v === 'number';
        const cls   = isNum ? 'cell-num' : '';
        const disp  = isNum ? fmtNum(v) : highlight(String(v));
        return `<td class="${cls}">${disp}</td>`;
      }).join('') + '</tr>'
    ).join('');

    /* pagination */
    renderPagination(pages, total, start, pageRows.length);
  }

  function renderPagination(pages, total, start, count) {
    const pag = mount.querySelector('#rt-pagination');

    const pageButtons = [];
    const addBtn = (label, page, isCurrent, disabled) => {
      pageButtons.push(`<button class="rt-page-btn${isCurrent ? ' current' : ''}"
        data-page="${page}" ${disabled ? 'disabled' : ''}>${label}</button>`);
    };

    addBtn('‹', currentPage - 1, false, currentPage === 1);

    // page window logic
    const window_ = 2;
    const lo = Math.max(1, currentPage - window_);
    const hi = Math.min(pages, currentPage + window_);

    if (lo > 1)   { addBtn(1, 1, false, false); if (lo > 2) pageButtons.push(`<span class="rt-page-btn" style="cursor:default;opacity:.3">…</span>`); }
    for (let p = lo; p <= hi; p++) addBtn(p, p, p === currentPage, false);
    if (hi < pages) { if (hi < pages - 1) pageButtons.push(`<span class="rt-page-btn" style="cursor:default;opacity:.3">…</span>`); addBtn(pages, pages, false, false); }

    addBtn('›', currentPage + 1, false, currentPage === pages);

    const sizes = [10, 25, 50, 100].map(s =>
      `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s} / page</option>`
    ).join('');

    pag.innerHTML = pageButtons.join('') +
      `<select class="rt-page-size" id="rt-page-size">${sizes}</select>` +
      `<span class="rt-page-info">
        ${(start + 1).toLocaleString()}–${(start + count).toLocaleString()} of ${total.toLocaleString()}
      </span>`;

    pag.querySelectorAll('.rt-page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = +btn.dataset.page;
        redraw();
      });
    });

    pag.querySelector('#rt-page-size').addEventListener('change', e => {
      pageSize    = +e.target.value;
      currentPage = 1;
      redraw();
    });
  }

  /* ── helpers ── */
  function detectColTypes(cols, rows) {
    const sample = rows.slice(0, 200);
    const types  = {};
    for (const col of cols) {
      let numCount = 0, total = 0;
      for (const row of sample) {
        const v = row[col];
        if (v !== null && v !== undefined && v !== '') { total++; if (typeof v === 'number') numCount++; }
      }
      types[col] = total > 0 && numCount / total > 0.7 ? 'numeric' : 'string';
    }
    return types;
  }

  function fmtNum(n) {
    if (!isFinite(n)) return String(n);
    // Use locale formatting, up to 4 decimal places, trimming trailing zeros
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  /* ── initial draw ── */
  redraw();

  /* ── expose applyFilterSort hook ──
     Called by applyFilterSort() to push a pre-filtered+sorted
     slice into this table instance as the pipeline base.
     AFS has already sorted the rows; we do NOT sync sortCol here
     so getPipelineResult() won't double-sort. Table-header clicks
     still set sortCol independently and override AFS order.  */
  function applyExternal(rows, newSortCol, newSortDir) {
    externalData = rows;
    // Reset table-header sort so we don't double-sort AFS's already-sorted rows.
    // A subsequent header click will re-set sortCol if the user wants to override.
    sortCol = null;
    sortDir = 'asc';
    currentPage = 1;
    redraw();
  }

  /* ── return controller ── (callable from console) */
  return {
    redraw,
    applyFilterSort : applyExternal,
    resetData       : () => { externalData = null; sortCol = null; sortDir = 'asc'; currentPage = 1; redraw(); },
    getState        : () => ({ sortCol, sortDir, searchTerm, currentPage, pageSize, visibleCols, isFiltered: externalData !== null }),
    getSearchTerm   : () => searchTerm,
    setSearchTerm   : (term) => {
      searchTerm = term;
      const si = mount.querySelector('#rt-search-input');
      if (si) si.value = term;
      currentPage = 1;
      redraw();
    },
  };
}

/* ── UI helpers ───────────────────────────────── */
function showProgress(on) {
  document.getElementById('progress-wrap').style.display = on ? 'block' : 'none';
  if (!on) { setProgress(0, ''); }
}

function setProgress(pct, label) {
  document.getElementById('progress-bar').style.width  = pct + '%';
  document.getElementById('progress-pct').textContent  = pct + '%';
  document.getElementById('progress-label-text').textContent = label;
}

function showError(msg) {
  const el = document.getElementById('error-box');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Drag & drop ─────────────────────────────── */
function onDragOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.add('drag-over');
}

function onDragLeave(e) {
  document.getElementById('upload-zone').classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadDataset(file);
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) loadDataset(file);
}

/* ═══════════════════════════════════════════════
   LOAD NEW FILE & EXPORT FEATURES
   ═══════════════════════════════════════════════ */

/* ── Show/hide the dashboard action bar when dashboard is ready ── */
function showDashActionBar(filename) {
  const bar = document.getElementById('dash-action-bar');
  const nameEl = document.getElementById('dash-file-name');
  const metaEl = document.getElementById('dash-file-meta');
  if (!bar) return;
  nameEl.textContent = filename;
  if (window.DS) {
    metaEl.textContent = `· ${window.DS.rowCount.toLocaleString()} rows · ${window.DS.colCount} cols`;
  }
  bar.style.display = 'flex';
}

/* ── Load New File flow ── */
function promptLoadNewFile() {
  document.getElementById('confirm-overlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}

function resetToUpload() {
  closeConfirm();

  // Destroy all charts
  if (window.CHARTS) {
    Object.keys(window.CHARTS).forEach(id => {
      if (window.CHARTS[id]) { window.CHARTS[id].destroy(); delete window.CHARTS[id]; }
    });
  }

  // Clear DS
  window.DS  = null;
  window.SC  = null;
  window.RT  = null;
  window.AFS = null;
  window.RST = null;
  window.S2  = {};

  // Hide dashboard, show loading indicator, then reload embedded dataset
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('dash-action-bar').style.display = 'none';
  document.getElementById('error-box').style.display = 'none';
  const az = document.getElementById('autoload-zone');
  if (az) az.style.display = '';

  // Reload embedded dataset
  loadEmbeddedDataset();
}

/* ── Rows-to-CSV helper ── */
function rowsToCSV(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape  = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

/* ── Trigger browser download ── */
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ── Show toast notification ── */
function showExportToast(msg) {
  const toast   = document.getElementById('export-toast');
  const msgEl   = document.getElementById('export-toast-msg');
  msgEl.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Export: full CSV ── */
function exportCSV() {
  if (!window.DS) return;
  const csv = rowsToCSV(window.DS.rows);
  const base = window.DS.filename.replace(/\.[^.]+$/, '');
  downloadFile(csv, `${base}_export.csv`, 'text/csv;charset=utf-8;');
  showExportToast(`Saved: ${base}_export.csv`);
}

/* ── Export: filtered/current table view as CSV ── */
function exportFilteredCSV() {
  if (!window.DS) return;
  // Try to get current table state from RT controller
  let rows = window.DS.rows;
  if (window.RT) {
    const state = window.RT.getState();
    // Re-derive the filtered+sorted rows from DS using RT state
    let filtered = window.DS.rows;
    if (state.isFiltered && window.AFS && typeof window.AFS.getCurrentRows === 'function') {
      filtered = window.AFS.getCurrentRows();
    }
    if (state.sortCol) {
      const dir = state.sortDir === 'asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        const av = a[state.sortCol], bv = b[state.sortCol];
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
        return dir * String(av).localeCompare(String(bv), undefined, { numeric: true });
      });
    }
    rows = filtered;
  }
  const csv  = rowsToCSV(rows);
  const base = window.DS.filename.replace(/\.[^.]+$/, '');
  downloadFile(csv, `${base}_filtered.csv`, 'text/csv;charset=utf-8;');
  showExportToast(`Saved: ${base}_filtered.csv (${rows.length} rows)`);
}

/* ── Export: full JSON ── */
function exportJSON() {
  if (!window.DS) return;
  const payload = JSON.stringify(window.DS.rows, null, 2);
  const base    = window.DS.filename.replace(/\.[^.]+$/, '');
  downloadFile(payload, `${base}_data.json`, 'application/json');
  showExportToast(`Saved: ${base}_data.json`);
}

/* ── Export: analysis report JSON ── */
function exportReport() {
  if (!window.DS) return;
  const DS = window.DS;
  const scores = DS.rows.map(r => r.score || r.Score || r.SCORE).filter(v => typeof v === 'number' && isFinite(v));
  const report = {
    meta: {
      filename  : DS.filename,
      exportedAt: new Date().toISOString(),
      rowCount  : DS.rowCount,
      colCount  : DS.colCount,
    },
    columnProfile: DS.columns,
    numericStats : DS.stats,
    preview      : DS.preview,
  };
  const base = DS.filename.replace(/\.[^.]+$/, '');
  downloadFile(JSON.stringify(report, null, 2), `${base}_report.json`, 'application/json');
  showExportToast(`Saved: ${base}_report.json`);
}

/* ── Wire up buttons after DOM is ready ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-new-file').addEventListener('click', promptLoadNewFile);
  document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirm);
  document.getElementById('confirm-ok-btn').addEventListener('click', resetToUpload);
  document.getElementById('confirm-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
  });

  // Export dropdown toggle
  const exportBtn  = document.getElementById('btn-export-toggle');
  const exportDrop = document.getElementById('export-dropdown');
  exportBtn.addEventListener('click', e => {
    e.stopPropagation();
    exportDrop.classList.toggle('open');
  });
  document.addEventListener('click', () => exportDrop.classList.remove('open'));

  document.getElementById('export-csv').addEventListener('click',          () => { exportCSV();         exportDrop.classList.remove('open'); });
  document.getElementById('export-filtered-csv').addEventListener('click', () => { exportFilteredCSV(); exportDrop.classList.remove('open'); });
  document.getElementById('export-json').addEventListener('click',         () => { exportJSON();        exportDrop.classList.remove('open'); });
  document.getElementById('export-report').addEventListener('click',       () => { exportReport();      exportDrop.classList.remove('open'); });
});

/* ═══════════════════════════════════════════════════════════════════
   ZONE 2 · STUDENT 2 — Visualizations + Deep Analysis Engine
   Branch: feature/viz-analysis
═══════════════════════════════════════════════════════════════════ */

window.CHARTS  = {};
window.S2      = {};   // shared state for WB mode

/* ─── PALETTE ─────────────────────────────────────────────────── */
const S2_PALETTE = ['#e8ff47','#47c8ff','#4dffb4','#ff4d6a','#c084fc',
                    '#fb923c','#38bdf8','#f472b6','#a3e635','#fbbf24'];

/* ─── FORMAT HELPERS ──────────────────────────────────────────── */
function fmtBig(n) {
  if (!isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (a >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (a >= 1e3) return (n/1e3).toFixed(1)+'K';
  return (+n).toFixed(2);
}
function fmtStat(n) { return isFinite(n) ? fmtBig(n) : '—'; }
function s2Mean(arr) {
  const c = arr.filter(v => typeof v==='number' && isFinite(v));
  return c.length ? c.reduce((s,v)=>s+v,0)/c.length : 0;
}

/* ─── CHART DESTROY HELPER ────────────────────────────────────── */
function destroyChart(id) {
  if (window.CHARTS[id]) { window.CHARTS[id].destroy(); delete window.CHARTS[id]; }
}

/* ═══════════════════════════════════════════════════════════════
   ENTRY POINT — called by renderDashboard()
═══════════════════════════════════════════════════════════════════ */
function onDataReady(rows, headers) {
  if (!rows || !rows.length || !headers || !headers.length) return;

  // Detect World Bank format: has Country Name, Series Name, year columns
  const h = headers.map(x => x.toLowerCase());
  const isWB = h.some(x => x.includes('country') || x.includes('country name')) &&
               h.some(x => x.includes('series'))  &&
               headers.some(x => /^\d{4}/.test(x));

  document.getElementById('s2-root').style.display = '';

  if (isWB) {
    initWorldBank(rows, headers);
  } else {
    initGeneric(rows, headers);
  }
}

/* ═══════════════════════════════════════════════════════════════
   WORLD BANK MODE
═══════════════════════════════════════════════════════════════════ */

// Aggregate codes to exclude from country pickers
const WB_AGGREGATES = new Set([
  'WLD','LMY','MIC','LMC','UMC','EAS','EAP','TEA','SAS','TSA','SSA','SSF','SSB',
  'LTE','EAR','PRE','PST','ECS','ECA','TEC','LCN','LAC','TLA','MEA','MNA','TMN',
  'NAC','OED','HIC','HPC','IDX','IDA','IBD','IBT','IDB','IDN','LIC','FCS','LDC',
  'ARB','CSS','CEB','EMU','EUU','SFX','OSS','PSS','TSS','AFW','AFE'
]);

// High-priority series to feature prominently
const WB_FEATURED = [
  'Population, total',
  'Life expectancy at birth, total (years)',
  'Fertility rate, total (births per woman)',
  'Urban population (% of total)',
  'Population growth (annual %)',
  'Birth rate, crude (per 1,000 people)',
  'Death rate, crude (per 1,000 people)',
  'Age dependency ratio (% of working-age population)',
];

function initWorldBank(rows, headers) {
  // Year columns (historical only, ≤ current year)
  const yearCols = headers.filter(h => /^\d{4}/.test(h) && parseInt(h) <= 2024);
  const yearLabels = yearCols.map(h => h.slice(0,4));

  // Build lookup: seriesName → { countryCode → [values per year] }
  const lookup = {};
  // Also build: countryCode → countryName
  const countryMap = {};
  // Find header keys (case-insensitive)
  const countryNameKey = headers.find(h => /country.?name/i.test(h)) || headers[0];
  const countryCodeKey = headers.find(h => /country.?code/i.test(h)) || headers[1];
  const seriesNameKey  = headers.find(h => /series.?name/i.test(h))  || headers[2];

  rows.forEach(r => {
    const sName = (r[seriesNameKey] || '').trim();
    const cCode = (r[countryCodeKey] || '').trim();
    const cName = (r[countryNameKey] || '').trim();
    if (!sName || !cCode || !cName) return;
    countryMap[cCode] = cName;
    if (!lookup[sName]) lookup[sName] = {};
    lookup[sName][cCode] = yearCols.map(yc => {
      const raw = r[yc];
      if (typeof raw === 'number' && isFinite(raw)) return raw;
      const v = String(raw ?? '').trim();
      return (v && v !== '..' && v !== 'null') ? parseFloat(v) : null;
    });
  });

  // All individual countries (non-aggregate, 3-letter alpha)
  const allCountries = Object.entries(countryMap)
    .filter(([code]) => /^[A-Z]{3}$/.test(code) && !WB_AGGREGATES.has(code))
    .sort((a,b) => a[1].localeCompare(b[1]));

  // Sorted series list, featured first
  const allSeries = Object.keys(lookup).sort((a,b) => {
    const ai = WB_FEATURED.indexOf(a), bi = WB_FEATURED.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return  1;
    return a.localeCompare(b);
  });

  // Default selection
  const defaultSeries   = allSeries[0] || '';
  const defaultCountries = ['CHN','USA','IND','NGA','BRA'].filter(c => countryMap[c]);

  // Store state
  window.S2.wb = {
    lookup, countryMap, allCountries, allSeries, yearCols, yearLabels,
    selectedSeries: defaultSeries,
    selectedCountries: [...defaultCountries],
    yearStart: 0,
    yearEnd: yearCols.length - 1,
  };

  // Show WB controls
  document.getElementById('wb-controls').style.display = '';
  document.getElementById('s2-section-title').textContent = 'World Bank Population Explorer';

  buildWBControls();
  buildWBKPIs();
  renderWBCharts();
  renderWBAnalysis();
  renderWBInsights();
}

function buildWBControls() {
  const st = window.S2.wb;

  // Series select
  const sel = document.getElementById('wb-series-select');
  sel.innerHTML = st.allSeries.map((s,i) => {
    const isFeatured = WB_FEATURED.includes(s);
    return `<option value="${esc(s)}" ${s===st.selectedSeries?'selected':''} ${isFeatured?'':''}>${esc(s)}</option>`;
  }).join('');
  sel.addEventListener('change', () => {
    st.selectedSeries = sel.value;
    renderWBCharts();
    renderWBAnalysis();
    renderWBInsights();
  });

  // Year range sliders
  const startSlider = document.getElementById('wb-year-start');
  const endSlider   = document.getElementById('wb-year-end');
  const startLbl    = document.getElementById('wb-year-start-lbl');
  const endLbl      = document.getElementById('wb-year-end-lbl');
  startSlider.max = endSlider.max = st.yearCols.length - 1;
  startSlider.value = st.yearStart;
  endSlider.value   = st.yearEnd;
  startLbl.textContent = st.yearLabels[st.yearStart];
  endLbl.textContent   = st.yearLabels[st.yearEnd];

  startSlider.addEventListener('input', () => {
    st.yearStart = Math.min(+startSlider.value, st.yearEnd - 1);
    startSlider.value = st.yearStart;
    startLbl.textContent = st.yearLabels[st.yearStart];
    renderWBCharts(); renderWBAnalysis();
  });
  endSlider.addEventListener('input', () => {
    st.yearEnd = Math.max(+endSlider.value, st.yearStart + 1);
    endSlider.value = st.yearEnd;
    endLbl.textContent = st.yearLabels[st.yearEnd];
    renderWBCharts(); renderWBAnalysis();
  });

  // Preset buttons
  document.querySelectorAll('.wb-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const total = st.yearCols.length - 1;
      st.yearStart = Math.max(0, total - parseInt(btn.dataset.end === '63' ? total : btn.dataset.end === '50' ? 14 : 29));
      if (btn.dataset.start === '0') st.yearStart = 0;
      st.yearEnd = total;
      startSlider.value = st.yearStart; endSlider.value = st.yearEnd;
      startLbl.textContent = st.yearLabels[st.yearStart];
      endLbl.textContent   = st.yearLabels[st.yearEnd];
      renderWBCharts(); renderWBAnalysis();
    });
  });

  // Country chips
  renderCountryChips();

  // Add country button + dropdown
  const addBtn    = document.getElementById('wb-add-country');
  const dropdown  = document.getElementById('wb-country-dropdown');
  let dropdownBuilt = false;

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropdownBuilt) {
      dropdown.innerHTML = `<input class="wb-dropdown-search" placeholder="Search country…" id="wb-dd-search">` +
        st.allCountries.map(([code, name]) =>
          `<div class="wb-dropdown-item" data-code="${esc(code)}">${esc(name)} <span style="color:var(--muted);font-size:9px">${code}</span></div>`
        ).join('');
      dropdownBuilt = true;
      dropdown.querySelector('#wb-dd-search').addEventListener('input', e2 => {
        const q = e2.target.value.toLowerCase();
        dropdown.querySelectorAll('.wb-dropdown-item').forEach(el => {
          el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
      dropdown.querySelectorAll('.wb-dropdown-item').forEach(el => {
        el.addEventListener('click', () => {
          const code = el.dataset.code;
          if (!st.selectedCountries.includes(code)) {
            st.selectedCountries.push(code);
            renderCountryChips();
            renderWBCharts(); renderWBAnalysis(); renderWBInsights();
          }
          dropdown.style.display = 'none';
        });
      });
    }
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    // Position dropdown relative to add button
    const rect = addBtn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top  = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
  });
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });
}

function renderCountryChips() {
  const st = window.S2.wb;
  const container = document.getElementById('wb-country-chips');
  container.innerHTML = st.selectedCountries.map((code, i) => `
    <span class="wb-chip" style="border-color:${S2_PALETTE[i % S2_PALETTE.length]}33; color:${S2_PALETTE[i % S2_PALETTE.length]}">
      ${esc(st.countryMap[code] || code)}
      <span class="wb-chip-x" data-code="${esc(code)}">×</span>
    </span>`).join('');
  container.querySelectorAll('.wb-chip-x').forEach(x => {
    x.addEventListener('click', () => {
      const st = window.S2.wb;
      st.selectedCountries = st.selectedCountries.filter(c => c !== x.dataset.code);
      renderCountryChips();
      renderWBCharts(); renderWBAnalysis(); renderWBInsights();
    });
  });
}

function buildWBKPIs() {
  const st     = window.S2.wb;
  const lookup = st.lookup;

  // World totals for key metrics in most recent available year
  const getWorld = (series) => {
    const d = lookup[series];
    if (!d || !d['WLD']) return null;
    const v = [...d['WLD']].reverse().find(x => x !== null);
    return v ?? null;
  };
  const getWorldYear = (series) => {
    const d = lookup[series];
    if (!d || !d['WLD']) return null;
    const idx = [...d['WLD']].map((v,i)=>[v,i]).reverse().find(([v])=>v!==null)?.[1];
    return idx != null ? st.yearLabels[idx] : null;
  };
  const getWorldPrev = (series, stepsBack=10) => {
    const d = lookup[series];
    if (!d || !d['WLD']) return null;
    const arr = d['WLD'];
    const lastIdx = [...arr].map((v,i)=>[v,i]).reverse().find(([v])=>v!==null)?.[1];
    if (lastIdx == null) return null;
    for (let i = lastIdx - stepsBack; i >= 0; i--) {
      if (arr[i] !== null) return arr[i];
    }
    return null;
  };

  const pop    = getWorld('Population, total');
  const le     = getWorld('Life expectancy at birth, total (years)');
  const fert   = getWorld('Fertility rate, total (births per woman)');
  const urban  = getWorld('Urban population (% of total)');
  const grow   = getWorld('Population growth (annual %)');

  const lePrev   = getWorldPrev('Life expectancy at birth, total (years)', 10);
  const fertPrev = getWorldPrev('Fertility rate, total (births per woman)', 10);
  const popPrev  = getWorldPrev('Population, total', 10);

  function delta(cur, prev) {
    if (cur == null || prev == null) return '';
    const d = cur - prev;
    const cls = d >= 0 ? 'up' : 'down';
    const arr = d >= 0 ? '▲' : '▼';
    return `<span class="kpi-delta ${cls}">${arr} ${fmtBig(Math.abs(d))} vs 10yr ago</span>`;
  }

  const kpis = [
    { label:'World Population', value: pop ? fmtBig(pop) : '—',
      sub: getWorldYear('Population, total') || '', delta: delta(pop, popPrev), color:'#e8ff47' },
    { label:'Life Expectancy', value: le ? le.toFixed(1)+' yrs' : '—',
      sub:'global average', delta: delta(le, lePrev), color:'#4dffb4' },
    { label:'Fertility Rate', value: fert ? fert.toFixed(2)+' births/woman' : '—',
      sub:'global average', delta: delta(fert, fertPrev), color:'#47c8ff' },
    { label:'Urban Population', value: urban ? urban.toFixed(1)+'%' : '—',
      sub:'of total world population', delta:'', color:'#c084fc' },
    { label:'Population Growth', value: grow ? grow.toFixed(3)+'%/yr' : '—',
      sub:'annual rate', delta:'', color:'#fb923c' },
  ];

  document.getElementById('kpi-strip').innerHTML = kpis.map((k,i) => `
    <div class="kpi-card" style="--kpi-color:${k.color}; animation-delay:${i*0.05}s">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
      ${k.delta}
    </div>`).join('');
}

/* Chart.js shared dark-theme defaults */
function wbChartDefaults(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode:'index', intersect:false },
    plugins: {
      legend: { display:false },
      tooltip: {
        backgroundColor:'#13151a', borderColor:'#1f2230', borderWidth:1,
        titleColor:'#e8ff47', bodyColor:'#d8dde8',
        titleFont:{ family:"'Space Mono'", size:11 },
        bodyFont: { family:"'Space Mono'", size:11 },
        padding:10,
      }
    },
    scales: {
      x: {
        title: xLabel ? { display:true, text:xLabel, color:'#6b7494', font:{family:"'Space Mono'",size:10} } : undefined,
        ticks: { color:'#6b7494', font:{family:"'Space Mono'",size:10}, maxTicksLimit:12 },
        grid:  { color:'#1f2230' }
      },
      y: {
        title: yLabel ? { display:true, text:yLabel, color:'#6b7494', font:{family:"'Space Mono'",size:10} } : undefined,
        ticks: { color:'#6b7494', font:{family:"'Space Mono'",size:10},
                 callback: v => fmtBig(v) },
        grid:  { color:'#1f2230' }
      }
    }
  };
}

function renderWBCharts() {
  const st = window.S2.wb;
  const { lookup, selectedCountries, selectedSeries, yearCols, yearLabels, yearStart, yearEnd } = st;
  if (!selectedCountries.length || !selectedSeries) return;

  const seriesData = lookup[selectedSeries] || {};
  const slicedYears = yearLabels.slice(yearStart, yearEnd + 1);

  // ── 1. MAIN: Multi-country time series line chart ──────────────
  destroyChart('barChart');
  const datasets = selectedCountries.map((code, i) => {
    const raw = (seriesData[code] || []).slice(yearStart, yearEnd + 1);
    const color = S2_PALETTE[i % S2_PALETTE.length];
    return {
      label: st.countryMap[code] || code,
      data: raw.map(v => v),
      borderColor: color,
      backgroundColor: color + '18',
      borderWidth: 2.5,
      pointRadius: slicedYears.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      tension: 0.35,
      fill: selectedCountries.length === 1,
      spanGaps: true,
    };
  });

  document.getElementById('barPlaceholder').style.display = 'none';
  document.getElementById('barChart').style.display = 'block';

  const mainOpts = wbChartDefaults('Year', selectedSeries);
  mainOpts.plugins.legend.display = false; // we use custom legend
  mainOpts.interaction = { mode:'index', intersect:false };
  mainOpts.plugins.tooltip.callbacks = {
    label: ctx => ` ${ctx.dataset.label}: ${fmtBig(ctx.parsed.y)}`
  };

  const ctx1 = document.getElementById('barChart').getContext('2d');
  window.CHARTS['barChart'] = new Chart(ctx1, {
    type: 'line',
    data: { labels: slicedYears, datasets },
    options: mainOpts,
  });

  // Update title
  document.getElementById('main-chart-title').textContent = selectedSeries;
  document.getElementById('main-chart-sub').textContent =
    `${slicedYears[0]} – ${slicedYears[slicedYears.length-1]} · hover for values`;

  // Custom legend
  document.getElementById('main-chart-legend').innerHTML = datasets.map(ds => `
    <span class="legend-item">
      <span class="legend-line" style="background:${ds.borderColor}"></span>
      ${esc(ds.label)}
    </span>`).join('');

  // ── 2. BOTTOM-LEFT: Latest-year bar chart (snapshot) ──────────
  destroyChart('scatterChart');
  const latestIdx = yearEnd;
  const snapData = selectedCountries
    .map((code, i) => ({ label: st.countryMap[code] || code, value: (seriesData[code]||[])[latestIdx], color: S2_PALETTE[i%S2_PALETTE.length] }))
    .filter(d => d.value !== null && d.value !== undefined);

  document.getElementById('scatterPlaceholder').style.display = 'none';
  document.getElementById('scatterChart').style.display = 'block';
  document.getElementById('scatter-title').textContent = `${yearLabels[yearEnd]} Snapshot`;
  document.getElementById('scatter-sub').textContent = `Latest available value per country`;

  const ctx2 = document.getElementById('scatterChart').getContext('2d');
  const snapOpts = wbChartDefaults(null, selectedSeries);
  snapOpts.indexAxis = 'y';
  snapOpts.interaction = { mode:'index', intersect:true };
  snapOpts.plugins.tooltip.callbacks = {
    label: ctx => ` ${fmtBig(ctx.parsed.x)}`
  };
  snapOpts.scales.x.ticks.maxTicksLimit = 6;
  snapOpts.scales.y.ticks.callback = undefined;
  // Annotation: best country
  window.CHARTS['scatterChart'] = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: snapData.map(d => d.label.length > 18 ? d.label.slice(0,16)+'…' : d.label),
      datasets: [{
        data: snapData.map(d => d.value),
        backgroundColor: snapData.map(d => d.color + 'cc'),
        borderColor:     snapData.map(d => d.color),
        borderWidth: 1, borderRadius: 4,
      }]
    },
    options: snapOpts,
  });

  // ── 3. BOTTOM-RIGHT: Trend comparison doughnut ─────────────────
  destroyChart('doughnutChart');
  // Show share of latest value among selected countries
  const total = snapData.reduce((s,d)=>s+(d.value||0),0);
  const hasShare = total > 0 && snapData.length > 1;

  document.getElementById('doughnutPlaceholder').style.display = 'none';
  document.getElementById('doughnutChart').style.display = 'block';
  document.getElementById('doughnut-title').textContent = hasShare ? `Share of Total` : `Value Distribution`;
  document.getElementById('doughnut-sub').textContent = `${yearLabels[yearEnd]} · selected countries`;

  const ctx3 = document.getElementById('doughnutChart').getContext('2d');
  window.CHARTS['doughnutChart'] = new Chart(ctx3, {
    type: hasShare ? 'doughnut' : 'bar',
    data: {
      labels: snapData.map(d => d.label),
      datasets: [{
        data: snapData.map(d => d.value),
        backgroundColor: snapData.map(d => d.color + 'cc'),
        borderColor:     snapData.map(d => d.color),
        borderWidth: 2,
        ...(hasShare ? { cutout:'58%' } : { borderRadius:4 }),
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins: {
        legend: { labels:{ color:'#6b7494', font:{family:"'Space Mono'",size:10}, boxWidth:10 } },
        tooltip: {
          backgroundColor:'#13151a', borderColor:'#1f2230', borderWidth:1,
          titleColor:'#e8ff47', bodyColor:'#d8dde8',
          titleFont:{family:"'Space Mono'",size:11}, bodyFont:{family:"'Space Mono'",size:11},
          callbacks: {
            label: ctx => {
              const v = ctx.parsed ?? ctx.raw;
              const val = hasShare ? ctx.parsed : ctx.parsed.y ?? ctx.parsed;
              const pct = total > 0 ? ((ctx.parsed/total)*100).toFixed(1)+'%' : '';
              return ` ${fmtBig(ctx.parsed)}${hasShare ? ' ('+pct+')' : ''}`;
            }
          }
        }
      },
      cutout: hasShare ? '58%' : undefined,
      ...(hasShare ? {} : { scales: { x:{ ticks:{color:'#6b7494', font:{family:"'Space Mono'",size:10}}, grid:{color:'#1f2230'} }, y:{ ticks:{color:'#6b7494', font:{family:"'Space Mono'",size:10}, callback:v=>fmtBig(v)}, grid:{color:'#1f2230'} } } })
    }
  });
}

function renderWBAnalysis() {
  const st = window.S2.wb;
  const { lookup, selectedCountries, selectedSeries, yearCols, yearLabels, yearStart, yearEnd } = st;
  if (!selectedCountries.length) return;

  const seriesData = lookup[selectedSeries] || {};

  // Flatten values of first country in selected range
  const code0 = selectedCountries[0];
  const vals0 = (seriesData[code0] || []).slice(yearStart, yearEnd+1).filter(v => v !== null && isFinite(v));

  const minV = vals0.length ? Math.min(...vals0) : 0;
  const maxV = vals0.length ? Math.max(...vals0) : 0;
  const varV = variance(vals0);
  const sdV  = stdDev(vals0);

  document.getElementById('an').textContent       = vals0.length;
  document.getElementById('aMin').textContent      = fmtStat(minV);
  document.getElementById('aMax').textContent      = fmtStat(maxV);
  document.getElementById('aRange').textContent    = fmtStat(maxV - minV);
  document.getElementById('aVariance').textContent = fmtStat(varV);
  document.getElementById('aStdDev').textContent   = fmtStat(sdV);
  const descTitle = document.getElementById('desc-tile-title');
  if (descTitle) descTitle.textContent = `Stats · ${st.countryMap[code0]||code0}`;
  const kMin = document.getElementById('k-min'); if(kMin) kMin.textContent = `Min (${yearLabels[yearStart]})`;
  const kMax = document.getElementById('k-max'); if(kMax) kMax.textContent = `Max (${yearLabels[yearStart]}–${yearLabels[yearEnd]})`;

  // Correlation: year index vs value (trend direction)
  if (vals0.length >= 3) {
    const xs = vals0.map((_,i) => i);
    const r1 = pearsonCorr(xs, vals0);
    const reg = linearRegression(xs, vals0);
    const r2 = vals0.length > 1 ? pearsonCorr(vals0.slice(0,-1), vals0.slice(1)) : 0;

    const kR1 = document.getElementById('k-r1'); if(kR1) kR1.textContent = 'Trend r (year→value)';
    const kR2 = document.getElementById('k-r2'); if(kR2) kR2.textContent = 'Autocorr (lag-1)';
    document.getElementById('rPearson').textContent  = r1.toFixed(4);
    document.getElementById('rInterp').textContent   = interpCorr(r1);
    document.getElementById('rPearson2').textContent = r2.toFixed(4);
    document.getElementById('rInterp2').textContent  = interpCorr(r2);
    document.getElementById('rStronger').textContent = Math.abs(r1) > 0.5 ? 'Time trend' : 'No strong trend';
    document.getElementById('rDirection').textContent = r1 > 0 ? 'Upward over time' : 'Downward over time';

    document.getElementById('regEquation').textContent  = `y = ${reg.slope.toFixed(4)}·t + ${reg.intercept.toFixed(2)}`;
    document.getElementById('regSlope').textContent     = reg.slope.toFixed(4);
    document.getElementById('regIntercept').textContent = fmtStat(reg.intercept);
    document.getElementById('regR2').textContent        = reg.rSquared.toFixed(4);
    document.getElementById('regInterp').textContent    = reg.rSquared >= 0.9 ? 'Excellent fit' : reg.rSquared >= 0.7 ? 'Good fit' : 'Moderate fit';
    const midT = Math.round(vals0.length / 2);
    document.getElementById('regPredict').textContent   = fmtStat(reg.slope * midT + reg.intercept) + ` (t=${midT})`;
    const kPred = document.getElementById('k-predict'); if(kPred) kPred.textContent = 'Predicted @midpoint';
  }
}

function renderWBInsights() {
  const st = window.S2.wb;
  const { lookup, selectedCountries, selectedSeries, yearLabels, yearStart, yearEnd } = st;
  if (!selectedCountries.length) return;

  const seriesData = lookup[selectedSeries] || {};
  const latest = yearLabels[yearEnd];
  const earliest = yearLabels[yearStart];

  // Per-country change summary
  const summaries = selectedCountries.slice(0,5).map((code, i) => {
    const arr  = (seriesData[code] || []).slice(yearStart, yearEnd+1);
    const start = arr.find(v => v !== null);
    const end   = [...arr].reverse().find(v => v !== null);
    if (start == null || end == null) return null;
    const change = end - start;
    const pct    = ((change / Math.abs(start)) * 100).toFixed(1);
    const dir    = change >= 0 ? 'increased' : 'decreased';
    const color  = S2_PALETTE[i % S2_PALETTE.length];
    return `<span style="color:${color}">${esc(st.countryMap[code]||code)}</span>: `+
      `${dir} from <strong>${fmtBig(start)}</strong> to <strong>${fmtBig(end)}</strong> `+
      `(${change>=0?'+':''}${fmtBig(change)}, ${change>=0?'+':''}${pct}%)`;
  }).filter(Boolean);

  const worldVal = (() => {
    const d = lookup[selectedSeries];
    if (!d || !d['WLD']) return null;
    return [...(d['WLD']||[])].reverse().find(v => v !== null);
  })();

  let html = `<p class="insight-text">`;
  html += `<strong>${esc(selectedSeries)}</strong> trends from `;
  html += `<span class="highlight">${earliest}</span> to <span class="highlight">${latest}</span>`;
  if (worldVal !== null) html += ` · World: <span class="highlight">${fmtBig(worldVal)}</span>`;
  html += `.<br><br>`;
  if (summaries.length) {
    html += summaries.join('<br>');
  }
  // Quick insight for well-known series
  if (selectedSeries.includes('Life expectancy')) {
    html += `<br><br><em style="color:var(--muted)">Life expectancy has risen globally due to improvements in medicine, sanitation, and nutrition.</em>`;
  } else if (selectedSeries.includes('Fertility')) {
    html += `<br><br><em style="color:var(--muted)">Fertility rates have declined in most countries as education levels and urbanization increased.</em>`;
  } else if (selectedSeries.includes('Urban')) {
    html += `<br><br><em style="color:var(--muted)">Urbanization continues globally — over half the world's population now lives in cities.</em>`;
  } else if (selectedSeries.includes('Population, total')) {
    html += `<br><br><em style="color:var(--muted)">World population growth has been slowing since its 1960s peak, but absolute numbers continue to rise.</em>`;
  }
  html += `</p>`;

  document.getElementById('insightsBody').innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   GENERIC CSV MODE (student dataset + any other CSV)
═══════════════════════════════════════════════════════════════════ */

function initGeneric(rows, headers) {
  document.getElementById('wb-controls').style.display = 'none';
  document.getElementById('s2-section-title').textContent = 'Data Insights';

  function isNumericCol(col) {
    const s = rows.slice(0,200).map(r=>r[col]).filter(v=>v!==null&&v!==undefined&&v!=='');
    return s.length > 0 && s.filter(v=>typeof v==='number'&&isFinite(v)).length/s.length > 0.5;
  }
  function isStringCol(col) {
    const s = rows.slice(0,50).map(r=>r[col]).filter(v=>v!==null&&v!==undefined&&v!=='');
    return s.length > 0 && s.filter(v=>typeof v==='string'&&v.trim()!=='').length/s.length > 0.6;
  }
  const numCols = headers.filter(isNumericCol);
  const strCols = headers.filter(isStringCol);
  if (!numCols.length) return;

  const lower = headers.map(h=>({h, l:h.toLowerCase()}));
  const find = (...hints) => { for(const hint of hints){ const m=lower.find(({l})=>numCols.map(x=>x.toLowerCase()).includes(l) && l.includes(hint)); if(m) return m.h; } return null; };
  const scoreCol  = lower.find(({l})=>l.includes('score')||l.includes('final')||l.includes('mark'))?.h || numCols[0];
  const studyCol  = lower.find(({l})=>l.includes('study')||l.includes('hour')||l.includes('hrs'))?.h  || numCols[1]||numCols[0];
  const attendCol = lower.find(({l})=>l.includes('attend'))?.h || numCols[2]||numCols[0];
  const gradeCol  = lower.find(({l})=>l==='grade'||l==='letter')?.h || null;
  const nameCol   = lower.find(({l})=>l.includes('name')||l.includes('student'))?.h || strCols[0]||headers[0];

  const adapted = rows.map(r => ({
    name: String(r[nameCol]??'').trim()||'(no name)',
    score: +r[scoreCol]||0, studyHours: +r[studyCol]||0,
    attendance: +r[attendCol]||0,
    grade: gradeCol ? String(r[gradeCol]||'').toUpperCase()[0] : deriveGrade(+r[scoreCol]||0),
    job: false,
  })).filter(r => isFinite(r.score));

  window.S2_DATA = adapted;
  window.S2_COLS = { scoreCol, studyCol, attendCol, gradeCol, nameCol, isStudentMode: true };

  // KPI strip
  const scores = adapted.map(d=>d.score);
  const passRate = Math.round(adapted.filter(d=>d.score>=60).length/adapted.length*100);
  const kpis = [
    { label:'Students', value:adapted.length, sub:'total records', color:'#e8ff47' },
    { label:'Mean Score', value:s2Mean(scores).toFixed(1), sub:'out of 100', color:'#4dffb4' },
    { label:'Pass Rate', value:passRate+'%', sub:'score ≥ 60', color: passRate>=75?'#4dffb4':passRate>=50?'#e8ff47':'#ff4d6a' },
    { label:'Top Score', value:Math.max(...scores), sub:adapted.sort((a,b)=>b.score-a.score)[0]?.name||'', color:'#47c8ff' },
    { label:'Avg Study Hrs', value:s2Mean(adapted.map(d=>d.studyHours)).toFixed(1), sub:'hrs/week', color:'#c084fc' },
  ];
  document.getElementById('kpi-strip').innerHTML = kpis.map((k,i)=>`
    <div class="kpi-card" style="--kpi-color:${k.color};animation-delay:${i*0.05}s">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  document.getElementById('main-chart-title').textContent = 'Top 10 — Final Scores';
  document.getElementById('main-chart-sub').textContent   = 'Sorted descending · hover for detail';
  document.getElementById('scatter-title').textContent    = 'Attendance vs Score';
  document.getElementById('scatter-sub').textContent      = 'With regression line overlay';
  document.getElementById('doughnut-title').textContent   = 'Grade Distribution';
  document.getElementById('doughnut-sub').textContent     = 'A / B / C / D breakdown';

  drawBarChart('barChart', adapted);
  drawScatterPlot('scatterChart', adapted);
  drawDoughnut('doughnutChart', adapted);
  renderAnalysis(adapted, scoreCol, studyCol, attendCol, true);
  renderInsights(adapted, scoreCol, studyCol, attendCol, true);
}

function deriveGrade(score) {
  if (score>=90) return 'A'; if (score>=75) return 'B'; if (score>=60) return 'C'; return 'D';
}

/* ── STUDENT CHART FUNCTIONS ──────────────────────────────────── */
function drawBarChart(canvasId, data) {
  const top10 = [...data].sort((a,b)=>b.score-a.score).slice(0,10);
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  window.CHARTS[canvasId] = new Chart(ctx, {
    type:'bar',
    data:{ labels:top10.map(d=>d.name.length>22?d.name.slice(0,20)+'…':d.name),
      datasets:[{ label:'Score', data:top10.map(d=>d.score),
        backgroundColor:'rgba(232,255,71,0.75)', borderColor:'rgba(232,255,71,1)',
        borderWidth:1, borderRadius:4 }] },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      indexAxis:'y',
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#13151a', borderColor:'#1f2230', borderWidth:1,
          titleColor:'#e8ff47', bodyColor:'#d8dde8',
          titleFont:{family:"'Space Mono'",size:11}, bodyFont:{family:"'Space Mono'",size:11},
          padding:10,
          callbacks:{
            title:items=>`#${items[0].dataIndex+1} — ${top10[items[0].dataIndex]?.name||''}`,
            label:c=>` Score: ${c.parsed.x}  (Grade ${deriveGrade(c.parsed.x)})`
          }
        }
      },
      scales:{
        x:{
          min:0, max:100,
          title:{ display:true, text:'Final Score', color:'#6b7494', font:{family:"'Space Mono'",size:10} },
          ticks:{color:'#6b7494',font:{family:"'Space Mono'",size:10}},
          grid:{color:'#1f2230'}
        },
        y:{
          ticks:{color:'#d8dde8',font:{family:"'Space Mono'",size:11}},
          grid:{color:'rgba(31,34,48,0.5)'}
        }
      }
    }
  });
  document.getElementById('barPlaceholder').style.display='none';
  document.getElementById(canvasId).style.display='block';
}

function drawScatterPlot(canvasId, data) {
  const valid = data.filter(d=>isFinite(d.attendance)&&isFinite(d.score));
  if (!valid.length) { document.getElementById('scatterPlaceholder').textContent='No valid data.'; return; }
  destroyChart(canvasId);
  const reg = linearRegression(valid.map(d=>d.attendance), valid.map(d=>d.score));
  const xv = valid.map(d=>d.attendance);
  const xMin=Math.min(...xv), xMax=Math.max(...xv);
  const regLine=[{x:xMin,y:reg.slope*xMin+reg.intercept},{x:xMax,y:reg.slope*xMax+reg.intercept}];
  const ctx = document.getElementById(canvasId).getContext('2d');
  window.CHARTS[canvasId] = new Chart(ctx,{
    type:'scatter',
    data:{ datasets:[
      { label:'Students', data:valid.map(d=>({x:d.attendance,y:d.score,name:d.name})),
        backgroundColor:'rgba(71,200,255,0.65)', borderColor:'#47c8ff',
        pointRadius:5, pointHoverRadius:8, pointBorderWidth:1, pointBorderColor:'rgba(71,200,255,0.9)' },
      { label:`Regression (R²=${reg.rSquared})`, data:regLine, type:'line',
        borderColor:'#e8ff47', borderWidth:2,
        borderDash:[6,4], pointRadius:0, fill:false, tension:0, spanGaps:true }
    ]},
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{
        legend:{ labels:{color:'#6b7494',font:{family:"'Space Mono'",size:10},
          generateLabels(chart) {
            return chart.data.datasets.map((ds,i) => ({
              text: ds.label, fillStyle: ds.borderColor,
              strokeStyle: ds.borderColor, lineWidth: i===1 ? 2 : 0,
              hidden: false, index: i,
              pointStyle: i===0 ? 'circle' : 'line',
            }));
          }
        }},
        tooltip:{
          backgroundColor:'#13151a', borderColor:'#1f2230', borderWidth:1,
          titleColor:'#e8ff47', bodyColor:'#d8dde8',
          titleFont:{family:"'Space Mono'",size:11}, bodyFont:{family:"'Space Mono'",size:11},
          padding:10,
          filter:item=>item.datasetIndex===0,
          callbacks:{
            title:items=>{ const pt=valid[items[0].dataIndex]; return pt?.name||'Student'; },
            label:c=>` Score: ${c.parsed.y}  |  Attendance: ${c.parsed.x}%`
          }
        }
      },
      scales:{
        x:{
          title:{display:true,text:'Attendance (%)',color:'#6b7494',font:{family:"'Space Mono'",size:10}},
          min:0, max:100,
          ticks:{color:'#6b7494',font:{family:"'Space Mono'",size:10}},
          grid:{color:'#1f2230'}
        },
        y:{
          title:{display:true,text:'Final Score',color:'#6b7494',font:{family:"'Space Mono'",size:10}},
          min:0, max:100,
          ticks:{color:'#6b7494',font:{family:"'Space Mono'",size:10}},
          grid:{color:'#1f2230'}
        }
      }
    }
  });
  document.getElementById('scatterPlaceholder').style.display='none';
  document.getElementById(canvasId).style.display='block';
  // Update subtitle with point count and R²
  document.getElementById('scatter-sub').textContent =
    `${valid.length} students · R²=${reg.rSquared} · r=${pearsonCorr(valid.map(d=>d.attendance),valid.map(d=>d.score)).toFixed(3)}`;
}

function drawDoughnut(canvasId, data) {
  destroyChart(canvasId);
  const gc={A:0,B:0,C:0,D:0};
  data.forEach(d=>{ const g=d.grade?.toString().toUpperCase()[0]; if(gc[g]!==undefined) gc[g]++; });
  const total = data.length;
  const grades = ['A','B','C','D'];
  const colors = ['#4dffb4','#47c8ff','#e8ff47','#ff4d6a'];
  const ctx = document.getElementById(canvasId).getContext('2d');
  window.CHARTS[canvasId] = new Chart(ctx,{
    type:'doughnut',
    data:{ labels:grades.map(g=>`${g} (${gc[g]})`), datasets:[{
      data:[gc.A,gc.B,gc.C,gc.D], backgroundColor:colors.map(c=>c+'cc'),
      borderColor:colors, borderWidth:2, hoverBorderWidth:3,
      hoverOffset:6 }] },
    options:{
      cutout:'62%', responsive:true, maintainAspectRatio:true,
      animation:{ animateRotate:true, animateScale:true },
      plugins:{
        legend:{
          position:'bottom',
          labels:{color:'#d8dde8',font:{family:"'Space Mono'",size:10},
            padding:16, boxWidth:12, usePointStyle:true, pointStyle:'circle'}
        },
        tooltip:{
          backgroundColor:'#13151a', borderColor:'#1f2230', borderWidth:1,
          titleColor:'#e8ff47', bodyColor:'#d8dde8',
          titleFont:{family:"'Space Mono'",size:11}, bodyFont:{family:"'Space Mono'",size:11},
          padding:10,
          callbacks:{
            title:items=>`Grade ${grades[items[0].dataIndex]}`,
            label:c=>` ${c.raw} students — ${((c.raw/total)*100).toFixed(1)}%`
          }
        }
      }
    }
  });
  document.getElementById('doughnutPlaceholder').style.display='none';
  document.getElementById(canvasId).style.display='block';
  document.getElementById('doughnut-sub').textContent = `${total} students · A/B/C/D breakdown`;
}

/* ── STATS FUNCTIONS ──────────────────────────────────────────── */
function variance(arr) {
  const c=arr.filter(v=>typeof v==='number'&&isFinite(v));
  if(!c.length) return 0;
  const mu=s2Mean(c);
  return Math.round((c.reduce((s,x)=>s+(x-mu)**2,0)/c.length)*100)/100;
}
function stdDev(arr) { return Math.round(Math.sqrt(variance(arr))*100)/100; }
function pearsonCorr(x,y) {
  const pairs=x.map((v,i)=>[v,y[i]]).filter(([a,b])=>typeof a==='number'&&isFinite(a)&&typeof b==='number'&&isFinite(b));
  if(pairs.length<2) return 0;
  const px=pairs.map(p=>p[0]),py=pairs.map(p=>p[1]);
  const mx=s2Mean(px),my=s2Mean(py);
  let num=0,dX=0,dY=0;
  for(const [a,b] of pairs){ const dx=a-mx,dy=b-my; num+=dx*dy; dX+=dx*dx; dY+=dy*dy; }
  const d=Math.sqrt(dX*dY); if(!d) return 0;
  return Math.round((num/d)*10000)/10000;
}
function linearRegression(x,y) {
  const pairs=x.map((v,i)=>[v,y[i]]).filter(([a,b])=>typeof a==='number'&&isFinite(a)&&typeof b==='number'&&isFinite(b));
  if(pairs.length<2) return{slope:0,intercept:0,rSquared:0};
  const px=pairs.map(p=>p[0]),py=pairs.map(p=>p[1]);
  const mx=s2Mean(px),my=s2Mean(py);
  let num=0,den=0;
  for(const [a,b] of pairs){ num+=(a-mx)*(b-my); den+=(a-mx)**2; }
  if(!den) return{slope:0,intercept:Math.round(my*10000)/10000,rSquared:0};
  const slope=Math.round((num/den)*10000)/10000;
  const intercept=Math.round((my-slope*mx)*10000)/10000;
  const r=pearsonCorr(px,py);
  return{slope,intercept,rSquared:Math.round(r**2*10000)/10000};
}
function interpCorr(r) {
  const s=Math.abs(r)>=0.7?'Strong':Math.abs(r)>=0.4?'Moderate':'Weak';
  return `${s} ${r>0?'Positive':'Negative'}`;
}

/* ── STUDENT ANALYSIS / INSIGHTS ─────────────────────────────── */
function renderAnalysis(data, primaryCol, studyCol, attendCol, isStudentMode) {
  const scores=data.map(d=>d.score).filter(isFinite);
  document.getElementById('an').textContent       = data.length;
  document.getElementById('aMin').textContent     = fmtStat(Math.min(...scores));
  document.getElementById('aMax').textContent     = fmtStat(Math.max(...scores));
  document.getElementById('aRange').textContent   = fmtStat(Math.max(...scores)-Math.min(...scores));
  document.getElementById('aVariance').textContent= fmtStat(variance(scores));
  document.getElementById('aStdDev').textContent  = fmtStat(stdDev(scores));
  const kMin=document.getElementById('k-min'); if(kMin) kMin.textContent='Min score';
  const kMax=document.getElementById('k-max'); if(kMax) kMax.textContent='Max score';
  const r1=pearsonCorr(data.filter(d=>d.studyHours).map(d=>d.studyHours),data.filter(d=>d.studyHours).map(d=>d.score));
  const r2=pearsonCorr(data.filter(d=>d.attendance).map(d=>d.attendance),data.filter(d=>d.attendance).map(d=>d.score));
  const kR1=document.getElementById('k-r1'); if(kR1) kR1.textContent=`r (study hrs→score)`;
  const kR2=document.getElementById('k-r2'); if(kR2) kR2.textContent=`r (attendance→score)`;
  document.getElementById('rPearson').textContent =r1.toFixed(4);
  document.getElementById('rInterp').textContent  =interpCorr(r1);
  document.getElementById('rPearson2').textContent=r2.toFixed(4);
  document.getElementById('rInterp2').textContent =interpCorr(r2);
  document.getElementById('rStronger').textContent=Math.abs(r1)>=Math.abs(r2)?'Study Hours':'Attendance';
  document.getElementById('rDirection').textContent=r1>0&&r2>0?'Both positive':r1<0&&r2<0?'Both negative':'Mixed';
  const rp=data.filter(d=>d.studyHours);
  const reg=linearRegression(rp.map(d=>d.studyHours),rp.map(d=>d.score));
  document.getElementById('regEquation').textContent =`score = ${reg.slope}·hrs + ${reg.intercept}`;
  document.getElementById('regSlope').textContent    =reg.slope;
  document.getElementById('regIntercept').textContent=reg.intercept;
  document.getElementById('regR2').textContent       =reg.rSquared;
  document.getElementById('regInterp').textContent   =reg.rSquared>=0.9?'Excellent fit':reg.rSquared>=0.7?'Good fit':'Moderate fit';
  document.getElementById('regPredict').textContent  =fmtStat(reg.slope*15+reg.intercept);
  const kPred=document.getElementById('k-predict'); if(kPred) kPred.textContent='Predicted @15 hrs';
}

function renderInsights(data, primaryCol) {
  const scores=data.map(d=>d.score).filter(isFinite);
  const passRate=Math.round(data.filter(d=>d.score>=60).length/data.length*100);
  const r1=pearsonCorr(data.filter(d=>d.studyHours).map(d=>d.studyHours),data.filter(d=>d.studyHours).map(d=>d.score));
  const r2=pearsonCorr(data.filter(d=>d.attendance).map(d=>d.attendance),data.filter(d=>d.attendance).map(d=>d.score));
  const stronger=Math.abs(r1)>=Math.abs(r2)?'study hours':'attendance';
  const strongerR=Math.abs(r1)>=Math.abs(r2)?r1:r2;
  const rp=data.filter(d=>d.studyHours);
  const reg=linearRegression(rp.map(d=>d.studyHours),rp.map(d=>d.score));

  /* ── Group-gap analysis: male vs female life expectancy ──────────
     Mirrors the reference's job-gap insight (two groups, same metric,
     compute the mean per group and report the difference).
     Uses the raw DS rows to find the two Life Expectancy series
     and computes the most-recent world average for each.             */
  let maleLE = null, femaleLE = null, leGap = null, leGapNote = '';
  try {
    const rawRows = window.DS && window.DS.rows ? window.DS.rows : [];
    const yearCols = window.DS && window.DS.headers
      ? window.DS.headers.filter(h => /^\d{4}/.test(h) && parseInt(h) <= 2024)
      : [];

    function latestWorld(seriesName) {
      const row = rawRows.find(r =>
        (r['Series Name'] || '').trim() === seriesName &&
        (r['Country Code'] || '').trim() === 'WLD'
      );
      if (!row) return null;
      for (let i = yearCols.length - 1; i >= 0; i--) {
        const v = row[yearCols[i]];
        const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').trim());
        if (isFinite(n)) return Math.round(n * 100) / 100;
      }
      return null;
    }

    maleLE   = latestWorld('Life expectancy at birth, male (years)');
    femaleLE = latestWorld('Life expectancy at birth, female (years)');

    if (maleLE !== null && femaleLE !== null) {
      leGap = Math.round(Math.abs(femaleLE - maleLE) * 100) / 100;
      const higher = femaleLE >= maleLE ? 'female' : 'male';
      const lower  = femaleLE >= maleLE ? 'male' : 'female';
      leGapNote = `
        <br><br>
        A gender gap also emerges in life expectancy: <span class="highlight">${higher}</span>
        life expectancy averages <span class="highlight">${Math.max(maleLE, femaleLE)} yrs</span>
        globally, compared to <span class="highlight">${Math.min(maleLE, femaleLE)} yrs</span>
        for <span class="highlight">${lower}</span> — a gap of
        <span class="highlight">${leGap} years</span>,
        indicating that biological sex is a meaningful factor in population longevity outcomes.`;
    }
  } catch(e) { leGapNote = ''; }

  document.getElementById('insightsBody').innerHTML=`<p class="insight-text">
    <strong>${data.length}</strong> records loaded. Mean score: <span class="highlight">${fmtStat(s2Mean(scores))}</span>
    (σ = <span class="highlight">${fmtStat(stdDev(scores))}</span>). Pass rate: <span class="highlight">${passRate}%</span>.
    <br><br>
    <span class="highlight">${stronger}</span> is the stronger predictor (r = <span class="highlight">${strongerR}</span>).
    Regression: score = <span class="highlight">${reg.slope}</span>·hrs + <span class="highlight">${reg.intercept}</span>
    (R² = <span class="highlight">${reg.rSquared}</span>).
    A student studying <span class="highlight">15 hrs/week</span> is predicted to score
    <span class="highlight">${fmtStat(reg.slope*15+reg.intercept)}</span>.
    ${leGapNote}
  </p>`;
}

/* ══ END STUDENT 2 CONTRIBUTION ZONE ══ */

