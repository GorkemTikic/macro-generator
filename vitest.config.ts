import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Lib tests have no DOM dependencies and parse logic is the bulk of value;
    // we keep them under src/ so the existing tsconfig "include" still picks
    // them up for editor IntelliSense.
    coverage: {
      provider: "v8",
      include: ["src/features/balance-log/lib/**/*.ts"],
      exclude: ["src/features/balance-log/lib/**/*.test.ts"]
    }
  }
});
