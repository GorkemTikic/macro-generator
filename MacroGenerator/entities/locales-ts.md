---
title: src/locales.ts
tags: [entity, i18n, strings]
source: src/locales.ts
date: 2026-04-25
status: active
---

# src/locales.ts

Translation dictionary that manages all UI strings from one place.
**Three languages**: `en` (default), `tr`, and `zh` (Simplified Chinese,
added 2026-05-04 — see
[[decisions/2026-05-04-add-zh-cn-trilingual]]).

File grew from ~298 lines (EN+TR only) to ~705 lines after the zh
block was added.

## Structure

```ts
export const uiStrings = {
  en: { tabMacro, tabFaq, tabLookup, tabFunding, tabMargin, ... },
  tr: { ... same keys, Turkish ... },
  zh: { ... same keys, Simplified Chinese ... },
}
```

It is a flat object. No nested objects — every label is a flat key.
Example key groups:

- `tab*` — tab names
- `lookup*` — Price Lookup panel
- `funding*` — Funding macro panel
- `paste*`, `pasteModal*` — Order grid paste modal
- `lookupNotFound`, `lookupFoundTitle`, `lookupNotReached`, `trailing*`, `gapExplainer*` — Price Lookup result messages
- `closestMiss*` — Find Price's "closest miss" output
- `avg*` — Average Calculator (placeholder + status + per-trade text builders + phase narration)
- `bl*` — Balance Log Analyzer **outer chrome only**. The inner StoryDrawer carries its own 10-language i18n via `src/features/balance-log/lib/i18n.ts` (zh already included there).

## Distribution pattern

The top level holds the state `App.tsx` `lang`; `t = uiStrings[lang] || uiStrings['en']` accounts; passes `lang` and `uiStrings={t}` props to each tab component. `const t = uiStrings;` is rebound within the component (the prop is named `uiStrings` and aliased as `t`).

See [[concepts/bilingual-tr-en]] (now trilingual) ·
[[decisions/language-via-prop-not-context]].

## Notes

- Default `'en'` fallback is everywhere — if a `tr` or `zh` key is missing it falls back to English.
- Some templates use interpolation: e.g. `lookupPriceNotReached: "...{price}..."` — solved by manual `replace`.
- `funding_macro` translations are not here; the `translations` object lives in `src/macros/funding_macro.ts` (now with `en` / `tr` / `zh` blocks).
- Several keys are functions (e.g. `closestMissSummaryLine(...)`, `avgPhaseNarration(...)`, `avgFlipCopy(...)`, `avgBuildStartedText(...)`) — they accept arguments and return a localized sentence. Each has a zh variant alongside the EN/TR ones.
- Brand-name terms stay English in `zh` body (`Mark Price`, `Last Price`, `USDⓈ-M`, …) following Binance's own zh-CN convention. See [[decisions/2026-05-04-add-zh-cn-trilingual]] § Translation discipline.

## Recent updates

- **2026-05-06** - `tabFaq` added in EN/TR/ZH for the new FAQ Searcher tab. See [[sources/sessions/2026-05-06-faq-searcher-deploy]].
- **2026-05-04** — added the full `zh:` block (~230 keys mirroring the `en` and `tr` shapes); changed `gapExplainerTriggerMark` and `gapExplainerTriggerLast` from `"MARK"` / `"LAST"` to `"Mark Price"` / `"Last Price"` (EN + TR + ZH). See [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]].

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] — `tabMargin` key added
- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]] — `zh` block added
- [[sources/sessions/2026-05-06-faq-searcher-deploy]] - `tabFaq` added

## Related

- [[entities/app-tsx]] — `uiStrings[lang]` consumer; passes `lang` + `t={uiStrings[lang]}` to each tab
- [[concepts/bilingual-tr-en]] — now trilingual
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[decisions/2026-05-04-prettify-trigger-type-token]]
