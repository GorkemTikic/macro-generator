---
title: src/locales.ts
tags: [entity, i18n, strings]
source: src/locales.ts
date: 2026-04-25
status: active
---

# src/locales.ts (298 lines)

Translation dictionary that manages all UI strings from one place. Two languages: `en` (default) and `tr`.

## Structure

```ts
export const uiStrings = {
  en: { tabMacro, tabLookup, tabFunding, tabMargin, ... },
  tr: { ... aynı anahtarlar Türkçe ... }
}
```

It is a flat object. No nested objects — every label is a flat key. Example key groups:

- `tab*` — tab names
- `lookup*` — Price Lookup paneli
- `funding*` — Funding macro paneli
- `paste*`, `pasteModal*` — Order grid paste modal
- `lookupNotFound`, `lookupFoundTitle`, `lookupNotReached`, `trailing*` — result messages
- `avg*` — Average Calculator (placeholder + status)

## Distribution pattern

The top level holds the state `App.tsx` `lang`; `t = uiStrings[lang] || uiStrings['en']` accounts; Passes `lang` and `uiStrings={t}` props to each tab component. `const t = uiStrings;` is rebind within the component.

See [[concepts/bilingual-tr-en]] · [[decisions/language-via-prop-not-context]].

## Notes

- Default `'en'` fallback is everywhere — If there is a missing key `tr`, it will be shown in English
- Interpolation in some template literals: like `lookupPriceNotReached: "...{price}..."` — this is solved by manual replace
- `funding_macro` translations are not here; As object `translations` in `src/macros/funding_macro.ts`

## Sources

<!-- It wasn't discussed directly in the sessions, but the tabMargin tag was written here when adding the Margin tab -->
- [[sources/sessions/2026-04-22-margin-restrictions-build]] (locales.ts edit edildi)

## Related

- [[entities/app-tsx]] — `uiStrings[lang]` consumer
- [[concepts/bilingual-tr-en]]
