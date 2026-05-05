import { GoogleGenAI } from "@google/genai";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// This is the canonical report file the user maintains
const reportPath = path.join(rootDir, "outputs", "PROJECT_PROGRESS_REPORT.md");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

function runCmd(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** Return today's date in "Month D, YYYY" format (Istanbul time via UTC+3) */
function todayLabel() {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // UTC+3
  return now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Return the "### Month YYYY" heading that should contain today */
function monthHeading() {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const m = now.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const y = now.getUTCFullYear();
  return `### ${m} ${y}`;
}

async function main() {
  console.log("Gathering recent changes...");

  // Commits from the last 48 h — wider window so schedule jobs don't miss anything
  // Exclude vault/docs/script/reporting changes — only real product commits
  const commits1 = runCmd(
    'git log --since="48 hours ago" --pretty=format:"%h - %s" ' +
      '-- . ":(exclude)MacroGenerator" ":(exclude)CLAUDE*" ":(exclude)scripts/" ' +
      '":(exclude).github/" ":(exclude)outputs/" ":(exclude)reports/"'
  );
  const commits2 = runCmd(
    'git -C screenshot-library log --since="48 hours ago" --pretty=format:"%h - %s"'
  );

  if (!commits1 && !commits2) {
    console.log("No product commits in the last 48 hours. Nothing to append.");
    process.exit(0);
  }

  let commitBlock = "";
  if (commits1) commitBlock += `[Macro Generator]\n${commits1}\n\n`;
  if (commits2) commitBlock += `[Screenshot Library]\n${commits2}\n\n`;

  console.log("Commits found:\n", commitBlock);
  console.log("Sending to Gemini for summary...");

  // Read the existing report so Gemini can see the style it must match
  const existingReport = await fs.readFile(reportPath, "utf8");
  // Pull out the last ~10 table rows as style examples
  const tableRows = existingReport
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Date"))
    .slice(-10)
    .join("\n");

  const today = todayLabel();

  const prompt = `
You are updating a project progress report that non-technical managers read.

Your ONLY job is to produce ONE new markdown table row for today (${today}).

The row must follow this exact format (no extra text, no headers, no explanation):
| ${today} | Your summary here. |

Rules:
1. The summary must be written in plain, management-friendly English — no code, no file names, no git hashes.
2. Be SPECIFIC about what actually changed — mention features by name (e.g. "Balance Log Analyzer tab", "Price Lookup icons", "Gemini model upgrade").
3. Write in the same style as these existing rows from the same report:
${tableRows}

Recent commits to summarise:
${commitBlock}

Return ONLY the single markdown table row. No other text.
`;

  // Try models in order — fall back if one is overloaded (503) or rate-limited (429)
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const MAX_RETRIES_PER_MODEL = 3;
  let response;

  modelLoop: for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        console.log(`Trying model: ${model} (attempt ${attempt})...`);
        response = await ai.models.generateContent({ model, contents: prompt });
        console.log(`✅ Success with model: ${model}`);
        break modelLoop;
      } catch (err) {
        const retryable = err?.status === 503 || err?.status === 429;
        if (retryable && attempt < MAX_RETRIES_PER_MODEL) {
          const waitMs = attempt * 10_000; // 10s, 20s
          console.log(`  ${model} returned ${err.status}. Retrying in ${waitMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else if (retryable) {
          console.log(`  ${model} exhausted retries. Falling back to next model...`);
          break; // try next model
        } else {
          throw err; // non-retryable error — fail immediately
        }
      }
    }
  }

  if (!response) {
    console.error("All models failed. Giving up.");
    process.exit(1);
  }

  const newRow = response.text.trim();
  console.log("New row:", newRow);

  // Validate it looks like a table row
  if (!newRow.startsWith("|")) {
    console.error("Gemini returned unexpected format:", newRow);
    process.exit(1);
  }

  // Insert the row at the right place in the report
  const heading = monthHeading(); // e.g. "### May 2026"
  const lines = existingReport.split("\n");

  // Find the heading for the current month
  let monthIndex = lines.findIndex((l) => l.trim() === heading);

  if (monthIndex === -1) {
    // Month section doesn't exist yet — create it before "## Current Product Position"
    const anchorIndex = lines.findIndex((l) =>
      l.startsWith("## Current Product Position")
    );
    const insertAt = anchorIndex !== -1 ? anchorIndex : lines.length;
    lines.splice(
      insertAt,
      0,
      "",
      heading,
      "",
      "| Date | What changed |",
      "|---|---|",
      newRow,
      ""
    );
  } else {
    // Find the last data row in this month's table
    let lastRowIndex = monthIndex;
    for (let i = monthIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith("|")) lastRowIndex = i;
      // Stop if we hit the next section header
      else if (lines[i].startsWith("## ") || lines[i].startsWith("### ")) break;
    }

    // Check if today's date is already present — don't duplicate
    const alreadyExists = lines.some((l) => l.includes(today));
    if (alreadyExists) {
      console.log(`Entry for ${today} already exists. Skipping.`);
      process.exit(0);
    }

    lines.splice(lastRowIndex + 1, 0, newRow);
  }

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`✅ Appended entry for ${today} to outputs/PROJECT_PROGRESS_REPORT.md`);
}

main().catch((err) => {
  console.error("Error generating report:", err);
  process.exit(1);
});
