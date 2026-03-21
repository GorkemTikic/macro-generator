# FD Macro Generator 🚀

**FD Macro Generator** is a high-fidelity, premium support automation tool designed for Futures support agents. It generates precise, data-backed macro responses for common user inquiries (Slippage, Stop Market triggers, Funding Rates) by pulling real-time 1m OHLC data directly from the Exchange API.

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
│   ├── components/       # UI Logic & Interactivity
│   ├── context/          # Global State Management
│   ├── macros/           # Core Logic & Response Templates
│   ├── locales.ts        # Multi-language Support (EN/TR)
│   ├── pricing.ts        # API Services & Data Fetching
│   └── styles.css        # Central Design System
├── .github/workflows/    # CI/CD Automation
└── DEPLOYMENT_GUIDE.md   # Deployment instructions
```

### 📄 Comprehensive File Map

| File / Directory | Responsibility | Dependencies |
|:--- |:--- |:--- |
| `src/main.tsx` | Entry point. Mounts the React tree. | `App.tsx`, `AppContext.tsx` |
| `src/App.tsx` | Main Layout. Manages navigation (Tabs) and global Language state. | `MacroGenerator.tsx`, `FundingMacro.tsx`, `PriceLookup.tsx` |
| `src/pricing.ts` | Centralized data fetching. Handles Exchange 1m OHLC and Precision data. | `Futures FAPI` |
| `src/components/MacroGenerator.tsx` | The primary interface for generating trade-related macros (TP/SL/Slippage). | `renderMacro`, `pricing.ts` |
| `src/components/FundingMacro.tsx` | Dedicated UI for complex funding rate calculation macros. | `pricing.ts`, `helpers.ts` |
| `src/components/AverageCalculator.tsx` | Calculates Position History Open & Close average prices dynamically from copy-pasted Trade History grids. | `locales.ts` |
| `src/components/LiveTicker.tsx` | Real-time header ticker for key symbols (BTC, ETH, etc.). | `pricing.ts` |
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
3. **Build for Production**:
   ```bash
   npm run build
   ```

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

*Last Updated: 2026-03-21*