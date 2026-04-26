// src/components/AdminDashboard.tsx
// Internal analytics dashboard. Reads from the Cloudflare Worker API.
// Access is gated by an admin token stored in localStorage.

import React, { useState, useEffect, useCallback } from 'react';

const ENDPOINT = (import.meta.env.VITE_ANALYTICS_URL ?? '').replace(/\/$/, '');
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

// ---------------------------------------------------------------------------
// Tiny chart components — no dependencies, pure CSS/SVG
// ---------------------------------------------------------------------------

function HBar({ label, value, max, color = 'var(--accent)' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 130, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
        {label}
      </div>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 20, overflow: 'hidden', minWidth: 80 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease', minWidth: pct > 0 ? 4 : 0 }} />
      </div>
      <div style={{ width: 36, fontSize: 12, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>{value}</div>
    </div>
  );
}

function HBarChart({ data, keyField, valueField, color }: {
  data: NameCount[];
  keyField: string;
  valueField: string;
  color?: string;
}) {
  if (!data || data.length === 0) return <p className="muted-sm">No data yet.</p>;
  const max = Math.max(...data.map(d => Number(d[valueField]) || 0));
  return (
    <div>
      {data.map((d, i) => (
        <HBar key={i} label={String(d[keyField] ?? '—')} value={Number(d[valueField]) || 0} max={max} color={color} />
      ))}
    </div>
  );
}

function DailyChart({ data }: { data: DailyRow[] }) {
  if (!data || data.length === 0) return <p className="muted-sm">No data yet.</p>;
  const max = Math.max(...data.map(d => d.sessions), 1);
  const W   = 560;
  const H   = 120;
  const n   = data.length;
  const gap = 2;
  const bw  = Math.max(4, Math.floor((W - gap * (n + 1)) / n));
  const sp  = (W - bw * n) / (n + 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 28}`} style={{ display: 'block', minWidth: 300 }}>
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.sessions / max) * H));
          const x    = sp + i * (bw + sp);
          const y    = H - barH;
          const showLabel = n <= 14 || i % Math.ceil(n / 14) === 0;
          const shortDay  = d.day.slice(5); // MM-DD
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={barH} fill="var(--accent)" rx={2} opacity={0.85} />
              {showLabel && (
                <text x={x + bw / 2} y={H + 18} fontSize={9} fill="var(--muted)" textAnchor="middle">{shortDay}</text>
              )}
              <title>{`${d.day}: ${d.sessions} sessions, ${d.events} events`}</title>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
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

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-section">
      <h3 className="admin-section-title">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range presets
// ---------------------------------------------------------------------------

type Range = '1d' | '7d' | '30d' | '90d';
const RANGES: { key: Range; label: string; ms: number }[] = [
  { key: '1d',  label: 'Today',    ms: 86_400_000 },
  { key: '7d',  label: '7 days',   ms: 7  * 86_400_000 },
  { key: '30d', label: '30 days',  ms: 30 * 86_400_000 },
  { key: '90d', label: '90 days',  ms: 90 * 86_400_000 },
];

// ---------------------------------------------------------------------------
// Recent Events table
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
          {events.map(e => {
            let propsObj: Record<string, unknown> = {};
            try { propsObj = JSON.parse(e.props); } catch {}
            const propsStr = Object.entries(propsObj).map(([k, v]) => `${k}=${v}`).join(' · ') || '—';
            return (
              <tr key={e.id}>
                <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(e.ts).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td><span className="evt-badge">{e.event_type}</span></td>
                <td>{e.tab || '—'}</td>
                <td>{e.country || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={propsStr}>{propsStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [token,     setToken]     = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [tokenDraft, setTokenDraft] = useState('');
  const [authed,    setAuthed]    = useState(false);
  const [range,     setRange]     = useState<Range>('30d');
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [events,    setEvents]    = useState<EventRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'events'>('overview');

  const fetchStats = useCallback(async (tok: string, r: Range) => {
    if (!ENDPOINT) { setError('VITE_ANALYTICS_URL is not configured.'); return; }
    setLoading(true);
    setError('');
    try {
      const ms    = RANGES.find(x => x.key === r)!.ms;
      const since = Date.now() - ms;
      const res   = await fetch(`${ENDPOINT}/admin/stats?since=${since}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) { setError('Invalid admin token.'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (tok: string, r: Range) => {
    if (!ENDPOINT) return;
    setLoading(true);
    setError('');
    try {
      const ms    = RANGES.find(x => x.key === r)!.ms;
      const since = Date.now() - ms;
      const res   = await fetch(`${ENDPOINT}/admin/events?since=${since}&limit=100`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when token is already saved
  useEffect(() => {
    if (token) fetchStats(token, range);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = () => {
    const tok = tokenDraft.trim();
    if (!tok) return;
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    fetchStats(tok, range);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setAuthed(false);
    setStats(null);
    setEvents([]);
  };

  const handleRangeChange = (r: Range) => {
    setRange(r);
    if (authed && token) {
      activeView === 'events' ? fetchEvents(token, r) : fetchStats(token, r);
    }
  };

  const handleViewChange = (v: 'overview' | 'events') => {
    setActiveView(v);
    if (!authed || !token) return;
    if (v === 'events' && events.length === 0) fetchEvents(token, range);
    if (v === 'overview' && !stats) fetchStats(token, range);
  };

  // -------------------------------------------------------------------------
  // Not authenticated — show token input
  // -------------------------------------------------------------------------
  if (!authed) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: '40px auto' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Admin Login</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          Enter the admin token you set as the <code>ADMIN_TOKEN</code> secret on your Cloudflare Worker.
        </p>
        {error && <div className="error-box">{error}</div>}
        {!ENDPOINT && (
          <div className="error-box">
            <strong>VITE_ANALYTICS_URL</strong> is not set. Add it to your <code>.env.local</code> and rebuild.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="password"
            placeholder="Admin token"
            value={tokenDraft}
            onChange={e => setTokenDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleLogin} disabled={loading || !tokenDraft.trim()}>
            {loading ? 'Loading…' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Authenticated — show dashboard
  // -------------------------------------------------------------------------
  const ov = stats?.overview;

  return (
    <div className="admin-dashboard">
      {/* Header row */}
      <div className="admin-header">
        <div>
          <h2 className="admin-title">Analytics Dashboard</h2>
          <p className="admin-subtitle">FD Macro Generator · internal use only</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Range selector */}
          <div className="range-picker">
            {RANGES.map(r => (
              <button
                key={r.key}
                className={`range-btn ${range === r.key ? 'active' : ''}`}
                onClick={() => handleRangeChange(r.key)}
              >{r.label}</button>
            ))}
          </div>
          <button className="btn-refresh" onClick={() => fetchStats(token, range)} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {(['overview', 'events'] as const).map(v => (
          <button
            key={v}
            className={`admin-view-tab ${activeView === v ? 'active' : ''}`}
            onClick={() => handleViewChange(v)}
          >{v === 'overview' ? 'Overview' : 'Recent Events'}</button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {activeView === 'overview' && stats && (
        <>
          {/* KPI row */}
          <div className="kpi-grid">
            <KpiCard label="Total Events"    value={ov?.total_events   ?? '—'} color="var(--accent)" />
            <KpiCard label="Sessions"        value={ov?.total_sessions ?? '—'} sub={`Today: ${stats.today_sessions}`} />
            <KpiCard label="Unique Devices"  value={ov?.unique_devices ?? '—'} />
            <KpiCard label="Unique IPs (hashed)" value={ov?.unique_ips ?? '—'} />
            <KpiCard label="Countries"       value={ov?.unique_countries ?? '—'} />
          </div>

          {/* Daily chart — full width */}
          <Section title="Sessions per Day">
            <DailyChart data={stats.daily} />
          </Section>

          {/* Two-column row */}
          <div className="admin-two-col">
            <Section title="Tab Usage">
              <HBarChart data={stats.tabUsage as NameCount[]} keyField="tab" valueField="count" color="var(--accent)" />
            </Section>
            <Section title="Top Symbols">
              <HBarChart data={stats.topSymbols as NameCount[]} keyField="symbol" valueField="count" color="var(--accent-2)" />
            </Section>
          </div>

          <div className="admin-two-col">
            <Section title="Top Macro Types">
              <HBarChart data={stats.topMacros as NameCount[]} keyField="macro_type" valueField="count" color="var(--accent)" />
            </Section>
            <Section title="Lookup Modes">
              <HBarChart data={stats.lookupModes as NameCount[]} keyField="mode" valueField="count" color="var(--accent-2)" />
            </Section>
          </div>

          <div className="admin-two-col">
            <Section title="Funding — Top Symbols">
              <HBarChart data={stats.fundingSymbols as NameCount[]} keyField="symbol" valueField="count" color="var(--accent)" />
            </Section>
            <Section title="Countries">
              <HBarChart data={stats.countries as NameCount[]} keyField="country" valueField="sessions" color="#a855f7" />
            </Section>
          </div>

          {/* Errors */}
          {stats.errors.length > 0 && (
            <Section title={`Recent Errors (${stats.errors.length})`}>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr><th>Time (UTC)</th><th>Type</th><th>Tab</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {stats.errors.map((e, i) => {
                      let p: Record<string, unknown> = {};
                      try { p = JSON.parse(e.props); } catch {}
                      return (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.ts).toISOString().slice(0, 19).replace('T', ' ')}</td>
                          <td><span className="evt-badge evt-error">{e.event_type}</span></td>
                          <td>{e.tab || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {Object.entries(p).map(([k, v]) => `${k}=${v}`).join(' · ') || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {activeView === 'events' && (
        <Section title="Recent Events">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => fetchEvents(token, range)} disabled={loading}>
              {loading ? 'Loading…' : '↻ Load'}
            </button>
          </div>
          <EventsTable events={events} />
        </Section>
      )}

      {loading && !stats && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Loading analytics…</div>
      )}
    </div>
  );
}
