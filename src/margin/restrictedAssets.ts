// Binance Margin Restricted Asset helper
//
// Endpoint: GET /sapi/v1/margin/restricted-asset  (MARKET_DATA — requires X-MBX-APIKEY)
// Docs: https://developers.binance.com/docs/margin_trading/market-data/Get-Margin-Restricted-Assets
//
// In production the request is routed through the Cloudflare Worker (/sapi/* route) which
// injects the API key server-side from a Worker secret. The frontend never sends X-MBX-APIKEY
// to the Worker; no key is baked into the JS bundle for production.
//
// In dev, Vite proxies /api-binance/* to api.binance.com, so VITE_BINANCE_API_KEY is still
// needed locally. Set it in .env.local (never commit that file).

const LS_KEY = "binance_api_key_v1";
const CACHE_KEY = "margin_restricted_cache_v1";
const HISTORY_KEY = "margin_restricted_history_v1";
const CACHE_TTL_MS = 60_000; // 60s — rate-limit-friendly refresh cap

// ---------------------------------------------------------------------------
// Proxy / base URL resolution
// ---------------------------------------------------------------------------

// Worker base (VITE_ANALYTICS_URL already set in .env.local and used for analytics;
// the same Worker now also serves /sapi/* for Margin SAPI). Fall back to legacy
// VITE_MARGIN_PROXY for backward compatibility.
const WORKER_URL = (
  import.meta.env?.VITE_ANALYTICS_URL ||
  import.meta.env?.VITE_MARGIN_PROXY ||
  ""
).trim().replace(/\/$/, "");

// True when the Cloudflare Worker proxy is active. The Worker injects BINANCE_API_KEY
// server-side, so the frontend must NOT send X-MBX-APIKEY.
const USE_WORKER_PROXY = !import.meta.env?.DEV && Boolean(WORKER_URL);

// Base(s) for SAPI calls:
//   dev  → Vite proxy at /api-binance (bypasses CORS; local key still required)
//   prod with Worker → single Worker URL (handles auth + CORS + fallback internally)
//   prod fallback → direct api*.binance.com (will fail CORS — only reached if no Worker configured)
const SAPI_BASES: string[] = import.meta.env?.DEV
  ? ["/api-binance"]
  : USE_WORKER_PROXY
  ? [WORKER_URL]
  : [
      "https://api.binance.com",
      "https://api1.binance.com",
      "https://api2.binance.com",
      "https://api3.binance.com",
    ];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RestrictedPayload = {
  openLongRestrictedAsset: string[];
  maxCollateralExceededAsset: string[];
};

export type CachedPayload = RestrictedPayload & { fetchedAt: number };

export type HistoryEntry = {
  ts: number;
  added: { openLong: string[]; maxCollateral: string[] };
  removed: { openLong: string[]; maxCollateral: string[] };
};

// ---------------------------------------------------------------------------
// API key management
// ---------------------------------------------------------------------------

// Build-time shared key (for local dev only). Set VITE_BINANCE_API_KEY in .env.local.
// NOT needed in production when VITE_ANALYTICS_URL is set (Worker injects the key).
const BUILD_TIME_KEY = (import.meta.env?.VITE_BINANCE_API_KEY || "").trim();

/** True when a key is available on the frontend (build-time or localStorage override). */
export function hasSharedKey(): boolean {
  return USE_WORKER_PROXY || Boolean(BUILD_TIME_KEY);
}

/** True when a call can succeed without asking the user for a key. */
export function hasApiKey(): boolean {
  return USE_WORKER_PROXY || Boolean(getApiKey());
}

/** True when the Cloudflare Worker proxy is handling auth server-side. */
export function isUsingWorkerProxy(): boolean {
  return USE_WORKER_PROXY;
}

export function getApiKey(): string {
  try {
    const override = localStorage.getItem(LS_KEY);
    if (override && override.trim()) return override.trim();
  } catch {
    /* ignore */
  }
  return BUILD_TIME_KEY;
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(LS_KEY, key.trim());
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export function clearApiKey(): void {
  setApiKey("");
}

// ---------------------------------------------------------------------------
// Cache + history (localStorage)
// ---------------------------------------------------------------------------

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: CachedPayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistory(list: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* ignore */
  }
}

function diff(prev: string[], next: string[]): { added: string[]; removed: string[] } {
  const p = new Set(prev);
  const n = new Set(next);
  return {
    added: next.filter(a => !p.has(a)),
    removed: prev.filter(a => !n.has(a)),
  };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchOnce(base: string, apiKey: string, signal?: AbortSignal): Promise<RestrictedPayload> {
  const url = `${base}/sapi/v1/margin/restricted-asset`;
  const headers: HeadersInit = {};
  // Only attach key when calling Binance directly (dev Vite proxy or fallback).
  // When USE_WORKER_PROXY the Worker injects the key server-side.
  if (apiKey && !USE_WORKER_PROXY) headers["X-MBX-APIKEY"] = apiKey;

  const res = await fetch(url, { method: "GET", headers, signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  const data = await res.json();
  return {
    openLongRestrictedAsset: Array.isArray(data?.openLongRestrictedAsset) ? data.openLongRestrictedAsset : [],
    maxCollateralExceededAsset: Array.isArray(data?.maxCollateralExceededAsset) ? data.maxCollateralExceededAsset : [],
  };
}

export async function fetchRestricted(opts?: { force?: boolean }): Promise<CachedPayload> {
  const cached = readCache();
  if (!opts?.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const key = getApiKey();
  // Worker proxy handles auth server-side; skip the key check in that case.
  if (!key && !USE_WORKER_PROXY) throw new Error("MISSING_API_KEY");

  let lastErr: unknown = null;
  for (const base of SAPI_BASES) {
    try {
      const data = await fetchOnce(base, key);
      const fresh: CachedPayload = { ...data, fetchedAt: Date.now() };

      if (cached) {
        const oL = diff(cached.openLongRestrictedAsset, fresh.openLongRestrictedAsset);
        const oC = diff(cached.maxCollateralExceededAsset, fresh.maxCollateralExceededAsset);
        if (oL.added.length || oL.removed.length || oC.added.length || oC.removed.length) {
          const hist = readHistory();
          hist.push({
            ts: fresh.fetchedAt,
            added: { openLong: oL.added, maxCollateral: oC.added },
            removed: { openLong: oL.removed, maxCollateral: oC.removed },
          });
          writeHistory(hist);
        }
      }

      writeCache(fresh);
      return fresh;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Failed to fetch from all Binance SAPI hosts");
}

export function getHistory(): HistoryEntry[] {
  return readHistory();
}

export function getCached(): CachedPayload | null {
  return readCache();
}

// ---------------------------------------------------------------------------
// Margin Buy (Long) Risk Control — diagnosis
//
// openLongRestrictedAsset:
//   Binance has activated Margin Buy (Long) Risk Control for this asset during high
//   volatility. Users CANNOT open new long positions or increase existing long exposure.
//   Reduce-only: buy market orders are capped at the net liabilities amount.
//   Net Liabilities = Total Debt + negative balance − Total Asset of that token.
//   If Net Liabilities ≤ 0, buy orders are rejected entirely.
//   Close position and repay debt flows remain allowed.
//
// maxCollateralExceededAsset:
//   The asset has hit Binance's platform-wide maximum collateral threshold.
//   No more of it can be brought into the margin account as collateral until the cap
//   frees up. Existing balances and trading are unaffected.
//
// Refs:
//   Maximum Collateral Limit for Margin Assets:
//   https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09
//   Binance Cross Margin Trading Risk Control:
//   https://www.binance.com/en/support/faq/detail/b83f0a71a1b448aaaad5e970a9936472
// ---------------------------------------------------------------------------

const MAX_COLLATERAL_FAQ_URL = "https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09";
const RISK_CONTROL_FAQ_URL = "https://www.binance.com/en/support/faq/detail/b83f0a71a1b448aaaad5e970a9936472";

export type FaqLink = {
  label: string;
  url: string;
};

export type AssetRestriction = {
  asset: string;
  /** false = buy-long is restricted (or collateral exceeded) */
  canBuyLong: boolean;
  reasonCode: "OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH" | "NONE";
  plainEnglish: string;
  customerReply: string;
  faqUrl: string;
  faqLinks: FaqLink[];
  // kept for backward compat with the UI canTransferIn check
  canTransferIn: boolean;
};

/** @deprecated use AssetRestriction */
export type TransferDiagnosis = AssetRestriction;

export function diagnoseTransfer(asset: string, data: RestrictedPayload): AssetRestriction {
  const a = asset.trim().toUpperCase();
  const inOpenLong = data.openLongRestrictedAsset.includes(a);
  const inMaxCollat = data.maxCollateralExceededAsset.includes(a);

  if (!a) {
    return {
      asset: a,
      canBuyLong: false,
      canTransferIn: false,
      reasonCode: "NONE",
      plainEnglish: "Enter an asset symbol to check restriction status.",
      customerReply: "",
      faqUrl: RISK_CONTROL_FAQ_URL,
      faqLinks: [],
    };
  }

  if (inOpenLong && inMaxCollat) {
    return {
      asset: a,
      canBuyLong: false,
      canTransferIn: false,
      reasonCode: "BOTH",
      plainEnglish:
        `${a} is currently under both Binance Margin Buy (Long) Risk Control AND has exceeded the ` +
        `maximum collateral threshold. Opening or increasing long positions is restricted — only ` +
        `reduce-only trades up to net liabilities are allowed. Close position and repay debt flows ` +
        `are still permitted.`,
      customerReply: buildReply(a, "BOTH"),
      faqUrl: RISK_CONTROL_FAQ_URL,
      faqLinks: faqLinksFor("BOTH"),
    };
  }

  if (inOpenLong) {
    return {
      asset: a,
      canBuyLong: false,
      canTransferIn: false,
      reasonCode: "OPEN_LONG_RESTRICTED",
      plainEnglish:
        `${a} is currently under Binance Margin Buy (Long) Risk Control. During high volatility, ` +
        `Binance has restricted opening new long positions or increasing existing long exposure ` +
        `in ${a} platform-wide. Buy orders are reduce-only: the maximum buy amount equals the ` +
        `net liabilities of ${a} (Total Debt − Total Asset). If net liabilities ≤ 0, buy orders ` +
        `are rejected. Close position and repay debt flows are still allowed.`,
      customerReply: buildReply(a, "OPEN_LONG_RESTRICTED"),
      faqUrl: RISK_CONTROL_FAQ_URL,
      faqLinks: faqLinksFor("OPEN_LONG_RESTRICTED"),
    };
  }

  if (inMaxCollat) {
    return {
      asset: a,
      canBuyLong: true,
      canTransferIn: false,
      reasonCode: "MAX_COLLATERAL_EXCEEDED",
      plainEnglish:
        `${a} has reached Binance's platform-wide maximum collateral threshold. No additional ` +
        `${a} can be transferred into the cross-margin account as collateral until the cap frees ` +
        `up. Existing ${a} balance, trading, and borrowing are unaffected.`,
      customerReply: buildReply(a, "MAX_COLLATERAL_EXCEEDED"),
      faqUrl: MAX_COLLATERAL_FAQ_URL,
      faqLinks: faqLinksFor("MAX_COLLATERAL_EXCEEDED"),
    };
  }

  return {
    asset: a,
    canBuyLong: true,
    canTransferIn: true,
    reasonCode: "NONE",
    plainEnglish: `${a} has no active Binance Margin restrictions at this time. Long positions and collateral transfers are allowed.`,
    customerReply: "",
    faqUrl: RISK_CONTROL_FAQ_URL,
    faqLinks: [],
  };
}

function faqLinksFor(code: "OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH"): FaqLink[] {
  if (code === "OPEN_LONG_RESTRICTED") {
    return [{ label: "Risk Control FAQ", url: RISK_CONTROL_FAQ_URL }];
  }
  if (code === "MAX_COLLATERAL_EXCEEDED") {
    return [{ label: "Max Collateral FAQ", url: MAX_COLLATERAL_FAQ_URL }];
  }
  return [
    { label: "Risk Control FAQ", url: RISK_CONTROL_FAQ_URL },
    { label: "Max Collateral FAQ", url: MAX_COLLATERAL_FAQ_URL },
  ];
}

function buildReply(asset: string, code: "OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH"): string {
  if (code === "OPEN_LONG_RESTRICTED") {
    return (
      `Thanks for reaching out. ${asset} is currently under Binance Margin Buy (Long) Risk Control — ` +
      `this is a platform-wide measure triggered during high volatility and is not specific to your account.\n\n` +
      `What this means:\n` +
      `• Opening new long positions or increasing existing long exposure in ${asset} is restricted.\n` +
      `• Buy market orders are capped at your net liabilities amount ` +
      `(Total Debt of ${asset} − Total Asset of ${asset}). If your net liabilities are 0 or negative, ` +
      `buy orders will be rejected.\n` +
      `• Close position (sell / reduce long) and repay debt flows are still fully allowed.\n\n` +
      `This restriction is temporary and will be lifted once Binance determines that market conditions ` +
      `have stabilised. More info: ${RISK_CONTROL_FAQ_URL}`
    );
  }
  if (code === "MAX_COLLATERAL_EXCEEDED") {
    return (
      `Thanks for reaching out. ${asset} has reached Binance's platform-wide maximum collateral ` +
      `threshold — this is not specific to your account.\n\n` +
      `What this means:\n` +
      `• No additional ${asset} can be transferred into the cross-margin account as collateral until ` +
      `the platform-wide cap frees up.\n` +
      `• Your existing ${asset} balance in margin still functions normally: trading, borrowing, and ` +
      `closing positions are unaffected.\n\n` +
      `You can wait for Binance to lift the cap, or use a different asset for your transfer. ` +
      `More info: ${MAX_COLLATERAL_FAQ_URL}`
    );
  }
  // BOTH
  return (
    `Thanks for reaching out. ${asset} is currently under both Binance Margin Buy (Long) Risk Control ` +
    `AND has exceeded the maximum collateral threshold — these are platform-wide restrictions.\n\n` +
    `What this means:\n` +
    `• Opening or increasing long positions in ${asset} is restricted (reduce-only, capped at net liabilities).\n` +
    `• No additional ${asset} can be transferred in as collateral.\n` +
    `• Close position and repay debt are still allowed.\n\n` +
    `More info:\n` +
    `Risk Control: ${RISK_CONTROL_FAQ_URL}\n` +
    `Maximum Collateral Limit: ${MAX_COLLATERAL_FAQ_URL}`
  );
}

// ---------------------------------------------------------------------------
// Asset badge helper (Full List view)
// ---------------------------------------------------------------------------

export type AssetStatus = {
  asset: string;
  openLongRestricted: boolean;
  maxCollateralExceeded: boolean;
};

export function lookupAsset(asset: string, data: RestrictedPayload): AssetStatus {
  const a = asset.trim().toUpperCase();
  return {
    asset: a,
    openLongRestricted: data.openLongRestrictedAsset.includes(a),
    maxCollateralExceeded: data.maxCollateralExceededAsset.includes(a),
  };
}
