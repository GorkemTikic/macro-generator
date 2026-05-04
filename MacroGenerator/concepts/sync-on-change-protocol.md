---
title: Sync-on-Change Maintenance Protocol
tags: [concept, process, ai-readiness]
source: README.md
date: 2026-04-25
status: active
---

# Sync-on-Change Maintenance Protocol

Defined in README.md under the heading **"Maintenance Protocol (Sync-on-Change)"**. Binding rule set for AI agents and human maintainers.

## 4 items

1. **Code Update**: Every file add/change/delete is evaluated against README
2. **Map Sync**: If the responsibility for a file changes or a new dependency is added → the **File Map** table in the README is updated **immediately**
3. **Logic Sync**: If data flow or architecture changes → **Technical Architecture** section of the README is revised
4. **AI Parsing**: Descriptions should be **keyword-rich** — so future LLM sessions can understand project status without in-depth file scanning

## Why is there

README is the project's **canonical context document** — every LLM session reads this first. Stale README → wrong decisions.

## Relationship with Vault

This protocol is close to [[wiki]]'s raison d'être: keeping information organized and up-to-date. But there are differences:

| Sync-on-Change README | LLM-Wiki Vault |
|---|---|
| Single file (README.md) | Multi-page, cross-referenced |
| Snapshot (durum) | Accumulation (situation + history + decisions + problems) |
| Manuel disciplined | Bookkeeping automatic ajan |

Ideal: vault takes the README as the source ([[sources/docs/2026-03-21-readme]]) and weaves deep context around it.

## Last update

README footer: `*Last Updated: 2026-03-21*`. Margin Restrictions feature (2026-04-22) has not yet been committed to **README File Map** — protocol violation. See lint-report.

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[syntheses/architecture]]
