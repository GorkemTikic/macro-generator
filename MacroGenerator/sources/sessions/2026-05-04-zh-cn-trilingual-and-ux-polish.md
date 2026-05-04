---
title: 2026-05-04 — Trilingual (EN/TR/ZH) + macro-output polish + dev-proxy via Worker
tags: [session, i18n, zh-cn, ux, dev-proxy, macros]
source: in-conversation session
date: 2026-05-04
status: active
---

# Session 2026-05-04 — Trilingual EN/TR/ZH + macro-output polish

A full day of UX polish and the largest i18n change since the project shipped:
the app is now **trilingual** (Simplified Chinese added end-to-end), the
macro outputs got several readability fixes (raw `MARK`/`LAST` tokens
prettified, run-on paragraphs broken up, empty-blockquote bar removed,
zero-padded timestamps), the Average Calculator's "Phase" block was
redesigned into a structured per-position card with copy-text mirroring
the on-screen layout, the FLIP detection got a much more visible
treatment, the language flags were swapped from emoji to inline SVG,
and the Vite dev proxy was rerouted through the deployed Cloudflare
Worker so a recurring CloudFront-edge flake on the user's network no
longer breaks dev.

## Master goal

The session opened with a UX/format pass on the macro outputs, escalated
when the user noticed real-world issues (`MARK` instead of `Mark Price`,
the chart-label-glued-to-From-line layout, the empty `>` line rendering as
a highlighted bar, `0:03:56` instead of `00:03:56`, the Spot button looking
like a raw OS button, the Phase block intimidating new agents, the FLIP
warning being too easy to miss). Mid-session the user asked whether
Chinese support was feasible — and after a scope confirmation, we shipped
the full trilingual implementation.

## Outcomes (what the agent now sees)

### Trilingual chrome + macro outputs

Third language **Simplified Chinese (zh-CN)** added end-to-end:

- New CN flag button in the language switcher (inline SVG, same render-on-every-OS approach as the EN/TR flags).
- `Lang` type extended: `'en' | 'tr' | 'zh'`.
- `src/locales.ts` gained a full `zh:` block — every key in `en`/`tr` now has a Chinese counterpart (~230 strings).
- All 8 macro template files gained a `zh:` translation block (`title`, `formConfig`, `templates: { detailed, summary }`).
- `src/macros/helpers.ts`:
  - `buildFullOHLCBlock` and `buildLastPriceOHLCBlock` got `zh` branches (`开盘 / 最高 / 最低 / 收盘`).
  - `applyTone` got `zh` Professional + Empathetic prefix/suffix.
  - `statusLineFriendly` is now lang-aware (it was hardcoded English before — a pre-existing inconsistency that bit TR macros too).
- Inline `lang === 'tr' ? trText : enText` conditionals in `App.tsx`, `PriceLookup.tsx`, `FundingMacro.tsx`, `MacroGenerator.tsx`, `AverageCalculator.tsx` were converted to use a small `L(en, tr, zh)` helper per file (~76 conversion sites in total). Each component picks up the third language with no further refactor.
- Binance brand terms (Mark Price / Last Price / USDⓈ-M / Stop-Market / Stop-Limit) are kept in their canonical English form inside Chinese output, mirroring what Binance's own zh-CN futures interface does — so the customer can match what they read in the support reply with what they see in the trading interface.

See [[decisions/2026-05-04-add-zh-cn-trilingual]],
[[concepts/bilingual-tr-en]] (now trilingual),
[[entities/locales-ts]],
[[entities/macros-helpers]],
[[entities/app-tsx]].

### Macro-output readability

Multiple deterministic fixes to the customer-facing reply text:

- **Raw `MARK` / `LAST` token prettification.** Every `${inputs.trigger_type}` site (28 occurrences across 7 macro files) now goes through a new `prettyTriggerType()` helper in `helpers.ts`: `MARK → "Mark Price"`, `LAST → "Last Price"`. The Gap Explainer in `PriceLookup.tsx` got the same treatment (locale buttons updated too: `gapExplainerTriggerMark` / `Last`). Bug: [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]]. Decision: [[decisions/2026-05-04-prettify-trigger-type-token]].
- **Chart-label / From-To layout.** The phrase `When we check the BTCUSDT Price Chart From: 2026-05-03 17:19:47 UTC+0` was visually merging the chart name with the `From:` line, orphaning `To:`. Fixed in `stop_market_mark_not_reached.ts` (EN + TR mirror) — chart label now ends with a colon on its own line, blank line, then `From:` and `To:` each on a separate line.
- **Run-on paragraphs in Stop-Market Loss Higher.** `stop_market_loss_higher_than_expected_mark_price.ts` (EN + TR) had multiple run-on sentences with timestamps embedded mid-sentence and the two numbered reasons crammed onto a single line. Restructured into clean paragraph blocks: order ID + blank + placed-at, trigger sentence + blank + executed price + blank + price-block header, two reasons split into title + body lines. Same pattern in the Last Price variant.
- **Empty `>` blockquote separator.** A `> ` (single space, no content) line between two blockquote blocks renders in most markdown viewers as a *visible* highlighted empty bar between the two sections. Replaced with a true empty line so markdown splits into two adjacent blockquotes — clean visual gap, no bar. Affected 5 places: `helpers.ts` (shared `buildFullOHLCBlock`), `stop_market_mark_not_reached.ts` (the range block), `stop_limit_mark_price.ts`, `stop_limit_last_price.ts`, `stop_market_loss_higher_than_expected_mark_price.ts` (each has a local OHLC helper that duplicated the bug). Bug: [[bugs/2026-05-04-empty-blockquote-line-renders-bar]].
- **Zero-padded timestamps.** Average Calculator parser previously accepted `0:03:56` (single-digit hour) and stored it raw — so position cards and copy text showed `2026-01-29 0:03:56` instead of `00:03:56`. Added a `padTime` step in `parseData` (line 64 of `AverageCalculator.tsx`) that pads each component to two digits at the parser boundary, so every downstream consumer (per-trade card, position card, copy block, narrative) sees normalized HH:MM:SS. Bug: [[bugs/2026-05-04-time-token-not-zero-padded]].

### Average Calculator phase block — full redesign

The previous "Phase 1 LONG" header + dense narrative paragraph + tiny inline formula was intimidating to new agents and easy to scan past. Replaced with a structured **per-position card**:

- Coloured header strip — green for LONG, red for SHORT — with a `POSITION #N` prefix (omitted for single-position cases), pill-shaped LONG/SHORT badge, status badge (`✓ CLOSED` green / `◷ STILL OPEN` yellow), and the date range in monospace.
- Bulleted "How this position was built" facts list — opened-on, closed-by, entry order chips (green tinted), close order chips (blue tinted) — replacing the dense paragraph.
- Two visually distinct calculation cards:
  - **STEP 1 / AVERAGE ENTRY PRICE** — green tinted, each `(qty × price)` on its own line with `+` aligned to the left, dashed line before the divisor, divider, big bold green result.
  - **STEP 2 / AVERAGE CLOSE PRICE** — same structure, blue tinted, big bold blue result.
- Copy text now mirrors the card layout (boxed `═══` headers, bulleted "How this position was built", `[STEP 1] / [STEP 2]` calc blocks with each `(qty × price)` on its own line) so what the agent copies looks identical to what they're seeing on screen. The narrative-paragraph (`avgPhaseNarration`) is no longer emitted into the copy block — its information is now in the bullet list.
- Multi-language: the new structural labels (`POSITION`, `✓ CLOSED`, `◷ STILL OPEN`, `How this position was built`, `N entry orders expanded the position`, `AVERAGE ENTRY`, `total quantity`) have EN/TR/ZH variants in the inline `L()` helper.
- The `phaseDescriptors` type was extended with `direction`, `startDate`, `endDate`, `entryOrderIds`, `closeOrderIds`, `isClosed`, `indexNumber`, `isMultiPhase` so the JSX has structured data instead of having to parse the narrative.

### FLIP detection visibility

The previous treatment was a 3-px yellow `border-left` and a warning line buried inside the card body — agents missed it. Layered four visual cues on top of each other for FLIP cards:
1. Floating "⚠ POSITION FLIP" pill at the top-right (yellow background, dark text, drop shadow).
2. "LONG ↔ SHORT" mini-tag next to the BUY/SELL side badge.
3. Yellow gradient card background (top→bottom).
4. Thicker 5-px yellow border-left + 1-px yellow outline + soft glow.

Non-flip cards visually unchanged, so contrast does the work.

### Inline SVG flags (drop emoji)

Windows' Segoe UI Emoji doesn't ship 🇬🇧/🇹🇷/🇨🇳 glyphs and falls back to the underlying letters (the user saw "GB"/"TR" instead of flags). Replaced all three flags with inline SVG so they render the same on every OS. UK = blue field with St-Andrew/St-Patrick/St-George crosses, TR = red field with white crescent + star, CN = red field with one large yellow star + four small stars in arc. CSS now resets to `display: inline-flex` and applies `filter: grayscale(0.45)` on inactive (full color on hover/active per existing rules), with a 1-px shadow border on the SVG for edge contrast.

Bug: [[bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters]]. Decision: [[decisions/2026-05-04-inline-svg-flags-not-emoji]].

### `.lookup-tab` CSS reset

The Spot/Futures toggle in Price Lookup looked weird because `.lookup-tab` rule set padding/font/radius but never reset native `<button>` defaults — so inactive buttons rendered with the browser's gray fill + default border (active was OK because it overrode `background`). Added explicit `background: transparent; border: 0; appearance: none; font-family: inherit; min-width: 84px;` to `.lookup-tab`. Same fix benefits the Average Calculator's LONG/SHORT presets which use the same class.

Bug: [[bugs/2026-05-04-lookup-tab-button-default-styling]].

### Dev proxy via the Worker (CloudFront flake mitigation)

Mid-session the user reported "the prices are not coming in" with `Binance temporarily unavailable (HTTP 500)` from the macro generator. Root-caused to:

1. The user's network path to `fapi.binance.com` (CloudFront-fronted) intermittently completes the TCP handshake then drops the HTTP request — 19-second hang followed by an empty 5xx from the Vite proxy.
2. The numbered mirrors `fapi1.binance.com / fapi2 / fapi3` are now redirect-only (HTTP 302 → `https://www.binance.com/en` marketing site) — they are no longer usable as API endpoints from this network path. The `pricing.ts` `F_BASES` array is therefore dead code in practice when called from the browser.
3. The deployed Cloudflare Worker (`macro-analytics.grkmtkc94.workers.dev`) does its own server-side multi-host fallback and was reachable + healthy throughout (HTTP 200 on the same large 19-day BTCUSDT call in 0.43 s).

Routed the Vite dev proxy through the Worker:

```ts
// vite.config.ts
"/api-binance": { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
"/fapi":        { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
"/api/v3":      { target: "https://macro-analytics.grkmtkc94.workers.dev", … }
```

Server-to-server: Vite's Node-side fetch is not subject to the Worker's `ALLOWED_ORIGIN` CORS allowlist (which only affects browser fetches — see the `corsHeaders` function in `worker/index.ts`).

Net effect: when Binance flakes from the user's network, the Worker (different infra, server-side fallback across `fapi/fapi1/2/3` and `api/api1/...`) carries the request through. No Worker change required.

Bug: [[bugs/2026-05-04-cloudfront-fapi-flake-on-user-network]]. Decision: [[decisions/2026-05-04-vite-dev-proxy-via-worker]].

## Files touched (verification: `npm run build` 6.5 s green; `npm test` 79/79 passed; `npm run test:trailing` all assertions passed)

- `vite.config.ts` — proxy targets repointed at the Worker
- `src/App.tsx` — `Lang` type extended to `'en' | 'tr' | 'zh'`; CN flag SVG button; brand subtitle adds zh
- `src/locales.ts` — `zh:` block (~230 strings)
- `src/macros/helpers.ts` — `prettyTriggerType` (new), zh OHLC blocks, zh tones, lang-aware `statusLineFriendly`
- `src/macros/funding_macro.ts` — `zh:` template block
- `src/macros/stop_market_mark_not_reached.ts` — `zh:` template + zh range/explanation in `buildSideAwareBlock`; chart/From/To layout fix; empty `> ` removed
- `src/macros/stop_market_loss_higher_than_expected_mark_price.ts` — `zh:` template + run-on paragraph fixes (EN+TR); empty `> ` removed; local OHLC zh branch
- `src/macros/stop_market_loss_higher_than_expected_last_price.ts` — `zh:` template + paragraph fixes (EN+TR); local OHLC zh branch
- `src/macros/take_profit_slippage_mark_price.ts` — `zh:` template (both scenarios) + `prettyTriggerType` wrapping
- `src/macros/take_profit_slippage_last_price.ts` — `zh:` template (both scenarios) + `prettyTriggerType`
- `src/macros/stop_limit_mark_price.ts` — `zh:` template; empty `> ` removed; zh OHLC; `prettyTriggerType`
- `src/macros/stop_limit_last_price.ts` — `zh:` template; empty `> ` removed; zh OHLC; `prettyTriggerType`
- `src/components/MacroGenerator.tsx` — `L()` helper; `lang === 'tr'` sites converted to 3-way; macro form labels translate
- `src/components/PriceLookup.tsx` — `L()` helper; ~30 inline conditionals converted; mode-card buttons (Trigger/Range/Find/Trailing/Last 1s/Gap) now translate
- `src/components/FundingMacro.tsx` — `L()` helper; error messages + tone dropdown translate
- `src/components/AverageCalculator.tsx` — `padTime` time normalization; phase descriptor type + render redesign; per-position card layout; FLIP visibility layered cues; copy block restructured to mirror cards; `L()` for new structural labels
- `src/styles.css` — `.lookup-tab` reset; `.lang-flag` updated for inline SVG (display:inline-flex, filter:grayscale, 1-px shadow border)

## Out of scope / not done in this session

- The long Trailing-Stop technical agent breakdown text in `PriceLookup.tsx`'s `buildTrailingOutput` is still EN-only (TR + ZH branches not added). Worth a follow-up.
- A short-lived experimental "DeskMate Demo" tab (Case Workspace + Missing Data Checklist + QA Guardrail + Evidence Pack + Safe Response Composer) was prototyped earlier in the session, the user disliked the UX, and the entire integration was reverted (`src/features/deskmate-demo/` deleted, `App.tsx` / `analytics/index.ts` / `locales.ts` reverted, build + tests still green). The design spec was preserved in the user's auto-memory at `memory/project_deskmate_demo_design.md` for a possible future revisit. Not added to the wiki because it does not exist in the codebase any more.
- Deletion housekeeping (parent-dir scratch files `aggtrades_clusdt.json` and `klines_1s.json` flagged in [[sources/sessions/2026-05-02-trailing-stop-clusdt-tick-precision]]; the empty `MacroGenerator/wiki.md` Obsidian stub; the user-only `CLAUDE_SESSION_PROMPTS.md` / `CLAUDE_STARTER.md` Claude prompt templates; one-off debug scripts at the repo root; orphaned `docs/feature-guide.*` files) — done in the same session at the user's request to keep only files that belong to either the project or the wiki.
- A larger "Futures DeskMate Agent Guide" PDF was generated and then later cleaned up to keep only the PDF deliverable. The PDF lives at `docs/agent-guide/Futures-DeskMate-Agent-Guide.pdf`. The capture script and markdown source were deleted at the user's request.

## Sources

- in-conversation session 2026-05-04

## Related

- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[decisions/2026-05-04-vite-dev-proxy-via-worker]]
- [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
- [[decisions/2026-05-04-prettify-trigger-type-token]]
- [[bugs/2026-05-04-cloudfront-fapi-flake-on-user-network]]
- [[bugs/2026-05-04-windows-emoji-flags-fall-back-to-letters]]
- [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]]
- [[bugs/2026-05-04-empty-blockquote-line-renders-bar]]
- [[bugs/2026-05-04-time-token-not-zero-padded]]
- [[bugs/2026-05-04-lookup-tab-button-default-styling]]
- [[concepts/bilingual-tr-en]] — now trilingual
- [[entities/locales-ts]] — now ~470 lines, three languages
- [[entities/macros-helpers]] — `prettyTriggerType`, lang-aware `statusLineFriendly`, zh OHLC + tones
- [[entities/app-tsx]] — `'zh'` Lang variant + CN flag button
- [[entities/average-calculator]] — phase card redesign + structured copy text + time padding + FLIP visibility
- [[bugs/2026-04-27-binance-fapi-cors-on-pages]] — production-side companion of the dev-side proxy issue this session addressed
