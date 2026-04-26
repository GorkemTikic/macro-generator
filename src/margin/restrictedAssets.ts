// Binance Margin Restricted Asset helper
//
// Endpoint: GET /sapi/v1/margin/restricted-asset  (MARKET_DATA — requires X-MBX-APIKEY header only)
// Docs: https://developers.binance.com/docs/margin_trading/market-data/Get-Margin-Restricted-Assets
//
// The API key is stored in localStorage (client-entered) so it is NOT baked into the
// GitHub Pages deployment. Each agent enters their own key once.

const LS_KEY = "binance_api_key_v1";
const CACHE_KEY = "margin_restricted_cache_v1";
const HISTORY_KEY = "margin_restricted_history_v1";
const CACHE_TTL_MS = 60_000; // 60s — refresh limit to be friendly to rate limits

// Resolve which base URL(s) to call.
// - Dev: Vite proxies "/api-binance/*" → "https://api.binance.com/*" (bypasses CORS).
// - Prod: if VITE_MARGIN_PROXY is set (e.g. a Cloudflare Worker URL), use it; otherwise
//   fall back to the direct api.binance.com hosts (which will fail if CORS blocks).
const PROD_PROXY = (import.meta.env?.VITE_MARGIN_PROXY || "").trim().replace(/\/$/, "");
const SAPI_BASES: string[] = import.meta.env?.DEV
  ? ["/api-binance"]
  : PROD_PROXY
  ? [PROD_PROXY]
  : [
      "https://api.binance.com",
      "https://api1.binance.com",
      "https://api2.binance.com",
      "https://api3.binance.com",
    ];

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

// Build-time shared key (baked in for all agents). Supplied via .env.local
// with VITE_BINANCE_API_KEY=... before `npm run build`. Do NOT commit .env.local.
const BUILD_TIME_KEY = (import.meta.env?.VITE_BINANCE_API_KEY || "").trim();

export function hasSharedKey(): boolean {
  return Boolean(BUILD_TIME_KEY);
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

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
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
    // cap at 50 entries
    const trimmed = list.slice(-50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
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

async function fetchOnce(base: string, apiKey: string, signal?: AbortSignal): Promise<RestrictedPayload> {
  const url = `${base}/sapi/v1/margin/restricted-asset`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-MBX-APIKEY": apiKey },
    signal,
  });
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
  if (!key) throw new Error("MISSING_API_KEY");

  let lastErr: unknown = null;
  for (const base of SAPI_BASES) {
    try {
      const data = await fetchOnce(base, key);
      const fresh: CachedPayload = { ...data, fetchedAt: Date.now() };

      // history diff
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

// ----- Transfer-in eligibility -----
//
// The Binance FAQ (dca77ef9...) explains that both lists are about TRANSFERRING AN
// ASSET IN to the cross-margin account — not about whether you can trade, borrow,
// or close positions using that asset. Existing balances are not affected.
//
// - openLongRestrictedAsset: transfers in are blocked because the asset would be
//   used to open new long-leveraged exposure that Binance is currently capping.
// - maxCollateralExceededAsset: the asset has hit Binance's platform-wide max
//   collateral threshold; more of it cannot be brought in as collateral.

const FAQ_URL = "https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09";

export type TransferDiagnosis = {
  asset: string;
  canTransferIn: boolean;
  reasonCode: "OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH" | "NONE";
  plainEnglish: string;
  customerReply: string;
  faqUrl: string;
};

export function diagnoseTransfer(asset: string, data: RestrictedPayload): TransferDiagnosis {
  const a = asset.trim().toUpperCase();
  const inOpenLong = data.openLongRestrictedAsset.includes(a);
  const inMaxCollat = data.maxCollateralExceededAsset.includes(a);

  if (!a) {
    return {
      asset: a,
      canTransferIn: false,
      reasonCode: "NONE",
      plainEnglish: "Enter an asset symbol to check transfer eligibility.",
      customerReply: "",
      faqUrl: FAQ_URL,
    };
  }

  if (inOpenLong && inMaxCollat) {
    return {
      asset: a,
      canTransferIn: false,
      reasonCode: "BOTH",
      plainEnglish: `${a} cannot be transferred into the cross-margin account. It is currently on both Binance's open-long restriction list AND has exceeded the max collateral threshold. Existing ${a} balance in margin can still be traded, borrowed against, or used to close positions — only new transfers in are blocked.`,
      customerReply: buildReply(a, "BOTH"),
      faqUrl: FAQ_URL,
    };
  }

  if (inOpenLong) {
    return {
      asset: a,
      canTransferIn: false,
      reasonCode: "OPEN_LONG_RESTRICTED",
      plainEnglish: `${a} cannot be transferred into the cross-margin account right now because it is on Binance's open-long restriction list — i.e. Binance is currently capping new long-leveraged exposure in this asset platform-wide. Your existing ${a} balance in margin is not affected: you can still trade it, borrow against it, or close positions.`,
      customerReply: buildReply(a, "OPEN_LONG_RESTRICTED"),
      faqUrl: FAQ_URL,
    };
  }

  if (inMaxCollat) {
    return {
      asset: a,
      canTransferIn: false,
      reasonCode: "MAX_COLLATERAL_EXCEEDED",
      plainEnglish: `${a} cannot be transferred into the cross-margin account right now because it has reached Binance's maximum collateral threshold platform-wide. Your existing ${a} balance in margin still functions as collateral and can still be traded or borrowed against — only new transfers in are blocked until the cap frees up.`,
      customerReply: buildReply(a, "MAX_COLLATERAL_EXCEEDED"),
      faqUrl: FAQ_URL,
    };
  }

  return {
    asset: a,
    canTransferIn: true,
    reasonCode: "NONE",
    plainEnglish: `${a} can be transferred into the cross-margin account. It is not on either Binance restriction list at this time.`,
    customerReply: "",
    faqUrl: FAQ_URL,
  };
}

function buildReply(asset: string, code: "OPEN_LONG_RESTRICTED" | "MAX_COLLATERAL_EXCEEDED" | "BOTH"): string {
  const intro = `Thanks for reaching out. The reason you can't transfer ${asset} into your cross-margin account right now is a platform-wide restriction from Binance — not something specific to your account.`;
  let body = "";
  if (code === "OPEN_LONG_RESTRICTED") {
    body = ` ${asset} is currently on Binance's open-long restriction list, which temporarily caps new long-leveraged exposure in this asset across all users. Your existing ${asset} balance in margin is not affected: you can still trade it, close positions, or borrow against it — only new transfers in are blocked.`;
  } else if (code === "MAX_COLLATERAL_EXCEEDED") {
    body = ` ${asset} has reached Binance's maximum collateral threshold platform-wide, so no more ${asset} can be brought in as collateral until the cap frees up. Your existing ${asset} balance in margin still works normally — you can still trade, borrow against it, or close positions. Only new transfers in are blocked.`;
  } else {
    body = ` ${asset} is currently on both Binance's open-long restriction list and has exceeded the max collateral threshold, so new transfers in are blocked. Your existing ${asset} balance in margin still works normally.`;
  }
  const outro = ` More info: ${FAQ_URL}. In the meantime you can either wait for Binance to lift the restriction, or use a different asset for the transfer.`;
  return intro + body + outro;
}

// Kept for the Full List / Asset badge view.
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
