/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BINANCE_API_KEY?: string;
  readonly VITE_MARGIN_PROXY?: string;
  /** URL of the Cloudflare Analytics Worker (no trailing slash). Leave empty to disable analytics. */
  readonly VITE_ANALYTICS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
