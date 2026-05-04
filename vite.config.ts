import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: Set "base" to your repo name for GitHub Pages.
// Example: if repo is https://github.com/your-org/order-macro-app
// base must be "/order-macro-app/"
export default defineConfig({
  plugins: [react()],
  base: "/macro-generator/",
  server: {
    // Dev-only proxies so the browser can call Binance APIs without CORS issues.
    //
    // In production, all of these calls flow through the Cloudflare Worker
    // (VITE_BINANCE_PROXY → macro-analytics...workers.dev). The Worker has
    // an ALLOWED_ORIGIN allowlist that does NOT include http://localhost:5173,
    // so localhost dev requests are rejected with `Access-Control-Allow-Origin: null`
    // and the LiveTicker / Price Lookup / Macro Generator / Funding Macro tools
    // all fail. To keep production untouched while making dev work, we proxy
    // futures (/fapi/*) and spot (/api/v3/*) directly to Binance from the dev
    // server — Binance is fine with server-to-server requests.
    //
    // pricing.ts and LiveTicker.tsx default VITE_BINANCE_PROXY to "" in dev mode,
    // which makes them build relative URLs like `/fapi/v1/premiumIndex?...` that
    // hit these proxies.
    proxy: {
      // All Binance REST traffic (futures /fapi, spot /api/v3, and margin /sapi
      // via /api-binance) is routed through the deployed Cloudflare Worker. The
      // Worker performs its own server-side multi-host fallback across
      // fapi/fapi1/fapi2/fapi3/api/api1/... so a transient CloudFront blip on
      // the primary host (which has bitten this dev setup before — see
      // wiki/bugs/2026-04-27-binance-fapi-cors-on-pages.md) doesn't break local
      // dev. Server-to-server: the Worker's ALLOWED_ORIGIN CORS check only
      // affects browser responses, not Vite's dev-time fetch.
      "/api-binance": {
        target: "https://macro-analytics.grkmtkc94.workers.dev",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api-binance/, ""),
      },
      "/fapi": {
        target: "https://macro-analytics.grkmtkc94.workers.dev",
        changeOrigin: true,
        secure: true,
      },
      "/api/v3": {
        target: "https://macro-analytics.grkmtkc94.workers.dev",
        changeOrigin: true,
        secure: true,
      },
      // Analytics Worker — POST /track and GET /admin/* both flow through the
      // deployed Cloudflare Worker. The Worker's ALLOWED_ORIGIN allowlist
      // rejects http://localhost:5173 with `Access-Control-Allow-Origin: null`,
      // which makes browser fetches CORS-fail in dev. Vite forwards the
      // request server-side (no CORS preflight) and the browser sees a clean
      // same-origin response. analytics/index.ts and AdminDashboard.tsx
      // default to relative URLs in DEV so these proxies kick in.
      "/track": {
        target: "https://macro-analytics.grkmtkc94.workers.dev",
        changeOrigin: true,
        secure: true,
      },
      "/admin": {
        target: "https://macro-analytics.grkmtkc94.workers.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
