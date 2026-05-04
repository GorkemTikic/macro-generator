import React, { useState } from "react";
import { type Row } from "../lib/story";
import { LANG_CONFIG, TEXTS, type LocalLang } from "../lib/i18n";

import StoryNarrative from "./story/StoryNarrative";
import StoryAudit from "./story/StoryAudit";
import StoryCharts from "./story/StoryCharts";
import StoryRaw from "./story/StoryRaw";
import { type StoryInputState } from "./story/types";

export default function StoryDrawer({
  open,
  onClose,
  rows,
  initialLang = "en"
}: {
  open: boolean;
  onClose: () => void;
  rows: Row[];
  /** Initial language for the drawer; user can still change it via the in-drawer
   *  selector, which exposes 10 languages (the host app only ships EN/TR). */
  initialLang?: LocalLang;
}) {
  const [tab, setTab] = useState<"narrative" | "audit" | "charts" | "raw">("narrative");

  // Shared inputs (persistent across tabs while the drawer is open)
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [baselineText, setBaselineText] = useState<string>("");
  const [trAmount, setTrAmount] = useState<string>("");
  const [trAsset, setTrAsset] = useState<string>("");
  const [currentWalletText, setCurrentWalletText] = useState<string>("");
  const [lang, setLang] = useState<LocalLang>(initialLang);
  const titleId = "bl-story-drawer-title";

  // Escape closes the dialog. We attach to document so the listener works even
  // if the user's focus is outside the drawer (e.g. clicked the backdrop).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const T = TEXTS[lang];

  const inputState: StoryInputState = { start, end, baselineText, trAmount, trAsset, currentWalletText };
  const setters = { setStart, setEnd, setBaselineText, setTrAmount, setTrAsset, setCurrentWalletText };
  const props = { rows, lang, inputs: inputState, setters };

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card bl-story-drawer"
        style={{
          width: "min(980px, 100%)",
          height: "100%",
          margin: 0,
          borderRadius: 0,
          overflow: "auto"
        }}
      >
        {/* Premium Header */}
        <div className="drawer-header">
          <h3 className="drawer-title" id={titleId}>{T.title}</h3>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Language Selector */}
            <select
              className="select-premium"
              value={lang}
              onChange={(e) => setLang(e.target.value as LocalLang)}
              title={T.lang}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({LANG_CONFIG[option.value].label})
                </option>
              ))}
            </select>

            {/* Close Button (X icon) */}
            <button className="btn-icon-close" onClick={onClose} title={T.close}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs - Segmented Control Style */}
        <div style={{ padding: "16px 24px 0" }}>
          <div className="tabs-segmented">
            <TabBtn id="narrative" label={T.tabNarrative} current={tab} set={setTab} />
            <TabBtn id="audit" label={T.tabAudit} current={tab} set={setTab} />
            <TabBtn id="charts" label={T.tabCharts} current={tab} set={setTab} />
            <TabBtn id="raw" label={T.tabRaw} current={tab} set={setTab} />
          </div>
        </div>

        {/* Content Container (Scrollable part) */}
        <div style={{ padding: "24px" }}>
          {tab === "narrative" && <StoryNarrative {...props} />}
          {tab === "audit" && <StoryAudit {...props} />}
          {tab === "charts" && <StoryCharts {...props} />}
          {tab === "raw" && <StoryRaw {...props} />}
        </div>
      </div>
    </div>
  );
}

const LANGUAGE_OPTIONS: { value: LocalLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "tr", label: "Türkçe" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" }
];

function TabBtn({ id, label, current, set }: { id: any; label: string; current: string; set: (v: any) => void }) {
  const active = current === id;
  // Use 'accent-blue' class for the active tab to trigger the blue styling
  const className = `tab-segment ${active ? "active accent-blue" : ""}`;
  return (
    <button className={className} onClick={() => set(id)}>
      {label}
    </button>
  );
}
