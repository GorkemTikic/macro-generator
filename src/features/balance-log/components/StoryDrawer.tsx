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
            <LangSelect value={lang} onChange={setLang} />

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

const LANGUAGE_OPTIONS: { value: LocalLang; flag: string; label: string }[] = [
  { value: "en", flag: "gb", label: "English" },
  { value: "tr", flag: "tr", label: "Türkçe" },
  { value: "es", flag: "es", label: "Español" },
  { value: "pt", flag: "br", label: "Português" },
  { value: "vi", flag: "vn", label: "Tiếng Việt" },
  { value: "ru", flag: "ru", label: "Русский" },
  { value: "uk", flag: "ua", label: "Українська" },
  { value: "ar", flag: "sa", label: "العربية" },
  { value: "zh", flag: "cn", label: "中文" },
  { value: "ko", flag: "kr", label: "한국어" }
];

function LangSelect({ value, onChange }: { value: LocalLang; onChange: (v: LocalLang) => void }) {
  const [open, setOpen] = React.useState(false);
  const selected = LANGUAGE_OPTIONS.find((o) => o.value === value)!;
  const cfg = LANG_CONFIG[value];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          background: "var(--bl-surface, #1a1f2e)",
          border: "1px solid var(--bl-border, #2a3045)",
          borderRadius: 8,
          color: "var(--bl-text, #e2e8f0)",
          cursor: "pointer",
          fontSize: 14,
          minWidth: 180,
          justifyContent: "space-between"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={`https://flagcdn.com/20x15/${selected.flag}.png`}
            alt={selected.label}
            width={20}
            height={15}
            style={{ borderRadius: 2, flexShrink: 0 }}
          />
          {selected.label}
          <span style={{ opacity: 0.5, fontSize: 12 }}>({cfg.label})</span>
        </span>
        <span style={{ opacity: 0.5, fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 200,
            background: "var(--bl-surface, #1a1f2e)",
            border: "1px solid var(--bl-border, #2a3045)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
            minWidth: 200
          }}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 14px",
                background: opt.value === value ? "rgba(99,102,241,0.15)" : "transparent",
                border: "none",
                color: opt.value === value ? "var(--bl-accent, #818cf8)" : "var(--bl-text, #e2e8f0)",
                cursor: "pointer",
                fontSize: 14,
                textAlign: "left",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = opt.value === value ? "rgba(99,102,241,0.15)" : "transparent"; }}
            >
              <img
                src={`https://flagcdn.com/20x15/${opt.flag}.png`}
                alt={opt.label}
                width={20}
                height={15}
                style={{ borderRadius: 2, flexShrink: 0 }}
              />
              {opt.label}
              <span style={{ opacity: 0.45, fontSize: 12, marginLeft: "auto" }}>
                ({LANG_CONFIG[opt.value].label})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

