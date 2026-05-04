---
title: AdminDashboard fetchDeviceEvents swallowed 401 silently
tags: [bug, ux, admin, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: AdminDashboard fetchDeviceEvents swallowed 401 silently

## Symptom

In the Devices view, clicking a device row triggered a drill-down fetch
to `/admin/devices?device_id=…`. If the admin token expired between the
page load and the click, the request returned 401, but the catch block
was empty:

```ts
} catch {} finally { setLoadingDevice(false); }
```

Result: the row expanded to show "No events in this range." The agent
saw an empty drill-down, assumed the device had no activity, and moved
on. They had to log out and back in to discover their token had
expired.

`fetchEvents` and `fetchDevices` already had `setError(e.message)` so
the 401 surfaced as "HTTP 401" in the error banner. Only the
device-drill-down route had the empty-catch.

## Root cause

The original `fetchDeviceEvents` was written as a "best effort" call:
the parent page already showed the device row, so a drill-down failure
was considered non-critical. Empty catch was deliberate, but the side
effect — silent stale UI — was worse than a banner.

## Fix

Added explicit 401 handling and an error message:

```ts
if (res.status === 401) {
  setError('Invalid admin token.');
  setAuthed(false);
  return;
}
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
setDeviceEvents(data.events || []);
} catch (e: any) {
  setError(e?.message || 'Failed to load device events.');
}
```

`fetchEvents` and `fetchDevices` were updated in the same pass to also
clear `authed` on 401 — previously they showed the error but kept the
dashboard rendered, which was slightly misleading.

## Related files

- `src/components/AdminDashboard.tsx`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/analytics-system]]
