---
title: lang state = prop drilling, context değil
tags: [decision, react, i18n]
source: src/App.tsx
date: 2026-03-21
status: active
---

# Decision: `lang` state is deployed with prop drilling, React Context is not used

## Decision

`App.tsx` holds lang with `useState('en')`. Each tab component is given `lang` and `uiStrings={t}` as **prop**. `AppContext` exists but only carries `activeSymbol` — not lang.

## Justification

- There are 5 tabs, each with direct child of App — drilling depth = 1
- Only App + 5 child → prop drilling minimum
- Using context is overkill (provider re-render = entire tree re-render on every language change)
- Calculation of `uiStrings[lang]` one time at App level; children already receive resolved object

## Counter argument

- If the components grow larger, there will be a prop drill problem for deep nested elements
- At that point you can switch to context (refactor is small)

## Sources

<!-- Not discussed directly in sessions, code review -->

## Related

- [[entities/app-tsx]]
- [[entities/locales-ts]]
- [[concepts/bilingual-tr-en]]
- [[entities/app-context]]
