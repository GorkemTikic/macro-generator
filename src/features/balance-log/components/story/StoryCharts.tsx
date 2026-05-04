import React, { useMemo } from "react";
import { type StoryTabProps } from "./types";
import { TEXTS } from "../../lib/i18n";
import { buildDailyNet, buildAssetNet } from "../charts/SimpleCharts";
import { DailyPerformanceChart, AssetDistributionChart } from "../charts/PremiumCharts";

export default function StoryCharts({ rows, lang }: StoryTabProps) {
  const T = TEXTS[lang];
  const dailySeries = useMemo(() => buildDailyNet(rows), [rows]);
  const assetNets = useMemo(() => buildAssetNet(rows), [rows]);

  return (
    <div style={{ marginTop: 16 }}>
      <h4 className="section-title" style={{ marginBottom: 8 }}>
        {T.tabCharts}
      </h4>
      <div className="card" style={{ marginTop: 8 }}>
        <div className="section-head">
          <h4 className="section-title">{T.dailyNetAll}</h4>
        </div>
        <p className="text-muted small" style={{ margin: "0 16px 10px" }}>
          {T.dailyNetHint}
        </p>
        <DailyPerformanceChart data={dailySeries} height={300} emptyText={T.noData} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h4 className="section-title">{T.netByAsset}</h4>
        </div>
        <p className="text-muted small" style={{ margin: "0 16px 10px" }}>
          {T.assetNetHint}
        </p>
        <AssetDistributionChart data={assetNets} height={320} emptyText={T.noData} />
      </div>
    </div>
  );
}
