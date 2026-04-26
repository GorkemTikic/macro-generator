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
  };
}

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
  return typeof env.ADMIN_TOKEN === 'string' &&
    env.ADMIN_TOKEN.length > 0 &&
    auth === `Bearer ${env.ADMIN_TOKEN}`;
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
    // POST /track  — ingest event
    // -------------------------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/track') {
      try {
        const body = await request.json() as Record<string, unknown>;

        const ip      = request.headers.get('CF-Connecting-IP') || '';
        const country = (request.headers.get('CF-IPCountry') || 'XX').slice(0, 2).toUpperCase();
        const ipHash  = ip ? await hashIp(ip) : null;

        const eventType = String(body.event  || 'unknown').slice(0, 64);
        const sessionId = String(body.session_id || '').slice(0, 64);
        const deviceId  = String(body.device_id  || '').slice(0, 64);
        const tab       = String(body.tab  || '').slice(0, 32);
        const props     = JSON.stringify(body.props && typeof body.props === 'object' ? body.props : {});
        const ts        = typeof body.ts === 'number' ? body.ts : Date.now();

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
