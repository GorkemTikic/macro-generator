import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: Set "base" to your repo name for GitHub Pages.
// Example: if repo is https://github.com/your-org/order-macro-app
// base must be "/order-macro-app/"
export default defineConfig({
  plugins: [react()],
  base: "/macro-generator/"
});
