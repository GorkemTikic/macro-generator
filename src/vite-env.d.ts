/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BINANCE_API_KEY?: string;
  readonly VITE_MARGIN_PROXY?: string;
  /** URL of the Cloudflare Analytics Worker (no trailing slash). Leave empty to disable analytics. */
  readonly VITE_ANALYTICS_URL?: string;
  /**
   * Override for the Binance Cloudflare Worker proxy URL used by pricing.ts and LiveTicker.
   *
   *   undefined  → defaults to deployed worker in prod, "" (relative) in dev so Vite's
   *                /fapi and /api/v3 dev proxies forward straight to Binance.
   *   ""         → forces relative-path mode (always uses Vite dev proxy / same-origin).
   *   "<url>"    → uses this URL as the prefix (your own proxy / custom Worker).
   */
  readonly VITE_BINANCE_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
