---
title: Obsidian llm-wiki vault kurulumu
tags: [source, session, vault, meta]
source: raw/sessions/31380025-80bf-4dd6-8041-500739e7ec25.jsonl
date: 2026-04-25
status: active
---

# Session: Obsidian llm-wiki vault installation

**Date**: 2026-04-25
**Raw source**: `raw/sessions/31380025-80bf-4dd6-8041-500739e7ec25.jsonl`

## Aim

Setting up an Obsidian llm-wiki vault for the macro-generator project, following the `PROMPTS.md` pattern in the selmakcby/knowledge-pipeline project.

## Stream

1. **18:15** — User asked me to read PROMPTS.md and install vault
2. First pass: SETUP — Created empty skeleton structure according to controlled prompt (folders, gitkeeps, skeleton CLAUDE.md/index.md/log.md)
3. **18:23** — User feedback: "you didn't create the actual files, it doesn't look good" — empty skeleton is insufficient
4. Second pass: vault moved to subfolder `wiki/`; SETUP — Automatic PHASE 3-6 instruction issued
5. All resources (README, DEPLOYMENT_GUIDE, .env.example, src/, 3 JSONL sessions) read
6. ~30 pages written: entities, concepts, decisions, bugs, sources, syntheses
7. lint-report and index/log update

## Done

| Folder | Number of pages |
|---|---|
| `entities/` | 12 |
| `concepts/` | 10 |
| `decisions/` | 9 |
| `bugs/` | 4 |
| `sources/sessions/` | 3 |
| `sources/docs/` | 3 |
| `syntheses/` | 4 |
| Root | CLAUDE.md, index.md, log.md, lint-report.md |

## Course found

- The “empty skeleton” does not produce value — the meaning of the vault is in the **full pages** of resources
- llm-wiki SETUP — Requires automatic prompt (PHASE 1-6) **real INGEST** — not just setting up folders

## Open topics

- Vault's graph view should be checked in Obsidian — for orphan page image verification
- Production CORS proxy still not installed (margin feature testing not done) — future ingest topic
- README File Map update pending — [[concepts/sync-on-change-protocol]] violation

## Sources

- raw: `raw/sessions/31380025-80bf-4dd6-8041-500739e7ec25.jsonl`
- ext referans: https://github.com/selmakcby/knowledge-pipeline/blob/main/PROMPTS.md

## Related

- [[concepts/sync-on-change-protocol]]
- [[syntheses/architecture]]
