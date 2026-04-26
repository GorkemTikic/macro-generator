import ExcelJS from 'exceljs';

// ---------------------------------------------------------------------------
// Types — mirror /admin/export response
// ---------------------------------------------------------------------------

export interface ExportPayload {
  range: { since: number; until: number };
  overview: {
    total_events: number;
    total_sessions: number;
    unique_devices: number;
    unique_ips: number;
    unique_countries: number;
  } | null;
  today_sessions: number;
  tabUsage:       Array<{ tab: string; count: number }>;
  topMacros:      Array<{ macro_type: string | null; count: number }>;
  topSymbols:     Array<{ symbol: string | null; count: number }>;
  lookupModes:    Array<{ mode: string | null; count: number }>;
  fundingSymbols: Array<{ symbol: string | null; count: number }>;
  countries:      Array<{ country: string; sessions: number }>;
  daily:          Array<{ day: string; sessions: number; events: number }>;
  errors:         Array<{ event_type: string; tab: string; props: string; ts: number }>;
  devices: Array<{
    device_id: string; country: string;
    total_events: number; sessions: number;
    first_seen: number; last_seen: number;
  }>;
  events: Array<{
    id: number; event_type: string; session_id: string; device_id: string;
    country: string; tab: string; props: string; ts: number;
  }>;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtTime = (ts: number) =>
  ts ? new Date(ts).toISOString().slice(0, 19).replace('T', ' ') : '';

const fmtDate = (ts: number) =>
  ts ? new Date(ts).toISOString().slice(0, 10) : '';

function parseProps(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try { const o = JSON.parse(raw); return (o && typeof o === 'object') ? o : {}; }
  catch { return {}; }
}

function propsHuman(raw: string): string {
  const o = parseProps(raw);
  const entries = Object.entries(o);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}: ${v ?? ''}`).join(' · ');
}

const EVENT_LABEL: Record<string, string> = {
  page_view:             'Opened the app',
  tab_switch:            'Switched tab',
  lang_switch:           'Changed language',
  macro_generated:       'Generated macro',
  macro_error:           'Macro generation failed',
  grid_paste_used:       'Pasted grid data',
  lookup_query:          'Ran price lookup',
  lookup_error:          'Lookup failed',
  trailing_stop_checked: 'Checked trailing stop',
  funding_query:         'Checked funding',
  funding_error:         'Funding lookup failed',
  average_calc_run:      'Used average calculator',
  margin_view:           'Viewed margin restrictions',
  margin_refresh:        'Refreshed margin data',
  margin_error:          'Margin lookup failed',
  error:                 'Reported an error',
};

function humanEvent(t: string): string {
  return EVENT_LABEL[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function keyDetails(eventType: string, raw: string): string {
  const p = parseProps(raw);
  const parts: string[] = [];
  if (p.symbol)     parts.push(String(p.symbol));
  if (p.macro_type) parts.push(String(p.macro_type));
  if (p.mode)       parts.push(String(p.mode));
  if (p.from && p.to) parts.push(`${p.from} → ${p.to}`);
  if (p.lang)       parts.push(`lang=${p.lang}`);
  if (p.message)    parts.push(String(p.message).slice(0, 80));
  if (parts.length === 0 && eventType.includes('error') && p.error) parts.push(String(p.error).slice(0, 80));
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true, color: { argb: 'FFFFFFFF' }, size: 11,
};
const KPI_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' },
};
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 16, color: { argb: 'FF111827' } };
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: 'FF111827' } };
const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' },
};
const ZEBRA_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 20;
  row.eachCell(c => { c.border = THIN_BORDER; });
}

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

function buildSummary(wb: ExcelJS.Workbook, data: ExportPayload, rangeLabel: string) {
  const ws = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { width: 32 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 32 },
  ];

  const ov = data.overview ?? {
    total_events: 0, total_sessions: 0, unique_devices: 0, unique_ips: 0, unique_countries: 0,
  };

  // Title
  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = 'FD Macro Generator — Analytics Summary';
  title.font = TITLE_FONT;
  title.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:E2');
  const sub = ws.getCell('A2');
  sub.value = `Period: ${rangeLabel}   ·   Generated: ${fmtTime(Date.now())} UTC`;
  sub.font = { italic: true, color: { argb: 'FF6B7280' } };

  // KPI grid
  let r = 4;
  ws.getCell(`A${r}`).value = 'Headline Metrics';
  ws.getCell(`A${r}`).font = SECTION_FONT;
  ws.mergeCells(`A${r}:E${r}`);
  ws.getRow(r).fill = SECTION_FILL;
  r++;

  const kpis: Array<[string, number | string]> = [
    ['Total Events',                        ov.total_events],
    ['Total Sessions',                      ov.total_sessions],
    ['Estimated Users (unique devices)',    ov.unique_devices],
    ['Unique IPs (hashed)',                 ov.unique_ips],
    ['Countries Reached',                   ov.unique_countries],
    ['Sessions in last 24h',                data.today_sessions],
    ['Events per Session (avg)',            ov.total_sessions > 0 ? +(ov.total_events / ov.total_sessions).toFixed(2) : 0],
    ['Sessions per Device (avg)',           ov.unique_devices > 0 ? +(ov.total_sessions / ov.unique_devices).toFixed(2) : 0],
    ['Total Errors',                        data.errors.length],
    ['Error Rate',                          ov.total_events > 0 ? `${((data.errors.length / ov.total_events) * 100).toFixed(2)}%` : '0.00%'],
  ];
  for (const [label, val] of kpis) {
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`B${r}`).value = val;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`B${r}`).font = { size: 12, color: { argb: 'FF1D4ED8' }, bold: true };
    ws.getCell(`A${r}`).fill = KPI_FILL;
    ws.getCell(`B${r}`).fill = KPI_FILL;
    ws.getCell(`A${r}`).border = THIN_BORDER;
    ws.getCell(`B${r}`).border = THIN_BORDER;
    r++;
  }

  r++;
  // Side-by-side breakdowns
  function addBreakdown(startCol: 'A' | 'C', startRow: number, title: string, rows: Array<[string, number]>): number {
    const valCol = startCol === 'A' ? 'B' : 'D';
    ws.getCell(`${startCol}${startRow}`).value = title;
    ws.getCell(`${startCol}${startRow}`).font = SECTION_FONT;
    ws.mergeCells(`${startCol}${startRow}:${valCol}${startRow}`);
    ws.getCell(`${startCol}${startRow}`).fill = SECTION_FILL;
    let rr = startRow + 1;
    const hdr = ws.getRow(rr);
    hdr.getCell(startCol).value = 'Item';
    hdr.getCell(valCol).value   = 'Count';
    hdr.getCell(startCol).font = HEADER_FONT;
    hdr.getCell(valCol).font   = HEADER_FONT;
    hdr.getCell(startCol).fill = HEADER_FILL;
    hdr.getCell(valCol).fill   = HEADER_FILL;
    hdr.getCell(startCol).border = THIN_BORDER;
    hdr.getCell(valCol).border   = THIN_BORDER;
    rr++;
    if (rows.length === 0) {
      ws.getCell(`${startCol}${rr}`).value = '(none)';
      ws.getCell(`${startCol}${rr}`).font = { italic: true, color: { argb: 'FF9CA3AF' } };
      rr++;
    } else {
      for (const [k, v] of rows) {
        ws.getCell(`${startCol}${rr}`).value = k || '(unspecified)';
        ws.getCell(`${valCol}${rr}`).value   = v;
        ws.getCell(`${startCol}${rr}`).border = THIN_BORDER;
        ws.getCell(`${valCol}${rr}`).border   = THIN_BORDER;
        rr++;
      }
    }
    return rr + 1;
  }

  const tabRows:    Array<[string, number]> = data.tabUsage.map(t => [t.tab, t.count]);
  const macroRows:  Array<[string, number]> = data.topMacros.map(t => [String(t.macro_type ?? ''), t.count]);
  const symRows:    Array<[string, number]> = data.topSymbols.map(t => [String(t.symbol ?? ''), t.count]);
  const lookupRows: Array<[string, number]> = data.lookupModes.map(t => [String(t.mode ?? ''), t.count]);
  const fundRows:   Array<[string, number]> = data.fundingSymbols.map(t => [String(t.symbol ?? ''), t.count]);
  const countryRows:Array<[string, number]> = data.countries.map(t => [t.country, t.sessions]);

  const left1  = addBreakdown('A', r, 'Top Tabs',         tabRows);
  const right1 = addBreakdown('C', r, 'Top Macro Types',  macroRows);
  r = Math.max(left1, right1);

  const left2  = addBreakdown('A', r, 'Top Symbols',      symRows);
  const right2 = addBreakdown('C', r, 'Lookup Modes',     lookupRows);
  r = Math.max(left2, right2);

  const left3  = addBreakdown('A', r, 'Funding Symbols',  fundRows);
  const right3 = addBreakdown('C', r, 'Top Countries',    countryRows);
  r = Math.max(left3, right3);

  // Plain English explanation
  r++;
  ws.getCell(`A${r}`).value = 'In Plain English';
  ws.getCell(`A${r}`).font = SECTION_FONT;
  ws.mergeCells(`A${r}:E${r}`);
  ws.getCell(`A${r}`).fill = SECTION_FILL;
  r++;

  const lines = buildPlainEnglish(data);
  for (const line of lines) {
    ws.mergeCells(`A${r}:E${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = line;
    c.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = Math.max(18, Math.ceil(line.length / 90) * 16);
    r++;
  }
}

function buildDeviceJourney(wb: ExcelJS.Workbook, data: ExportPayload) {
  const ws = wb.addWorksheet('Device Journey', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Device',         key: 'device',  width: 22 },
    { header: 'Session',        key: 'session', width: 18 },
    { header: 'Time (UTC)',     key: 'time',    width: 20 },
    { header: 'Country',        key: 'country', width: 10 },
    { header: 'Tab',            key: 'tab',     width: 12 },
    { header: 'Event',          key: 'event',   width: 22 },
    { header: 'Action',         key: 'action',  width: 28 },
    { header: 'Key Details',    key: 'details', width: 50 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.autoFilter = { from: 'A1', to: 'H1' };

  // Group events by device, sort each group by ts ASC.
  const byDevice = new Map<string, ExportPayload['events']>();
  for (const e of data.events) {
    const arr = byDevice.get(e.device_id) ?? [];
    arr.push(e);
    byDevice.set(e.device_id, arr);
  }

  // Order devices by last activity DESC.
  const ordered = Array.from(byDevice.entries()).sort((a, b) => {
    const la = Math.max(...a[1].map(e => e.ts));
    const lb = Math.max(...b[1].map(e => e.ts));
    return lb - la;
  });

  let zebra = false;
  for (const [deviceId, evts] of ordered) {
    evts.sort((a, b) => a.ts - b.ts);

    // Group separator row
    const sepRow = ws.addRow({});
    ws.mergeCells(`A${sepRow.number}:H${sepRow.number}`);
    const sep = sepRow.getCell(1);
    const country = evts[0]?.country || '—';
    sep.value = `Device  ${deviceId.slice(0, 12)}…   ·   ${country}   ·   ${evts.length} events   ·   ${evts.length > 0 ? `${fmtTime(evts[0].ts)} → ${fmtTime(evts[evts.length - 1].ts)}` : ''}`;
    sep.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sep.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    sep.alignment = { vertical: 'middle' };
    sepRow.height = 18;

    for (const e of evts) {
      const row = ws.addRow({
        device:  e.device_id.slice(0, 12) + '…',
        session: e.session_id.slice(0, 10) + '…',
        time:    fmtTime(e.ts),
        country: e.country || '',
        tab:     e.tab || '',
        event:   e.event_type,
        action:  humanEvent(e.event_type),
        details: keyDetails(e.event_type, e.props) || propsHuman(e.props),
      });
      if (zebra) row.eachCell(c => { c.fill = ZEBRA_FILL; });
      row.eachCell(c => { c.border = THIN_BORDER; c.alignment = { vertical: 'top', wrapText: true }; });
      zebra = !zebra;
    }
    zebra = false;
  }
}

function buildRawEvents(wb: ExcelJS.Workbook, data: ExportPayload) {
  const ws = wb.addWorksheet('Raw Events', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'ID',              key: 'id',       width: 8 },
    { header: 'Time (UTC)',      key: 'time',     width: 20 },
    { header: 'Event Type',      key: 'event',    width: 22 },
    { header: 'Tab',             key: 'tab',      width: 12 },
    { header: 'Country',         key: 'country',  width: 10 },
    { header: 'Session ID',      key: 'session',  width: 38 },
    { header: 'Device ID',       key: 'device',   width: 38 },
    { header: 'Props (parsed)',  key: 'parsed',   width: 50 },
    { header: 'Props (raw JSON)',key: 'raw',      width: 50 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.autoFilter = { from: 'A1', to: 'I1' };

  let zebra = false;
  for (const e of data.events) {
    const row = ws.addRow({
      id:       e.id,
      time:     fmtTime(e.ts),
      event:    e.event_type,
      tab:      e.tab || '',
      country:  e.country || '',
      session:  e.session_id,
      device:   e.device_id,
      parsed:   propsHuman(e.props),
      raw:      e.props || '',
    });
    if (zebra) row.eachCell(c => { c.fill = ZEBRA_FILL; });
    row.eachCell(c => { c.border = THIN_BORDER; c.alignment = { vertical: 'top', wrapText: true }; });
    zebra = !zebra;
  }
}

function buildDevices(wb: ExcelJS.Workbook, data: ExportPayload) {
  const ws = wb.addWorksheet('Devices', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Device ID',          key: 'device',     width: 38 },
    { header: 'Country',            key: 'country',    width: 10 },
    { header: 'Sessions',           key: 'sessions',   width: 12 },
    { header: 'Total Events',       key: 'total',      width: 14 },
    { header: 'Avg Events/Session', key: 'avgEvents',  width: 18 },
    { header: 'Most Used Tab',      key: 'topTab',     width: 16 },
    { header: 'Last Activity',      key: 'lastAction', width: 28 },
    { header: 'First Seen (UTC)',   key: 'first',      width: 20 },
    { header: 'Last Seen (UTC)',    key: 'last',       width: 20 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.autoFilter = { from: 'A1', to: 'I1' };

  // Index events by device for derived columns
  const byDevice = new Map<string, ExportPayload['events']>();
  for (const e of data.events) {
    const arr = byDevice.get(e.device_id) ?? [];
    arr.push(e);
    byDevice.set(e.device_id, arr);
  }

  let zebra = false;
  for (const d of data.devices) {
    const evts = (byDevice.get(d.device_id) ?? []).slice().sort((a, b) => a.ts - b.ts);
    const tabCounts: Record<string, number> = {};
    for (const e of evts) {
      if (!e.tab) continue;
      tabCounts[e.tab] = (tabCounts[e.tab] ?? 0) + 1;
    }
    const topTab = Object.entries(tabCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const last = evts[evts.length - 1];
    const lastAction = last ? humanEvent(last.event_type) : '';
    const avg = d.sessions > 0 ? +(d.total_events / d.sessions).toFixed(2) : 0;

    const row = ws.addRow({
      device:     d.device_id,
      country:    d.country || '',
      sessions:   d.sessions,
      total:      d.total_events,
      avgEvents:  avg,
      topTab,
      lastAction,
      first:      fmtTime(d.first_seen),
      last:       fmtTime(d.last_seen),
    });
    if (zebra) row.eachCell(c => { c.fill = ZEBRA_FILL; });
    row.eachCell(c => { c.border = THIN_BORDER; c.alignment = { vertical: 'middle' }; });
    zebra = !zebra;
  }
}

function buildReadyToShare(wb: ExcelJS.Workbook, data: ExportPayload, rangeLabel: string) {
  const ws = wb.addWorksheet('Ready to Share', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [{ width: 4 }, { width: 110 }];

  const ov = data.overview ?? { total_events: 0, total_sessions: 0, unique_devices: 0, unique_ips: 0, unique_countries: 0 };
  const topTabs    = data.tabUsage.slice(0, 3).map(t => t.tab).filter(Boolean);
  const topMacros  = data.topMacros.slice(0, 3).map(t => String(t.macro_type ?? '')).filter(Boolean);
  const topSyms    = data.topSymbols.slice(0, 3).map(t => String(t.symbol ?? '')).filter(Boolean);

  // Trend
  const half = Math.floor(data.daily.length / 2);
  const firstHalf = data.daily.slice(0, half).reduce((s, d) => s + d.sessions, 0);
  const secondHalf = data.daily.slice(half).reduce((s, d) => s + d.sessions, 0);
  let trend = 'stable';
  if (data.daily.length >= 4) {
    if (secondHalf > firstHalf * 1.15) trend = 'growing';
    else if (secondHalf < firstHalf * 0.85) trend = 'declining';
  }

  let r = 1;
  function setTitle(text: string) {
    ws.mergeCells(`A${r}:B${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = text;
    c.font = TITLE_FONT;
    c.alignment = { vertical: 'middle' };
    ws.getRow(r).height = 30;
    r++;
  }
  function setSub(text: string) {
    ws.mergeCells(`A${r}:B${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = text;
    c.font = { italic: true, color: { argb: 'FF6B7280' } };
    r++;
  }
  function section(title: string) {
    r++;
    ws.mergeCells(`A${r}:B${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = title;
    c.font = SECTION_FONT;
    c.fill = SECTION_FILL;
    c.alignment = { vertical: 'middle' };
    ws.getRow(r).height = 22;
    r++;
  }
  function bullet(text: string) {
    ws.getCell(`A${r}`).value = '•';
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'top' };
    ws.getCell(`A${r}`).font = { color: { argb: 'FF1D4ED8' }, bold: true };
    const c = ws.getCell(`B${r}`);
    c.value = text;
    c.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = Math.max(18, Math.ceil(text.length / 100) * 16);
    r++;
  }

  setTitle('FD Macro Generator — Weekly Snapshot');
  setSub(`Reporting period: ${rangeLabel}   ·   Prepared: ${fmtDate(Date.now())}`);

  section('What this tool is used for');
  bullet('FD Macro Generator helps the FD/SL teams produce Binance-style support macros, run quick price lookups, check funding rates, calculate position averages, and review margin restrictions — replacing repetitive manual work with a single internal web tool.');

  section('Adoption snapshot');
  bullet(`During this period the tool was used across ${ov.unique_devices} unique device${ov.unique_devices === 1 ? '' : 's'} (estimated users) and ${ov.total_sessions} session${ov.total_sessions === 1 ? '' : 's'}, generating ${ov.total_events} tracked interaction${ov.total_events === 1 ? '' : 's'}.`);
  bullet(`Reach extended to ${ov.unique_countries} countr${ov.unique_countries === 1 ? 'y' : 'ies'}, with ${data.today_sessions} session${data.today_sessions === 1 ? '' : 's'} in the last 24 hours.`);
  if (data.daily.length >= 4) {
    bullet(`Usage trend across the period is ${trend} (${firstHalf} sessions in the first half vs. ${secondHalf} in the second half).`);
  }

  section('Most used workflows');
  if (topTabs.length > 0)   bullet(`The most actively used areas of the tool were: ${topTabs.join(', ')}.`);
  if (topMacros.length > 0) bullet(`The most frequently generated macro types were: ${topMacros.join(', ')}.`);
  if (topSyms.length > 0)   bullet(`The symbols teams looked up most often were: ${topSyms.join(', ')}.`);
  if (topTabs.length === 0 && topMacros.length === 0 && topSyms.length === 0) {
    bullet('No specific workflow concentration yet — usage is still distributed evenly across features.');
  }

  section('Example user behavior patterns');
  bullet(`On average, each session contained ${ov.total_sessions > 0 ? (ov.total_events / ov.total_sessions).toFixed(1) : '0'} interactions, indicating that users typically perform multiple actions per visit rather than single one-off lookups.`);
  bullet(`On average, each device returned for ${ov.unique_devices > 0 ? (ov.total_sessions / ov.unique_devices).toFixed(1) : '0'} session${ov.unique_devices > 0 && (ov.total_sessions / ov.unique_devices) === 1 ? '' : 's'} during this period, suggesting recurring use rather than one-time visits.`);

  section('Business / operational value');
  bullet('Standardised macro output reduces ticket-handling variance across agents and shortens average response time for repetitive case categories.');
  bullet('Integrated price, funding and margin checks remove the need to switch between multiple internal/external tools, cutting context switches during live ticket work.');
  bullet('Centralised tracking now provides leadership with visibility into adoption and most-used workflows for the first time, enabling data-informed iteration.');

  section('Risks and current limitations');
  bullet(`There were ${data.errors.length} tracked error event${data.errors.length === 1 ? '' : 's'} during this period (${ov.total_events > 0 ? ((data.errors.length / ov.total_events) * 100).toFixed(2) : '0.00'}% of all interactions). These should be reviewed in the Raw Events tab.`);
  bullet('"Users" are estimated from unique browser devices. The platform does not yet store an authenticated user identity, so a single agent on two browsers will appear as two devices, and a shared browser may understate distinct users.');
  bullet('Analytics is opt-in by virtue of the internal-only domain; no PII or raw IPs are stored — only hashed identifiers and country codes derived from Cloudflare edge data.');
}

// ---------------------------------------------------------------------------
// Plain-English summary lines (used on Summary tab)
// ---------------------------------------------------------------------------

function buildPlainEnglish(data: ExportPayload): string[] {
  const ov = data.overview ?? { total_events: 0, total_sessions: 0, unique_devices: 0, unique_ips: 0, unique_countries: 0 };
  const lines: string[] = [];

  lines.push(`How many people used the tool: an estimated ${ov.unique_devices} unique device${ov.unique_devices === 1 ? '' : 's'} accessed the tool, generating ${ov.total_sessions} session${ov.total_sessions === 1 ? '' : 's'} and ${ov.total_events} tracked interaction${ov.total_events === 1 ? '' : 's'}. Note: "users" is an estimate based on unique browser devices, since the tool does not store authenticated user identities.`);

  const topTabs   = data.tabUsage.slice(0, 3).map(t => `${t.tab} (${t.count})`).join(', ');
  const topMacros = data.topMacros.slice(0, 3).map(t => `${t.macro_type ?? 'unknown'} (${t.count})`).filter(Boolean).join(', ');
  if (topTabs)   lines.push(`Most used features: ${topTabs}.`);
  if (topMacros) lines.push(`Most generated macro types: ${topMacros}.`);

  if (data.daily.length >= 4) {
    const half = Math.floor(data.daily.length / 2);
    const a = data.daily.slice(0, half).reduce((s, d) => s + d.sessions, 0);
    const b = data.daily.slice(half).reduce((s, d) => s + d.sessions, 0);
    let trend = 'stable across the selected period';
    if (b > a * 1.15) trend = `growing — ${a} sessions in the first half vs. ${b} in the second`;
    else if (b < a * 0.85) trend = `declining — ${a} sessions in the first half vs. ${b} in the second`;
    lines.push(`Usage trend: ${trend}.`);
  }

  lines.push(`Operational value: the tool consolidates macro generation, price lookups, funding checks, average calculations and margin reviews into one internal interface, reducing context switching and standardising outputs across agents.`);

  if (data.errors.length > 0) {
    const rate = ov.total_events > 0 ? ((data.errors.length / ov.total_events) * 100).toFixed(2) : '0.00';
    lines.push(`Reliability: ${data.errors.length} error event${data.errors.length === 1 ? '' : 's'} were recorded (${rate}% of interactions). See Raw Events tab.`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export async function generateAnalyticsWorkbook(data: ExportPayload, rangeLabel: string): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FD Macro Generator';
  wb.created = new Date();
  wb.title   = 'FD Macro Generator Analytics';

  buildSummary(wb, data, rangeLabel);
  buildDeviceJourney(wb, data);
  buildRawEvents(wb, data);
  buildDevices(wb, data);
  buildReadyToShare(wb, data, rangeLabel);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadAnalyticsWorkbook(data: ExportPayload, rangeLabel: string): Promise<void> {
  return generateAnalyticsWorkbook(data, rangeLabel).then(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `fd-macro-analytics-${fmtDate(Date.now())}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}
