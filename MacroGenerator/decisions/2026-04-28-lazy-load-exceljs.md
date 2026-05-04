---
title: Lazy-load exceljs from AdminDashboard
tags: [decision, performance, bundle, admin, analytics]
source: sources/sessions/2026-04-28-end-to-end-audit-pass.md
date: 2026-04-28
status: active
---

# Lazy-load `exceljs` so it does not ship to every visitor

## Context

`exceljs` is only used by [[entities/export-workbook]], which in turn is only
called when an authenticated admin clicks **Export Workbook** in
[[entities/analytics-dashboard-guide]]. Pre-fix, `AdminDashboard.tsx`
statically imported `downloadAnalyticsWorkbook`, which pulled `exceljs` into
the main bundle for every page load. Build output was a single ~1.3 MB chunk
(372 KB gzip) — vast majority being `exceljs`.

## Decision

Switch the import to a dynamic `import()` inside `handleExport`:

```ts
import type { ExportPayload } from '../analytics/exportWorkbook';
...
const { downloadAnalyticsWorkbook } = await import('../analytics/exportWorkbook');
await downloadAnalyticsWorkbook(data, label);
```

Vite splits `exportWorkbook` (and `exceljs`) into its own chunk, fetched only
on first export click.

## Result

- Main bundle: **1297 KB → 344 KB** (372 KB → 96 KB gzip).
- `exportWorkbook` chunk (~954 KB / 276 KB gzip) loads on demand for admins.
- No behavioral change for non-admin users; admins pay one extra request the
  first time they export per session.

## Out of scope

- Splitting `AdminDashboard` itself behind `React.lazy`. Possible follow-up,
  but the dashboard component minus exceljs is small and admin tab is already
  conditionally mounted only when its tab is active.

## Sources

- Vite build output before / after the change.
- [[sources/sessions/2026-04-28-end-to-end-audit-pass]]

## Related

- [[entities/export-workbook]]
- [[entities/analytics-system]]
