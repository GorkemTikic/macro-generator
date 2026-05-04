import React from "react";
import { type StoryTabProps } from "./types";
import { TEXTS } from "../../lib/i18n";

export default function StoryRaw({ lang }: StoryTabProps) {
  const T = TEXTS[lang];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h4 className="section-title" style={{ marginBottom: 8 }}>
        {T.tabRaw}
      </h4>
      <pre
        className="mono"
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 12,
          background: "rgba(0,0,0,0.3)",
          padding: 12,
          borderRadius: 8,
          maxHeight: 560,
          overflow: "auto"
        }}
      >
        {T.rawHint}
      </pre>
    </div>
  );
}
