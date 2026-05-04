// Pure utilities for narrative/audit/summary. No React imports here.
import { type LocalLang, TEXTS, friendlyLabel, LANG_CONFIG } from "./i18n";

export type Row = {
  id: string;
  uid: string;
  asset: string;
  type: string;
  amountStr?: string;
  amount: number;
  time: string;
  ts: number;
  symbol: string;
  extra: string;
  raw: string;
};

export type SummaryRow = { label: string; asset: string; in: number; out: number; net: number };

// ---------------- Formatting ----------------
import { fmt, fmtTrim, fmtFinalForAsset, fmtSigned as fmtSignedPlus, nonZero } from "./format";

/* Template: "Hello {NAME}" */
function tFormat(s: string, map: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
}

/* -------- Date Formatting (No milliseconds, with Offset) -------- */
export function formatTime(ts: number, offsetHours: number): string {
  // Create date object from timestamp
  const date = new Date(ts);
  // Adjust for offset (UTC timestamp + offset hours)
  // We want to force the display of the resulting "local" time as if it were UTC numbers
  // So we add the offset to the UTC milliseconds
  const adjusted = new Date(date.getTime() + offsetHours * 3600 * 1000);

  const Y = adjusted.getUTCFullYear();
  const M = String(adjusted.getUTCMonth() + 1).padStart(2, "0");
  const D = String(adjusted.getUTCDate()).padStart(2, "0");
  const h = String(adjusted.getUTCHours()).padStart(2, "0");
  const m = String(adjusted.getUTCMinutes()).padStart(2, "0");
  const s = String(adjusted.getUTCSeconds()).padStart(2, "0");

  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

// TYPE keys possibly present in logs (extendable)
export const TYPE = {
  TRANSFER: "TRANSFER",
  REALIZED_PNL: "REALIZED_PNL",
  FUNDING_FEE: "FUNDING_FEE",
  COMMISSION: "COMMISSION",
  INSURANCE_CLEAR: "INSURANCE_CLEAR",
  WELCOME_BONUS: "WELCOME_BONUS",
  REFERRAL_KICKBACK: "REFERRAL_KICKBACK",
  COMISSION_REBATE: "COMISSION_REBATE",
  CASH_COUPON: "CASH_COUPON",
  COIN_SWAP_DEPOSIT: "COIN_SWAP_DEPOSIT",
  COIN_SWAP_WITHDRAW: "COIN_SWAP_WITHDRAW",
  POSITION_LIMIT_INCREASE_FEE: "POSITION_LIMIT_INCREASE_FEE",
  POSITION_CLAIM_TRANSFER: "POSITION_CLAIM_TRANSFER",
  AUTO_EXCHANGE: "AUTO_EXCHANGE",
  DELIVERED_SETTELMENT: "DELIVERED_SETTELMENT",
  STRATEGY_UMFUTURES_TRANSFER: "STRATEGY_UMFUTURES_TRANSFER",
  FUTURES_PRESENT: "FUTURES_PRESENT",
  EVENT_CONTRACTS_ORDER: "EVENT_CONTRACTS_ORDER",
  EVENT_CONTRACTS_PAYOUT: "EVENT_CONTRACTS_PAYOUT",
  INTERNAL_COMMISSION: "INTERNAL_COMMISSION",
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
  BFUSD_REWARD: "BFUSD_REWARD",
  INTERNAL_AGENT_REWARD: "INTERNAL_AGENT_REWARD",
  API_REBATE: "API_REBATE",
  CONTEST_REWARD: "CONTEST_REWARD",
  INTERNAL_CONTEST_REWARD: "INTERNAL_CONTEST_REWARD",
  CROSS_COLLATERAL_TRANSFER: "CROSS_COLLATERAL_TRANSFER",
  OPTIONS_PREMIUM_FEE: "OPTIONS_PREMIUM_FEE",
  OPTIONS_SETTLE_PROFIT: "OPTIONS_SETTLE_PROFIT",
  LIEN_CLAIM: "LIEN_CLAIM",
  INTERNAL_COMMISSION_REBATE: "INTERNAL_COMMISSION_REBATE",
  FEE_RETURN: "FEE_RETURN",
  FUTURES_PRESENT_SPONSOR_REFUND: "FUTURES_PRESENT_SPONSOR_REFUND"
} as const;

type Totals = Record<string, { pos: number; neg: number; net: number }>;
export function totalsByType(rows: Row[]) {
  const map: Record<string, Totals> = {};
  for (const r of rows) {
    const tt = (map[r.type] = map[r.type] || {});
    const m = (tt[r.asset] = tt[r.asset] || { pos: 0, neg: 0, net: 0 });
    if (r.amount >= 0) m.pos += r.amount;
    else m.neg += Math.abs(r.amount);
    m.net += r.amount;
  }
  return map;
}

/* -------- Parse final balances from Agent Audit (keeps math intact) -------- */
export function parseFinalBalancesFromAudit(audit: string): { asset: string; amount: number }[] {
  const lines = audit.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.trim().toLowerCase().startsWith("final expected balances"));
  if (startIdx === -1) return [];
  const out: { asset: string; amount: number }[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/•\s*([A-Z0-9_]+)\s+(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
    if (!m) continue;
    out.push({ asset: m[1].toUpperCase(), amount: Number(m[2]) });
  }
  return out;
}

/* -------- Parsers (moved from StoryDrawer) -------- */
export function parseUTC(s: string): number | undefined {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return undefined;
  const [, Y, Mo, D, H, Mi, S] = m;
  return Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S);
}

export function parseBaseline(s: string): { map?: Record<string, number>; error?: string } {
  const out: Record<string, number> = {};
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { map: undefined };

  // Accept "ASSET amount" or "amount ASSET"; amount may be decimal or scientific (e.g., 5.4e-7)
  const AMT = "(-?\\d+(?:\\.\\d+)?(?:e[+\\-]?\\d+)?)";
  const PAT1 = new RegExp(`^([A-Z0-9_]+)\\s+${AMT}$`, "i");
  const PAT2 = new RegExp(`^${AMT}\\s+([A-Z0-9_]+)$`, "i");

  for (const line of lines) {
    let m = line.match(PAT1);
    if (m) {
      out[m[1].toUpperCase()] = (out[m[1].toUpperCase()] || 0) + Number(m[2]);
      continue;
    }
    m = line.match(PAT2);
    if (m) {
      out[m[2].toUpperCase()] = (out[m[2].toUpperCase()] || 0) + Number(m[1]);
      continue;
    }
    return { error: `Could not parse: "${line}"` };
  }
  return { map: out };
}

export function parseTransfer(amountStr: string, assetStr: string) {
  const amount = Number((amountStr || "").trim());
  const asset = (assetStr || "").trim().toUpperCase();
  if (!asset || !Number.isFinite(amount)) return undefined;
  return { asset, amount };
}

/* -------- Narrative composer (display only; no math changes) -------- */
export function composeNarrative(opts: {
  lang: LocalLang;
  // We pass raw timestamp for start, not string, so we can format it with offset
  startTs?: number;
  baselineMap?: Record<string, number> | undefined;
  transferAtStart?: { asset: string; amount: number } | undefined;
  groups: Record<string, Record<string, { in: number; out: number }>>;
  finalFromAudit: { asset: string; amount: number }[];
}) {
  const { lang, startTs, baselineMap, transferAtStart, groups, finalFromAudit } = opts;
  const T = TEXTS[lang];
  const conf = LANG_CONFIG[lang] || LANG_CONFIG["en"];
  const lines: string[] = [];

  // Header
  lines.push(tFormat(T.timesNote, { ZONE: conf.label }));
  lines.push("");

  // Initial balances line. Pick wording based on whether the user actually
  // told us about a transfer-at-start; otherwise the "before the transfer"
  // phrasing is misleading.
  if (baselineMap && Object.keys(baselineMap).length) {
    const items = Object.keys(baselineMap)
      .sort()
      .map((a) => `${a} ${fmtTrim(baselineMap[a])}`);
    const intro = transferAtStart
      ? T.initialBalancesIntro
      : (T as { initialBalancesNoTransfer?: string }).initialBalancesNoTransfer || T.initialBalancesIntro;
    lines.push(`${intro} ${items.join("  •  ")}`);
  }

  // Start line
  const startStr = startTs ? formatTime(startTs, conf.offset) : "";

  if (startStr && transferAtStart) {
    const pretty = `${startStr} ${conf.label}`;
    const amtStr = fmtTrim(transferAtStart.amount);
    const before = baselineMap?.[transferAtStart.asset];
    const after = typeof before === "number" ? before + transferAtStart.amount : undefined;
    const transferLine =
      transferAtStart.amount >= 0
        ? tFormat(T.transferSentenceTo, { AMOUNT: amtStr, ASSET: transferAtStart.asset })
        : tFormat(T.transferSentenceFrom, { AMOUNT: amtStr, ASSET: transferAtStart.asset });
    let line = `${pretty} - ${transferLine}`;
    if (typeof before === "number" && typeof after === "number") {
      line +=
        " " +
        tFormat(T.changedFromTo, {
          BEFORE: fmtTrim(before),
          AFTER: fmtTrim(after),
          ASSET: transferAtStart.asset
        });
    } else {
      line += " " + T.balanceChanged;
    }
    lines.push("");
    lines.push(line);
  } else if (startStr) {
    lines.push("");
    lines.push(`${startStr} ${conf.label} - ${T.startLineNoTransfer}`);
  }
  lines.push("");

  // `groups` keys are the localized friendly labels produced upstream by
  // friendlyLabel(r.label, lang); we sort alphabetically since reverse-mapping
  // back to a canonical key would require duplicating the i18n table here.
  const groupNames = Object.keys(groups).sort();

  lines.push(T.afterStart);
  lines.push("");

  // Groups
  for (const g of groupNames) {
    const byAsset = groups[g];
    // Compare the localized group name against T.COIN_SWAP_MIX etc. to detect
    // swap/funding rows.
    const T_any = T as any;
    const isSwap = g === T_any.COIN_SWAP_MIX || g === T_any.AUTO_EXCHANGE_MIX;
    const isFunding = g === T_any.FUNDING_FEE;

    lines.push(g);

    const assets = Object.keys(byAsset).sort();

    if (isSwap) {
      // Only swaps/auto-exchange show explicit In/Out buckets
      const outs: string[] = [];
      const ins: string[] = [];
      for (const a of assets) {
        const e = byAsset[a];
        if (e.out > 0) outs.push(`${a} -${fmtTrim(e.out)}`);
        if (e.in > 0) ins.push(`${a} +${fmtTrim(e.in)}`);
      }
      if (outs.length) lines.push(`  • ${T.out}:  ${outs.join(", ")}`);
      if (ins.length) lines.push(`  • ${T.in}:   ${ins.join(", ")}`);
    } else if (isFunding) {
      // Funding Fees: split into Received (+) and Paid (-)
      const received: string[] = [];
      const paid: string[] = [];
      for (const a of assets) {
        const e = byAsset[a];
        if (e.in > 0) received.push(`${a} +${fmtTrim(e.in)}`);
        if (e.out > 0) paid.push(`${a} -${fmtTrim(e.out)}`);
      }
      if (received.length) lines.push(`  • ${T.fundingFeesReceived}: ${received.join(", ")}`);
      if (paid.length) lines.push(`  • ${T.fundingFeesPaid}: ${paid.join(", ")}`);
    } else {
      // Others: no "In/Out" words — just signed amounts per asset
      for (const a of assets) {
        const e = byAsset[a];
        const parts: string[] = [];
        if (e.in !== 0) parts.push(`+${fmtTrim(e.in)}`);
        if (e.out !== 0) parts.push(`-${fmtTrim(e.out)}`);
        if (parts.length) lines.push(`  • ${a}: ${parts.join(", ")}`);
      }
    }
    lines.push("");
  }

  // Final balances
  lines.push("—");
  if (finalFromAudit.length > 0) {
    lines.push(T.finalIntro);
    for (const f of finalFromAudit) {
      lines.push(`  • ${f.asset} ${fmtFinalForAsset(f.amount, f.asset)}`);
    }
  }

  return lines.join("\n");
}

// ---------- Summary table (Type & Asset) ----------
export function buildSummaryRows(rows: Row[]): SummaryRow[] {
  const t = totalsByType(rows);
  const out: SummaryRow[] = [];
  for (const typeKey of Object.keys(t)) {
    const m = t[typeKey];
    for (const asset of Object.keys(m)) {
      const e = m[asset];
      const row: SummaryRow = { label: typeKey, asset, in: 0, out: 0, net: 0 };
      if (nonZero(e.pos)) row.in = +fmt(e.pos);
      if (nonZero(e.neg)) row.out = +fmt(e.neg);
      if (nonZero(e.net)) row.net = +fmt(e.net);
      if (row.in || row.out || row.net) out.push(row);
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label) || a.asset.localeCompare(b.asset));
}

// Agent audit text. Timestamps stay in UTC+0 (audit is the technical view —
// only the Narrative tab applies the user's locale offset).
export function buildAudit(
  rows: Row[],
  params: {
    anchorTs: number;
    endTs?: number;
    baseline?: Record<string, number>;
    anchorTransfer?: { asset: string; amount: number };
  }
): string {
  const { anchorTs, endTs, baseline, anchorTransfer } = params;
  const inRange = rows.filter((r) => r.ts >= anchorTs && (endTs ? r.ts <= endTs : true)).sort((a, b) => a.ts - b.ts);

  const t = totalsByType(inRange);

  const lines: string[] = [];
  lines.push("Agent Balance Audit");
  lines.push(`Anchor (UTC+0): ${formatTime(anchorTs, 0)}${endTs ? `  →  End: ${formatTime(endTs, 0)}` : ""}`);
  if (baseline && Object.keys(baseline).length) {
    const bl = Object.keys(baseline)
      .map((a) => `${a} ${fmt(baseline[a])}`)
      .join("  •  ");
    lines.push("", "Baseline (before anchor):", `  • ${bl}`);
  } else {
    lines.push("", "Baseline: not provided (rolling from zero).");
  }
  if (anchorTransfer)
    lines.push("", `Applied anchor transfer: ${fmtSignedPlus(anchorTransfer.amount)} ${anchorTransfer.asset}`);

  lines.push("", "Activity after anchor:");
  const perType: string[] = [];
  for (const typeKey of Object.keys(t).sort()) {
    const m = t[typeKey];
    const items: string[] = [];
    for (const a of Object.keys(m)) {
      const e = m[a];
      const segs: string[] = [];
      if (nonZero(e.pos)) segs.push(`+${fmt(e.pos)}`);
      if (nonZero(e.neg)) segs.push(`-${fmt(e.neg)}`);
      if (!segs.length) continue;
      segs.push(`= ${fmt(e.net)}`);
      items.push(`${a}  ${segs.join(" / ")}`);
    }
    if (items.length) perType.push(`• ${typeKey}: ${items.join("  •  ")}`);
  }
  if (perType.length) lines.push(...perType);
  else lines.push("  • No activity.");

  // Net effect
  const assetNet: Record<string, number> = {};
  for (const typeKey of Object.keys(t)) {
    const m = t[typeKey];
    for (const a of Object.keys(m)) assetNet[a] = (assetNet[a] || 0) + m[a].net;
  }
  lines.push("", "Net effect (after anchor):");
  const netLines = Object.keys(assetNet)
    .filter((a) => nonZero(assetNet[a]))
    .map((a) => `  • ${a}  ${fmtSignedPlus(assetNet[a])}`);
  lines.push(...(netLines.length ? netLines : ["  • 0"]));

  // Always compute final expected balances. If no baseline was provided we
  // roll from zero — useful for users who only want to see net activity.
  {
    const final: Record<string, number> = { ...(baseline || {}) };
    if (anchorTransfer) final[anchorTransfer.asset] = (final[anchorTransfer.asset] || 0) + anchorTransfer.amount;
    for (const a of Object.keys(assetNet)) final[a] = (final[a] || 0) + assetNet[a];

    // Dust filter
    for (const dust of ["BFUSD", "FDUSD", "LDUSDT"]) {
      if (Math.abs(final[dust] || 0) < 1e-7) delete final[dust];
    }

    const finalLines = Object.keys(final)
      .filter((a) => nonZero(final[a]))
      .sort()
      .map((a) => `  • ${a}  ${fmt(final[a])}`);
    if (finalLines.length) {
      const heading = baseline && Object.keys(baseline).length
        ? "Final expected balances:"
        : "Final expected balances (rolling from zero):";
      lines.push("", heading, ...finalLines);
    }
  }

  return lines.join("\n");
}
