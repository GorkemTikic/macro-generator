---
title: npm run dev — wrong directory problem
tags: [source, session, dev]
source: raw/sessions/8d9d55e9-123e-430c-89c5-8ee85c08d8f5.jsonl
date: 2026-04-22
status: active
---

# Session: npm run dev ENOENT (short diagnostic)

**Date**: 2026-04-22 21:14
**Raw source**: `raw/sessions/8d9d55e9-123e-430c-89c5-8ee85c08d8f5.jsonl` (24KB)
**Size**: 6 assistant messages, 1 user message

## Aim

User tried `npm run dev` in PowerShell but `package.json` was not found.

## Done

Agent recognized terminal error: GitHub zip downloads return double nested folder — `Macro App/macro-generator-main/macro-generator-main/`. Solution: `cd` into a subfolder.

## Course found

- Download zip from GitHub → folder nesting convention
- README "Setup & Execution" section does not contain step `cd macro-generator-main` — minor UX gap

## Sources

- raw: `raw/sessions/8d9d55e9-123e-430c-89c5-8ee85c08d8f5.jsonl`

## Related

- [[bugs/2026-04-22-npm-wrong-cwd]]
- [[sources/docs/2026-04-22-deployment-guide]]
