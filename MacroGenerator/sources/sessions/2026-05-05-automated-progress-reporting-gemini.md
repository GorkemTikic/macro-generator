---
type: session
date: 2026-05-05
tags:
  - automation
  - reporting
  - gemini
  - github-actions
---

# 2026-05-05 Automated Progress Reporting using Gemini

## Objective
Automate the generation of the management-facing progress report so that it consistently translates raw Git commits and Vault notes into a non-technical summary without manual effort.

## What was done
1. Created `.github/workflows/generate_progress_report.yml` to trigger on pushes to `main` and via a daily schedule (18:00 UTC).
2. Wrote a Node.js script (`scripts/generate_report.mjs`) leveraging the `@google/genai` SDK.
3. The script extracts the last 24 hours of Git commits from both the `macro-generator` and `screenshot-library` repositories.
4. It reads any recently modified vault notes from `MacroGenerator/` to provide the LLM with deeper context.
5. The `gemini-2.5-flash` model summarizes the technical updates into professional, management-friendly English.
6. Copied `PROJECT_PROGRESS_REPORT.md` and the PDF styling engine `render-progress-report-pdf.mjs` into `reports/`.
7. Configured the workflow to use `peter-evans/create-pull-request` to open a PR for review instead of merging blindly.

## Why it was done
- **Efficiency**: Reduces the manual overhead of writing daily or weekly reports.
- **Consistency**: Ensures the tone remains professional, outcome-focused, and stripped of confusing technical jargon.
- **Cross-Project Visibility**: Both `macro-generator` and `screenshot-library` progress are synthesized into a single narrative automatically.
- **Human-in-the-Loop Validation**: Using a Pull Request workflow allows the human manager to review and fine-tune the AI summary before final publication.
