import React, { useMemo, useState } from "react";
import { type StoryTabProps } from "./types";
import { TEXTS } from "../../lib/i18n";
import { parseUTC, parseBaseline, parseTransfer } from "../../lib/story";
import { reconcileUsdMFuturesBalance, type ParsedRow } from "../../lib/balanceLog";

/**
 * Agent Audit — wallet reconciliation flow.
 *
 * Inputs:
 *   - Start time (required, UTC YYYY-MM-DD HH:MM:SS)
 *   - End time (optional)
 *   - Initial balances (one per line: "USDT 1000" or "1000 USDT")
 *   - Transfer at start (single asset + amount)
 *   - Current wallet balances (optional, same format as baseline) — when
 *     supplied, the table shows expected vs actual + match/mismatch status.
 *
 * Output: per-asset reconciliation table from `reconcileUsdMFuturesBalance`,
 * plus warnings the parser raised, plus a "Copy Audit" button.
 */
export default function StoryAudit({ rows, lang, inputs, setters }: StoryTabProps) {
  const T = TEXTS[lang];
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const startTs = useMemo(() => parseUTC(inputs.start), [inputs.start]);
  const endTs = useMemo(() => (inputs.end ? parseUTC(inputs.end) : undefined), [inputs.end]);
  const baseline = useMemo(() => {
    if (!inputs.baselineText.trim()) return { map: undefined as Record<string, number> | undefined, error: undefined };
    return parseBaseline(inputs.baselineText);
  }, [inputs.baselineText]);
  const currentWallet = useMemo(() => {
    if (!inputs.currentWalletText.trim()) return { map: undefined as Record<string, number> | undefined, error: undefined };
    return parseBaseline(inputs.currentWalletText);
  }, [inputs.currentWalletText]);
  const transfer = useMemo(
    () => parseTransfer(inputs.trAmount, inputs.trAsset),
    [inputs.trAmount, inputs.trAsset]
  );

  const result = useMemo(() => {
    if (!startTs) return undefined;
    if (baseline.error) return undefined;
    if (currentWallet.error) return undefined;
    return reconcileUsdMFuturesBalance({
      // ParsedRow is a structural superset of Row for our purposes; the
      // narrowing is enforced by the parser earlier in the pipeline.
      rows: rows as unknown as ParsedRow[],
      startTs,
      endTs,
      baseline: baseline.map,
      transferAtStart: transfer,
      currentWallet: currentWallet.map,
    });
  }, [rows, startTs, endTs, baseline, currentWallet, transfer]);

  // Surface parse errors before render
  React.useEffect(() => {
    if (baseline.error) setError(`Baseline: ${baseline.error}`);
    else if (currentWallet.error) setError(`Current wallet: ${currentWallet.error}`);
    else setError("");
  }, [baseline.error, currentWallet.error]);

  const auditText = useMemo(() => {
    if (!result || !startTs) return "";
    const lines: string[] = [];
    lines.push(`Agent Audit — ${T.title}`);
    lines.push(`Start (UTC+0): ${inputs.start}`);
    if (inputs.end) lines.push(`End (UTC+0): ${inputs.end}`);
    lines.push(`Rows in range: ${result.consideredRowCount}`);
    lines.push("");
    lines.push("Asset | Baseline | Transfer | Activity | Expected | Actual | Diff | Status");
    lines.push("------|----------|----------|----------|----------|--------|------|-------");
    for (const a of Object.values(result.perAsset)) {
      lines.push(
        [
          a.asset,
          a.baseline,
          a.transferAtStart,
          a.activity,
          a.expected,
          a.actual ?? "—",
          a.difference ?? "—",
          a.status,
        ].join(" | ")
      );
    }
    if (result.warnings.length) {
      lines.push("");
      lines.push("Warnings:");
      for (const w of result.warnings) lines.push(`- ${w.message}`);
    }
    return lines.join("\n");
  }, [result, startTs, inputs.start, inputs.end, T.title]);

  const handleCopyAudit = async () => {
    if (!auditText) return;
    try {
      await navigator.clipboard.writeText(auditText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed.");
    }
  };

  const inputLabel: React.CSSProperties = { fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h4 className="section-title" style={{ margin: 0 }}>
          {T.tabAudit}
        </h4>
        <button
          className="btn btn-dark"
          onClick={handleCopyAudit}
          disabled={!auditText}
          title={T.copyAudit}
        >
          {copied ? "✓ Copied" : T.copyAudit}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <label>
          <span style={inputLabel}>{T.startTime} *</span>
          <input
            className="input-block"
            value={inputs.start}
            onChange={(e) => setters.setStart(e.target.value)}
            placeholder="YYYY-MM-DD HH:MM:SS"
            aria-label={T.startTime}
          />
        </label>
        <label>
          <span style={inputLabel}>{T.endTime}</span>
          <input
            className="input-block"
            value={inputs.end}
            onChange={(e) => setters.setEnd(e.target.value)}
            placeholder="YYYY-MM-DD HH:MM:SS"
            aria-label={T.endTime}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
        <label>
          <span style={inputLabel}>{T.baseline}</span>
          <textarea
            className="input-block"
            style={{ minHeight: 80, fontFamily: "ui-monospace, monospace" }}
            value={inputs.baselineText}
            onChange={(e) => setters.setBaselineText(e.target.value)}
            placeholder={`${T.onePerLine}\nUSDT 1000`}
            aria-label={T.baseline}
          />
        </label>
        <div>
          <span style={inputLabel}>{T.transferAtStart}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input-block"
              style={{ flex: 1 }}
              value={inputs.trAmount}
              onChange={(e) => setters.setTrAmount(e.target.value)}
              placeholder="Amount"
              aria-label="Transfer amount"
            />
            <input
              className="input-block"
              style={{ flex: 1 }}
              value={inputs.trAsset}
              onChange={(e) => setters.setTrAsset(e.target.value)}
              placeholder="Asset"
              aria-label="Transfer asset"
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>
          <span style={inputLabel}>{T.currentWallet}</span>
          <textarea
            className="input-block"
            style={{ minHeight: 60, fontFamily: "ui-monospace, monospace" }}
            value={inputs.currentWalletText}
            onChange={(e) => setters.setCurrentWalletText(e.target.value)}
            placeholder={`${T.onePerLine}\nUSDT 1234.56\nBNB 0.0123`}
            aria-label={T.currentWallet}
          />
        </label>
      </div>

      <div style={{ marginTop: 20 }}>
        <h5 className="section-title" style={{ marginBottom: 8 }}>{T.preview}</h5>
        <div
          style={{
            padding: 12,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            color: "#cbd5e1"
          }}
        >
          {error ? (
            <div style={{ color: "#ef4444" }}>{error}</div>
          ) : !startTs ? (
            <div style={{ color: "#94a3b8" }}>{T.auditStartRequired}</div>
          ) : !result ? (
            <div style={{ color: "#94a3b8" }}>{T.auditFailed}</div>
          ) : (
            <AuditTable result={result} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}

function AuditTable({
  result,
  lang
}: {
  result: ReturnType<typeof reconcileUsdMFuturesBalance>;
  lang: StoryTabProps["lang"];
}) {
  const T = TEXTS[lang];
  const assets = Object.values(result.perAsset).sort((a, b) => a.asset.localeCompare(b.asset));
  if (!assets.length) {
    return <div style={{ color: "#94a3b8" }}>{T.rowsInRange}: {result.consideredRowCount}</div>;
  }
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {T.rowsInRange}: <strong>{result.consideredRowCount}</strong>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table mono small" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Asset</th>
              <th style={{ textAlign: "right" }}>{T.baselineColumn}</th>
              <th style={{ textAlign: "right" }}>{T.transferColumn}</th>
              <th style={{ textAlign: "right" }}>{T.activityColumn}</th>
              <th style={{ textAlign: "right" }}>{T.expectedColumn}</th>
              <th style={{ textAlign: "right" }}>{T.actualColumn}</th>
              <th style={{ textAlign: "right" }}>{T.differenceColumn}</th>
              <th style={{ textAlign: "left" }}>{T.statusColumn}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.asset}>
                <td style={{ fontWeight: 700 }}>{a.asset}</td>
                <td style={{ textAlign: "right" }}>{a.baseline}</td>
                <td style={{ textAlign: "right" }}>{a.transferAtStart}</td>
                <td style={{ textAlign: "right" }}>{a.activity}</td>
                <td style={{ textAlign: "right" }}>{a.expected}</td>
                <td style={{ textAlign: "right" }}>{a.actual ?? "—"}</td>
                <td style={{ textAlign: "right", color: a.difference && a.difference !== "0" ? "#eab308" : undefined }}>
                  {a.difference ?? "—"}
                </td>
                <td>
                  <StatusBadge status={a.status} lang={lang} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.warnings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong style={{ color: "#94a3b8" }}>Warnings:</strong>
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {result.warnings.slice(0, 50).map((w, i) => (
              <li key={i} style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5 }}>
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, lang }: { status: "match" | "mismatch" | "unknown"; lang: StoryTabProps["lang"] }) {
  const T = TEXTS[lang];
  const map = {
    match:    { color: "#10b981", text: T.match },
    mismatch: { color: "#ef4444", text: T.mismatch },
    unknown:  { color: "#94a3b8", text: T.unknown }
  } as const;
  const { color, text } = map[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        background: `${color}22`,
        color,
        fontWeight: 600,
        fontSize: 11,
        textTransform: "uppercase"
      }}
    >
      {text}
    </span>
  );
}
