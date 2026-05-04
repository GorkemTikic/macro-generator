---
title: Stateless Macro Engine
tags: [concept, architecture, pattern]
source: src/macros/, src/components/MacroGenerator.tsx
date: 2026-04-25
status: active
---

# Stateless Macro Engine

The core architectural pattern of the project. In the README it is called **"Stateless Macro Engine architecture"**. [[sources/docs/2026-03-21-readme]].

## Description

Her makro **pure function**'dır:

```ts
({ inputs, prices }) => string  // markdown
```

- No side effects
- No async (fetch is done externally)
- Does not read global state
- Same input → same output (deterministic)

## Distribution of responsibility

| Layer | Does | Doesn't |
|---|---|---|
| **UI** ([[entities/macro-generator-component]]) | Collects input, triggers fetch, displays output | does not write format rules |
| **Pricing** ([[entities/pricing-ts]]) | Withdraws OHLC from Binance | does not format |
| **Macro fn** | formats — produces string | does not fetch, does not keep state |

## Benefits

1. Easy to test - `({inputs:{...}, prices:{...}}) → expected string` snapshot test
2. Adding new macro = a file, import to registry + push to array
3. Bilingual support on template side (`m.translations[lang].templates[mode]`)
4. Tone application as post-processor (`applyTone(result, tone, lang)`)

## Evidence

`src/macros/index.ts` collects 7 macros in the MACROS array. `renderMacro` finds the correct template, calls it with `({inputs, prices})`, then applies `applyTone`. See [[entities/macros-registry]].

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[entities/macros-registry]]
- [[entities/macros-helpers]]
- [[entities/macro-generator-component]]
- [[decisions/architecture-stateless-pure-functions]]
- [[syntheses/macro-system]]
