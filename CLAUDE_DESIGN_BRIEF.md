# Claude Design brief: **Futures DeskMate** (workspace redesign)

## 1. Identity & context

You are redesigning an internal **customer-support agent workspace** currently shipped as "FD Macro Generator". The product is being renamed to **Futures DeskMate** — a single-page React/Vite app where Binance Futures support agents handle live tickets: generating macros, looking up historical prices, parsing balance logs, calculating averages, and triaging margin restrictions. There is also a token-gated admin analytics view.

Tone: friendly, useful, **operational support tool** — not a marketing site, not a generic AI dashboard, not a fintech retail product. The agents using it have many tabs open and need dense, scannable information with copy-ready outputs. Most are bilingual EN/TR.

The implementation already exists. Your job is to redesign the visual system, layout, and component patterns. **Do not invent features that don't exist below.**

## 2. Verified feature inventory (do not exceed this list)

### Top-level navigation (7 tabs, last is token-gated)
1. **Macro Generator** (`macros`) — primary tab on load
2. **Price Lookup** (`lookup`)
3. **Funding Macro** (`funding`)
4. **Average Price Calculator** (`average`) — full label *Position History Open & Close Price Calculator*
5. **Margin Restrictions** (`margin`)
6. **Balance Log Analyzer** (`balanceLog`)
7. **Admin** (`admin`) — only visible if `_fd_admin_token` exists in localStorage

### Global header chrome
- Product name "Futures DeskMate"
- Short subtitle (one line, e.g. "Binance Futures support workspace")
- Small badge "Binance 1m OHLC" (data-source disclaimer)
- **Live Ticker** — single symbol following the active context (default BTCUSDT), shows price, flashes green/red on up/down ticks via WebSocket. Stays present across all tabs.
- EN / TR language switcher

### Tab 1 — Macro Generator
- Macro dropdown (7 real macros): `mark_not_reached_user_checked_last`, `stop_market_loss_higher_than_expected_mark_price`, `stop_market_loss_higher_than_expected_last_price`, `tp_slippage_mark_price`, `tp_slippage_last_price`, `stop_limit_mark_price_not_filled`, `stop_limit_last_price_not_filled`
- Output Mode segmented control: **Detailed / Professional** vs **Summary / Simplified**
- Tone segmented control: Standard (Educational) — auto-set by Smart Detect to Empathetic / Professional / Direct
- "Smart Detect (Describe Issue)" textarea — paste customer complaint, auto-detects macro + tone (secondary, can collapse)
- "📋 Paste Order Grid Data" modal — accepts 26-27 line raw paste, auto-fills the form. Auto-fills these fields: Order ID, Symbol, Side, Price, Position Side, Status, Type, Working Type, Stop Price, Liquidation, Activate Price, Price Rate, Price Protect, Price Match
- Manual form fields below the dropdown
- Big "Generate" CTA button
- Generated output area with **Copy** button (copy success → toast, no alert)

### Tab 2 — Price Lookup
- Sticky **Spot / Futures** toggle
- Mode selector — six modes: **Trigger Minute** (Mark+Last), **Range** (High/Low), **Last 1s** (1-second precision, max 7 days), **Find Price** (target price within window), **Trailing Stop Simulation**, **Gap Explainer** (Mark vs Last divergence)
- Per-mode inputs: Symbol, At/From/To datetime (UTC), target price, activation price + callback rate (trailing), gap trigger type ("none" / MARK / LAST)
- "Present Time" helper button (sets to 1 minute ago UTC+0)
- Output area — different shape per mode: closest-miss analysis card, gap analysis with both Mark & Last summary, trailing-stop step-by-step + agent customer-message block

### Tab 3 — Funding Macro
- Symbol, Funding Time (UTC), Position Side (Long/Short), Position Size, Funding Interval (hours, default 8)
- "Apply Precision" helper button
- "✨ Generate Funding Macro" CTA
- Output with copy button

### Tab 4 — Average Price Calculator
- Single large monospace textarea: paste raw Binance Futures Trade History (any extraneous text is ignored by the parser)
- Clear-data button + Calculate button
- Output: per-position-phase blocks, **HEDGE LONG / HEDGE SHORT** badges, FLIP-detected callout, multi-position narration, "Copy Full Explanation" button per phase
- Pure local calculation, no API

### Tab 5 — Margin Restrictions
- Three mode cards (keep as cards, not sub-tabs): **Check Asset** · **List All** · **History (snapshot diff)**
- **Check Asset**: input single asset code (e.g. CHZ) → diagnosis card → auto-generated customer reply in copy-ready textarea
- **List All**: filter input + two columns: 🔴 *Margin Buy (Long) Restricted* (`openLongRestrictedAsset`), 🔴 *Max Collateral Exceeded* (`maxCollateralExceededAsset`)
- **History**: list of timestamped diffs — added vs removed entries with ± icons; this is a snapshot diff, not a live feed
- Refresh button + "Data as of <timestamp>" indicator

### Tab 6 — Balance Log Analyzer
**Header strip**: Title, "One Page Summary" subtitle, **Clear** button (secondary), **Open Balance Story** (primary, opens drawer).

**Mid section**: Performance Highlights card + PnL & Fees Breakdown card (`FilterBar`), then a `TypeFilter` chip strip (per balance-log type, with Show All / Hide All).

**Paste zone** (`GridPasteBox`): contenteditable dropzone "Click here and press Ctrl/⌘+V to paste from the Balance Log web page" + preview of detected rows × cols + "Use & Parse" CTA.

**Three KPI tiles**: Rows (total) · Rows (filtered) · Symbols (filtered).

**Four inner tabs** (segmented pill control):
1. **Summary** — grid of `RpnTable` cards, one per balance-log type detected (Realized PnL, Funding, Commission, Insurance Clearance, etc.). Each card shows totals per asset with positive/negative coloring.
2. **By Symbol** — wide table: Symbol · Realized PnL · Funding · Trading Fees · Insurance Clearance Fee · Final Net (All Fees) · Actions (Copy / Export PNG). Heavy data — must stay readable. Negative red, positive green.
3. **Swaps & Events** — coin-swap ledger + auto-exchange ledger + Event Contracts split into **Orders** (negative) and **Payout** (positive).
4. **Diagnostics** — totals (pasted / included / excluded / invalid / after-filters / symbols / types), format detected, header used, raw-type histogram, warnings list, excluded rows, invalid rows.

**Balance Story drawer** (right-side modal, lazy-loaded, ~980px wide). Already has Escape-key close, focus-friendly, `aria-labelledby`. Drawer header has a 10-language dropdown (independent from host EN/TR). Four segmented tabs:
- **Narrative** — composed story per group/asset, copy + export PNG
- **Agent Audit** — inputs: Start time (required), End time (optional), Initial balances (multi-line "ASSET amount"), Transfer at start (amount + asset), Current wallet balances (multi-line). Output: per-asset reconciliation table (Asset · Baseline · Transfer · Activity · Expected · Actual · Difference · Status badge `match`/`mismatch`/`unknown`) + warnings + Copy Audit button.
- **Charts** — recharts: daily performance + asset distribution
- **Raw** — currently a placeholder; design as either a hint card OR a real raw-rows view (open question — design both states)

### Tab 7 — Admin (token-gated)
**Login screen** when no token: password input + "Enter" button + small note "Admin token from the Cloudflare Worker secret".

**Authenticated layout**:
- Header: "Analytics Dashboard" + small subtitle "Internal use only", Range picker (`Today / 7 days / 30 days / 90 days`), Refresh button, "⬇ Export Workbook (.xlsx)", Logout
- View switcher (3 tabs): **Overview · Recent Events · Devices**

**Overview**:
- 5 KPI cards: Total Events · Sessions (sub: "Today: N") · Unique Devices · Unique IPs (hashed) · Countries
- "Sessions per Day" — bar chart, full range zero-filled
- 2-col rows of horizontal bar charts: Tab Usage / Top Symbols, Top Macro Types / Lookup Modes, Funding Top Symbols / Countries
- "Recent Errors" table when `errors.length > 0`: Time · Type · Tab · Details
- **Important**: tab keys must be displayed via the `TAB_LABELS` map (`balanceLog → "Balance Log"`, etc.), never as raw camelCase

**Recent Events**:
- Table: Time (UTC) · Event (badge) · Tab (humanized) · Country · Props (truncated, hover for full)
- Load button

**Devices**:
- Table: Last Seen · Device ID (truncated `xxxxxxxx…`) · Country · Sessions · Events · First Seen
- Click-to-expand row: per-device event timeline

**Privacy boundary**: this dashboard never sees pasted balance-log content, parsed wallet balances, customer text, or generated macro outputs. Only safe metadata is tracked: tab switches, mode selections, error categories. The redesign must NOT invent any panel that would require recording financial data.

## 3. Real telemetry event types (do not invent more)
`page_view`, `tab_switch`, `lang_switch`, `macro_generated`, `macro_error`, `grid_paste_used`, `lookup_query`, `lookup_error`, `trailing_stop_checked`, `gap_explainer_checked`, `funding_query`, `funding_error`, `average_calc_run`, `margin_view`, `margin_refresh`, `margin_error`, `error`.

## 4. Design goals (in priority order)
1. **Density without anxiety** — agents handle many tickets; the workspace must feel calm and orderly even when a Balance Log of 200 rows is visible.
2. **Copy-ready outputs are first-class** — every generated message / customer reply must look like a quotable block with an unmissable Copy affordance.
3. **Positive vs negative numbers** — must be instantly recognizable without reading. Realized PnL, Funding, fees, FLIP detection, mismatch status all rely on this.
4. **Tabs feel like one product** — Macro Generator and Balance Log Analyzer were originally two apps. Make them feel like rooms in the same building.
5. **Forms before flair** — input fields, paste zones, and CTA buttons must dominate the visual hierarchy in each tab. Decoration is secondary.
6. **Active state must scream** — agents tab-hop quickly; the active tab and active mode within a tab must be unambiguous from 2 meters away.
7. **No-data states should teach** — empty Balance Log paste box, "no rows yet", "no errors yet" should explain the next action briefly.

## 5. Anti-goals (do not produce)
- Hero sections, marketing CTAs, "Try it now" panels
- Purple/blue AI gradients, neon glows, glassmorphism cards larger than 600 px
- Decorative blobs, aurora backgrounds, animated particles
- Fake AI assistant chat bubbles
- Fake metrics, fake charts, dummy fintech tickers, fake order books
- Onboarding wizards, splash screens, lottie animations
- Multi-step funnels — every tab is a single workspace screen
- Sidebar navigation (the existing tab strip works for 6-7 items)

## 6. Design style direction

**Theme**: dark professional workspace. Background near-black (e.g. `#0b0f14`), surfaces a touch lighter (`#111827`), borders very low contrast. Reserve saturated color for **state**: success green, danger red, warning amber, info blue/cyan. One distinctive **brand accent** (suggest a teal/mint anchored color — the existing app uses `#00e5a8`; keep or swap, but only one). One **secondary accent** for chart bars / less-prominent CTAs.

**Typography**:
- UI sans: Inter or system-ui stack
- Mono for tables, numbers, pasted data, generated outputs: ui-monospace stack
- Two type scales: a normal scale for chrome (12 / 13 / 14 / 16 / 20 / 28 px) and a tabular-nums monospace scale for numerical columns

**Spacing**: 8-px base. Compact panels (16-20 px padding), not airy ones (40+ px).

**Radius**: 8-12 px on panels, 6-8 px on inputs/buttons, full-pill (999 px) only for status chips and the active tab indicator if pill style.

**Shadows**: subtle depth on cards (`0 4px 16px rgba(0,0,0,0.3)`); avoid heavy drop shadows.

**Animation** (only where it improves feedback):
- Tab switch: 120 ms cross-fade or slide-in
- Copy success: button morphs to "✓ Copied" for ~1.2 s
- Loading: skeleton blocks for tables, spinner only as last resort
- Toast: fade+slide from bottom-right, 1.8 s linger
- Row hover: 1-frame background tint
- Drawer: slide from right, 200 ms ease-out
- **No animation on**: numbers themselves (no number-counters), backgrounds, brand mark

## 7. Layout requirements

The first screen on load = **the usable Macro Generator workspace**. No splash, no marketing.

**Page shell** (every tab):
```
┌─────────────────────────────────────────────────────────────────┐
│  Futures DeskMate · Binance Futures support workspace           │
│  [BTCUSDT 78,xxx.xx ↑]  ·  [Binance 1m OHLC]   [EN] [TR] [⚙ Admin]│
├─────────────────────────────────────────────────────────────────┤
│  [Macro Generator] [Price Lookup] [Funding] [Avg.] [Margin] [BL]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                  active tab content                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Responsive**:
- ≥1280 px: full width up to ~1280, content max-width container, header in one row
- 900-1279 px: tab strip wraps to 2 lines if needed; KPI tiles 2-up; charts stack
- <900 px (rare; agents are on desktop, but design must not break): brand+ticker stacks above lang+admin; tab strip becomes horizontal-scroll; tables become horizontal-scroll containers; drawer becomes full-screen sheet

## 8. Component specs Claude Design must produce

For each, give visuals, states, and CSS variable names:
- Header (brand + ticker + lang + admin chip)
- Tab strip (active / hover / focus, with overflow scroll on mobile)
- Panel / Card (default, with section header, with action row)
- Form row (label above, input below, optional helper text, error state)
- Input, Textarea (resting / focus / disabled / error)
- Button (primary, secondary, ghost, danger, icon-only) — size sm/md
- Segmented control (Output Mode, Tone, Spot/Futures, Story Drawer tabs, Admin view tabs)
- Dropdown / Select (macro selector)
- Mode card (the Margin Restrictions Check/List/History selector)
- Data table (sticky header, alternating rows, monospace numerics, status-colored cells, sortable arrow if applicable)
- KPI tile (label + big number + optional sub line)
- Status chip (`match` green, `mismatch` red, `unknown` muted, plus error/warning/info)
- Toast (info/success/error)
- Modal / Drawer (right-side panel with focus trap)
- Empty state (icon + 1-line + suggested action)
- Loading state (skeleton for tables, inline spinner for buttons)
- Error state (full-panel and inline-banner variants)
- Copy block (the prominent quoted-message style for generated outputs — must look like an obvious copyable artifact)
- Code/raw block (for Diagnostics, Raw drawer tab)
- Live ticker badge (resting / up tick / down tick / loading "---")

## 9. Per-tab design notes Claude Design must include
One section per real tab (Macro Generator / Price Lookup / Funding / Average / Margin / Balance Log / Admin), each covering:
- Primary action layout (what does the agent's eye land on first?)
- Form layout (single column vs two-column, when each)
- Output area styling
- Empty state
- Loading state
- Error state
- Specific visual handling for that tab's quirks (e.g. Margin's "Check / List / History" cards; Balance Log's 4 inner tabs; Story Drawer's 4 segmented tabs; Admin's range picker + view switch)

## 10. Admin dashboard specifics

Design only metrics that exist:
- **KPIs**: Total Events, Sessions (with Today: N), Unique Devices, Unique IPs (hashed), Countries
- **Charts**: Sessions per Day, Tab Usage, Top Symbols, Top Macro Types, Lookup Modes, Funding Top Symbols, Countries
- **Tables**: Recent Errors, Recent Events, Devices (with expandable per-device events)
- **Range picker**: Today / 7 days / 30 days / 90 days
- **Workbook export** button

Tab keys in the Tab Usage chart and the Recent Events table must be displayed via the human-readable label map (`macros → Macros`, `balanceLog → Balance Log`, etc.), never raw.

The dashboard's role is **operational visibility for the team lead**. Design for one person scanning it once a day, not a public stats page.

## 11. Implementation constraints

- Existing stack: **React 18, Vite 5, TypeScript, vanilla CSS** (no CSS-in-JS, no Tailwind, no shadcn). Stay within this.
- No backend changes needed; analytics already go to a Cloudflare Worker which the design need not represent.
- Existing CSS already uses CSS custom properties (`--bg`, `--panel`, `--text`, `--accent`, `--accent-2`, `--danger`, `--card`, `--input`, `--ring`, `--mark`, `--last`). Redesign should extend or replace these tokens cleanly — the implementer will need a one-pass migration path.
- The Balance Log feature lives under `.balance-log-app` (a CSS scope wrapper — its existing class names like `.container`, `.tab`, `.btn` are isolated there). The redesign should respect that boundary so the BL tab and the host don't fight CSS.
- recharts and html2canvas are already in the bundle. Charts and PNG exports should use them, not new libs.

## 12. Deliverables (what Claude Design must return)

1. **Visual direction** — 2-3 representative full-screen mocks (Macro Generator default state, Balance Log Analyzer with data + drawer open, Admin Overview)
2. **Design system tokens** — full color palette (light mode optional, dark mode required), spacing scale, typography scale, radius scale, shadow scale, motion durations + easing curves, all named as CSS custom properties
3. **Page layout spec** — header / tab strip / content shell with annotated dimensions
4. **Navigation design** — tab strip details: hover, active, focus-visible, keyboard navigation, overflow behavior
5. **Component specs** — every component listed in section 8 above, with all states drawn or described
6. **Per-tab design notes** — one section per real tab (section 9 above)
7. **Admin dashboard design notes** — covering all the elements in section 10
8. **Responsive behavior** — desktop ≥1280, ≥900, and mobile <900 specifications
9. **Animation guidance** — which interactions get motion, which don't, with millisecond timings
10. **Implementation notes for React/CSS** — file/CSS-variable migration plan, suggested order of swap, gotchas (e.g. don't break the `.balance-log-app` scope; respect the existing `display:none` tab persistence so animations don't fire on hidden tabs)

## 13. Bilingual scope

The host renders **EN/TR** for chrome and macro tabs (via `src/locales.ts`). The Balance Story drawer carries an independent **10-language** selector (en/tr/es/pt/vi/ru/uk/ar/zh/ko) that translates only the drawer content. The redesign must:
- Make the host EN/TR switcher prominent (header)
- Treat the drawer's 10-language selector as a secondary, drawer-scoped control (not a global one)
- Tolerate longer Turkish strings — they are typically 10-20 % wider than English

## 14. What is explicitly out of scope

- Adding new tools or tabs not in section 2
- Adding new analytics events not in section 3
- Adding admin metrics that would require recording any user-pasted financial data
- Any change to the Cloudflare Worker, the Binance API plumbing, or the Vite dev proxy
- Renaming the deploy artifact / GitHub repo — only user-facing chrome becomes "Futures DeskMate"
