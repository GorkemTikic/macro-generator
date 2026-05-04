import React, { useState, useCallback, useEffect } from 'react';
// exceljs is heavy (~600 KB). Load it on demand from handleExport instead of
// pulling it into the main bundle for every page view.
import type { ExportPayload } from '../analytics/exportWorkbook';
import { TAB_LABELS, type Tab } from '../analytics';

// Same dev/prod split as src/analytics/index.ts:
//   dev   → ENDPOINT = ""       (Vite dev proxy forwards /admin/* to Worker)
//   prod  → ENDPOINT = env var  (browser → Worker, Worker's ALLOWED_ORIGIN
//                                accepts the GitHub Pages origin).
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env) ?? ({} as ImportMetaEnv);
const ENDPOINT = (_ENV.DEV ? '' : (_ENV.VITE_ANALYTICS_URL ?? '')).replace(/\/$/, '');
// In dev we always have a working endpoint (the Vite proxy). In prod the
// dashboard requires VITE_ANALYTICS_URL to have been set at build time.
const ENDPOINT_AVAILABLE = _ENV.DEV || !!_ENV.VITE_ANALYTICS_URL;
const TOKEN_KEY = '_fd_admin_token';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Overview {
  total_events: number;
  total_sessions: number;
  unique_devices: number;
  unique_ips: number;
  unique_countries: number;
}
interface NameCount { [key: string]: unknown; count: number; }
interface DailyRow  { day: string; sessions: number; events: number; }
interface ErrorRow  { event_type: string; tab: string; props: string; ts: number; }
interface EventRow  { id: number; event_type: string; session_id: string; device_id: string; country: string; tab: string; props: string; ts: number; }
interface DeviceRow { device_id: string; country: string; total_events: number; sessions: number; first_seen: number; last_seen: number; }

interface Stats {
  overview:       Overview;
  today_sessions: number;
  tabUsage:       Array<{ tab: string; count: number }>;
  topMacros:      Array<{ macro_type: string; count: number }>;
  topSymbols:     Array<{ symbol: string; count: number }>;
  lookupModes:    Array<{ mode: string; count: number }>;
  fundingSymbols: Array<{ symbol: string; count: number }>;
  countries:      Array<{ country: string; sessions: number }>;
  daily:          DailyRow[];
  errors:         ErrorRow[];
}

type Range = '1d' | '7d' | '30d' | '90d';
const RANGES: { key: Range; label: string; ms: number }[] = [
  { key: '1d',  label: 'Today',   ms: 86_400_000 },
  { key: '7d',  label: '7 days',  ms: 7  * 86_400_000 },
  { key: '30d', label: '30 days', ms: 30 * 86_400_000 },
  { key: '90d', label: '90 days', ms: 90 * 86_400_000 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sinceMs(range: Range) { return RANGES.find(r => r.key === range)!.ms; }

function fillDailyGaps(data: DailyRow[], range: Range): DailyRow[] {
  const ms  = sinceMs(range);
  const map = new Map(data.map(d => [d.day, d]));
  const out: DailyRow[] = [];
  const cur = new Date(Date.now() - ms);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    out.push(map.get(key) ?? { day: key, sessions: 0, events: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function fmtTime(ts: number) {
  return new Date(ts).toISOString().slice(0, 19).replace('T', ' ');
}

function shortDevice(id: string) {
  return id ? id.slice(0, 8) + '…' : '—';
}

function propsStr(raw: string) {
  try {
    const o = JSON.parse(raw);
    return Object.entries(o).map(([k, v]) => `${k}=${v}`).join(' · ') || '—';
  } catch { return raw || '—'; }
}

// ---------------------------------------------------------------------------
// Chart: horizontal bar
// ---------------------------------------------------------------------------

function HBar({ label, value, max, color = 'var(--accent)' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="hbar">
      <span className="lbl" title={label}>{label}</span>
      <span className="track">
        <span style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="val num">{value}</span>
    </div>
  );
}

function HBarChart({ data, keyField, valueField, color, labelMap }: { data: NameCount[]; keyField: string; valueField: string; color?: string; labelMap?: Readonly<Record<string, string>> }) {
  if (!data || data.length === 0) return <p className="muted-sm">No data yet.</p>;
  const max = Math.max(...data.map(d => Number(d[valueField]) || 0));
  return (
    <div>
      {data.map((d, i) => {
        const raw = String(d[keyField] ?? '—');
        const label = labelMap?.[raw] ?? raw;
        return (
          <HBar key={i} label={label} value={Number(d[valueField]) || 0} max={max} color={color} />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: daily sessions (always shows full range, zero-filled gaps)
// ---------------------------------------------------------------------------

function DailyChart({ data, range }: { data: DailyRow[]; range: Range }) {
  const filled = fillDailyGaps(data, range);
  if (filled.length === 0) return <p className="muted-sm">No data yet.</p>;

  const max = Math.max(...filled.map(d => d.sessions), 1);
  const W   = 560;
  const H   = 120;
  const n   = filled.length;
  const bw  = Math.max(4, Math.min(40, Math.floor((W - 2) / n) - 2));
  const sp  = (W - bw * n) / (n + 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 28}`} style={{ display: 'block', minWidth: 300 }}>
        {filled.map((d, i) => {
          const barH = d.sessions > 0 ? Math.max(2, Math.round((d.sessions / max) * H)) : 0;
          const x    = sp + i * (bw + sp);
          const y    = H - barH;
          const showLabel = n <= 14 || i % Math.ceil(n / 14) === 0;
          return (
            <g key={i}>
              {barH > 0 && <rect x={x} y={y} width={bw} height={barH} fill="var(--accent)" rx={2} opacity={0.92} />}
              {showLabel && (
                <text x={x + bw / 2} y={H + 18} fontSize={10} fill="var(--text-3)" textAnchor="middle" fontFamily="var(--font-mono)">{d.day.slice(5)}</text>
              )}
              <title>{`${d.day}: ${d.sessions} sessions, ${d.events} events`}</title>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={W} y2={H} stroke="var(--line-2)" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-section">
      <h3 className="admin-section-title">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events table
// ---------------------------------------------------------------------------

function EventsTable({ events }: { events: EventRow[] }) {
  if (!events || events.length === 0) return <p className="muted-sm">No events yet.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Time (UTC)</th>
            <th>Event</th>
            <th>Tab</th>
            <th>Country</th>
            <th>Props</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id}>
              <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(e.ts)}</td>
              <td><span className="evt-badge">{e.event_type}</span></td>
              <td>{e.tab ? (TAB_LABELS[e.tab as Tab] ?? e.tab) : '—'}</td>
              <td>{e.country || '—'}</td>
              <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={propsStr(e.props)}>{propsStr(e.props)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Devices table
// ---------------------------------------------------------------------------

function DevicesTable({
  devices,
  selectedId,
  onSelect,
  deviceEvents,
  loadingDevice,
}: {
  devices: DeviceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  deviceEvents: EventRow[];
  loadingDevice: boolean;
}) {
  if (!devices || devices.length === 0) return <p className="muted-sm">No devices yet.</p>;
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Last Seen (UTC)</th>
              <th>Device ID</th>
              <th>Country</th>
              <th>Sessions</th>
              <th>Events</th>
              <th>First Seen (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <React.Fragment key={d.device_id}>
                <tr
                  style={{ cursor: 'pointer', background: selectedId === d.device_id ? 'rgba(0,229,168,0.07)' : undefined }}
                  onClick={() => onSelect(d.device_id)}
                >
                  <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(d.last_seen)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }} title={d.device_id}>{shortDevice(d.device_id)}</td>
                  <td>{d.country || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{d.sessions}</td>
                  <td style={{ textAlign: 'center' }}>{d.total_events}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--muted)' }}>{fmtTime(d.first_seen)}</td>
                </tr>

                {/* Expanded device events */}
                {selectedId === d.device_id && (
                  <tr>
                    <td colSpan={6} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)' }}>
                      {loadingDevice ? (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</span>
                      ) : deviceEvents.length === 0 ? (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>No events in this range.</span>
                      ) : (
                        <table className="admin-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Time (UTC)</th>
                              <th>Event</th>
                              <th>Tab</th>
                              <th>Props</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deviceEvents.map(e => (
                              <tr key={e.id}>
                                <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>{fmtTime(e.ts)}</td>
                                <td><span className="evt-badge">{e.event_type}</span></td>
                                <td style={{ fontSize: 11 }}>{e.tab || '—'}</td>
                                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={propsStr(e.props)}>{propsStr(e.props)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

type View = 'overview' | 'events' | 'devices';

export default function AdminDashboard() {
  const [token,       setToken]       = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [tokenDraft,  setTokenDraft]  = useState('');
  const [authed,      setAuthed]      = useState(false);
  const [range,       setRange]       = useState<Range>('7d');
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [events,      setEvents]      = useState<EventRow[]>([]);
  const [devices,     setDevices]     = useState<DeviceRow[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceEvents,   setDeviceEvents]   = useState<EventRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [error,       setError]       = useState('');
  const [activeView,  setActiveView]  = useState<View>('overview');

  const authHeader = (tok: string) => ({ Authorization: `Bearer ${tok}` });

  const fetchStats = useCallback(async (tok: string, r: Range) => {
    if (!ENDPOINT_AVAILABLE) { setError('VITE_ANALYTICS_URL is not configured.'); return; }
    setLoading(true); setError('');
    try {
      const since = Date.now() - sinceMs(r);
      const res   = await fetch(`${ENDPOINT}/admin/stats?since=${since}`, { headers: authHeader(tok) });
      if (res.status === 401) { setError('Invalid admin token.'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch.');
    } finally { setLoading(false); }
  }, []);

  const fetchEvents = useCallback(async (tok: string, r: Range) => {
    if (!ENDPOINT_AVAILABLE) return;
    setLoading(true); setError('');
    try {
      const since = Date.now() - sinceMs(r);
      const res   = await fetch(`${ENDPOINT}/admin/events?since=${since}&limit=200`, { headers: authHeader(tok) });
      if (res.status === 401) { setError('Invalid admin token.'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data  = await res.json();
      setEvents(data.events || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchDevices = useCallback(async (tok: string, r: Range) => {
    if (!ENDPOINT_AVAILABLE) return;
    setLoading(true); setError('');
    try {
      const since = Date.now() - sinceMs(r);
      const res   = await fetch(`${ENDPOINT}/admin/devices?since=${since}`, { headers: authHeader(tok) });
      if (res.status === 401) { setError('Invalid admin token.'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data  = await res.json();
      setDevices(data.devices || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchDeviceEvents = useCallback(async (tok: string, deviceId: string, r: Range) => {
    if (!ENDPOINT_AVAILABLE) return;
    setLoadingDevice(true);
    try {
      const since = Date.now() - sinceMs(r);
      const res   = await fetch(`${ENDPOINT}/admin/devices?device_id=${encodeURIComponent(deviceId)}&since=${since}&limit=100`, { headers: authHeader(tok) });
      if (res.status === 401) {
        setError('Invalid admin token.');
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data  = await res.json();
      setDeviceEvents(data.events || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load device events.');
    } finally {
      setLoadingDevice(false);
    }
  }, []);

  // Auto-load on mount if token already saved
  useEffect(() => { if (token) fetchStats(token, range); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = () => {
    const tok = tokenDraft.trim();
    if (!tok) return;
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    fetchStats(tok, range);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(''); setAuthed(false); setStats(null); setEvents([]); setDevices([]);
  };

  const handleRangeChange = (r: Range) => {
    setRange(r);
    if (!authed || !token) return;
    setSelectedDevice(null); setDeviceEvents([]);
    if (activeView === 'events')  fetchEvents(token, r);
    else if (activeView === 'devices') fetchDevices(token, r);
    else fetchStats(token, r);
  };

  const handleViewChange = (v: View) => {
    setActiveView(v);
    if (!authed || !token) return;
    if (v === 'events'  && events.length === 0)  fetchEvents(token, range);
    if (v === 'devices' && devices.length === 0) fetchDevices(token, range);
    if (v === 'overview' && !stats)              fetchStats(token, range);
  };

  const handleExport = async () => {
    if (!ENDPOINT_AVAILABLE || !token) return;
    setExporting(true); setError('');
    try {
      const since = Date.now() - sinceMs(range);
      const res = await fetch(`${ENDPOINT}/admin/export?since=${since}`, { headers: authHeader(token) });
      if (res.status === 401) { setError('Invalid admin token.'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
      const data = await res.json() as ExportPayload;
      const label = RANGES.find(r => r.key === range)?.label ?? range;
      const sinceStr = new Date(since).toISOString().slice(0, 10);
      const untilStr = new Date().toISOString().slice(0, 10);
      const { downloadAnalyticsWorkbook } = await import('../analytics/exportWorkbook');
      await downloadAnalyticsWorkbook(data, `${label} (${sinceStr} → ${untilStr})`);
    } catch (e: any) {
      setError(e.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSelectDevice = (id: string) => {
    if (selectedDevice === id) { setSelectedDevice(null); setDeviceEvents([]); return; }
    setSelectedDevice(id);
    setDeviceEvents([]);
    fetchDeviceEvents(token, id, range);
  };

  // -------------------------------------------------------------------------
  // Login screen
  // -------------------------------------------------------------------------
  if (!authed) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: '40px auto' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Admin Login</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          Enter the <code>ADMIN_TOKEN</code> secret you set on the Cloudflare Worker.
        </p>
        {error && <div className="error-box">{error}</div>}
        {!ENDPOINT_AVAILABLE && <div className="error-box"><strong>VITE_ANALYTICS_URL</strong> is not set.</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" type="password" placeholder="Admin token"
            value={tokenDraft} onChange={e => setTokenDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={handleLogin} disabled={loading || !tokenDraft.trim()}>
            {loading ? 'Loading…' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  const ov = stats?.overview;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2 className="admin-title">Analytics Dashboard</h2>
          <p className="admin-subtitle">Futures DeskMate · internal use only</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="range-picker">
            {RANGES.map(r => (
              <button key={r.key} className={`range-btn ${range === r.key ? 'active' : ''}`}
                onClick={() => handleRangeChange(r.key)}>{r.label}</button>
            ))}
          </div>
          <button className="btn-refresh" onClick={() => {
            if (activeView === 'events')       fetchEvents(token, range);
            else if (activeView === 'devices') fetchDevices(token, range);
            else                               fetchStats(token, range);
          }} disabled={loading}>{loading ? '…' : '↻ Refresh'}</button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={exporting || !authed}
            title="Download a polished Excel workbook with Summary, Device Journey, Raw Events, Devices and a Ready-to-Share tab."
            style={{ fontWeight: 600 }}
          >
            {exporting ? 'Building workbook…' : '⬇ Export Workbook (.xlsx)'}
          </button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {(['overview', 'events', 'devices'] as View[]).map(v => (
          <button key={v} className={`admin-view-tab ${activeView === v ? 'active' : ''}`}
            onClick={() => handleViewChange(v)}>
            {v === 'overview' ? 'Overview' : v === 'events' ? 'Recent Events' : 'Devices'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeView === 'overview' && stats && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Events"        value={ov?.total_events    ?? '—'} color="var(--accent)" />
            <KpiCard label="Sessions"            value={ov?.total_sessions  ?? '—'} sub={`Today: ${stats.today_sessions}`} />
            <KpiCard label="Unique Devices"      value={ov?.unique_devices  ?? '—'} />
            <KpiCard label="Unique IPs (hashed)" value={ov?.unique_ips      ?? '—'} />
            <KpiCard label="Countries"           value={ov?.unique_countries ?? '—'} />
          </div>

          <Section title="Sessions per Day">
            <DailyChart data={stats.daily} range={range} />
          </Section>

          {/* Slide 11 layout: 3-column row of Tab Usage / Top Symbols / Recent
              Errors. The errors table fills the third column when there are
              errors; otherwise we collapse to a 2-column row. */}
          <div className="admin-three-col">
            <Section title="Tab Usage">
              <HBarChart
                data={stats.tabUsage as NameCount[]}
                keyField="tab"
                valueField="count"
                color="var(--accent)"
                labelMap={TAB_LABELS as Readonly<Record<string, string>>}
              />
            </Section>
            <Section title="Top Symbols">
              <HBarChart data={stats.topSymbols as NameCount[]} keyField="symbol" valueField="count" color="var(--accent-2)" />
            </Section>
            {stats.errors.length > 0 ? (
              <Section title={`Recent Errors (${stats.errors.length})`}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead><tr><th>Time</th><th>Type</th><th>Tab</th><th>Detail</th></tr></thead>
                    <tbody>
                      {stats.errors.slice(0, 6).map((e, i) => (
                        <tr key={i}>
                          <td className="num" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {fmtTime(e.ts).slice(11)}
                          </td>
                          <td><span className="evt-badge evt-error">{e.event_type}</span></td>
                          <td>{e.tab ? (TAB_LABELS[e.tab as Tab] ?? e.tab) : '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{propsStr(e.props)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : (
              <Section title="Top Macro Types">
                <HBarChart data={stats.topMacros as NameCount[]} keyField="macro_type" valueField="count" color="var(--accent)" />
              </Section>
            )}
          </div>

          {/* Lookup modes / Funding / Countries — secondary breakdowns */}
          <div className="admin-three-col">
            <Section title="Lookup Modes">
              <HBarChart data={stats.lookupModes as NameCount[]} keyField="mode" valueField="count" color="var(--accent-2)" />
            </Section>
            <Section title="Funding — Top Symbols">
              <HBarChart data={stats.fundingSymbols as NameCount[]} keyField="symbol" valueField="count" color="var(--accent)" />
            </Section>
            <Section title="Countries">
              <HBarChart data={stats.countries as unknown as NameCount[]} keyField="country" valueField="sessions" color="var(--info)" />
            </Section>
          </div>

          {/* When errors are shown above, also surface Top Macro Types in its
              own row so it doesn't get hidden. */}
          {stats.errors.length > 0 && (
            <div className="admin-two-col">
              <Section title="Top Macro Types">
                <HBarChart data={stats.topMacros as NameCount[]} keyField="macro_type" valueField="count" color="var(--accent)" />
              </Section>
              <Section title="Full error log">
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead><tr><th>Time (UTC)</th><th>Type</th><th>Tab</th><th>Details</th></tr></thead>
                    <tbody>
                      {stats.errors.map((e, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(e.ts)}</td>
                          <td><span className="evt-badge evt-error">{e.event_type}</span></td>
                          <td>{e.tab ? (TAB_LABELS[e.tab as Tab] ?? e.tab) : '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{propsStr(e.props)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          )}
        </>
      )}

      {/* ── EVENTS ── */}
      {activeView === 'events' && (
        <Section title="Recent Events">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => fetchEvents(token, range)} disabled={loading}>
              {loading ? 'Loading…' : '↻ Load'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Use “Export Workbook” in the header to download the full dataset for the selected range.
            </span>
          </div>
          <EventsTable events={events} />
        </Section>
      )}

      {/* ── DEVICES ── */}
      {activeView === 'devices' && (
        <Section title={`Devices${devices.length > 0 ? ` (${devices.length} unique)` : ''}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => { setSelectedDevice(null); setDeviceEvents([]); fetchDevices(token, range); }} disabled={loading}>
              {loading ? 'Loading…' : '↻ Load'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Click a row to see that device's events</span>
          </div>
          <DevicesTable
            devices={devices}
            selectedId={selectedDevice}
            onSelect={handleSelectDevice}
            deviceEvents={deviceEvents}
            loadingDevice={loadingDevice}
          />
        </Section>
      )}

      {loading && !stats && activeView === 'overview' && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Loading analytics…</div>
      )}
    </div>
  );
}
