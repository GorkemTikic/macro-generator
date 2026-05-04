---
title: Add Simplified Chinese (zh-CN) as a third UI + macro language
tags: [decision, i18n, zh-cn]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: active
---

# Decision: Add zh-CN as a third UI + macro language

## Context

Until 2026-05-04 the app supported only EN and TR (the original
`Lang = 'en' | 'tr'` type, the two-key `uiStrings = { en, tr }`
dictionary, and `translations: { en, tr }` blocks in every macro).
A non-trivial share of Binance Futures support tickets are handled
in Mandarin Chinese; a Chinese support agent could navigate the
*chrome* of the app via context but the macro outputs (which become
the customer reply) would always be EN or TR — making the tool
effectively unusable for Chinese-language tickets.

## Decision

Adopt **Simplified Chinese (zh-CN)** as a third first-class language.
Scope: full end-to-end — UI chrome + every macro output.

- `Lang` type: `'en' | 'tr' | 'zh'`.
- `src/locales.ts`: full `zh:` block mirroring every key in `en` and `tr`.
- All 8 macro template files (`src/macros/*.ts`) gain a `zh:` block under `translations`.
- `src/macros/helpers.ts`:
  - `buildFullOHLCBlock` and `buildLastPriceOHLCBlock` add a `zh` branch.
  - `applyTone` adds zh Professional + Empathetic prefix/suffix.
  - `statusLineFriendly` becomes lang-aware (it was hardcoded English before — pre-existing inconsistency that bit TR macros too).
- `App.tsx`: third button in the language switcher with an inline-SVG China flag (see [[decisions/2026-05-04-inline-svg-flags-not-emoji]]); brand subtitle adds zh.
- Inline `lang === 'tr' ? trText : enText` conditionals in `App.tsx`, `PriceLookup.tsx`, `FundingMacro.tsx`, `MacroGenerator.tsx`, `AverageCalculator.tsx` are converted in-place to a small per-component `L(en, tr, zh)` helper. ~76 conversion sites total.
- The Balance Log feature has its own internal 10-language drawer i18n (already includes zh) and is unchanged.

## Translation discipline

- **Use Simplified Chinese**, not Traditional. The mainland China market is the primary audience.
- **Use Binance's actual Chinese terminology** as it appears in the official zh-CN futures interface. Reference terms:

  | Concept | Binance zh-CN |
  |---|---|
  | Mark Price / Last Price | **kept as English** in zh body — same convention Binance uses in zh-CN UI; so the customer can match the exact term they read in the trading interface. |
  | Trigger Price | 触发价 |
  | Funding Rate / Fee | 资金费率 / 资金费 |
  | Long / Short | 做多 / 做空 |
  | Order ID | 订单号 |
  | Position (averaged) | 持仓 / 平均开仓价 / 平均平仓价 |
  | Balance Log | 资金流水 |
  | Liquidation | 强制平仓 (爆仓) |
  | Margin Restrictions | 保证金限制 |

- **Brand-name terms stay English:** Binance, Futures, USDⓈ-M, Stop-Market, Stop-Limit, MARK, LAST tokens. These appear that way in Binance's own zh-CN interface.

## Consequences

- **Bigger file size.** `locales.ts` grew from ~459 to ~705 lines. Each macro file gained 60–120 lines for its zh block. Bundle impact is small — every string was already an SSR string literal.
- **Per-component `L()` helper.** A 1-line helper inside each component instead of a global `L()` import. Trade-off: tiny duplication for keeping component files self-contained. Same pattern across the 4 components that have inline conditionals.
- **`statusLineFriendly` API change.** Previously `statusLineFriendly(inputs)` (always English). Now `statusLineFriendly(inputs, lang = 'en')`. Default value preserves backward-compat for macros that don't yet pass `lang`. The new zh templates pass `'zh'` explicitly. Worth a follow-up to thread `lang` into all macro templates so the EN+TR ones also stop emitting English status lines.
- **Native review needed before sending to real customers.** Translations use proper Binance terminology and standard support phrasing, but a zh-fluent agent should spot-check macro outputs.

## Alternatives considered

- **Phase 1 only (chrome + flag, English macro fallback).** Considered, rejected by the user — they wanted the full thing in one go for review.
- **Move every string into `locales.ts` as a flat dictionary first**, then add zh. This is the "cleaner" refactor but a much bigger change in scope and risk. Stuck with the existing pattern (`L(en, tr, zh)` inline) because the existing pattern was already `lang === 'tr' ? tr : en` inline — adding a third arm preserves the file-by-file ownership and keeps the diff small.
- **Use a translation library (i18next / formatjs).** Out of scope — the existing pattern is hand-rolled and it's intentional ([[decisions/language-via-prop-not-context]]).

## Verification

`npm run build` 6.6 s green; `npm test` 79/79 passed; `npm run test:trailing` all assertions passed. Smoke test (Playwright headless) confirmed Funding tab labels, Price Lookup mode buttons, and the macro output blocks all render in Chinese after the language switcher click.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[concepts/bilingual-tr-en]] — now trilingual
- [[entities/locales-ts]]
- [[entities/macros-helpers]]
- [[entities/app-tsx]]
- [[decisions/language-via-prop-not-context]]
- [[decisions/2026-05-04-inline-svg-flags-not-emoji]]
