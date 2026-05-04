import React from "react";

export type TabKey = "summary" | "symbol" | "swaps" | "diag";

export type TabLabels = {
  summary: string;
  symbol: string;
  swaps: string;
  diag: string;
};

const DEFAULT_LABELS: TabLabels = {
  summary: "Summary",
  symbol: "By Symbol",
  swaps: "Swaps & Events",
  diag: "Diagnostics"
};

export default function Tabs({
  active,
  onChange,
  labels = DEFAULT_LABELS
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  labels?: TabLabels;
}) {
  const items: { key: TabKey; name: string }[] = [
    { key: "summary", name: labels.summary },
    { key: "symbol", name: labels.symbol },
    { key: "swaps", name: labels.swaps },
    { key: "diag", name: labels.diag }
  ];
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          aria-selected={active === it.key}
          className={`tab ${active === it.key ? "active" : ""}`}
          onClick={() => onChange(it.key)}
        >
          {it.name}
        </button>
      ))}
    </div>
  );
}
