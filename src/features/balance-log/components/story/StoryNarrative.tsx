import React, { useMemo } from "react";
import Amount from "../Amount";
import { useToast } from "../Toast";
import { type StoryTabProps } from "./types";
import { TEXTS, friendlyLabel } from "../../lib/i18n";
import { buildSummaryRows, composeNarrative, parseUTC, parseBaseline, parseTransfer } from "../../lib/story";
import { fmtTrim } from "../../lib/format";
import { decimal } from "../../lib/balanceLog";

export default function StoryNarrative({ rows, lang, inputs, setters }: StoryTabProps) {
  const T = TEXTS[lang];
  const toast = useToast();
  const { start, baselineText, trAmount, trAsset } = inputs;
  const { setStart, setBaselineText, setTrAmount, setTrAsset } = setters;

  const baselineParsed = useMemo(() => parseBaseline(baselineText), [baselineText]);
  const transferParsed = useMemo(() => parseTransfer(trAmount, trAsset), [trAmount, trAsset]);
  const summaryRows = useMemo(() => buildSummaryRows(rows), [rows]);

  // P3: validation helpers
  const startValid = !start || parseUTC(start) !== undefined;
  const transferAmountValid = !trAmount || Number.isFinite(Number(trAmount));

  const groups = useMemo(() => {
    const G: Record<string, Record<string, { in: number; out: number }>> = {};
    for (const r of summaryRows) {
      const label = friendlyLabel(r.label, lang);
      const asset = r.asset.toUpperCase();
      const g = (G[label] = G[label] || {});
      const e = (g[asset] = g[asset] || { in: 0, out: 0 });
      e.in += r.in || 0;
      e.out += r.out || 0;
    }
    return G;
  }, [summaryRows, lang]);

  // P4: decimal-safe final balance accumulation (avoids IEEE-754 drift on large row sets).
  // Uses r.amountStr (original string from the log) so we never re-introduce float rounding.
  const finalBalances = useMemo(() => {
    const acc: Record<string, string> = {};
    for (const [asset, amount] of Object.entries(baselineParsed.map || {})) {
      acc[asset] = decimal.add(acc[asset] ?? "0", amount);
    }
    if (transferParsed) {
      acc[transferParsed.asset] = decimal.add(acc[transferParsed.asset] ?? "0", transferParsed.amount);
    }
    const startTs = start ? parseUTC(start) : undefined;
    for (const r of rows) {
      if (startTs && r.ts < startTs) continue;
      acc[r.asset] = decimal.add(acc[r.asset] ?? "0", r.amountStr ?? r.amount);
    }
    const out: { asset: string; amount: number }[] = [];
    for (const [asset, amountStr] of Object.entries(acc).sort(([a], [b]) => a.localeCompare(b))) {
      const amount = Number(amountStr);
      if (Math.abs(amount) < 1e-7) continue;
      out.push({ asset, amount });
    }
    return out;
  }, [rows, baselineParsed.map, transferParsed, start]);

  const friendlyText = useMemo(
    () =>
      composeNarrative({
        lang,
        startTs: start ? parseUTC(start) : undefined,
        baselineMap: baselineParsed.map,
        transferAtStart: transferParsed,
        groups,
        finalFromAudit: finalBalances
      }),
    [lang, start, baselineParsed.map, transferParsed, groups, finalBalances]
  );

  async function copyStory() {
    try {
      await navigator.clipboard.writeText(friendlyText);
      toast.show(T.copied, "success");
    } catch {
      toast.show(T.copyFailed, "error");
    }
  }

  async function exportSummaryPng() {
    try {
      const el = document.getElementById("story-summary-table");
      if (!el) throw new Error(T.tableNotFound);
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el as HTMLElement, { backgroundColor: "#0f172a", scale: 2 });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "balance-story.png";
      a.click();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`${T.exportFailed}: ${msg}`, "error");
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          alignItems: "start"
        }}
      >
        <label className="text-muted" style={{ minWidth: 0 }}>
          {T.startTime}
          <input
            className="input-block"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="YYYY-MM-DD HH:MM:SS"
            style={!startValid ? { borderColor: "#f87171" } : undefined}
          />
          {/* P3: inline validation */}
          {!startValid && (
            <span className="error" style={{ display: "block", fontSize: 11, marginTop: 3 }}>
              Use format YYYY-MM-DD HH:MM:SS
            </span>
          )}
        </label>
        <label className="text-muted" style={{ minWidth: 0 }}>
          {T.baseline}
          <textarea
            className="input-block"
            style={{
              minHeight: 64,
              fontFamily: "monospace",
              fontSize: 13,
              ...(baselineParsed.error ? { borderColor: "#f87171" } : {})
            }}
            placeholder={`USDT 1000\n0.5 BTC`}
            value={baselineText}
            onChange={(e) => setBaselineText(e.target.value)}
          />
          {/* P3: show parse error inline */}
          {baselineParsed.error && (
            <span className="error" style={{ display: "block", fontSize: 11, marginTop: 3 }}>
              {baselineParsed.error}
            </span>
          )}
        </label>
        <div style={{ minWidth: 0 }}>
          <div className="text-muted">{T.transferAtStart}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <input
              className="input-block"
              placeholder={T.amount}
              value={trAmount}
              onChange={(e) => setTrAmount(e.target.value)}
              style={!transferAmountValid ? { borderColor: "#f87171" } : undefined}
            />
            <input
              className="input-block"
              placeholder={T.asset}
              value={trAsset}
              onChange={(e) => setTrAsset(e.target.value)}
            />
          </div>
          {/* P3: invalid transfer amount */}
          {!transferAmountValid && (
            <span className="error" style={{ display: "block", fontSize: 11, marginTop: 3 }}>
              Enter a valid number
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 16 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h4 className="section-title" style={{ margin: 0 }}>
            {T.narrative}
          </h4>
          <button className="btn small" onClick={copyStory}>
            {T.copyStory}
          </button>
        </div>
        <pre
          className="mono"
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 13,
            background: "rgba(0,0,0,0.3)",
            padding: 16,
            borderRadius: 8
          }}
        >
          {friendlyText}
        </pre>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-head flex-between">
          <h4 className="section-title">{T.summaryByTypeAsset}</h4>
          <button className="btn small" onClick={exportSummaryPng}>
            {T.exportPng}
          </button>
        </div>
        <p className="text-muted small" style={{ margin: "0 16px 10px" }}>
          {T.summaryHint}
        </p>
        <div id="story-summary-table" className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th className="text-left">{T.type}</th>
                <th className="text-left">{T.asset}</th>
                <th className="text-right">{T["in"]}</th>
                <th className="text-right">{T.out}</th>
                <th className="text-right">{T.net}</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r, i) => (
                <tr key={i}>
                  <td className="text-left">{friendlyLabel(r.label, lang)}</td>
                  <td className="text-left">
                    <AssetIcon asset={r.asset} /> {r.asset}
                  </td>
                  <td className="text-right" style={amountCellStyle}>
                    {r.in ? <Amount value={r.in} showPlus /> : <span className="text-muted">-</span>}
                  </td>
                  <td className="text-right" style={amountCellStyle}>
                    {r.out ? (
                      <Amount value={-r.out} displayValue={`-${fmtTrim(r.out)}`} />
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-right bold" style={amountCellStyle}>
                    <Amount value={r.net} showPlus bold />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const amountCellStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  wordBreak: "normal"
};

function AssetIcon({ asset }: { asset: string }) {
  const colors: Record<string, string> = {
    BTC: "#f7931a",
    ETH: "#8b93a7",
    BNB: "#f3ba2f",
    USDT: "#26a17b",
    USDC: "#2775ca",
    BFUSD: "#38bdf8",
    FDUSD: "#a78bfa",
    LDUSDT: "#22c55e",
    BNFCR: "#f97316"
  };
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: 3,
        marginRight: 6,
        verticalAlign: "-2px",
        background: colors[asset.toUpperCase()] || "#94a3b8"
      }}
    />
  );
}
