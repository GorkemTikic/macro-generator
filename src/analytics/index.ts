// Product analytics client.
// Sends events to VITE_ANALYTICS_URL (Cloudflare Worker).
// Session ID: sessionStorage — resets on page close.
// Device ID:  localStorage  — persists across sessions.
// Silent on every failure — analytics must never break the app.

const ENDPOINT = (import.meta.env.VITE_ANALYTICS_URL ?? '').replace(/\/$/, '');

export type Tab = 'macros' | 'lookup' | 'funding' | 'average' | 'margin' | 'admin';

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
  | 'funding_query'
  | 'funding_error'
  | 'average_calc_run'
  | 'margin_view'
  | 'margin_refresh'
  | 'margin_error'
  | 'error';

export interface TrackPayload {
  event: EventType;
  tab?: Tab | string;
  props?: Record<string, string | number | boolean | null>;
}

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('_fd_did');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('_fd_did', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('_fd_sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('_fd_sid', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export function track(payload: TrackPayload): void {
  if (!ENDPOINT) return;

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
