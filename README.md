# FD Macro Generator 🚀

**FD Macro Generator** is a high-fidelity, premium support automation tool designed for Futures support agents. It generates precise, data-backed macro responses for common user inquiries (Slippage, Stop Market triggers, Funding Rates) by pulling real-time 1m OHLC data directly from the Exchange API.

The app also bundles a **Balance Log Analyzer** tab (originally a separate project) for parsing and reconciling Binance USDⓈ-M Futures Balance Log exports — see `src/features/balance-log/`. New runtime dependencies introduced by this tool: `recharts`, `html2canvas`.

---

## 🏗️ Technical Architecture

The application is built with a **Stateless Macro Engine** architecture. UI components capture user inputs, fetch necessary market data via a centralized pricing service, and pass them to pure formatting functions (macros) to generate consistent, authoritative responses.

### Key Technologies
- **Core**: React 18, Vite, TypeScript.
- **Data Source**: Futures Public API (`fapi`).
- **Styling**: Vanilla CSS with a **Premium Dark Mode** design system (glassmorphism, vibrant gradients).
- **Deployment**: Automated GitHub Pages via GitHub Actions.

---

## 📂 Project Structure & File Mapping

### 🌲 Project Tree
```text
.
├── src/
│   ├── components/                    # UI Logic & Interactivity
│   ├── context/                       # Global State Management
│   ├── features/
│   │   └── balance-log/               # Balance Log Analyzer (integrated tab)
│   │       ├── BalanceLogAnalyzer.tsx # Top-level component
│   │       ├── balance-log.css        # Generated, scoped under .balance-log-app
│   │       ├── balance-log-overrides.css # Manual integration tweaks
│   │       ├── components/            # Feature components (incl. StoryDrawer)
│   │       └── lib/                   # Parser, reconciliation, story, formatters (+ Vitest)
│   ├── macros/                        # Core Logic & Response Templates
│   ├── analytics/                     # Tracking client + Excel export
│   ├── locales.ts                     # Host language support (EN/TR)
│   ├── pricing.ts                     # API Services & Data Fetching
│   └── styles.css                     # Central Design System
├── scripts/
│   └── scope-balance-log-css.cjs      # Regenerates balance-log.css from upstream
├── .github/workflows/                 # CI/CD Automation
├── vitest.config.ts                   # Test config (jsdom, includes lib/*.test.ts)
└── DEPLOYMENT_GUIDE.md                # Deployment instructions
```

### 📄 Comprehensive File Map

| File / Directory | Responsibility | Dependencies |
|:--- |:--- |:--- |
| `src/main.tsx` | Entry point. Mounts the React tree. | `App.tsx`, `AppContext.tsx` |
| `src/App.tsx` | Main Layout. Manages navigation (Tabs) and global Language state. | `MacroGenerator.tsx`, `FundingMacro.tsx`, `PriceLookup.tsx` |
| `src/pricing.ts` | Centralized data fetching. Handles Exchange 1m OHLC and Precision data. | `Futures FAPI` |
| `src/components/MacroGenerator.tsx` | The primary interface for generating trade-related macros (TP/SL/Slippage). | `renderMacro`, `pricing.ts` |
| `src/components/FundingMacro.tsx` | Dedicated UI for complex funding rate calculation macros. | `pricing.ts`, `helpers.ts` |
| `src/components/AverageCalculator.tsx` | Calculates Position History Open & Close average prices dynamically from copy-pasted Trade History grids. Features a Running Inventory algorithm for precise Position Flip (Long/Short reversal) detection and bilingual reporting. | `locales.ts` |
| `src/components/LiveTicker.tsx` | Real-time header ticker for key symbols (BTC, ETH, etc.). | `pricing.ts` |
| `src/features/balance-log/` | **Balance Log Analyzer** tab — paste a Binance USDⓈ-M Futures Balance Log to get a top-level summary (per-type / per-symbol), Swaps & Events, Diagnostics, and the Balance Story drawer (Narrative / Agent Audit / Charts / Raw). The Audit tab runs full USDⓈ-M reconciliation via `reconcileUsdMFuturesBalance` (start / end / baseline / transfer-at-start / current wallet → expected vs actual + match/mismatch status). Originally a standalone app at `GorkemTikic/balance-log-analyzer`. CSS is scoped under `.balance-log-app` (see `balance-log.css`, regenerated from upstream by `scripts/scope-balance-log-css.cjs`). | `recharts`, `html2canvas` |
| `src/features/balance-log/BalanceLogAnalyzer.tsx` | Top-level component for the Balance Log tab. App.tsx mounts it on the first activation of the tab and keeps it mounted thereafter (toggled with `display:none`) so pasted rows survive switching to other tabs. State only resets on a full page refresh. recharts and html2canvas are dynamically imported so users who never open the tab don't pay their bundle cost. Receives host `lang` + `uiStrings` for chrome translation; the StoryDrawer carries its own 10-language i18n via `lib/i18n.ts`. | feature-internal |
| `src/macros/index.ts` | Macro Registry. Exports `renderMacro` and maps IDs to functions. | All individual macro files |
| `src/macros/helpers.ts` | **Critical**: Centralized formatting (fmtNum) and OHLC block builders. | Global |
| `src/macros/smart_detect.ts` | NLP-lite intent detection; parses user intent from free-text input. | `MacroGenerator.tsx` |
| `src/context/AppContext.tsx` | Provides `activeSymbol` and shared context to components. | React Context API |
| `src/styles.css` | Implements the **FD Premium** aesthetic (Glassmorphism, Neon accents). | Global |

---

## ⚙️ Setup & Execution

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Opens at http://localhost:5173/macro-generator/.
3. **Run Tests**:
   ```bash
   npm test               # 79 Vitest tests across the Balance Log lib/
   npm run test:trailing  # Trailing-stop integration test against the pricing engine
   ```
4. **Build for Production**:
   ```bash
   npm run build
   ```

### Local development & the production proxy

All Binance API calls flow through the deployed Cloudflare Worker
(`https://macro-analytics.grkmtkc94.workers.dev`) in production — the Worker has
its own ALLOWED_ORIGIN allowlist scoped to the GitHub Pages origin and rejects
`http://localhost:5173` with `Access-Control-Allow-Origin: null`.

To make local dev work without modifying the deployed Worker, `pricing.ts` and
`LiveTicker.tsx` default `VITE_BINANCE_PROXY` to `""` in dev mode. Empty proxy →
relative URLs (`/fapi/...`, `/api/v3/...`) which Vite's dev proxy (see
`vite.config.ts`) forwards directly to Binance — same-origin from the browser's
perspective, no CORS handshake needed.

`VITE_BINANCE_PROXY` overrides:
- **unset** → defaults: deployed Worker in prod, `""` (Vite proxy) in dev.
- **`""`** → forces relative-path mode in any environment (useful if you host
  your own dev proxy).
- **`"https://your-worker"`** → uses that URL as the prefix.

### Regenerating Balance Log scoped CSS

`src/features/balance-log/balance-log.css` is a generated file. If the upstream
`balance-log-analyzer` styles change, regenerate via:

```bash
node scripts/scope-balance-log-css.cjs
```

The script climbs four levels up to find the sibling `Balance Log/` repo. Tweak
the `SRC` constant if you've moved the upstream project. For local edits that
should not be wiped on regeneration, append rules to
`src/features/balance-log/balance-log-overrides.css`.

---

## 📜 Maintenance Protocol (Sync-on-Change)

> [!IMPORTANT]
> **This project follows a 'Sync-on-Change' rule for AI Agents and Maintainers.**
> 1. **Code Update**: Every modification, addition, or deletion of a file must be evaluated against this README.
> 2. **Map Sync**: If a file's responsibility changes or a new dependency is added, the **File Map** above must be updated immediately.
> 3. **Logic Sync**: If the data flow or architecture logic changes, the **Technical Architecture** section must be revised.
> 4. **AI Parsing**: Explanations must remain keyword-rich to ensure future LLM sessions can parse the project state without deep-scanning files.

---

## 🤖 AI Compatibility Map (Technical Summary)

- **Entry**: `src/main.tsx` -> `src/App.tsx`
- **State**: `src/context/AppContext.tsx`
- **API Entry**: `src/pricing.ts`
- **Logic Core**: `src/macros/` (Stateless functions)
- **Styling**: `src/styles.css` (Target classes like `.panel`, `.btn`, `.glass`)
- **Feature Boundary**: `src/features/balance-log/` (CSS-scoped under `.balance-log-app`; never imports from outside the folder; consumed only via `App.tsx` and the host's `Tab` analytics type)
- **Tests**: `npm test` runs Vitest against `src/features/balance-log/lib/*.test.ts`. `npm run test:trailing` runs `tsx test-trailing-stop.ts` for the pricing engine.

*Last Updated: 2026-05-03*