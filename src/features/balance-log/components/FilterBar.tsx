import React, { useMemo, useState } from "react";

type Row = {
  symbol: string;
  type: string;
  asset: string;
  amount: number;
  time: string;
};

// Distinct sets
const TYPE_COMMISSION = new Set(["COMMISSION", "TRADING_FEE"]);
const TYPE_FUNDING = new Set(["FUNDING_FEE"]);
const TYPE_OTHER_FEE = new Set(["INSURANCE_CLEAR", "LIQUIDATION_FEE"]);

import { fmtMoney } from "../lib/format";

type AssetStats = {
  asset: string;
  commission: number;
  funding: number;
  otherFees: number;
  totalPnl: number; // Realized PnL (Gross)
  netPnl: number; // Realized + Comm + Funding + Other
  bestDay: { day: string; val: number } | null;
  worstDay: { day: string; val: number } | null;
};

export default function FilterBar({ rows }: { rows: Row[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const assetStats = useMemo(() => {
    const byAsset: Record<
      string,
      {
        commission: number;
        funding: number;
        otherFees: number;
        pnl: number;
        daily: Record<string, number>;
      }
    > = {};

    for (const r of rows) {
      if (!r.asset) continue;
      const A = r.asset.toUpperCase();
      const entry = (byAsset[A] = byAsset[A] || { commission: 0, funding: 0, otherFees: 0, pnl: 0, daily: {} });

      // Bucket Types
      if (TYPE_COMMISSION.has(r.type)) entry.commission += r.amount;
      else if (TYPE_FUNDING.has(r.type)) entry.funding += r.amount;
      else if (TYPE_OTHER_FEE.has(r.type)) entry.otherFees += r.amount;
      else if (r.type === "REALIZED_PNL") {
        entry.pnl += r.amount;
        const day = r.time.split(" ")[0];
        if (day) entry.daily[day] = (entry.daily[day] || 0) + r.amount;
      }
    }

    const results: AssetStats[] = [];
    for (const [asset, d] of Object.entries(byAsset)) {
      // Filter noise (approx zero on all)
      if (Math.abs(d.commission) < 0.01 && Math.abs(d.funding) < 0.01 && Math.abs(d.pnl) < 0.01) continue;

      let bestDay = { day: "-", val: -Infinity };
      let worstDay = { day: "-", val: Infinity };
      const days = Object.entries(d.daily);
      if (days.length) {
        for (const [day, val] of days) {
          if (val > bestDay.val) bestDay = { day, val };
          if (val < worstDay.val) worstDay = { day, val };
        }
      }

      const netPnl = d.pnl + d.commission + d.funding + d.otherFees;

      results.push({
        asset,
        commission: d.commission,
        funding: d.funding,
        otherFees: d.otherFees,
        totalPnl: d.pnl,
        netPnl,
        bestDay: days.length ? bestDay : null,
        worstDay: days.length ? worstDay : null
      });
    }

    return results.sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl));
  }, [rows]);

  if (!assetStats.length) return null;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <button
        className="section-head"
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          padding: 0
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="section-title">Performance Highlights</h3>
        <div style={{ color: "#94a3b8" }}>{isOpen ? "Hide ▲" : "Show ▼"}</div>
      </button>

      {isOpen && (
        <div style={{ marginTop: 16 }}>
          {assetStats.map((stats) => {
            const hasComm = Math.abs(stats.commission) > 0.0001;
            const hasFund = Math.abs(stats.funding) > 0.0001;
            const hasOther = Math.abs(stats.otherFees) > 0.0001;

            return (
              <div
                key={stats.asset}
                style={{ marginBottom: 24, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}
              >
                <h4 style={{ margin: "0 0 16px", color: "#38bdf8", fontSize: 16 }}>{stats.asset} Performance</h4>
                <div className="grid-2">
                  {/* Fee Efficiency */}
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16 }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#94a3b8", textTransform: "uppercase" }}>
                      PnL & Fees Breakdown
                    </h4>

                    <RowLine label="Realized PnL (Gross)" val={stats.totalPnl} asset={stats.asset} bold />

                    {hasComm && <RowLine label="Commissions" val={stats.commission} asset={stats.asset} />}
                    {hasFund && <RowLine label="Funding" val={stats.funding} asset={stats.asset} />}
                    {hasOther && <RowLine label="Other Fees" val={stats.otherFees} asset={stats.asset} />}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
                    <RowLine label="Net PnL (After Fees)" val={stats.netPnl} asset={stats.asset} bold colored />
                  </div>

                  {/* Volatility */}
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16 }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#94a3b8", textTransform: "uppercase" }}>
                      Volatility Extremes (PnL)
                    </h4>
                    {stats.bestDay && stats.worstDay ? (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>BEST DAY</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                            <div className="text-green" style={{ fontSize: 18, fontWeight: 700 }}>
                              {fmtMoney(stats.bestDay.val, "")}
                            </div>
                            <div style={{ fontSize: 14, color: "#e2e8f0" }}>{stats.bestDay.day}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>WORST DAY</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                            <div className="text-red" style={{ fontSize: 18, fontWeight: 700 }}>
                              {fmtMoney(stats.worstDay.val, "")}
                            </div>
                            <div style={{ fontSize: 14, color: "#e2e8f0" }}>{stats.worstDay.day}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="muted">No PnL Events found.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowLine({
  label,
  val,
  asset,
  bold,
  colored
}: {
  label: string;
  val: number;
  asset: string;
  bold?: boolean;
  colored?: boolean;
}) {
  const cls = colored
    ? val >= 0
      ? "text-green"
      : "text-red"
    : val > 0
      ? "text-green"
      : val < 0
        ? "text-red"
        : "text-bright";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ color: "#e2e8f0" }}>{label}</span>
      <span className={cls} style={{ fontWeight: bold ? 700 : 400 }}>
        {fmtMoney(val, asset)}
      </span>
    </div>
  );
}
