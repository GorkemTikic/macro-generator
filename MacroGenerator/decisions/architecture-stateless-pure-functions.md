---
title: Architecture = Stateless Macro Engine (pure function macros)
tags: [decision, architecture, foundational]
source: README.md, src/macros/
date: 2026-03-21
status: active
---

# Verdict: Architecture "Stateless Macro Engine" — pure function macros

## Decision

Each macro `({inputs, prices}) => string` is pure function. No side effects, no async, no fetch, no state.

UI does fetch, macro gives prices to function, macro produces markdown. See [[concepts/stateless-macro-engine]].

## Justification

- **Testable**: snapshot tests trivial
- **Predictable**: same input → same output, easy to debug
- **New macro = a file**: import + push to registry
- **Bilingual**: templates are in the language object; core logic does not change
- **Tone**: additional as post-processor; macro stays clean

## Trade-off

- ❌ Two steps between pricing fetch and macro — cannot fetch price once again to format
- ❌ If Conditional UI is needed (e.g. "user changed symbol, recalculate"), UI's job
- ✅ This trade-off is intentional: macro is a **format** layer, not a business-logic layer

## Evidence

`src/macros/index.ts` collects 7 macros in the MACROS array; `renderMacro` call signature `(macroId, inputs, prices, mode, lang, tone) → string`. Zero direct dependency with `pricing.ts`.

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[concepts/stateless-macro-engine]]
- [[entities/macros-registry]]
- [[entities/macros-helpers]]
- [[syntheses/macro-system]]
