import React from "react";
import Amount from "./Amount";
import { fmtTrim } from "../lib/format";

export type TotalsMap = Record<string, { pos: number; neg: number; net: number }>;

export default function RpnTable({ title, map }: { title: string; map: TotalsMap }) {
  const rows = Object.entries(map)
    .filter(([, v]) => !(v.pos === 0 && v.neg === 0 && v.net === 0))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card">
      <h3 className="section-title" style={{ marginBottom: 8 }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="muted small">No activity.</div>
      ) : (
        <table className="table mono small" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Asset</th>
              <th style={{ textAlign: "left" }}>Totals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([asset, v], i) => (
              <tr key={asset} style={{ background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                <td style={{ fontWeight: 700 }}>{asset}</td>
                <td>
                  <span className="rpn-totals-line">
                    {v.pos !== 0 && <Amount value={v.pos} showPlus />}
                    {v.neg !== 0 && <Amount value={-v.neg} displayValue={`-${fmtTrim(v.neg)}`} />}
                    <Amount
                      value={v.net}
                      showPlus
                      displayValue={`= ${v.net > 0 ? "+" : ""}${fmtTrim(v.net)}`}
                      bold
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
