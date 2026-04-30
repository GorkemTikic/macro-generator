---
title: Use Edge headless to render leadership PDFs from styled HTML
tags: [decision, doc, pdf, tooling, edge]
source: docs/analytics-dashboard-guide.html, docs/analytics-dashboard-guide.pdf
date: 2026-04-26
status: active
---

# Use Edge headless to render leadership PDFs from styled HTML

## Decision

Author leadership-facing documents as styled HTML (with print CSS), then convert to PDF using **Microsoft Edge in `--headless=new` mode**. No Node.js dependency, no Puppeteer install, no external SaaS. The HTML is the source-of-truth; the PDF is a derivative.

## Context

The first leadership artefact for the analytics dashboard ([[entities/analytics-dashboard-guide]]) needed to:

- Look polished — typography, gradients, embedded screenshots, page breaks at sensible places.
- Be edited by hand later (text, screenshots, ordering).
- Embed nine PNG screenshots without re-uploading them anywhere.
- Stay reproducible — anyone in the team should be able to regenerate the PDF on their own machine without a 500 MB toolchain install.

## Alternatives considered

- **Puppeteer / Playwright in Node.** Pulls in a Chromium download (~300 MB) and a Node dependency tree just for one document. Overkill.
- **Word / Google Docs.** Manual layout, no source-control friendly format, screenshots get re-encoded, page breaks behave unpredictably. Rejected for any artefact intended to be re-rendered.
- **LaTeX / Typst.** Excellent typography but high learning-curve for collaborators, and embedding raw PNG screenshots in styled cards is fiddly.
- **A static-site generator (e.g. Pandoc).** Closer to right but adds a build step and a styling layer; CSS in HTML is already the styling layer we wanted.
- **Online HTML-to-PDF services.** Uploading internal screenshots to a third party is unacceptable.

## Choice

`msedge.exe --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=…` against a `file://` URL. Edge ships with every Windows 11 install — already on the machine, always up to date, no extra install. Headless rendering uses the same engine as the browser the user already views the HTML in, so WYSIWYG between Save-as-PDF and the headless command.

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="docs/analytics-dashboard-guide.pdf" \
  "file:///…/docs/analytics-dashboard-guide.html"
```

## Why this is the right trade-off

- **Zero install** on a Windows fleet — Edge is preinstalled, kept current by Windows Update.
- **HTML stays the source-of-truth.** Edits happen in one place, in a format that anyone can open and tweak.
- **Print CSS works as expected** — `@page { size: A4; margin: …; }`, `page-break-inside: avoid`, `print-color-adjust: exact`. The same hints work in browser Save-as-PDF, so manual re-renders give identical output.
- **Screenshots stay local** — relative `<img src="01-…png">` references resolve against the HTML's directory; nothing leaves the machine.

## Pitfalls discovered

- The legacy `--headless` flag silently produces no output on this Edge build. Must use `--headless=new`.
- If the destination PDF is held open in another reader (VS Code's PDF preview being the common case here), Edge exits 0 without writing — no error message. Workaround: write to a `-v2.pdf` filename, or close the preview before re-rendering.

## Consequences

- The HTML+PDF pair lives in `docs/`, both committed. The PDF is small enough (~1.5 MB) that committing it is fine; if many such documents accumulate, revisit and either git-lfs or generate-on-CI.
- Future leadership documents follow the same pattern: HTML with print CSS, screenshots in the same folder, Edge headless to render. The pattern is documented on [[entities/analytics-dashboard-guide]].

## Sources
- [[sources/sessions/2026-04-26-analytics-workbook-export]]

## Related
- [[entities/analytics-dashboard-guide]]
