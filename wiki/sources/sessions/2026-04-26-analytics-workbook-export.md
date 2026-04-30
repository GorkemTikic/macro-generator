---
title: Analytics Workbook Export + Leadership PDF Guide
tags: [session, analytics, export, excel, exceljs, pdf, admin]
source: in-conversation session (continuation of 2026-04-26-analytics-build)
date: 2026-04-26
status: active
---

# Analytics Workbook Export + Leadership PDF Guide

Follow-up session to [[sources/sessions/2026-04-26-analytics-build]]. The analytics dashboard was already live; this session replaced the per-tab CSV exports with one polished `.xlsx` workbook designed for upper-management presentation, and produced a leadership-facing PDF guide explaining the dashboard.

## Context entering the session

- Admin dashboard had three views (Overview, Recent Events, Devices) and two CSV-export buttons.
- `/admin/events` and `/admin/devices` were capped at 200 / 200 rows.
- Export quality was insufficient for leadership presentation — raw CSVs only.

## What was built

### Backend
- New `GET /admin/export` route on the Cloudflare Worker (`worker/index.ts`).
  - Auth-gated by the same bearer token pattern.
  - One call returns: overview KPIs, today's session count, tab/macro/symbol/lookup-mode/funding/country breakdowns, daily series, error rows, devices summary (5k cap), and full events stream (50k safety cap, ordered by `device_id, ts ASC` so device-grouped consumers don't need to re-sort).
- Existing `/admin/stats`, `/admin/events`, `/admin/devices` routes were left untouched.

### Frontend
- Added `exceljs ^4.4.0` to `package.json`.
- New helper file `src/analytics/exportWorkbook.ts` (~430 lines):
  - Type `ExportPayload` mirroring the new endpoint's response.
  - Formatting helpers: `fmtTime`, `fmtDate`, `parseProps`, `propsHuman`, `humanEvent`, `keyDetails`.
  - `EVENT_LABEL` map translating technical events (`macro_generated` → "Generated macro", `funding_query` → "Checked funding", etc.).
  - Five sheet builders: `buildSummary`, `buildDeviceJourney`, `buildRawEvents`, `buildDevices`, `buildReadyToShare`.
  - `buildPlainEnglish()` — generates narrative sentences from real metrics.
  - Public entrypoints: `generateAnalyticsWorkbook` (returns Blob) and `downloadAnalyticsWorkbook` (triggers browser download).
- `AdminDashboard.tsx`:
  - Removed `downloadCSV`, `exportEvents`, `exportDevices` helpers.
  - Removed both per-tab "Export CSV" buttons.
  - Added single header button "⬇ Export Workbook (.xlsx)" with `exporting` state.
  - Added `handleExport` calling `/admin/export?since=…` and feeding the response to `downloadAnalyticsWorkbook`.

### Workbook structure

| Sheet | Purpose |
|---|---|
| Summary | Headline KPIs (with derived ratios), six side-by-side breakdowns, plain-English narrative |
| Device Journey | Events grouped by device with separator rows, ordered by time, technical events translated to readable Action labels |
| Raw Events | Flat audit table; parsed + raw JSON columns side-by-side; frozen header + autofilter |
| Devices | Per-device summary with derived columns: avg events/session, most-used tab, last activity |
| Ready to Share | Auto-generated leadership narrative based on actual numbers, with growth/decline trend detection |

### Leadership PDF guide
- Created `docs/analytics-dashboard-guide.html` — styled HTML with cover page, why-cards, per-tab cards (one per dashboard view + one per workbook sheet), and a closing sign-off.
- Embedded nine screenshots (3 dashboard tabs + 5 workbook sheets + drill-down view) saved to `docs/01-…09-…png`.
- Generated `docs/analytics-dashboard-guide.pdf` (1.5 MB) via Microsoft Edge headless: `msedge --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=…`.
- Tone is first-person ("I built this because…"), framed for upper management at a weekly FD/SL meeting.

## Decisions taken

- [[decisions/2026-04-26-xlsx-workbook-over-csv]] — adopt ExcelJS for leadership-readable output.
- [[decisions/2026-04-26-admin-export-endpoint]] — dedicated full-data endpoint instead of lifting `/admin/events` cap.
- [[decisions/2026-04-26-devices-not-users-framing]] — honest "Estimated Users (unique devices)" labelling everywhere.
- [[decisions/2026-04-26-edge-headless-pdf-pipeline]] — Edge headless for HTML→PDF rendering.

## Issues / quirks

- `npx wrangler deploy` for the new endpoint succeeded on first attempt.
- `git push` succeeded clean (commit `a2f37c4`).
- TypeScript surfaced one pre-existing cast issue in `AdminDashboard.tsx` (`stats.countries as NameCount[]`) that required `as unknown as NameCount[]` after the file was edited — not a bug introduced by this session, but a refactor side-effect.
- First Edge headless invocation silently failed because the previous PDF was held open in the IDE; switching to a `-v2` filename succeeded. Required `--headless=new` (not legacy `--headless`) on this Edge build to actually emit the file.

## Deployment

- Worker deployed: version `ea33746a-f2b1-4c4d-9b03-eb1f3062ba14` at `https://macro-analytics.grkmtkc94.workers.dev`.
- Frontend committed: `a2f37c4` "Replace per-tab CSV exports with a single styled .xlsx workbook" — pushed to `main`, GitHub Actions rebuild + Pages deploy triggered.

## Related

- [[entities/analytics-system]]
- [[entities/export-workbook]]
- [[entities/analytics-dashboard-guide]]
- [[sources/sessions/2026-04-26-analytics-build]]
