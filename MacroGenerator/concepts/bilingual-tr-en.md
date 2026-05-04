---
title: Trilingual UI (EN / TR / ZH)
tags: [concept, i18n]
source: src/locales.ts, src/macros/
date: 2026-04-25
status: active
---

# Trilingual UI (English + Turkish + Simplified Chinese)

> **Note:** Page originally documented EN+TR (bilingual). Extended to
> trilingual (added zh-CN) on 2026-05-04. See
> [[decisions/2026-05-04-add-zh-cn-trilingual]] and
> [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]].
> Filename kept as `bilingual-tr-en.md` for backward link stability.

Translation is managed in two different places:

## 1. UI strings — `src/locales.ts`

Tab names, button labels, error messages, helper text. Plain
`{ en: {...}, tr: {...}, zh: {...} }` object. See [[entities/locales-ts]].

## 2. Macro templates — within each macro file

```ts
m.translations = {
  en: { title, formConfig, templates: { detailed, summary } },
  tr: { title, formConfig, templates: { detailed, summary } },
  zh: { title, formConfig, templates: { detailed, summary } },
}
```

Templates are tagged template literals — `({inputs, prices}) => string`.

## Distribution

`lang` state (`'en' | 'tr' | 'zh'`) in `App.tsx`. It is given as a prop
to all children. **Context not used**. See
[[decisions/language-via-prop-not-context]].

## Default and fallback

`uiStrings[lang] || uiStrings['en']` for the locale dictionary;
`m.translations[lang] || m.translations['en']` for macro templates.
Incomplete translation → automatic English fallback.

For **inline conditionals inside components** (escape hatch — used
where a string is too contextual to live in `locales.ts`), the
project convention is a per-component `L(en, tr, zh)` helper:

```ts
const L = (en: string, tr: string, zh?: string) =>
  lang === 'tr' ? tr : lang === 'zh' ? (zh ?? en) : en;
```

`zh` is optional in this helper because some sites (e.g. very
ephemeral debug strings) don't have a translation; in that case the
helper falls back to EN. The 4 components that use it (`PriceLookup`,
`FundingMacro`, `MacroGenerator`, `AverageCalculator`) each declare
their own copy of `L`.

## Tone × Language

`applyTone(text, tone, lang)` post-processor: 4 tones (standard /
empathetic / professional / direct) × 3 languages = 12 variants.
Tone application **after** the template — template determines "what
is said", tone determines "how it is said". See [[entities/macros-helpers]]
§ `applyTone`.

## Brand-name terms stay English in zh body

Binance's actual zh-CN futures interface mixes Chinese prose with
English brand terms — `Mark Price`, `Last Price`, `USDⓈ-M`,
`Stop-Market`, `Stop-Limit`, the raw `MARK` / `LAST` tokens. We follow
the same convention so the customer can match terms in the macro reply
with what they read in the trading interface. See
[[decisions/2026-05-04-add-zh-cn-trilingual]] § Translation discipline.

## Format details

- Date: ISO `YYYY-MM-DD HH:MM:SS UTC+0` in all three languages — no localized month names. Avoids agent confusion when comparing across regions. See [[bugs/2026-05-04-time-token-not-zero-padded]] for a parser-side normalization that ensures HH:MM:SS components are always 2-digit.
- Number: decimal point `.` in all three languages (Binance convention).
- Currencies: USDT / USDC / BFUSD / etc. — same in all languages.
- `prettyTriggerType("MARK")` → `"Mark Price"` in all three languages — trigger-type prettification is lang-agnostic on purpose. See [[decisions/2026-05-04-prettify-trigger-type-token]].

## Where the EN-only fallback hurts

A pre-existing inconsistency until 2026-05-04: `statusLineFriendly`
in `helpers.ts` was hardcoded English regardless of `lang`. So even
TR macros emitted English status lines. Made lang-aware in the same
session that added zh; backward-compat default value preserves
behaviour for macros that don't yet pass `lang`. See
[[entities/macros-helpers]] § `statusLineFriendly`.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]] — zh added

## Related

- [[entities/locales-ts]]
- [[entities/macros-helpers]] — `applyTone`, `buildFullOHLCBlock`, `statusLineFriendly`, `prettyTriggerType`
- [[entities/macros-registry]] — translations distribution
- [[decisions/language-via-prop-not-context]]
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[decisions/2026-05-04-prettify-trigger-type-token]]
