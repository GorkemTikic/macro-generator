---
title: Bilingual UI (TR/EN)
tags: [concept, i18n]
source: src/locales.ts, src/macros/
date: 2026-04-25
status: active
---

# Bilingual UI (Turkish + English)

Translation is managed in two different places:

## 1. UI strings — `src/locales.ts`

Tab names, button labels, error messages. Plain `{ en: {...}, tr: {...} }` object. See [[entities/locales-ts]].

## 2. Macro templates — within each macro file

```ts
m.translations = {
  en: { title, formConfig, templates: { detailed, summary, brief } },
  tr: { ... }
}
```

Şablonlar tagged template literal — `({inputs, prices}) => string`.

## Distribution

`lang` state (`'en' | 'tr'`) in `App.tsx`. It is given as a prop to all children. **Context not used**. See [[decisions/language-via-prop-not-context]].

## Default and fallback

`lang === 'tr' ? trText : enText` or `dict[lang] || dict['en']` everywhere. Incomplete translation → automatic English fallback.

## Tone × Language

`applyTone(text, tone, lang)` post-processor 4 tones (standard / empathetic / professional / direct) × 2 languages ​​= 8 variants. Tone application **after** the template — template determines "what is said", tone determines "how it is said".

## Format details

- Date: TR There are no Turkish month names in the output - UTC ISO format is the same in all languages ​​(avoid confusion with the agent)
- Number: decimal point `.` in both languages ​​(Binance convention)
- Currencies: USDT, USDC etc. same in all languages

## Sources

<!-- Design decision not discussed in sessions, code review -->

## Related

- [[entities/locales-ts]]
- [[entities/macros-helpers]] — `applyTone`
- [[entities/macros-registry]] — translations distribution
- [[decisions/language-via-prop-not-context]]
