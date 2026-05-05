import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const require = createRequire(path.join(rootDir, "package.json"));
const MarkdownIt = require("markdown-it");
const { chromium } = require("playwright");

const inputPath = path.join(__dirname, "PROJECT_PROGRESS_REPORT.md");
const htmlPath = path.join(__dirname, "PROJECT_PROGRESS_REPORT_STYLED.html");
const pdfPath = path.join(__dirname, "PROJECT_PROGRESS_REPORT_STYLED.pdf");

const source = await fs.readFile(inputPath, "utf8");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const bodyHtml = md.render(source);

const statRows = [
  ["403", "Total commits", "Across both repositories"],
  ["33", "Commit-active days", "Plus vault-documented Macro Generator sessions"],
  ["107", "Screenshot entries", "Current Screenshot Library catalog"],
  ["79", "Balance Log tests", "Automated tests documented in the vault"],
];

const statCards = statRows
  .map(
    ([value, label, note]) => `
      <article class="metric-card">
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
        <p>${note}</p>
      </article>`
  )
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Progress Report</title>
  <style>
    :root {
      --ink: #15202b;
      --muted: #5c6672;
      --line: #dfe5ec;
      --soft: #f5f8fb;
      --panel: #ffffff;
      --navy: #101828;
      --blue: #2454d6;
      --cyan: #0f8fa9;
      --green: #0d8a63;
      --gold: #bd7b14;
      --paper: #fbfcfe;
    }

    @page {
      size: A4;
      margin: 15mm 13mm 17mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font: 10.5pt/1.55 "Inter", "Segoe UI", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    a {
      color: var(--blue);
      text-decoration: none;
      border-bottom: 1px solid rgba(36, 84, 214, 0.28);
    }

    .cover {
      min-height: 267mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 7mm 0 0;
      break-after: page;
      position: relative;
      overflow: hidden;
    }

    .cover::before {
      content: "";
      position: absolute;
      inset: -25mm -20mm auto auto;
      width: 120mm;
      height: 120mm;
      background:
        radial-gradient(circle at 30% 30%, rgba(36, 84, 214, 0.18), transparent 58%),
        radial-gradient(circle at 72% 66%, rgba(13, 138, 99, 0.14), transparent 60%);
      z-index: 0;
    }

    .cover > * {
      position: relative;
      z-index: 1;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--cyan);
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px solid rgba(15, 143, 169, 0.24);
      background: rgba(15, 143, 169, 0.07);
      border-radius: 999px;
      padding: 6px 11px;
      width: fit-content;
    }

    .cover-title {
      margin-top: 18mm;
      max-width: 175mm;
    }

    .cover-title h1 {
      margin: 0;
      color: var(--navy);
      font-size: 37pt;
      line-height: 0.98;
      letter-spacing: -0.02em;
    }

    .cover-title p {
      margin: 7mm 0 0;
      max-width: 145mm;
      color: var(--muted);
      font-size: 13pt;
      line-height: 1.45;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
      margin-top: 16mm;
      max-width: 170mm;
    }

    .meta-panel,
    .metric-card {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 14px 35px rgba(16, 24, 40, 0.07);
    }

    .meta-panel {
      padding: 6mm;
    }

    .meta-panel h2 {
      margin: 0 0 2.5mm;
      color: var(--navy);
      font-size: 11pt;
      letter-spacing: 0.01em;
    }

    .meta-panel p {
      margin: 1.5mm 0;
      color: var(--muted);
      font-size: 9.5pt;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4mm;
      margin-top: 13mm;
    }

    .metric-card {
      padding: 5mm;
      min-height: 33mm;
    }

    .metric-value {
      color: var(--blue);
      font-size: 24pt;
      line-height: 1;
      font-weight: 850;
    }

    .metric-label {
      margin-top: 2.5mm;
      color: var(--navy);
      font-weight: 800;
      font-size: 9.5pt;
    }

    .metric-card p {
      margin: 1.5mm 0 0;
      color: var(--muted);
      font-size: 8.4pt;
      line-height: 1.35;
    }

    .cover-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 10mm;
      padding-top: 12mm;
      border-top: 1px solid var(--line);
    }

    .cover-bottom p {
      margin: 0;
      color: var(--muted);
      font-size: 9.2pt;
    }

    .repo-list {
      display: flex;
      gap: 6mm;
      color: var(--navy);
      font-weight: 700;
      font-size: 9.2pt;
    }

    .content {
      max-width: 184mm;
      margin: 0 auto;
    }

    .content > h1 {
      display: none;
    }

    .content h2 {
      margin: 0 0 5mm;
      padding-top: 3mm;
      color: var(--navy);
      font-size: 19pt;
      line-height: 1.2;
      letter-spacing: -0.01em;
      break-after: avoid;
    }

    .content h2:not(:first-of-type) {
      break-before: page;
    }

    .content h2::after {
      content: "";
      display: block;
      width: 22mm;
      height: 2.2px;
      margin-top: 2.5mm;
      background: linear-gradient(90deg, var(--blue), var(--green));
      border-radius: 999px;
    }

    .content h3 {
      margin: 7mm 0 3mm;
      color: #1f355d;
      font-size: 13.5pt;
      line-height: 1.25;
      break-after: avoid;
    }

    .content p {
      margin: 0 0 3.2mm;
    }

    .content ul {
      margin: 0 0 4mm;
      padding-left: 5mm;
    }

    .content li {
      margin-bottom: 1.8mm;
    }

    .content code {
      color: #244064;
      background: #edf3fb;
      border: 1px solid #d8e4f2;
      border-radius: 5px;
      padding: 1px 4px;
      font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
      font-size: 8.7pt;
    }

    .content table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 4mm 0 7mm;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
      box-shadow: 0 8px 20px rgba(16, 24, 40, 0.045);
      font-size: 8.9pt;
    }

    .content thead th {
      background: #eaf1fb;
      color: #15294d;
      font-weight: 800;
      text-align: left;
      border-bottom: 1px solid #cfdbea;
      padding: 8px 10px;
    }

    .content tbody td {
      vertical-align: top;
      border-bottom: 1px solid #edf1f5;
      padding: 8px 10px;
    }

    .content tbody tr:nth-child(even) td {
      background: #fafcff;
    }

    .content tbody tr:last-child td {
      border-bottom: 0;
    }

    .content blockquote {
      margin: 4mm 0;
      padding: 4mm 5mm;
      color: #38516f;
      background: #f0f6fb;
      border-left: 4px solid var(--cyan);
      border-radius: 0 9px 9px 0;
    }

    .content hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 7mm 0;
    }

    .content strong {
      color: #111827;
    }

    .note-strip {
      margin: 0 0 8mm;
      padding: 4mm 5mm;
      border: 1px solid rgba(189, 123, 20, 0.27);
      border-left: 4px solid var(--gold);
      background: #fff7e8;
      border-radius: 10px;
      color: #5f4016;
      font-size: 9.5pt;
    }

    .generated-watermark {
      color: #7b8491;
      font-size: 8pt;
    }

    @media print {
      .content h2 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <section class="cover">
    <div>
      <div class="eyebrow">Management Progress Report</div>
      <div class="cover-title">
        <h1>Project Progress Report</h1>
        <p>Screenshot Library and Macro Generator / Futures DeskMate progress, presented as a clear business-facing record of product work, reliability improvements, content expansion, and agent enablement.</p>
      </div>
      <div class="cover-meta">
        <div class="meta-panel">
          <h2>Prepared For</h2>
          <p>Management review and recurring progress updates</p>
          <p>Generated on May 5, 2026</p>
        </div>
        <div class="meta-panel">
          <h2>Source Basis</h2>
          <p>GitHub origin/main history for both repositories</p>
          <p>Macro Generator committed vault: sessions, decisions, bugs, and syntheses</p>
        </div>
      </div>
      <div class="metrics">${statCards}</div>
    </div>
    <div class="cover-bottom">
      <div>
        <p>Reporting period: Dec 8, 2025 to May 4, 2026</p>
        <p class="generated-watermark">Designed from PROJECT_PROGRESS_REPORT.md</p>
      </div>
      <div class="repo-list">
        <span>Screenshot Library</span>
        <span>Macro Generator</span>
      </div>
    </div>
  </section>
  <main class="content">
    <div class="note-strip">This PDF keeps the report management-friendly: it focuses on delivered outcomes, agent impact, reliability work, and product maturity instead of deep implementation detail.</div>
    ${bodyHtml}
  </main>
</body>
</html>`;

await fs.writeFile(htmlPath, html, "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7px;color:#7b8491;padding:0 13mm;">Project Progress Report</div>`,
  footerTemplate: `<div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7px;color:#7b8491;padding:0 13mm;display:flex;justify-content:space-between;"><span>Screenshot Library + Macro Generator / Futures DeskMate</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  margin: { top: "15mm", right: "13mm", bottom: "17mm", left: "13mm" },
});
await browser.close();

console.log(JSON.stringify({ htmlPath, pdfPath }, null, 2));
