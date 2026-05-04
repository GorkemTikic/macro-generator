import React from "react";

export type TypeFilterProps = {
  types: string[];
  counts?: Record<string, number>;
  hidden: Set<string>;
  onChange: (next: Set<string>) => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
};

export default function TypeFilter({ types, counts = {}, hidden, onChange, onShowAll, onHideAll }: TypeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!types.length) return null;

  const toggle = (t: string) => {
    const n = new Set(hidden);
    if (n.has(t)) n.delete(t);
    else n.add(t);
    onChange(n);
  };

  const shownCount = types.length - hidden.size;

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
          alignItems: "center",
          padding: 0
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h3 className="section-title">Types</h3>
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
            ({hidden.size === 0 ? "All" : shownCount} shown)
          </span>
        </div>
        <div style={{ color: "#94a3b8" }}>{isOpen ? "Hide ▲" : "Show ▼"}</div>
      </button>

      {isOpen && (
        <div style={{ marginTop: 12 }}>
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button className="btn" onClick={onShowAll} disabled={hidden.size === 0}>
              Show All
            </button>
            <button className="btn" onClick={onHideAll} disabled={hidden.size === types.length}>
              Hide All
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {types.map((t) => {
              const isOn = !hidden.has(t);
              return (
                <button
                  key={t}
                  className="btn"
                  onClick={() => toggle(t)}
                  title={t}
                  style={{
                    borderColor: isOn ? "#111827" : undefined,
                    background: isOn ? "#111827" : "#fff",
                    color: isOn ? "#fff" : undefined
                  }}
                >
                  <span className="mono small">{t}</span>
                  {typeof counts[t] === "number" ? (
                    <span className="mono small" style={{ opacity: 0.8 }}>
                      {" "}
                      · {counts[t]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
