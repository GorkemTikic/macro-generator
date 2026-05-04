---
title: Smart Detect missed every all-caps Turkish complaint (toLowerCase quirk)
tags: [bug, smart-detect, i18n, turkish, unicode]
source: sources/sessions/2026-04-28-end-to-end-audit-pass.md
date: 2026-04-29
status: fixed
---

# Bug: All-caps Turkish input never matched any Smart Detect keyword

## Symptom

When a Turkish agent typed a complaint in **all caps** (very common in chat) into the Smart Detect textarea — for example `"STOPUM ÇALIŞMADI"`, `"DOLMADI"`, `"TETİKLENMEDİ"`, `"DEĞMEDİ"`, `"FARKLI FİYAT"` — `detectMacro` returned `null` and the macro auto-suggestion silently did nothing. Sentence-case typing (`"Stopum çalışmadı"`) worked.

## Root cause

`detectMacro` lowered the input with the default `String.prototype.toLowerCase()`, which is **not** Turkish-locale-aware:

- `'I'` (U+0049) → `'i'` (U+0069, dotted i) — Turkish wants dotless `'ı'` (U+0131).
- `'İ'` (U+0130) → `'i̇'` (i + combining dot above) — Turkish wants plain `'i'`.

So `'ÇALIŞMADI'.toLowerCase()` produced `'çalişmadi'` (dotted `i`s), which never matches the source literal `'çalışmadı'` (dotless `ı`). Every all-caps Turkish keyword was unreachable.

A naive switch to `text.toLocaleLowerCase('tr')` would have fixed Turkish but broken English literals like `'not trigger'`, `'didn't hit'`, `'slippage'`: tr-locale lowercase turns ASCII `'I'` into `'ı'`, and `'NOT TRIGGER'.toLocaleLowerCase('tr')` becomes `'not trıgger'`, which doesn't contain `'not trigger'`.

## Fix

`src/macros/smart_detect.ts` introduced a `norm()` helper:

```ts
function norm(s: string): string {
    return s.toLocaleLowerCase('tr').replace(/ı/g, 'i');
}
```

And a thin `has` wrapper applied to every literal at the call site:

```ts
const t = norm(text);
const has = (lit: string) => t.includes(norm(lit));
```

After the locale-aware lowercase, all dotless `ı`s are collapsed back to plain `i`. Both input and literals go through the same pipeline, so the matcher works regardless of caps or language.

| Input | After `norm()` |
|---|---|
| `ÇALIŞMADI` | `çalismadi` |
| `Çalışmadı` | `çalismadi` |
| `çalışmadı` (literal) | `çalismadi` |
| `NOT TRIGGER` | `not trigger` |
| `not trigger` (literal) | `not trigger` |

## Verification

Inline node script ran 19 inputs (Turkish caps, sentence case, English caps, English mixed, nonsense). 17 matched the expected macro IDs. The 2 fails are a **pre-existing** matcher gap on the literal `'not trigger'` vs. the phrase `"didn't trigger"` — substring miss, unrelated to this fix; tracked as remaining risk in [[sources/sessions/2026-04-28-end-to-end-audit-pass]].

`tsc --noEmit` + `vite build` clean.

A direct mojibake scan (`grep -E "Ã|Â|â€|ï¿½|Ä|Å"`) on the source file and the touched wiki page returned zero hits — the bytes on disk are correct UTF-8. The bug was logical, not encoding-level.

## Sources

- [[sources/sessions/2026-04-28-end-to-end-audit-pass]]

## Related

- [[entities/smart-detect]]
- [[concepts/smart-detect-nlp]]
- [[concepts/bilingual-tr-en]]
