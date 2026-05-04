---
title: Smart Detect (Lite NLP Intent)
tags: [concept, nlp, heuristic]
source: src/macros/smart_detect.ts
date: 2026-04-25
status: active
---

# Smart Detect — "NLP-lite Intent Detection"

In the README it is called "NLP-lite intent detection". Actually **keyword-based rule system** — no real NLP/ML.

## How it works

`detectMacro(text)`:
1. Text is converted to lowercase
2. A chain of `if (text.includes("X") || text.includes("Y"))` runs
3. `{macroId, tone, confidence, reason}` object of the first match is returned
4. If there is no match `null`

## Design philosophy

- **Explicit rules > black box ML** — agent sees what word triggered the session (`reason` field)
- **TR + EN mixed** — user should write "my stop didn't trigger" write "my stop didn't trigger" same category
- **Tone hint** — "complaint" patterns (e.g. "did not pop") automatically suggest `empathetic` tone
- **Confidence is numeric** but the intended use is unclear — the UI does not use it as a threshold (open to visibility)

## Limitations

- Negation not detected ("stop triggered but wrong" → wrong category)
- No multiple intents — first match wins
- Confidence is not calibrated (0.8 vs 0.95 arbitrarily assigned)
- macroId ↔ MACROS registry does not match (see [[entities/smart-detect]] conflict note)

## Expansion path

New category = new `if` block, new keyword list. It's not an ML model. This is **deliberate** — so the agent team can write and update the rules themselves.

## Sources

- [[sources/docs/2026-03-21-readme]] — "NLP-lite" tab

## Related

- [[entities/smart-detect]]
- [[entities/macro-generator-component]]
