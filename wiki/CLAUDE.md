# CLAUDE.md - macro-generator Information Archive

## Purpose

Permanent information archive that captures the macro-generator web application's development process, architectural decisions, and lessons learned.

## Language

All wiki pages should be written in English. Technical terms (function names, file paths, library names) may remain in English.

## Naming

- File names: `kebab-case.md`
- Folders: lowercase, short, English

## Page Format

Every wiki page follows this structure:

```markdown
---
title: Page Title
tags: [tag1, tag2]
source: sources/sessions/2026-04-25-slug.md
date: YYYY-MM-DD
status: active | archived | draft
---

# Page Title

<content>

## Sources
- [[sources/sessions/YYYY-MM-DD-slug]]

## Related
- [[entities/related-component]]
- [[concepts/related-concept]]
```

## Folder Structure

| Folder | Content |
|---|---|
| `raw/sessions/` | Raw JSONL transcripts - **DO NOT TOUCH** |
| `raw/docs/` | Static documents - **DO NOT TOUCH** |
| `sources/sessions/` | One summary page for each raw source |
| `entities/` | Files, functions, services, APIs, components |
| `concepts/` | Abstract concepts, design principles, algorithms |
| `decisions/` | Atomic decisions - each decision = one page |
| `bugs/` | Fixed issues: root cause + fix + related files |
| `syntheses/` | High-level overview and synthesis pages |
| `archive/` | Obsolete pages - never deleted |

## Raw Sources

Raw sources live at `~/.claude/projects/C--Users-user-Desktop-Macro-App-macro-generator-main/*.jsonl`. They are linked into `raw/sessions/` via symlink and must never be copied or modified.

---

## Workflow: INGEST

When a new source (JSONL transcript, document, note) is added:

1. Find the most recently modified file in `raw/` (`ls -lt`).
2. Read the file and extract:
   - Main topic / session purpose
   - Changes made and features added
   - Mentioned entities (file paths, functions, services, APIs)
   - Decisions taken
   - Issues and bugs identified
   - Open topics / TODOs
3. Show me a 5-item summary and ask for confirmation.
4. After confirmation, write:
   - `sources/sessions/YYYY-MM-DD-<slug>.md` - summary page
   - `entities/<entity-name>.md` for each entity (create if absent, update if present)
   - `decisions/YYYY-MM-DD-<decision-slug>.md` for each decision
   - `bugs/YYYY-MM-DD-<bug-slug>.md` for each bug
   - `concepts/<concept-name>.md` for each abstract concept
   - Update `index.md`
   - Add an entry to `log.md`: `## [YYYY-MM-DD] ingest | <slug>`
5. Establish bidirectional links. If A links to B, add a link back from B to A as well.
6. Never write to `raw/`.

---

## Workflow: QUERY

To answer questions using the wiki:

1. Read `index.md` and identify the relevant categories.
2. Find and read the relevant pages under `sources/`, `entities/`, `concepts/`, `decisions/`, and `syntheses/`.
3. Synthesize the answer and provide source references for each important claim.
4. If the answer introduces a new synthesis or concept, file it back under `syntheses/` or `concepts/`.
5. Add an entry to `log.md`: `## [YYYY-MM-DD] query | <short question summary>`
6. List the pages that were created or updated.

---

## Workflow: LINT

Periodic health check (scan all markdown files except `raw/`):

1. **Contradictions** - do two pages contain opposing claims on the same topic?
2. **Outdated claims** - have sources added in the last 30 days made existing pages obsolete?
3. **Orphan pages** - pages that do not receive links from anywhere
4. **Missing concept pages** - concepts that appear on 3+ pages but do not have their own page
5. **One-way cross-reference** - A -> B exists but B -> A does not
6. **Weak source** - important claims that rely on only one source

Write findings to `lint-report.md`. Do not auto-fix them.
Add an entry to `log.md`: `## [YYYY-MM-DD] lint | N findings`

---

## Hard Rules

1. **`raw/` immutable** - this folder is never written to, only read
2. **Unsourced claims are forbidden** - every finding must reference a source page
3. **Page deletion is forbidden** - obsolete pages are moved to `archive/`, never deleted
4. **Contradictions are marked, not deleted** - conflicting claims are marked with the heading `## CONTRADICTION`
5. **All content should be in English** - except technical terms when appropriate

---

## Available Sources

There are **3 JSONL** transcript files in `~/.claude/projects/C--Users-user-Desktop-Macro-App-macro-generator-main/`. Use the INGEST prompt to start the first ingest.

---

## Next Step

For the first ingest:

```text
TARGET: C:/Users/user/Desktop/Macro App/macro-generator-main/macro-generator-main/wiki

I added a new source to the `raw/` folder. Find the most recently modified file (`ls -lt`),
read it, and process it according to the ingest workflow in `CLAUDE.md`.
...
```

Or use the ready-made INGEST prompt in `PROMPTS.md`.
