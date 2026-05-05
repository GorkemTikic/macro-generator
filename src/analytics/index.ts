// Product analytics client.
// Sends events to VITE_ANALYTICS_URL (Cloudflare Worker).
// Session ID: sessionStorage — resets on page close.
// Device ID:  localStorage  — persists across sessions.
// Silent on every failure — analytics must never break the app.

// Tri-state for the analytics endpoint:
//   ANALYTICS_DISABLED = true  → no env var set in prod → tracking off
//   ENDPOINT = ""              → dev mode → use relative /track + /admin URLs
//                                that vite.config.ts forwards to the Worker
//   ENDPOINT = "https://..."   → prod with VITE_ANALYTICS_URL set → direct
//                                fetch (Worker's ALLOWED_ORIGIN allows the
//                                GitHub Pages origin)
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env) ?? ({} as ImportMetaEnv);
const ANALYTICS_DISABLED = !_ENV.DEV && !_ENV.VITE_ANALYTICS_URL;
const ENDPOINT = (_ENV.DEV ? '' : (_ENV.VITE_ANALYTICS_URL ?? '')).replace(/\/$/, '');

export type Tab = 'macros' | 'faq' | 'lookup' | 'funding' | 'average' | 'margin' | 'balanceLog' | 'admin';

/** Human-readable labels for each tab id. Used by the Admin Dashboard so the
 *  Tab Usage chart shows "Balance Log" rather than "balanceLog". */
export const TAB_LABELS: Readonly<Record<Tab, string>> = {
  macros:     'Macros',
  faq:        'FAQ Searcher',
  lookup:     'Price Lookup',
  funding:    'Funding Macro',
  average:    'Position History',
  margin:     'Margin Restrictions',
  balanceLog: 'Balance Log',
  admin:      'Admin',
};

export type EventType =
  | 'page_view'
  | 'tab_switch'
  | 'lang_switch'
  | 'macro_generated'
  | 'macro_error'
  | 'grid_paste_used'
  | 'lookup_query'
  | 'lookup_error'
  | 'trailing_stop_checked'
  | 'gap_explainer_checked'
  | 'faq_search'
  | 'faq_copy'
  | 'funding_query'
  | 'funding_error'
  | 'average_calc_run'
  | 'margin_view'
  | 'margin_refresh'
  | 'margin_error'
  | 'error';

export interface TrackPayload {
  event: EventType;
  tab?: Tab;
  props?: Record<string, string | number | boolean | null>;
}

// crypto.randomUUID is unsupported on Safari ≤ 15.3 / older Edge — fall back
// to a Math.random hex string that's good enough for analytics device/session
// keys (we don't depend on cryptographic uniqueness).
function uuidLike(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* fall through */ }
  // RFC4122-shaped fallback so the value still parses as a UUID downstream.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('_fd_did');
    if (!id) {
      id = uuidLike();
      localStorage.setItem('_fd_did', id);
    }
    return id;
  } catch {
    // localStorage blocked (incognito, restricted contexts) — issue a fresh
    // per-pageload id so multiple incognito browsers don't collide on
    // 'unknown' and pollute analytics.
    return `eph-${uuidLike()}`;
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('_fd_sid');
    if (!id) {
      id = uuidLike();
      sessionStorage.setItem('_fd_sid', id);
    }
    return id;
  } catch {
    return `eph-${uuidLike()}`;
  }
}

export function track(payload: TrackPayload): void {
  if (ANALYTICS_DISABLED) return;

  const body = JSON.stringify({
    ...payload,
    device_id: getDeviceId(),
    session_id: getSessionId(),
    ts: Date.now(),
  });

  try {
    // sendBeacon is fire-and-forget and survives page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(`${ENDPOINT}/track`, body);
    } else {
      fetch(`${ENDPOINT}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // silent — analytics never crashes the app
  }
}

// Debounced track — use for high-frequency inputs (e.g. AverageCalculator).
// Fires once after `delay` ms of silence.
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function trackDebounced(payload: TrackPayload, delay = 1500): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    track(payload);
    _debounceTimer = null;
  }, delay);
}
