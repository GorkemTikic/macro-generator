// Pure, dependency-free parser + classifier + reconciliation for the
// Binance USDⓈ-M Futures Balance Log.
//
// Design goals:
//  - Resilient to header reorder, rename, removal, or addition.
//  - Never silently drops rows. Every input row becomes one of:
//      included  (parsed, in scope)
//      excluded  (parsed, out of scope, with reason)
//      invalid   (could not be parsed, with reason)
//  - Preserves the exact raw `type` string. Classification is an extra layer.
//  - Pure: no React / DOM imports. Safe for Node-side tests.
//
// All math is performed via a small decimal-string helper to avoid
// floating-point drift when summing many small fees.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RawTable = string[][];

export type ParsedRow = {
  /** original 1-based row index in the pasted block (excluding header row) */
  rowIndex: number;
  id: string;
  uid: string;
  asset: string;
  /** original raw type string from the log, never normalised */
  type: string;
  /** signed decimal amount as string for precision */
  amountStr: string;
  /** number form for display / charts */
  amount: number;
  /** original timestamp string */
  time: string;
  /** epoch millis (UTC), or NaN when unparseable */
  ts: number;
  symbol: string;
  /** anything we did not place in a known column */
  extra: string;
  /** the raw cells, joined with tab, as we received them */
  raw: string;
  /** broad classifier tag (see classifyType). Raw type still authoritative. */
  category: TypeCategory;
  /** USDⓈ-M scope decision */
  scope: "USDM" | "COINM" | "OTHER" | "UNKNOWN";
};

export type ExcludedRow = ParsedRow & { excludeReason: string };
export type InvalidRow = {
  rowIndex: number;
  raw: string;
  reason: string;
};

export type ParseWarning = { rowIndex?: number; message: string };

export type ParseResult = {
  included: ParsedRow[];
  excluded: ExcludedRow[];
  invalid: InvalidRow[];
  /** raw types seen in the file, with counts (across all categories) */
  rawTypes: Record<string, number>;
  /** raw types that we could not classify */
  unknownTypes: string[];
  warnings: ParseWarning[];
  /** header used (after detection) — empty if heuristic fallback */
  headerUsed: string[] | null;
  /** which file shape we believed we were parsing */
  inputFormat: "html" | "tsv" | "csv" | "whitespace" | "table";
  totalInputRows: number;
};

export type TypeCategory =
  | "TRANSFER"
  | "REALIZED_PNL"
  | "FUNDING_FEE"
  | "COMMISSION"
  | "INSURANCE"
  | "BONUS"
  | "REBATE"
  | "COIN_SWAP"
  | "AUTO_EXCHANGE"
  | "EVENT_CONTRACTS"
  | "DELIVERY"
  | "OPTIONS"
  | "STRATEGY"
  | "CROSS_COLLATERAL"
  | "INTERNAL"
  | "OTHER";

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  id: ["id", "tranid", "tran id", "transactionid", "transaction id", "txid"],
  uid: ["uid", "userid", "user id", "account", "accountid"],
  asset: ["asset", "coin", "currency", "ccy"],
  type: ["type", "tradetype", "trade type", "operation", "kind", "incometype", "income type"],
  amount: ["amount", "income", "value", "change", "delta", "qty", "quantity"],
  time: ["time", "datetime", "date time", "date/time", "timestamp", "createtime", "create time", "executiontime", "execution time"],
  symbol: ["symbol", "pair", "instrument", "contract"]
};

function normaliseHeader(s: string): string {
  return s.toLowerCase().replace(/[\s_]+/g, " ").trim();
}

/** Returns map column-name → column-index, or null when no header looked plausible. */
function detectHeader(row: string[]): { map: Record<string, number>; row: string[] } | null {
  const norm = row.map(normaliseHeader);
  const map: Record<string, number> = {};
  let hits = 0;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < norm.length; i++) {
      if (aliases.includes(norm[i])) {
        if (!(field in map)) {
          map[field] = i;
          hits++;
          break;
        }
      }
    }
  }
  // Need at least asset+type+amount to count as a header.
  if (hits >= 3 && "asset" in map && "type" in map && "amount" in map) {
    return { map, row };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Lexers
// ---------------------------------------------------------------------------

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}:\d{2})\b/;
const ASSET_RE = /^[A-Z][A-Z0-9_]{1,15}$/; // permissive
const SIGNED_NUM_RE = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
const ALL_DIGITS_RE = /^\d{6,}$/; // ids tend to be long digit strings

export function looksLikeAsset(s: string): boolean {
  if (!s) return false;
  if (!ASSET_RE.test(s)) return false;
  if (SIGNED_NUM_RE.test(s)) return false;
  return true;
}

const SIMPLE_TYPE_TOKENS = new Set([
  "TRANSFER",
  "COMMISSION",
  "INSURANCE",
  "BONUS",
  "REBATE"
]);

function looksLikeSymbolToken(s: string): boolean {
  const c = s.toUpperCase();
  if (!/^[A-Z0-9_/.]+$/.test(c) || !/[A-Z]/.test(c)) return false;
  if (c.includes("/") || c.includes(".")) return true;
  // Quote suffix must be at end-of-string (perpetual: BTCUSDT) or followed by
  // a digit (delivery: BTCUSD_240329). Letters after the underscore mean we
  // are looking at a type token like BFUSD_REWARD, not a symbol.
  return /(?:USDT|USDC|BUSD|USD)(?:$|_\d)/.test(c) && c.length > 5;
}

function looksLikeTypeToken(s: string): boolean {
  const c = s.toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{2,}$/.test(c)) return false;
  if (ALL_DIGITS_RE.test(c) || SIGNED_NUM_RE.test(c) || looksLikeSymbolToken(c)) return false;
  return c.includes("_") || SIMPLE_TYPE_TOKENS.has(c) || c.length > 5;
}

export function looksLikeAmount(s: string): boolean {
  if (!s) return false;
  return SIGNED_NUM_RE.test(s.replace(/,/g, ""));
}

export function looksLikeTimestamp(s: string): boolean {
  return DATE_RE.test(s);
}

export function extractTimestamp(s: string): { time: string; ts: number } | null {
  const m = s.match(DATE_RE);
  if (!m) return null;
  const raw = m[1].replace("T", " ");
  const mm = raw.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})$/);
  if (!mm) return null;
  const [, Y, Mo, D, H, Mi, S] = mm;
  const time = `${Y}-${Mo}-${D} ${H.padStart(2, "0")}:${Mi}:${S}`;
  const ts = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S);
  return { time, ts };
}

// ---------------------------------------------------------------------------
// Input shaping: HTML / TSV / CSV / whitespace → 2D table
// ---------------------------------------------------------------------------

/** Convert pasted text to a 2D grid. Caller should set format hint when known. */
export function textToGrid(text: string): { grid: RawTable; format: ParseResult["inputFormat"] } {
  const cleaned = text.replace(/[\u00A0\u2000-\u200B]/g, " ");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { grid: [], format: "whitespace" };

  if (lines.some((l) => l.includes("\t"))) {
    return { grid: lines.map((l) => l.split("\t").map((c) => c.trim())), format: "tsv" };
  }
  // CSV-like: comma separator + at least 4 commas on most lines
  const commaScore = lines.filter((l) => (l.match(/,/g)?.length || 0) >= 4).length;
  if (commaScore >= Math.max(1, Math.floor(lines.length * 0.6))) {
    return { grid: lines.map((l) => splitCsvLine(l)), format: "csv" };
  }
  // whitespace fallback — prefer cell-style splits (2+ spaces or " | "). The
  // single-space alternative was redundant with the looser pattern winning,
  // so it's been removed; the heuristic parser already rejoins date+time.
  return {
    grid: lines.map((l) => l.trim().split(/\s{2,}|\s\|\s/).map((c) => c.trim())),
    format: "whitespace"
  };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/** Map a raw type string to a broad TypeCategory. Returns "OTHER" when unknown. */
export function classifyType(raw: string): TypeCategory {
  const t = raw.toUpperCase();
  if (!t) return "OTHER";
  if (t.includes("FUNDING")) return "FUNDING_FEE";
  if (t.includes("REALIZED")) return "REALIZED_PNL";
  if (t.includes("COMMISSION") || t.includes("TRADING_FEE")) return "COMMISSION";
  if (t.includes("INSURANCE")) return "INSURANCE";
  if (t.includes("REFERRAL") || t.includes("REBATE") || t.includes("KICKBACK") || t.includes("API_REBATE"))
    return "REBATE";
  if (t.includes("WELCOME") || t.includes("BONUS") || t.includes("CASH_COUPON") || t.includes("PRESENT") || t.includes("REWARD") || t.includes("CONTEST"))
    return "BONUS";
  if (t.includes("AUTO_EXCHANGE")) return "AUTO_EXCHANGE";
  if (t.includes("COIN_SWAP")) return "COIN_SWAP";
  if (t.includes("EVENT_CONTRACTS")) return "EVENT_CONTRACTS";
  if (t.includes("DELIVERED") || t.includes("DELIVERY")) return "DELIVERY";
  if (t.includes("OPTIONS")) return "OPTIONS";
  if (t.includes("STRATEGY")) return "STRATEGY";
  if (t.includes("CROSS_COLLATERAL")) return "CROSS_COLLATERAL";
  if (t.includes("TRANSFER")) return "TRANSFER";
  if (t.startsWith("INTERNAL_")) return "INTERNAL";
  return "OTHER";
}

// ---------------------------------------------------------------------------
// USDⓈ-M scope decision
// ---------------------------------------------------------------------------

/**
 * USDⓈ-M futures balance log columns are denominated in stable / quote assets
 * (USDT, USDC, BFUSD, FDUSD, BNFCR, …) and fees can also appear in BNB.
 * Coin-M (delivery) settlements are paid in the coin itself (BTC, ETH, …) and
 * carry COIN-M telltales in `symbol`/`type`.
 *
 * We deliberately err on the side of *including* unfamiliar quote assets so
 * a brand-new stable doesn't silently disappear from the wallet maths.
 * Anything that looks Coin-M is excluded with a clear reason.
 */
const USDM_QUOTE_ASSETS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "BFUSD",
  "FDUSD",
  "TUSD",
  "USDP",
  "DAI",
  "USDE",
  "USD1",
  "BNFCR",
  "LDUSDT",
  "BNB" // fees can settle in BNB on USDⓈ-M
]);

const COINM_HINT_RE = /(_PERP|USD_PERP|_\d{6}|COIN_?M)/i;

export function decideScope(row: { asset: string; type: string; symbol: string; raw: string }):
  | { scope: "USDM" }
  | { scope: "COINM"; reason: string }
  | { scope: "OTHER"; reason: string }
  | { scope: "UNKNOWN"; reason: string } {
  const sym = (row.symbol || "").toUpperCase();
  const type = (row.type || "").toUpperCase();
  const asset = (row.asset || "").toUpperCase();

  if (COINM_HINT_RE.test(sym) || COINM_HINT_RE.test(type) || COINM_HINT_RE.test(row.raw)) {
    return { scope: "COINM", reason: `Coin-M marker matched ("${sym || type}")` };
  }
  if (USDM_QUOTE_ASSETS.has(asset)) {
    return { scope: "USDM" };
  }
  // PnL/fees in a coin-named asset is almost certainly Coin-M.
  if (/^(BTC|ETH|BNB|SOL|XRP|DOGE|ADA|LTC|TRX|LINK|MATIC|DOT|AVAX)$/.test(asset)) {
    if (asset === "BNB") return { scope: "USDM" }; // BNB fee discount on USDⓈ-M
    return { scope: "COINM", reason: `Settlement asset ${asset} is Coin-M-typical` };
  }
  // Unfamiliar but plausibly-stable asset → keep, but flag as UNKNOWN.
  if (looksLikeAsset(asset)) {
    return { scope: "UNKNOWN", reason: `Unfamiliar asset ${asset} treated as USDⓈ-M; verify manually` };
  }
  return { scope: "OTHER", reason: "Asset symbol unrecognised" };
}

// ---------------------------------------------------------------------------
// Row parser (header-driven OR heuristic)
// ---------------------------------------------------------------------------

function parseRowWithHeader(
  cells: string[],
  header: Record<string, number>,
  rowIndex: number,
  rawLine: string
): ParsedRow | { invalid: InvalidRow } {
  const get = (k: string) => (k in header ? (cells[header[k]] || "").trim() : "");
  const id = get("id");
  const uid = get("uid");
  const asset = get("asset").toUpperCase();
  const type = get("type");
  const amountRaw = get("amount").replace(/,/g, "");
  const symbol = get("symbol");
  const tsStr = get("time");

  if (!asset && !type && !amountRaw) {
    return { invalid: { rowIndex, raw: rawLine, reason: "Empty row" } };
  }
  if (!asset) return { invalid: { rowIndex, raw: rawLine, reason: "Missing asset" } };
  if (!type) return { invalid: { rowIndex, raw: rawLine, reason: "Missing type" } };
  if (!looksLikeAmount(amountRaw)) {
    return { invalid: { rowIndex, raw: rawLine, reason: `Amount not numeric: "${amountRaw}"` } };
  }
  const amount = Number(amountRaw);
  const tsHit = extractTimestamp(tsStr) || extractTimestamp(rawLine);
  const time = tsHit?.time || tsStr;
  const ts = tsHit?.ts ?? NaN;

  return finishRow({
    rowIndex,
    id,
    uid,
    asset,
    type,
    amountStr: amountRaw,
    amount,
    time,
    ts,
    symbol,
    extra: "",
    raw: rawLine
  });
}

function parseRowHeuristic(cells: string[], rowIndex: number, rawLine: string):
  | ParsedRow
  | { invalid: InvalidRow } {
  // Find timestamp cell.
  let tsIdx = -1;
  let tsHit: { time: string; ts: number } | null = null;
  for (let i = 0; i < cells.length; i++) {
    const hit = extractTimestamp(cells[i]);
    if (hit) {
      tsIdx = i;
      tsHit = hit;
      break;
    }
  }
  if (!tsHit) {
    // Try joining adjacent cells (when "YYYY-MM-DD" and "HH:MM:SS" got split).
    for (let i = 0; i < cells.length - 1; i++) {
      const hit = extractTimestamp(cells[i] + " " + cells[i + 1]);
      if (hit) {
        tsIdx = i;
        tsHit = hit;
        break;
      }
    }
  }

  // Locate type first. Raw types can look asset-like ("TRANSFER"), so prefer
  // type-shaped tokens while explicitly rejecting symbol/pair-shaped tokens.
  let typeIdx = -1;
  for (let i = 0; i < cells.length; i++) {
    if (i === tsIdx) continue;
    const c = cells[i];
    if (looksLikeTypeToken(c)) {
      typeIdx = i;
      break;
    }
  }
  // Asset: short uppercase identifier, prefer one adjacent to typeIdx.
  let assetIdx = -1;
  if (typeIdx !== -1 && typeIdx > 0 && looksLikeAsset(cells[typeIdx - 1])) {
    assetIdx = typeIdx - 1;
  } else {
    for (let i = 0; i < cells.length; i++) {
      if (i === tsIdx || i === typeIdx) continue;
      if (looksLikeAsset(cells[i])) {
        assetIdx = i;
        break;
      }
    }
  }
  // Amount: prefer the numeric cell immediately after typeIdx; otherwise
  // the cell immediately before tsIdx; otherwise first numeric that isn't
  // an id-shaped digit string.
  let amountIdx = -1;
  const isAmountCandidate = (i: number) =>
    i >= 0 && i < cells.length && i !== tsIdx && i !== typeIdx && i !== assetIdx && looksLikeAmount(cells[i]);
  if (typeIdx !== -1 && isAmountCandidate(typeIdx + 1)) amountIdx = typeIdx + 1;
  else if (tsIdx !== -1 && isAmountCandidate(tsIdx - 1)) amountIdx = tsIdx - 1;
  else {
    for (let i = 0; i < cells.length; i++) {
      if (!isAmountCandidate(i)) continue;
      // Prefer numbers with sign/decimal; skip pure id-shaped longs first.
      if (/[.-]/.test(cells[i])) {
        amountIdx = i;
        break;
      }
    }
    if (amountIdx === -1) {
      for (let i = 0; i < cells.length; i++) {
        if (!isAmountCandidate(i)) continue;
        if (!ALL_DIGITS_RE.test(cells[i])) {
          amountIdx = i;
          break;
        }
      }
    }
  }
  // type fallback: last non-numeric, non-id token as type
  if (typeIdx === -1) {
    for (let i = cells.length - 1; i >= 0; i--) {
      if (i === tsIdx || i === assetIdx || i === amountIdx) continue;
      if (/^[A-Z_][A-Z0-9_ ]+$/i.test(cells[i]) && !ALL_DIGITS_RE.test(cells[i]) && !looksLikeSymbolToken(cells[i])) {
        typeIdx = i;
        break;
      }
    }
  }

  if (assetIdx === -1)
    return { invalid: { rowIndex, raw: rawLine, reason: "Could not locate asset column" } };
  if (amountIdx === -1)
    return { invalid: { rowIndex, raw: rawLine, reason: "Could not locate amount column" } };
  if (typeIdx === -1)
    return { invalid: { rowIndex, raw: rawLine, reason: "Could not locate type column" } };

  const asset = cells[assetIdx].toUpperCase();
  const type = cells[typeIdx];
  const amountStr = cells[amountIdx].replace(/,/g, "");
  const amount = Number(amountStr);

  // id / uid / symbol via remaining cells:
  const used = new Set([tsIdx, assetIdx, amountIdx, typeIdx]);
  const remaining = cells.map((c, i) => ({ c, i })).filter((x) => !used.has(x.i));

  // pick id (long digit), uid (long digit), symbol (uppercase A-Z/digits with /)
  let id = "";
  let uid = "";
  let symbol = "";
  for (const { c } of remaining) {
    if (!id && ALL_DIGITS_RE.test(c)) {
      id = c;
      continue;
    }
    if (!uid && ALL_DIGITS_RE.test(c)) {
      uid = c;
      continue;
    }
    if (!symbol && looksLikeSymbolToken(c) && !ALL_DIGITS_RE.test(c)) {
      symbol = c;
      continue;
    }
  }
  const extra = remaining
    .map(({ c }) => c)
    .filter((c) => c !== id && c !== uid && c !== symbol)
    .join(" ");

  return finishRow({
    rowIndex,
    id,
    uid,
    asset,
    type,
    amountStr,
    amount,
    time: tsHit?.time ?? "",
    ts: tsHit?.ts ?? NaN,
    symbol,
    extra,
    raw: rawLine
  });
}

function finishRow(base: Omit<ParsedRow, "category" | "scope">): ParsedRow | { invalid: InvalidRow } {
  if (!Number.isFinite(base.amount)) {
    return { invalid: { rowIndex: base.rowIndex, raw: base.raw, reason: `Amount not finite: "${base.amountStr}"` } };
  }
  const category = classifyType(base.type);
  const scopeDecision = decideScope({ asset: base.asset, type: base.type, symbol: base.symbol, raw: base.raw });
  return { ...base, category, scope: scopeDecision.scope };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function parseGrid(grid: RawTable, format: ParseResult["inputFormat"] = "table"): ParseResult {
  const result: ParseResult = {
    included: [],
    excluded: [],
    invalid: [],
    rawTypes: {},
    unknownTypes: [],
    warnings: [],
    headerUsed: null,
    inputFormat: format,
    totalInputRows: grid.length
  };
  if (!grid.length) return result;

  // Detect header on first row
  let dataRows = grid;
  const header = detectHeader(grid[0]);
  if (header) {
    result.headerUsed = header.row;
    dataRows = grid.slice(1);
  }

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i];
    const rawLine = cells.join("\t");
    if (!cells.some((c) => c.trim().length)) continue;
    let parsed: ParsedRow | { invalid: InvalidRow };
    if (header) {
      parsed = parseRowWithHeader(cells, header.map, i + 1, rawLine);
    } else {
      parsed = parseRowHeuristic(cells, i + 1, rawLine);
    }
    if ("invalid" in parsed) {
      result.invalid.push(parsed.invalid);
      continue;
    }
    result.rawTypes[parsed.type] = (result.rawTypes[parsed.type] || 0) + 1;
    if (parsed.category === "OTHER" && parsed.type) {
      if (!result.unknownTypes.includes(parsed.type)) result.unknownTypes.push(parsed.type);
    }
    // `parsed.scope` was already populated by `finishRow` via `decideScope`.
    // Re-running `decideScope` here would double the work and risks drifting
    // if either call is ever changed. We only need the reason string for the
    // excluded/unknown cases, so call once with `_` ignored where possible.
    let reason = '';
    if (parsed.scope !== "USDM") {
      const re = decideScope({ asset: parsed.asset, type: parsed.type, symbol: parsed.symbol, raw: parsed.raw });
      if (re.scope !== 'USDM') reason = re.reason ?? '';
    }
    if (parsed.scope === "USDM" || parsed.scope === "UNKNOWN") {
      result.included.push(parsed);
      if (parsed.scope === "UNKNOWN") {
        result.warnings.push({ rowIndex: parsed.rowIndex, message: reason });
      }
    } else {
      result.excluded.push({ ...parsed, excludeReason: reason });
    }
  }
  return result;
}

export function parseText(text: string): ParseResult {
  const { grid, format } = textToGrid(text);
  return parseGrid(grid, format);
}

// ---------------------------------------------------------------------------
// Decimal-safe arithmetic
// ---------------------------------------------------------------------------
// We avoid pulling in big.js / decimal.js to keep the bundle small.
// A small fixed-precision string adder is enough for summing balance log
// amounts, which never exceed ~12 fractional digits in practice.

const DEC_PRECISION = 18;

function toFixedStr(n: number | string): string {
  if (typeof n === "number") {
    if (!Number.isFinite(n)) return "0";
    if (Math.abs(n) < 1e-15) return "0";
    return n.toFixed(DEC_PRECISION);
  }
  const s = (n || "").trim();
  if (!s) return "0";
  if (/e/i.test(s)) return Number(s).toFixed(DEC_PRECISION);
  if (!s.includes(".")) return s + "." + "0".repeat(DEC_PRECISION);
  const [a, b] = s.split(".");
  return a + "." + (b + "0".repeat(DEC_PRECISION)).slice(0, DEC_PRECISION);
}

function decAdd(a: string | number, b: string | number): string {
  const aa = toFixedStr(a);
  const bb = toFixedStr(b);
  // BigInt addition on integer * 10^DEC_PRECISION
  const ai = BigInt(aa.replace(/[.-]/g, "")) * (aa.startsWith("-") ? -1n : 1n);
  const bi = BigInt(bb.replace(/[.-]/g, "")) * (bb.startsWith("-") ? -1n : 1n);
  const sum = ai + bi;
  const sign = sum < 0n ? "-" : "";
  const abs = (sum < 0n ? -sum : sum).toString().padStart(DEC_PRECISION + 1, "0");
  const intPart = abs.slice(0, abs.length - DEC_PRECISION) || "0";
  const fracPart = abs.slice(abs.length - DEC_PRECISION).replace(/0+$/, "");
  return fracPart ? `${sign}${intPart}.${fracPart}` : `${sign}${intPart}`;
}

function decNegate(v: string | number): string {
  const n = decAdd(v, 0);
  if (n === "0") return "0";
  return n.startsWith("-") ? n.slice(1) : `-${n}`;
}

function decSub(a: string | number, b: string | number): string {
  return decAdd(a, decNegate(b));
}

export const decimal = { add: decAdd, normalise: (s: string | number) => decAdd(s, 0) };

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export type ReconcileInput = {
  rows: ParsedRow[];
  startTs: number;
  endTs?: number;
  baseline?: Record<string, number | string>;
  transferAtStart?: { asset: string; amount: number | string };
  currentWallet?: Record<string, number | string>;
  /** absolute tolerance for the comparison, default 1e-6 */
  tolerance?: number;
};

export type AssetReconcile = {
  asset: string;
  baseline: string;
  transferAtStart: string;
  activity: string;
  expected: string;
  actual?: string;
  difference?: string;
  status: "match" | "mismatch" | "unknown";
};

export type ReconcileResult = {
  perAsset: Record<string, AssetReconcile>;
  /** rows considered (after start/end window) */
  consideredRowCount: number;
  warnings: ParseWarning[];
  /** raw-type breakdown for the considered range */
  byType: Record<string, Record<string, string>>;
};

export function reconcileUsdMFuturesBalance(input: ReconcileInput): ReconcileResult {
  const tol = input.tolerance ?? 1e-6;
  const start = input.startTs;
  const end = input.endTs ?? Number.POSITIVE_INFINITY;
  const considered = input.rows.filter((r) => Number.isFinite(r.ts) && r.ts >= start && r.ts <= end);

  const warnings: ParseWarning[] = [];
  const perAsset: Record<string, AssetReconcile> = {};
  const ensure = (asset: string): AssetReconcile => {
    if (!perAsset[asset]) {
      perAsset[asset] = {
        asset,
        baseline: "0",
        transferAtStart: "0",
        activity: "0",
        expected: "0",
        status: "unknown"
      };
    }
    return perAsset[asset];
  };

  // 1. Baselines
  if (input.baseline) {
    for (const [a, v] of Object.entries(input.baseline)) {
      const e = ensure(a.toUpperCase());
      e.baseline = decAdd(e.baseline, v ?? 0);
    }
  }
  // 2. Transfer-at-start
  if (input.transferAtStart) {
    const a = input.transferAtStart.asset.toUpperCase();
    const e = ensure(a);
    e.transferAtStart = decAdd(e.transferAtStart, input.transferAtStart.amount ?? 0);

    // Duplicate-detection: any TRANSFER row at start with same asset+amount?
    const target = Number(input.transferAtStart.amount);
    const dup = considered.find(
      (r) =>
        classifyType(r.type) === "TRANSFER" &&
        r.asset.toUpperCase() === a &&
        Math.abs(r.ts - start) <= 60_000 && // within 1 minute
        Math.abs(r.amount - target) <= tol
    );
    if (dup) {
      warnings.push({
        rowIndex: dup.rowIndex,
        message: `Transfer-at-start (${target} ${a}) appears to overlap with TRANSFER row at ${dup.time}. If the log already includes this transfer, do NOT also enter it as transfer-at-start.`
      });
    }
  }

  // 3. Activity
  const byType: Record<string, Record<string, string>> = {};
  for (const r of considered) {
    const e = ensure(r.asset.toUpperCase());
    e.activity = decAdd(e.activity, r.amountStr);
    const t = (byType[r.type] = byType[r.type] || {});
    t[r.asset] = decAdd(t[r.asset] || "0", r.amountStr);
  }

  // 4. Expected, Actual, Diff
  for (const e of Object.values(perAsset)) {
    e.expected = decAdd(decAdd(e.baseline, e.transferAtStart), e.activity);
  }
  if (input.currentWallet) {
    for (const [a, v] of Object.entries(input.currentWallet)) {
      const e = ensure(a.toUpperCase());
      e.actual = decAdd("0", v ?? 0);
      e.difference = decSub(e.actual, e.expected);
      e.status = Math.abs(Number(e.difference)) <= tol ? "match" : "mismatch";
    }
  }

  return { perAsset, consideredRowCount: considered.length, warnings, byType };
}

// ---------------------------------------------------------------------------
// Utility used by App: sort a record of asset → number/string
// ---------------------------------------------------------------------------
export function entriesSortedByMagnitude<T extends string | number>(rec: Record<string, T>): [string, T][] {
  return Object.entries(rec).sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])));
}
