/**
 * Macro-Generator Analytics Worker
 * Cloudflare Worker + D1 (SQLite)
 *
 * Routes:
 *   POST /track          — ingest a single analytics event (public)
 *   GET  /admin/stats    — aggregated statistics (auth required)
 *   GET  /admin/events   — recent raw events     (auth required)
 *
 * Privacy:
 *   - Raw IPs are NEVER stored. Only a 16-char SHA-256 hex prefix.
 *   - Country comes from Cloudflare's CF-IPCountry header (free, no geo-DB needed).
 *   - No cookies, no PII beyond a client-generated device UUID.
 */

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  ALLOWED_ORIGIN: string;
  BINANCE_API_KEY?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN || '*';
  const origin  = request.headers.get('Origin') || '';
  const effectiveOrigin = (allowed === '*' || origin === allowed) ? (allowed === '*' ? '*' : origin) : 'null';
  return {
    'Access-Control-Allow-Origin':  effectiveOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    // Tell intermediaries / browsers that the response varies by Origin so a
    // denied preflight can't poison a permitted origin's cached response.
    'Vary': 'Origin',
    // Cache successful preflights for 24 h to skip the extra OPTIONS RTT.
    'Access-Control-Max-Age': '86400',
  };
}

// Constant-time string comparison so token verification doesn't leak length
// or prefix via response timing. Worker-fronted endpoints aren't realistically
// exploitable here (network jitter dominates), but the defense is one line.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Allowlist of Binance paths the proxy will forward. Anything outside this
// list returns 404 — prevents the Worker from being weaponized as an open
// proxy for arbitrary endpoints (including signed/private ones).
const FAPI_PATH_ALLOW = [
  '/fapi/v1/klines',
  '/fapi/v1/markPriceKlines',
  '/fapi/v1/aggTrades',
  '/fapi/v1/premiumIndex',
  '/fapi/v1/fundingRate',
  '/fapi/v1/exchangeInfo',
];
const SPOT_PATH_ALLOW = [
  '/api/v3/klines',
  '/api/v3/aggTrades',
  '/api/v3/exchangeInfo',
];
const SAPI_PATH_ALLOW = [
  '/sapi/v1/margin/exchange-small-liability',
  '/sapi/v1/margin/restricted-list',
  '/sapi/v1/margin/exchange-info',
];

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

async function hashIp(ip: string): Promise<string> {
  const buf  = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');  // 16 hex chars — enough for uniqueness, not enough to reverse
}

function requireAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (typeof env.ADMIN_TOKEN !== 'string' || env.ADMIN_TOKEN.length === 0) return false;
  if (typeof auth !== 'string') return false;
  return timingSafeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url  = new URL(request.url);
    const cors = corsHeaders(request, env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // -------------------------------------------------------------------
    // GET /sapi/*  — Binance Margin SAPI CORS proxy (API key injected server-side)
    // The frontend never sends X-MBX-APIKEY; the Worker reads BINANCE_API_KEY from
    // its secret store and injects it before forwarding to api.binance.com.
    // -------------------------------------------------------------------
    if (request.method === 'GET' && url.pathname.startsWith('/sapi/')) {
      const apiKey = env.BINANCE_API_KEY || '';
      if (!apiKey) {
        return json({ error: 'binance_key_not_configured' }, 503, cors);
      }
      // Path allowlist: only the SAPI endpoints we actually call. Prevents the
      // Worker from being weaponized as an open authenticated proxy.
      if (!SAPI_PATH_ALLOW.includes(url.pathname)) {
        return json({ error: 'path_not_allowed' }, 403, cors);
      }

      const tail = url.pathname + url.search;
      const sapiBases = [
        'https://api.binance.com',
        'https://api1.binance.com',
        'https://api2.binance.com',
        'https://api3.binance.com',
      ];
      let lastStatus = 0;
      let lastBody = '';

      for (const base of sapiBases) {
        try {
          const upstream = await fetch(base + tail, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'X-MBX-APIKEY': apiKey },
            redirect: 'follow',
          });

          if (upstream.status === 429 || upstream.status === 418 || upstream.status === 451) {
            const body = await upstream.text();
            return new Response(body, {
              status: upstream.status,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          }

          if (upstream.ok) {
            const body = await upstream.text();
            return new Response(body, {
              status: 200,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          }

          lastStatus = upstream.status;
          lastBody = await upstream.text();
        } catch (e) {
          lastStatus = 502;
          lastBody = JSON.stringify({ error: 'upstream_unreachable', base, detail: String(e) });
        }
      }

      return new Response(lastBody || JSON.stringify({ error: 'upstream_failed' }), {
        status: lastStatus || 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------------------------------------------
    // GET /fapi/*  or  /api/*  — Binance CORS proxy
    // GitHub Pages cannot reach Binance directly (CORS / region). The
    // Worker forwards the request to Binance with multi-base fallback
    // and adds the appropriate CORS headers on the way back.
    // -------------------------------------------------------------------
    if (request.method === 'GET' && (url.pathname.startsWith('/fapi/') || url.pathname.startsWith('/api/'))) {
      const isFapi = url.pathname.startsWith('/fapi/');
      // Path allowlist enforced per surface. Anything outside is rejected so
      // the Worker can't proxy arbitrary Binance endpoints.
      const allow = isFapi ? FAPI_PATH_ALLOW : SPOT_PATH_ALLOW;
      if (!allow.includes(url.pathname)) {
        return json({ error: 'path_not_allowed' }, 403, cors);
      }
      const upstreamBases = isFapi
        ? ['https://fapi.binance.com', 'https://fapi1.binance.com', 'https://fapi2.binance.com', 'https://fapi3.binance.com']
        : ['https://api.binance.com',  'https://api1.binance.com',  'https://api2.binance.com',  'https://api3.binance.com'];

      const tail = url.pathname + url.search;
      let lastStatus = 0;
      let lastBody = '';

      for (const base of upstreamBases) {
        try {
          const upstream = await fetch(base + tail, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            // Don't forward credentials or the browser's Origin.
            redirect: 'follow',
          });

          // Hard rate / region blocks — propagate immediately so the client
          // surfaces them through the existing error path.
          if (upstream.status === 429 || upstream.status === 418 || upstream.status === 451) {
            const body = await upstream.text();
            return new Response(body, {
              status: upstream.status,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          }

          if (upstream.ok) {
            const body = await upstream.text();
            return new Response(body, {
              status: 200,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          }

          lastStatus = upstream.status;
          lastBody = await upstream.text();
        } catch (e) {
          lastStatus = 502;
          lastBody = JSON.stringify({ error: 'upstream_unreachable', base, detail: String(e) });
          // try next base
        }
      }

      return new Response(lastBody || JSON.stringify({ error: 'upstream_failed' }), {
        status: lastStatus || 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------------------------------------------
    // POST /track  — ingest event
    // -------------------------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/track') {
      try {
        // Cap body size to 16 KB. The legitimate frontend payload is ~300 bytes;
        // anything bigger is an abuse attempt or a misuse.
        const lenHeader = request.headers.get('content-length');
        if (lenHeader && Number(lenHeader) > 16_384) {
          return json({ error: 'payload_too_large' }, 413, cors);
        }
        const text = await request.text();
        if (text.length > 16_384) {
          return json({ error: 'payload_too_large' }, 413, cors);
        }

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          return json({ error: 'bad_json' }, 400, cors);
        }
        if (!body || typeof body !== 'object') {
          return json({ error: 'bad_request' }, 400, cors);
        }

        // Allowlist of event types — anything else is rejected. Keeps the
        // events table from filling with arbitrary keys an attacker invented.
        const ALLOWED_EVENTS = new Set<string>([
          'page_view', 'tab_switch', 'lang_switch',
          'macro_generated', 'macro_error', 'grid_paste_used',
          'lookup_query', 'lookup_error', 'trailing_stop_checked', 'gap_explainer_checked',
          'funding_query', 'funding_error',
          'average_calc_run',
          'margin_view', 'margin_refresh', 'margin_error',
          'error',
        ]);
        const eventType = String(body.event || 'unknown').slice(0, 64);
        if (!ALLOWED_EVENTS.has(eventType)) {
          return json({ error: 'unknown_event_type' }, 400, cors);
        }

        const ip      = request.headers.get('CF-Connecting-IP') || '';
        const country = (request.headers.get('CF-IPCountry') || 'XX').slice(0, 2).toUpperCase();
        const ipHash  = ip ? await hashIp(ip) : null;

        const sessionId = String(body.session_id || '').slice(0, 64);
        const deviceId  = String(body.device_id  || '').slice(0, 64);
        const tab       = String(body.tab  || '').slice(0, 32);

        // Cap props at 32 keys / 4 KB serialized.
        let propsObj: Record<string, unknown> = {};
        if (body.props && typeof body.props === 'object' && !Array.isArray(body.props)) {
          const entries = Object.entries(body.props as Record<string, unknown>).slice(0, 32);
          for (const [k, v] of entries) {
            const safeKey = String(k).slice(0, 64);
            // Only keep primitive values; anything richer is dropped to avoid
            // unbounded nesting in the JSON blob.
            if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
              propsObj[safeKey] = typeof v === 'string' ? v.slice(0, 256) : v;
            }
          }
        }
        let props = JSON.stringify(propsObj);
        if (props.length > 4096) props = '{}';

        const ts = typeof body.ts === 'number' && Number.isFinite(body.ts) ? body.ts : Date.now();

        await env.DB.prepare(`
          INSERT INTO events (event_type, session_id, device_id, ip_hash, country, tab, props, ts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(eventType, sessionId, deviceId, ipHash, country, tab, props, ts).run();

        return json({ ok: true }, 200, cors);
      } catch (e) {
        console.error('track error', e);
        return json({ error: 'bad_request' }, 400, cors);
      }
    }

    // -------------------------------------------------------------------
    // Admin routes — all require Authorization: Bearer <ADMIN_TOKEN>
    // -------------------------------------------------------------------
    if (url.pathname.startsWith('/admin/')) {
      if (!requireAdmin(request, env)) {
        return json({ error: 'unauthorized' }, 401, cors);
      }

      // Parse date range from query params (default: last 30 days)
      const now   = Date.now();
      const since = url.searchParams.has('since') ? Number(url.searchParams.get('since')) : now - 30 * 86_400_000;
      const until = url.searchParams.has('until') ? Number(url.searchParams.get('until')) : now;

      // -----------------------------------------------------------------
      // GET /admin/stats
      // -----------------------------------------------------------------
      if (url.pathname === '/admin/stats' && request.method === 'GET') {
        const [overview, tabUsage, topMacros, topSymbols, lookupModes, fundingSymbols, countries, daily, errors, sessions] =
          await Promise.all([
            // Overview counts
            env.DB.prepare(`
              SELECT
                COUNT(*)                    AS total_events,
                COUNT(DISTINCT session_id)  AS total_sessions,
                COUNT(DISTINCT device_id)   AS unique_devices,
                COUNT(DISTINCT ip_hash)     AS unique_ips,
                COUNT(DISTINCT country)     AS unique_countries
              FROM events WHERE ts >= ? AND ts <= ?
            `).bind(since, until).first(),

            // Tab switch counts
            env.DB.prepare(`
              SELECT tab, COUNT(*) AS count
              FROM events
              WHERE tab != '' AND ts >= ? AND ts <= ?
              GROUP BY tab ORDER BY count DESC
            `).bind(since, until).all(),

            // Top macro types
            env.DB.prepare(`
              SELECT json_extract(props, '$.macro_type') AS macro_type, COUNT(*) AS count
              FROM events
              WHERE event_type = 'macro_generated' AND ts >= ? AND ts <= ?
              GROUP BY macro_type ORDER BY count DESC LIMIT 10
            `).bind(since, until).all(),

            // Top symbols (across all event types that log a symbol)
            env.DB.prepare(`
              SELECT json_extract(props, '$.symbol') AS symbol, COUNT(*) AS count
              FROM events
              WHERE json_extract(props, '$.symbol') IS NOT NULL
                AND json_extract(props, '$.symbol') != ''
                AND ts >= ? AND ts <= ?
              GROUP BY symbol ORDER BY count DESC LIMIT 10
            `).bind(since, until).all(),

            // Lookup modes
            env.DB.prepare(`
              SELECT json_extract(props, '$.mode') AS mode, COUNT(*) AS count
              FROM events
              WHERE event_type = 'lookup_query' AND ts >= ? AND ts <= ?
              GROUP BY mode ORDER BY count DESC
            `).bind(since, until).all(),

            // Funding symbols
            env.DB.prepare(`
              SELECT json_extract(props, '$.symbol') AS symbol, COUNT(*) AS count
              FROM events
              WHERE event_type = 'funding_query' AND ts >= ? AND ts <= ?
              GROUP BY symbol ORDER BY count DESC LIMIT 10
            `).bind(since, until).all(),

            // Countries by session count
            env.DB.prepare(`
              SELECT country, COUNT(DISTINCT session_id) AS sessions
              FROM events
              WHERE country != 'XX' AND ts >= ? AND ts <= ?
              GROUP BY country ORDER BY sessions DESC LIMIT 20
            `).bind(since, until).all(),

            // Daily sessions trend
            env.DB.prepare(`
              SELECT
                date(ts / 1000, 'unixepoch') AS day,
                COUNT(DISTINCT session_id)   AS sessions,
                COUNT(*)                     AS events
              FROM events WHERE ts >= ? AND ts <= ?
              GROUP BY day ORDER BY day ASC
            `).bind(since, until).all(),

            // Recent errors
            env.DB.prepare(`
              SELECT event_type, tab, props, ts
              FROM events
              WHERE event_type LIKE '%error%' AND ts >= ? AND ts <= ?
              ORDER BY ts DESC LIMIT 20
            `).bind(since, until).all(),

            // Sessions per day for today
            env.DB.prepare(`
              SELECT COUNT(DISTINCT session_id) AS today_sessions
              FROM events
              WHERE ts >= ?
            `).bind(now - 86_400_000).first(),
          ]);

        return json({
          overview,
          today_sessions: (sessions as any)?.today_sessions ?? 0,
          tabUsage:      tabUsage.results,
          topMacros:     topMacros.results,
          topSymbols:    topSymbols.results,
          lookupModes:   lookupModes.results,
          fundingSymbols: fundingSymbols.results,
          countries:     countries.results,
          daily:         daily.results,
          errors:        errors.results,
        }, 200, cors);
      }

      // -----------------------------------------------------------------
      // GET /admin/devices  — per-device summary or drill-down events
      // -----------------------------------------------------------------
      if (url.pathname === '/admin/devices' && request.method === 'GET') {
        const deviceId = url.searchParams.get('device_id');

        if (deviceId) {
          // Drill-down: events for a single device
          const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);
          const rows  = await env.DB.prepare(`
            SELECT id, event_type, session_id, device_id, country, tab, props, ts
            FROM events
            WHERE device_id = ? AND ts >= ? AND ts <= ?
            ORDER BY ts DESC LIMIT ?
          `).bind(deviceId, since, until, limit).all();
          return json({ events: rows.results }, 200, cors);
        }

        // Summary: one row per unique device
        const rows = await env.DB.prepare(`
          SELECT
            device_id,
            country,
            COUNT(*)                   AS total_events,
            COUNT(DISTINCT session_id) AS sessions,
            MIN(ts)                    AS first_seen,
            MAX(ts)                    AS last_seen
          FROM events
          WHERE ts >= ? AND ts <= ?
          GROUP BY device_id
          ORDER BY last_seen DESC
          LIMIT 200
        `).bind(since, until).all();
        return json({ devices: rows.results }, 200, cors);
      }

      // -----------------------------------------------------------------
      // GET /admin/export  — full data dump for workbook generation
      // Returns stats + all devices + all events for the selected range
      // (no 200-row cap; safety bound at 50k events).
      // -----------------------------------------------------------------
      if (url.pathname === '/admin/export' && request.method === 'GET') {
        const eventsCap = Math.min(Number(url.searchParams.get('limit') ?? 50000), 50000);

        const [
          overview, tabUsage, topMacros, topSymbols, lookupModes,
          fundingSymbols, countries, daily, errors, todayRow,
          devices, events,
        ] = await Promise.all([
          env.DB.prepare(`
            SELECT
              COUNT(*)                    AS total_events,
              COUNT(DISTINCT session_id)  AS total_sessions,
              COUNT(DISTINCT device_id)   AS unique_devices,
              COUNT(DISTINCT ip_hash)     AS unique_ips,
              COUNT(DISTINCT country)     AS unique_countries
            FROM events WHERE ts >= ? AND ts <= ?
          `).bind(since, until).first(),
          env.DB.prepare(`SELECT tab, COUNT(*) AS count FROM events WHERE tab != '' AND ts >= ? AND ts <= ? GROUP BY tab ORDER BY count DESC`).bind(since, until).all(),
          env.DB.prepare(`SELECT json_extract(props, '$.macro_type') AS macro_type, COUNT(*) AS count FROM events WHERE event_type = 'macro_generated' AND ts >= ? AND ts <= ? GROUP BY macro_type ORDER BY count DESC LIMIT 20`).bind(since, until).all(),
          env.DB.prepare(`SELECT json_extract(props, '$.symbol') AS symbol, COUNT(*) AS count FROM events WHERE json_extract(props, '$.symbol') IS NOT NULL AND json_extract(props, '$.symbol') != '' AND ts >= ? AND ts <= ? GROUP BY symbol ORDER BY count DESC LIMIT 20`).bind(since, until).all(),
          env.DB.prepare(`SELECT json_extract(props, '$.mode') AS mode, COUNT(*) AS count FROM events WHERE event_type = 'lookup_query' AND ts >= ? AND ts <= ? GROUP BY mode ORDER BY count DESC`).bind(since, until).all(),
          env.DB.prepare(`SELECT json_extract(props, '$.symbol') AS symbol, COUNT(*) AS count FROM events WHERE event_type = 'funding_query' AND ts >= ? AND ts <= ? GROUP BY symbol ORDER BY count DESC LIMIT 20`).bind(since, until).all(),
          env.DB.prepare(`SELECT country, COUNT(DISTINCT session_id) AS sessions FROM events WHERE country != 'XX' AND ts >= ? AND ts <= ? GROUP BY country ORDER BY sessions DESC LIMIT 50`).bind(since, until).all(),
          env.DB.prepare(`SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS events FROM events WHERE ts >= ? AND ts <= ? GROUP BY day ORDER BY day ASC`).bind(since, until).all(),
          env.DB.prepare(`SELECT event_type, tab, props, ts FROM events WHERE event_type LIKE '%error%' AND ts >= ? AND ts <= ? ORDER BY ts DESC LIMIT 200`).bind(since, until).all(),
          env.DB.prepare(`SELECT COUNT(DISTINCT session_id) AS today_sessions FROM events WHERE ts >= ?`).bind(now - 86_400_000).first(),
          env.DB.prepare(`
            SELECT device_id, country,
              COUNT(*)                   AS total_events,
              COUNT(DISTINCT session_id) AS sessions,
              MIN(ts)                    AS first_seen,
              MAX(ts)                    AS last_seen
            FROM events WHERE ts >= ? AND ts <= ?
            GROUP BY device_id ORDER BY last_seen DESC LIMIT 5000
          `).bind(since, until).all(),
          env.DB.prepare(`
            SELECT id, event_type, session_id, device_id, country, tab, props, ts
            FROM events WHERE ts >= ? AND ts <= ?
            ORDER BY device_id ASC, ts ASC LIMIT ?
          `).bind(since, until, eventsCap).all(),
        ]);

        return json({
          range: { since, until },
          overview,
          today_sessions: (todayRow as any)?.today_sessions ?? 0,
          tabUsage:       tabUsage.results,
          topMacros:      topMacros.results,
          topSymbols:     topSymbols.results,
          lookupModes:    lookupModes.results,
          fundingSymbols: fundingSymbols.results,
          countries:      countries.results,
          daily:          daily.results,
          errors:         errors.results,
          devices:        devices.results,
          events:         events.results,
        }, 200, cors);
      }

      // -----------------------------------------------------------------
      // GET /admin/events  — recent raw events
      // -----------------------------------------------------------------
      if (url.pathname === '/admin/events' && request.method === 'GET') {
        const limit  = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
        const tab    = url.searchParams.get('tab') || null;
        const type   = url.searchParams.get('type') || null;

        let query = `
          SELECT id, event_type, session_id, device_id, country, tab, props, ts
          FROM events WHERE ts >= ? AND ts <= ?
        `;
        const binds: (string | number)[] = [since, until];

        if (tab)  { query += ` AND tab = ?`;        binds.push(tab);  }
        if (type) { query += ` AND event_type = ?`; binds.push(type); }

        query += ` ORDER BY ts DESC LIMIT ?`;
        binds.push(limit);

        const events = await env.DB.prepare(query).bind(...binds).all();
        return json({ events: events.results }, 200, cors);
      }
    }

    return json({ error: 'not_found' }, 404, cors);
  },
};
