import React, { useMemo } from "react";
import { fmt } from "../lib/format";
import { useToast } from "./Toast";

export type Row = { symbol: string; asset: string; type: string; amount: number };

export default function SymbolTable({ rows }: { rows: Row[] }) {
  const toast = useToast();
  function sumByAsset(rs: Row[]) {
    const acc: Record<string, { pos: number; neg: number; net: number }> = {};
    for (const r of rs) {
      const a = (acc[r.asset] ||= { pos: 0, neg: 0, net: 0 });
      if (r.amount >= 0) a.pos += r.amount;
      else a.neg += Math.abs(r.amount);
      a.net += r.amount;
    }
    return acc;
  }

  type Totals = { pos: number; neg: number; net: number };
  type TotalsMap = Record<string, Totals>;
  type Block = {
    symbol: string;
    realized: TotalsMap;
    funding: TotalsMap;
    commission: TotalsMap;
    insurance: TotalsMap; // liquidation/clearance fees
  };

  const blocks = useMemo<Block[]>(() => {
    if (!rows?.length) return [];
    const bySym = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.symbol) continue;
      (bySym.get(r.symbol) || bySym.set(r.symbol, []).get(r.symbol)!).push(r);
    }
    const out: Block[] = [];
    for (const [sym, rs] of bySym.entries()) {
      const realized = rs.filter((r) => r.type === "REALIZED_PNL");
      const funding = rs.filter((r) => r.type === "FUNDING_FEE");
      const commission = rs.filter((r) => r.type === "COMMISSION");
      const insurance = rs.filter((r) => r.type === "INSURANCE_CLEAR" || r.type === "LIQUIDATION_FEE");

      const rMap = sumByAsset(realized);
      const fMap = sumByAsset(funding);
      const cMap = sumByAsset(commission);
      const iMap = sumByAsset(insurance);

      const prune = (m: TotalsMap) => {
        for (const k of Object.keys(m)) {
          const v = m[k];
          if (v.pos === 0 && v.neg === 0 && v.net === 0) delete (m as any)[k];
        }
      };
      prune(rMap);
      prune(fMap);
      prune(cMap);
      prune(iMap);

      const any =
        Object.keys(rMap).length || Object.keys(fMap).length || Object.keys(cMap).length || Object.keys(iMap).length;

      if (any) out.push({ symbol: sym, realized: rMap, funding: fMap, commission: cMap, insurance: iMap });
    }
    out.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return out;
  }, [rows]);

  // ——— Tek satır metin export’u (PNG, tüm tablo için aşağıda) ———
  const buildBlockText = (b: Block) => {
    const lines: string[] = [];
    const dispSym =
      b.symbol === "ADMIN_CLEARING" || b.symbol === "CHAT_APPLY_CLEARING" ? "Insurance Fund Clearance" : b.symbol;
    const sect = (title: string, m: TotalsMap) => {
      const keys = Object.keys(m).sort();
      if (!keys.length) return;
      lines.push(`  ${title}:`);
      for (const k of keys) {
        const v = m[k];
        const parts: string[] = [];
        if (v.pos !== 0) parts.push(`+${fmt(v.pos)}`);
        if (v.neg !== 0) parts.push(`−${fmt(v.neg)}`);
        parts.push(`= ${fmt(v.net)}`);
        lines.push(`    • ${k}  ${parts.join("  ")}`);
      }
    };
    lines.push(`Symbol: ${dispSym}`);
    sect("Realized PnL", b.realized);
    sect("Funding", b.funding);
    sect("Trading Fees", b.commission);
    sect("Insurance Clearance Fee", b.insurance);
    // Final Net (All Fees)
    const allAssets = new Set<string>([
      ...Object.keys(b.realized),
      ...Object.keys(b.funding),
      ...Object.keys(b.commission),
      ...Object.keys(b.insurance)
    ]);
    const finals: Record<string, number> = {};
    for (const a of allAssets) {
      finals[a] =
        (b.realized[a]?.net || 0) + (b.funding[a]?.net || 0) + (b.commission[a]?.net || 0) + (b.insurance[a]?.net || 0);
    }
    const keys = Object.keys(finals).sort();
    if (keys.length) {
      lines.push("  Final Net (All Fees):");
      for (const k of keys) lines.push(`    • ${k}  = ${fmt(finals[k])}`);
    }
    return lines.join("\n");
  };

  // Render the full table as a standalone PNG.
  //
  // We don't snapshot the on-screen DOM directly — at common viewport widths,
  // narrow column widths plus `white-space: nowrap` make values overlap into
  // adjacent columns in the rasterized output, even though the live page hides
  // it via horizontal scroll. Instead we build a fresh, off-screen table that
  // ignores the on-screen colgroup, sizes columns to content, and applies
  // explicit per-cell padding/borders so html2canvas captures something
  // legible regardless of the user's viewport.
  async function exportWholeTablePNG() {
    let stage: HTMLElement | null = null;
    try {
      if (!blocks.length) {
        toast.show("Nothing to export.", "info");
        return;
      }

      const { default: html2canvas } = await import("html2canvas");

      const BG = "#0f172a";
      const HEADER_BG = "#11151c";
      const ROW_ALT_BG = "rgba(255,255,255,0.02)";
      const BORDER = "1px solid rgba(255,255,255,0.08)";
      const TEXT = "#e2e8f0";
      const MUTED = "#94a3b8";
      const GREEN = "#10b981";
      const RED = "#ef4444";

      stage = document.createElement("div");
      stage.style.position = "fixed";
      stage.style.left = "-10000px";
      stage.style.top = "0";
      stage.style.padding = "32px";
      stage.style.background = BG;
      stage.style.color = TEXT;
      stage.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      stage.style.fontSize = "13px";
      stage.style.lineHeight = "1.45";

      const heading = document.createElement("div");
      heading.textContent = "By Symbol (Futures, not Events)";
      heading.style.fontSize = "18px";
      heading.style.fontWeight = "700";
      heading.style.marginBottom = "16px";
      heading.style.color = "#f8fafc";
      heading.style.fontFamily = "Inter, system-ui, sans-serif";
      stage.appendChild(heading);

      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.background = BG;
      table.style.tableLayout = "auto";
      table.style.minWidth = "800px";

      const HEADERS = [
        "Symbol",
        "Realized PnL",
        "Funding",
        "Trading Fees",
        "Insurance Clearance Fee",
        "Final Net (All Fees)"
      ];

      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      for (const h of HEADERS) {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.background = HEADER_BG;
        th.style.color = MUTED;
        th.style.textAlign = "left";
        th.style.padding = "12px 16px";
        th.style.borderBottom = BORDER;
        th.style.fontWeight = "600";
        th.style.fontSize = "11px";
        th.style.letterSpacing = "0.05em";
        th.style.textTransform = "uppercase";
        th.style.whiteSpace = "nowrap";
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const renderTotalsCell = (m: TotalsMap) => {
        const td = document.createElement("td");
        td.style.padding = "12px 16px";
        td.style.borderBottom = BORDER;
        td.style.verticalAlign = "top";
        td.style.whiteSpace = "nowrap";
        const keys = Object.keys(m).sort();
        if (!keys.length) {
          td.textContent = "—";
          td.style.color = MUTED;
          return td;
        }
        for (const k of keys) {
          const v = m[k];
          const line = document.createElement("div");
          line.style.whiteSpace = "nowrap";
          line.style.marginBottom = "2px";
          const tag = document.createElement("span");
          tag.textContent = k + " ";
          tag.style.color = TEXT;
          line.appendChild(tag);
          if (v.pos !== 0) {
            const p = document.createElement("span");
            p.textContent = `+${fmt(v.pos)} `;
            p.style.color = GREEN;
            line.appendChild(p);
          }
          if (v.neg !== 0) {
            const n = document.createElement("span");
            n.textContent = `−${fmt(v.neg)} `;
            n.style.color = RED;
            line.appendChild(n);
          }
          td.appendChild(line);
        }
        return td;
      };

      const renderFinalCell = (b: Block) => {
        const td = document.createElement("td");
        td.style.padding = "12px 16px";
        td.style.borderBottom = BORDER;
        td.style.verticalAlign = "top";
        td.style.whiteSpace = "nowrap";
        const allAssets = new Set<string>([
          ...Object.keys(b.realized),
          ...Object.keys(b.funding),
          ...Object.keys(b.commission),
          ...Object.keys(b.insurance)
        ]);
        const keys = Array.from(allAssets).sort();
        if (!keys.length) {
          td.textContent = "—";
          td.style.color = MUTED;
          return td;
        }
        for (const a of keys) {
          const net =
            (b.realized[a]?.net || 0) +
            (b.funding[a]?.net || 0) +
            (b.commission[a]?.net || 0) +
            (b.insurance[a]?.net || 0);
          const line = document.createElement("div");
          line.style.whiteSpace = "nowrap";
          line.style.marginBottom = "2px";
          line.style.color = net === 0 ? MUTED : net > 0 ? GREEN : RED;
          line.style.fontWeight = "700";
          line.textContent = `${a} = ${fmt(net)}`;
          td.appendChild(line);
        }
        return td;
      };

      const tbody = document.createElement("tbody");
      blocks.forEach((b, i) => {
        const tr = document.createElement("tr");
        tr.style.background = i % 2 ? ROW_ALT_BG : "transparent";

        const symTd = document.createElement("td");
        symTd.textContent =
          b.symbol === "ADMIN_CLEARING" || b.symbol === "CHAT_APPLY_CLEARING"
            ? "Insurance Fund Clearance"
            : b.symbol;
        symTd.style.padding = "12px 16px";
        symTd.style.borderBottom = BORDER;
        symTd.style.verticalAlign = "top";
        symTd.style.whiteSpace = "nowrap";
        symTd.style.fontWeight = "700";
        symTd.style.color = "#f8fafc";
        tr.appendChild(symTd);

        tr.appendChild(renderTotalsCell(b.realized));
        tr.appendChild(renderTotalsCell(b.funding));
        tr.appendChild(renderTotalsCell(b.commission));
        tr.appendChild(renderTotalsCell(b.insurance));
        tr.appendChild(renderFinalCell(b));

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      stage.appendChild(table);
      document.body.appendChild(stage);

      const fullW = Math.max(stage.scrollWidth, stage.clientWidth);
      const fullH = Math.max(stage.scrollHeight, stage.clientHeight);

      const canvas = await html2canvas(stage, {
        backgroundColor: BG,
        scale: 2,
        width: fullW,
        height: fullH,
        scrollX: 0,
        scrollY: 0,
        windowWidth: fullW,
        windowHeight: fullH
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "by-symbol-table.png";
      a.click();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.show("Export failed: " + msg, "error");
    } finally {
      if (stage && stage.parentElement) stage.parentElement.removeChild(stage);
    }
  }

  async function copyAll() {
    try {
      const text = blocks.map((b) => buildBlockText(b)).join("\n\n");
      await navigator.clipboard.writeText(text);
      toast.show("All symbol details copied.", "success");
    } catch {
      toast.show("Copy failed.", "error");
    }
  }

  if (!blocks.length) {
    return (
      <div className="card">
        <div className="section-head">
          <h3 className="section-title">By Symbol (Futures, not Events)</h3>
        </div>
        <div className="muted">No symbol activity.</div>
      </div>
    );
  }

  const colStyles = {
    sym: { width: 180 },
    col: { width: 140 },
    act: { width: 200 }
  } as const;

  const renderMapSimple = (m: TotalsMap) => {
    const keys = Object.keys(m).sort();
    if (!keys.length) return <span className="muted">—</span>;
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {keys.map((k) => {
          const v = m[k];
          const parts: React.ReactNode[] = [];
          if (v.pos !== 0)
            parts.push(
              <span key="p" className="text-green">
                +{fmt(v.pos)}{" "}
              </span>
            );
          if (v.neg !== 0)
            parts.push(
              <span key="n" className="text-red">
                −{fmt(v.neg)}{" "}
              </span>
            );
          return (
            <div key={k} className="nowrap">
              {k} {parts}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFinalNet = (b: Block) => {
    const allAssets = new Set<string>([
      ...Object.keys(b.realized),
      ...Object.keys(b.funding),
      ...Object.keys(b.commission),
      ...Object.keys(b.insurance)
    ]);
    const keys = Array.from(allAssets).sort();
    if (!keys.length) return <span className="muted">—</span>;
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {keys.map((a) => {
          const net =
            (b.realized[a]?.net || 0) +
            (b.funding[a]?.net || 0) +
            (b.commission[a]?.net || 0) +
            (b.insurance[a]?.net || 0);
          const cls = net === 0 ? "text-muted" : net > 0 ? "text-green" : "text-red";
          return (
            <div key={a} className={`nowrap ${cls}`}>
              {a} <strong>= {fmt(net)}</strong>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="section-head" style={{ alignItems: "center" }}>
        <h3 className="section-title">By Symbol (Futures, not Events)</h3>
        <div className="btn-row">
          <button className="btn" onClick={exportWholeTablePNG}>
            Export PNG
          </button>
          <button className="btn" onClick={copyAll}>
            Copy ALL (text)
          </button>
        </div>
      </div>

      <div className="tablewrap horizontal" style={{ maxHeight: 560, overflow: "auto" }}>
        <table className="table mono small" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <colgroup>
            <col style={{ width: colStyles.sym.width }} />
            <col style={{ width: colStyles.col.width }} />
            <col style={{ width: colStyles.col.width }} />
            <col style={{ width: colStyles.col.width }} />
            <col style={{ width: colStyles.col.width }} />
            {/* Final Net (All Fees) */}
            <col style={{ width: colStyles.col.width }} />
            <col style={{ width: colStyles.act.width }} />
          </colgroup>
          <thead>
            <tr>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Symbol
              </th>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Realized PnL
              </th>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Funding
              </th>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Trading Fees
              </th>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Insurance Clearance Fee
              </th>
              <th
                style={{ textAlign: "left", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Final Net (All Fees)
              </th>
              <th
                style={{ textAlign: "right", position: "sticky", top: 0, background: "var(--bg-2)", whiteSpace: "nowrap" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b, i) => {
              const textForRow = buildBlockText(b);
              const displaySymbol =
                b.symbol === "ADMIN_CLEARING" || b.symbol === "CHAT_APPLY_CLEARING"
                  ? "Insurance Fund Clearance"
                  : b.symbol;
              return (
                <tr key={b.symbol} style={{ background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                  <td
                    style={{
                      textAlign: "left",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      wordBreak: "keep-all",
                      minWidth: 180,
                      maxWidth: 180
                    }}
                    title={displaySymbol}
                  >
                    {displaySymbol}
                  </td>
                  <td style={{ textAlign: "left", verticalAlign: "top" }}>{renderMapSimple(b.realized)}</td>
                  <td style={{ textAlign: "left", verticalAlign: "top" }}>{renderMapSimple(b.funding)}</td>
                  <td style={{ textAlign: "left", verticalAlign: "top" }}>{renderMapSimple(b.commission)}</td>
                  <td style={{ textAlign: "left", verticalAlign: "top" }}>{renderMapSimple(b.insurance)}</td>
                  <td style={{ textAlign: "left", verticalAlign: "top" }}>{renderFinalNet(b)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>
                    <button
                      className="btn"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(textForRow);
                          toast.show(`${displaySymbol} copied`, "success");
                        } catch {
                          toast.show("Copy failed.", "error");
                        }
                      }}
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
