import { GoogleGenAI } from "@google/genai";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const reportPath = path.join(reportsDir, "PROJECT_PROGRESS_REPORT.md");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to run commands
function runCmd(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    return "";
  }
}

async function main() {
  console.log("Gathering recent changes...");

  // Get commits from the last 24 hours (excluding Vault/Wiki)
  const commits1 = runCmd('git log --since="24 hours ago" --pretty=format:"%h - %s (%an)" -- . ":(exclude)MacroGenerator" ":(exclude)CLAUDE*"');
  const commits2 = runCmd('git -C screenshot-library log --since="24 hours ago" --pretty=format:"%h - %s (%an)"');
  
  let allCommits = "";
  if (commits1) allCommits += `[Macro Generator Commits]:\n${commits1}\n\n`;
  if (commits2) allCommits += `[Screenshot Library Commits]:\n${commits2}\n\n`;

  if (!allCommits) {
    console.log("No new commits in the last 24 hours. Exiting.");
    process.exit(0);
  }

  console.log("Sending data to Gemini for summary...");

  const prompt = `
You are an expert technical writer and project manager.
Your task is to review the recent technical changes in the "Macro Generator" and "Screenshot Library" repositories and write a short, management-friendly summary of the progress made today.

Recent Commits:
${allCommits}

Instructions:
1. Write in clear, professional English.
2. Group the updates logically.
3. Focus on outcomes, what was delivered, improved, stabilized, or fixed.
4. Mention the impact on the product or agents.
5. Do NOT use deep technical jargon, internal file names, or pure git commit logs.
6. Return ONLY the markdown formatted summary. Use headers like "### YYYY-MM-DD Update".
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const newSummary = response.text.trim();
  console.log("Generated Summary:\n", newSummary);

  // Read current report, insert new summary after the first main header
  let currentReport = await fs.readFile(reportPath, "utf8");
  
  // A simple way to insert: find the first line starting with "## " and insert before it
  const lines = currentReport.split('\n');
  let insertIndex = lines.findIndex(line => line.startsWith('## '));
  if (insertIndex === -1) insertIndex = lines.length; // fallback to end

  lines.splice(insertIndex, 0, `\n${newSummary}\n`);
  
  await fs.writeFile(reportPath, lines.join('\n'), "utf8");
  console.log("Updated PROJECT_PROGRESS_REPORT.md");

  // Render PDF
  console.log("Rendering PDF...");
  runCmd('node reports/render-progress-report-pdf.mjs');
  console.log("Done.");
}

main().catch(err => {
  console.error("Error generating report:", err);
  process.exit(1);
});
