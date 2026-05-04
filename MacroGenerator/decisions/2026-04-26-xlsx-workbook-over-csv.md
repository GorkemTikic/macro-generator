---
title: Export as styled .xlsx workbook, not raw CSV
tags: [decision, analytics, export, exceljs]
source: src/analytics/exportWorkbook.ts, src/components/AdminDashboard.tsx
date: 2026-04-26
status: active
---

# Export as styled .xlsx workbook, not raw CSV

## Decision

Replace the two per-view CSV download buttons (`Export CSV` on Recent Events and Devices tabs) with **one** "Export Workbook (.xlsx)" button in the dashboard header. The export bundles five tabs in a single ExcelJS-generated workbook: Summary, Device Journey, Raw Events, Devices, Ready to Share.

## Context

The first iteration of analytics export shipped two separate CSV downloads — one per view — limited to whatever the UI had loaded (max 200 rows). When the user tried to share the output with upper management, three problems surfaced:

1. Two files for one period — needs reconciliation by hand before any meeting.
2. Raw CSV reads like a database dump, not a story. Leadership glances at it and disengages.
3. The 200-row UI cap means the export silently undercounts everything beyond the most recent activity.

## Alternatives considered

- **Lift the CSV row limits** and keep separate downloads. Solves (3) but not (1) or (2).
- **Pre-render a server-side PDF** of the dashboard. Heavy infra cost (Cloudflare Workers can't run headless Chromium), and PDFs are read-only — leadership can't filter or sort.
- **Google Sheets API push.** Requires an integration, OAuth, ongoing maintenance — wildly disproportionate for an internal tool with two daily users.

## Choice

**ExcelJS in the browser.** Generates a styled `.xlsx` Blob client-side from a JSON payload — no server, no upload, no third-party. The format supports everything needed for executive readability: frozen headers, autofilters, column widths, fills, borders, multiple sheets, narrative text blocks.

## Why this is the right trade-off

- **One file** = one source of truth for the period. No reconciliation step.
- **Five sheets** lets the document address multiple audiences in the same artefact: leadership reads sheet 1 and 5, analysts dig into 3 and 4, presenters pick screenshots from sheet 2.
- **Styled output** changes the perception of the work — same numbers, but management treats a polished workbook as a deliverable rather than a debug dump.
- **In-browser generation** preserves the privacy posture: data never leaves Cloudflare → admin's browser → admin's local disk.
- **Bundle cost is acceptable.** ExcelJS adds ~1 MB raw / ~370 KB gzipped. Only admins ever load this code path (gated by token), so the cost is paid by exactly two people.

## Consequences

- New runtime dependency: `exceljs ^4.4.0`.
- Vite chunk-size warning on production build (chunk > 500 KB). Acknowledged, not split — admin code path is rarely loaded and code-splitting would add maintenance overhead without user-facing benefit.
- The earlier `downloadCSV`, `exportEvents`, `exportDevices` helpers were deleted from `AdminDashboard.tsx` — no fallback. If ExcelJS ever needs to be replaced, the helper file `src/analytics/exportWorkbook.ts` is the single point of contact.
- A new endpoint was added to back the export — see [[decisions/2026-04-26-admin-export-endpoint]].

## Sources
- [[sources/sessions/2026-04-26-analytics-workbook-export]]

## Related
- [[entities/export-workbook]]
- [[entities/analytics-system]]
- [[decisions/2026-04-26-admin-export-endpoint]]
- [[decisions/2026-04-26-devices-not-users-framing]]
