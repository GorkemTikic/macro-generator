---
title: Label "users" as "Estimated users (unique devices)" everywhere
tags: [decision, analytics, privacy, communication, leadership]
source: src/analytics/exportWorkbook.ts, docs/analytics-dashboard-guide.html
date: 2026-04-26
status: active
---

# Label "users" as "Estimated Users (unique devices)" everywhere

## Decision

In every leadership-facing surface (workbook Summary, workbook Ready-to-Share, the leadership PDF, and the verbal narrative), the count of distinct people using the tool is presented as **"Estimated Users (unique devices)"** — never as a bare "users" number. Risks-and-limitations sections explicitly call out the device-vs-user gap.

## Context

The analytics backend stores only:

- `session_id` — UUID in `sessionStorage`, resets on tab close.
- `device_id` — UUID in `localStorage`, persists per browser profile.
- `ip_hash` — first 16 hex chars of `SHA-256(raw_ip)`, used for distinct-IP counts only.
- `country` — from Cloudflare's `CF-IPCountry` header.

There is no authentication, no email, no employee ID. We genuinely do not know who any device belongs to.

Calling `unique_devices` "users" in a meeting would be technically inflated:

- One person on two browsers (e.g. work Chrome + personal Firefox) appears as two devices.
- One person who clears localStorage appears as a new device.

…and could also be technically deflated:

- A shared kiosk browser used by three agents appears as one device.

Both directions are possible. The safe label is the one that matches what we actually measured.

## Alternatives considered

- **Just call them "users"** because everyone does. Easy, but if leadership ever inspects the data and finds a single agent counted as three devices, every other number in the deck loses credibility.
- **Add user authentication** so we can count real users. Massively out of scope for an internal tool with two daily users today; would also turn a privacy-by-design system into a PII-handling system.
- **Heuristic deduplication** by IP + UA. Adds fingerprinting we explicitly avoided when designing the backend (see [[decisions/2026-04-26-ip-hash-privacy]]).

## Choice

Use the label **"Estimated Users (unique devices)"** in every executive surface, and in every "In Plain English" / "Risks and limitations" block include an honest sentence:

> "Users are estimated from unique browser devices. The platform does not yet store an authenticated user identity, so a single agent on two browsers will appear as two devices, and a shared browser may understate distinct users."

The Devices admin tab and the Devices workbook sheet keep the bare term **"devices"** without qualification — there's no ambiguity at that level of detail.

## Why this is the right trade-off

- **Trust compounds.** Once leadership sees the caveat, every other number in the workbook gets the benefit of the doubt. If you inflate one number, every other number becomes suspect.
- **It costs nothing.** Three extra words on the KPI label. One sentence on a risks slide.
- **It future-proofs the product.** When/if real user identity is added, we can swap the label without re-explaining old numbers.

## Consequences

- The Summary KPI block uses "Estimated Users (unique devices)" instead of "Unique Devices" or "Users".
- The leadership PDF dedicates a full sub-bullet on the Risks slide to this caveat.
- The narrative generator (`buildPlainEnglish`, `buildReadyToShare`) always pairs the device count with a clarifying note.
- The dashboard's Devices tab keeps the bare label "Devices" — appropriate at that drill-down level.

## Sources
- [[sources/sessions/2026-04-26-analytics-workbook-export]]

## Related
- [[entities/export-workbook]]
- [[entities/analytics-dashboard-guide]]
- [[entities/analytics-system]]
- [[decisions/2026-04-26-ip-hash-privacy]]
