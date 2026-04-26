import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: Set "base" to your repo name for GitHub Pages.
// Example: if repo is https://github.com/your-org/order-macro-app
// base must be "/order-macro-app/"
export default defineConfig({
  plugins: [react()],
  base: "/macro-generator/",
  server: {
    // Dev-only proxy so the browser can call Binance SAPI without CORS issues.
    // MarginRestrictions hits /api-binance/... in dev; Vite forwards to api.binance.com.
    // In production you need either a CORS-enabled proxy URL (set VITE_MARGIN_PROXY)
    // or a serverless worker.
    proxy: {
      "/api-binance": {
        target: "https://api.binance.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api-binance/, ""),
      },
    },
  },
});
