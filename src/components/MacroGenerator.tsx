import React, { useState, useEffect, useMemo, useRef } from "react";
import { listMacros, renderMacro } from "../macros";
import { detectMacro } from "../macros/smart_detect";
import {
  getTriggerMinuteCandles,
  getRangeHighLow,
  msMinuteStartUTC,
  getAllSymbolPrecisions
} from "../pricing";
import { useApp } from "../context/AppContext";

// --- Types & Helpers Moved from App.tsx ---

interface MacroInputs {
  order_id: string;
  symbol: string;
  side: string;
  trigger_type: string;
  trigger_price: string;
  limit_price: string;
  executed_price: string;
  placed_at_utc: string;
  triggered_at_utc: string;
  final_status_utc: string;
  status: string;
  executed_at_utc?: string;
  [key: string]: any;
}

const initialInputs: MacroInputs = {
  order_id: "",
  symbol: "ETHUSDT",
  side: "SELL",
  trigger_type: "MARK",
  trigger_price: "",
  limit_price: "",
  executed_price: "",
  placed_at_utc: "",
  triggered_at_utc: "",
  final_status_utc: "",
  status: "OPEN"
};

const GRID_KEYS = [
  "Future UID",
  "Order ID",
  "Order Update Time (UTC)",
  "Symbol",
  "Side",
  "Price",
  "Orig. Qty.",
  "Executed Qty.",
  "Exec. Quote Qty.",
  "Position Side",
  "Status",
  "Expired Reason",
  "Time In Force",
  "Expire Time",
  "Type",
  "Working Type",
  "Stop Price",
  "Liquidation",
  "ADL",
  "ReduceOnly",
  "Client Order ID",
  "Activate Price",
  "Price Rate",
  "Price Protect",
  "Price Match",
  "Self Protection Mode",
  "Order Place Time(UTC)"
];

function getDynamicTimestampLabel(fieldName: string, status: string, lang: string, macroId: string) {
  const labels: any = {
    en: {
      OPEN: "To (UTC, YYYY-MM-DD HH:MM:SS)",
      CANCELED: "Canceled At (UTC, YYYY-MM-DD HH:MM:SS)",
      EXPIRED: "Expired At (UTC, YYYY-MM-DD HH:MM:SS)",
      TRIGGERED: "Triggered At (UTC, YYYY-MM-DD HH:MM:SS)",
      EXECUTED: "Executed At (UTC, YYYY-MM-DD HH:MM:SS)",
      FINAL_STATUS: "Final Status At (Open/Canceled/Expired)",
      TRIGGER_HIT: "Triggered At (Stop Price Hit)"
    },
    tr: {
      OPEN: "Bitiş (UTC, YYYY-AA-GG SS:DD:ss)",
      CANCELED: "İptal Zamanı (UTC, YYYY-AA-GG SS:DD:ss)",
      EXPIRED: "Süre Doldu (UTC, YYYY-AA-GG SS:DD:ss)",
      TRIGGERED: "Tetiklenme Zamanı (UTC, YYYY-AA-GG SS:DD:ss)",
      EXECUTED: "Gerçekleşme Zamanı (UTC, YYYY-AA-GG SS:DD:ss)",
      FINAL_STATUS: "Son Durum Zamanı (Açık/İptal/Süresi Doldu)",
      TRIGGER_HIT: "Tetiklenme Zamanı (Stop Fiyatına Ulaştı)"
    }
  };
  const l = labels[lang] || labels['en'];

  if (fieldName === "final_status_utc") {
    return l[status] || l.FINAL_STATUS;
  }
  if (fieldName === "triggered_at_utc") {
    if (macroId.includes("stop_limit")) {
      return l.TRIGGER_HIT;
    }
    return l[status] || l.EXECUTED;
  }
  return "Timestamp (UTC)";
}

function mapGridData(rawText: string) {
  const values = rawText.split('\n').map(v => v.trim()).filter(v => v);
  const dataMap: { [key: string]: string } = {};

  if (values.length === 0) return dataMap;

  if (values.length === 27) {
    for (let i = 0; i < GRID_KEYS.length; i++) {
      dataMap[GRID_KEYS[i]] = values[i] || "";
    }
  } else if (values.length === 26) {
    for (let i = 0; i <= 16; i++) {
      dataMap[GRID_KEYS[i]] = values[i] || "";
    }
    dataMap[GRID_KEYS[17]] = "N/A (Boşluk Atlandı)";
    for (let i = 17; i <= 25; i++) {
      if (values[i] !== undefined) {
        dataMap[GRID_KEYS[i + 1]] = values[i];
      }
    }
  } else {
    throw new Error(`Geçersiz satır sayısı. 26 veya 27 satır bekleniyordu, ${values.length} bulundu.`);
  }

  return dataMap;
}

function parseDataMap(dataMap: { [key: string]: string }): Partial<MacroInputs> {
  const parsed: Partial<MacroInputs> = {};

  if (dataMap['Order ID']) parsed.order_id = dataMap['Order ID'];
  if (dataMap['Symbol']) parsed.symbol = dataMap['Symbol'];
  if (dataMap['Side']) parsed.side = dataMap['Side'].toUpperCase();
  if (dataMap['Order Place Time(UTC)']) parsed.placed_at_utc = dataMap['Order Place Time(UTC)'];

  if (dataMap['Status']) {
    const status = dataMap['Status'].toUpperCase();
    if (status === 'FILLED') parsed.status = 'EXECUTED';
    else if (status === 'CANCELED') parsed.status = 'CANCELED';
    else if (status === 'OPEN') parsed.status = 'OPEN';
    else parsed.status = status;
  }

  if (dataMap['Working Type']) {
    const wt = dataMap['Working Type'].toUpperCase();
    if (wt === 'MARK_PRICE') parsed.trigger_type = 'MARK';
    else if (wt === 'LAST_PRICE') parsed.trigger_type = 'LAST';
    else parsed.trigger_type = wt;
  }

  if (dataMap['Order Update Time (UTC)']) {
    const updateTime = dataMap['Order Update Time (UTC)'];
    const currentStatus = parsed.status || 'OPEN';

    if (currentStatus === 'EXECUTED') {
      parsed.executed_at_utc = updateTime;
      parsed.final_status_utc = updateTime;
    } else if (currentStatus === 'CANCELED') {
      parsed.final_status_utc = updateTime;
    } else if (currentStatus === 'EXPIRED') {
      parsed.final_status_utc = updateTime;
    }
  }

  if (dataMap['Stop Price']) {
    const stopPriceParts = dataMap['Stop Price'].split('|').map(p => p.trim());
    const price = parseFloat(stopPriceParts[0]);
    if (!isNaN(price) && price > 0) {
      parsed.trigger_price = stopPriceParts[0];
    }
    if (stopPriceParts.length > 1 && stopPriceParts[1].includes('-')) {
      parsed.triggered_at_utc = stopPriceParts[1];
    }
  }

  if (dataMap['Price']) {
    const price = parseFloat(dataMap['Price']);
    if (!isNaN(price) && price > 0) {
      parsed.limit_price = dataMap['Price'];
    }
  }

  return parsed;
}

// --- Main Component ---

export default function MacroGenerator({ lang, uiStrings }) {
  const t = uiStrings;
  const { activeSymbol, setActiveSymbol } = useApp();

  const [macros, setMacros] = useState<any[]>([]);
  const [macroId, setMacroId] = useState("");
  const [inputs, setInputs] = useState(initialInputs);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState("detailed");
  const [tone, setTone] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const outRef = useRef<any>(null);

  // Smart Detect State
  const [userQuery, setUserQuery] = useState("");
  const [detectedIntent, setDetectedIntent] = useState<any>(null);

  // Modal state
  const [showParseModal, setShowParseModal] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [parseError, setParseError] = useState("");

  // Sync Active Symbol -> Inputs
  useEffect(() => {
    setInputs(prev => ({ ...prev, symbol: activeSymbol }));
  }, [activeSymbol]);

  // Smart Detect Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userQuery.trim().length > 3) {
        const intent = detectMacro(userQuery);
        if (intent && intent.macroId) {
          setDetectedIntent(intent);
          setMacroId(intent.macroId);
          if (intent.tone) {
            setTone(intent.tone);
          }
        } else {
          setDetectedIntent(null);
        }
      } else {
        setDetectedIntent(null);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [userQuery]);

  // Load Macros
  useEffect(() => {
    const mList = listMacros(lang);
    setMacros(mList);
    if (mList.length > 0 && !macroId) {
      setMacroId(mList[0].id);
    }
  }, [lang]);

  // Active Macro Logic
  const activeMacro = useMemo(
    () => macros.find((m) => m.id === macroId),
    [macros, macroId]
  );

  useEffect(() => {
    if (!activeMacro) return;
    const newDefaults = {};
    activeMacro.formConfig.forEach((field) => {
      if (field.defaultValue !== undefined) {
        newDefaults[field.name] = field.defaultValue;
      }
    });
    setInputs((prev) => ({
      ...initialInputs,
      ...newDefaults,
      symbol: prev.symbol,
      order_id: prev.order_id
    }));
  }, [activeMacro]);

  const onChange = (k: string, v: string) => setInputs((prev) => ({ ...prev, [k]: v }));

  // Preview Data Map for Modal
  const previewDataMap = useMemo(() => {
    try {
      setParseError("");
      return mapGridData(pasteData);
    } catch (e: any) {
      if (pasteData.trim().length > 0) {
        setParseError(e.message);
      }
      return {};
    }
  }, [pasteData]);

  function openParseModal() {
    setPasteData("");
    setParseError("");
    setShowParseModal(true);
  }

  function handleParseAndFill() {
    setParseError("");
    try {
      const dataMap = previewDataMap;
      if (Object.keys(dataMap).length < 27) {
        throw new Error("Lütfen veriyi yapıştırın.");
      }

      const parsedData = parseDataMap(dataMap);

      setInputs(prev => {
        const newDefaults = {};
        if (activeMacro) {
          activeMacro.formConfig.forEach((field) => {
            if (field.defaultValue !== undefined) {
              newDefaults[field.name] = field.defaultValue;
            }
          });
        }
        const baseInputs = { ...initialInputs, ...newDefaults };
        const finalParsed = { ...parsedData };

        if (finalParsed.status === 'EXECUTED' && finalParsed.executed_at_utc && !finalParsed.triggered_at_utc) {
          finalParsed.triggered_at_utc = finalParsed.executed_at_utc;
        }

        return { ...baseInputs, ...finalParsed };
      });

      setShowParseModal(false);
      setPasteData("");
    } catch (e: any) {
      setParseError(e.message);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setErr("");
    setResult("");

    let effectiveInputs = { ...inputs };
    const usesFinalStatusTime = macroId.includes("not_reached") || macroId.includes("stop_limit");
    let rangeEndTime = inputs.final_status_utc;
    let triggerCandleTime = inputs.triggered_at_utc;

    if (inputs.status === "OPEN") {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      if (usesFinalStatusTime) {
        rangeEndTime = now;
        effectiveInputs.final_status_utc = now;
      }
    } else if (usesFinalStatusTime) {
      rangeEndTime = inputs.final_status_utc;
    }

    try {
      if (!activeMacro) throw new Error("Select a macro.");
      if (!effectiveInputs.symbol) throw new Error("Symbol is required.");

      if (usesFinalStatusTime && !rangeEndTime) {
        throw new Error(`Final Status At is required.`);
      }
      const needsTriggerTime = !usesFinalStatusTime || macroId.includes("stop_limit");
      if (needsTriggerTime && !triggerCandleTime) {
        throw new Error(`Triggered/Executed At is required.`);
      }
      if (macroId.includes("not_reached") && !inputs.placed_at_utc) {
        throw new Error(`Placed At (UTC) is required.`);
      }

      let prices: any = {};
      const priceSource = activeMacro.price_required;

      if (macroId.includes("not_reached")) {
        const range = await getRangeHighLow(
          effectiveInputs.symbol,
          effectiveInputs.placed_at_utc,
          rangeEndTime
        );
        if (!range) throw new Error("No data found for this range.");
        prices = range;
      } else {
        const { mark, last } = await getTriggerMinuteCandles(
          effectiveInputs.symbol,
          inputs.triggered_at_utc
        );
        const tMinute = new Date(msMinuteStartUTC(inputs.triggered_at_utc))
          .toISOString()
          .slice(0, 16)
          .replace("T", " ");

        if (priceSource === "both") {
          prices = { triggered_minute: tMinute, mark, last };
        } else if (priceSource === "last") {
          prices = { triggered_minute: tMinute, last };
        } else {
          prices = { triggered_minute: tMinute, mark, last };
        }
      }

      // Fetch precision
      try {
        const precisions = await getAllSymbolPrecisions();
        prices.precision = precisions[effectiveInputs.symbol.toUpperCase()] ?? 8;
      } catch (precErr) {
        console.warn("Failed to fetch precision, using default 8", precErr);
        prices.precision = 8;
      }

      const msg = renderMacro(macroId, effectiveInputs, prices, mode, lang, tone);
      setResult(msg);
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    alert(t.copied || "Copied!");
  }

  // --- Render Helpers ---

  const renderFormField = (field: any) => {
    let value = inputs[field.name] ?? "";
    let label = field.label;
    let placeholder = field.placeholder;
    let isDisabled = field.locked;
    let helperText = field.helper;

    if (field.name === "triggered_at_utc" || field.name === "final_status_utc") {
      label = getDynamicTimestampLabel(field.name, inputs.status, lang, macroId);
    }

    if (field.name === "final_status_utc") {
      if (inputs.status === "OPEN") {
        value = "(Auto-populates on Generate)";
        isDisabled = true;
      }
      helperText = (inputs.status === "OPEN")
        ? (lang === 'tr' ? "'AÇIK' emirler için 'Verilme Zamanı'ndan şu anki zamana kadar kontrol edilir." : "For 'OPEN' orders, we check from 'Placed At' to the current time.")
        : (lang === 'tr' ? `Emrin ${inputs.status.toLowerCase()} olduğu zamanı girin.` : `Enter the time the order was ${inputs.status.toLowerCase()}.`);
    }

    if (field.type === "select") {
      return (
        <div className={`col-${field.col || 6}`} key={field.name}>
          <label className="label">{label}</label>
          <select
            className="select"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isDisabled}
          >
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className={`col-${field.col || 6}`} key={field.name}>
        <label className="label">{label}</label>
        <input
          className="input"
          type={field.type}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(field.name, field.name === "symbol" ? val.toUpperCase() : val);
            if (field.name === "symbol") {
              setActiveSymbol(val.toUpperCase());
            }
          }}
          placeholder={placeholder}
          disabled={isDisabled}
        />
        {helperText && <div className="helper">{helperText}</div>}
      </div>
    );
  };

  const renderPreviewGrid = () => {
    if (pasteData.trim().length === 0) return null;

    const keysToShow = [
      "Order ID", "Symbol", "Side", "Status", "Working Type",
      "Price", "Stop Price", "Order Place Time(UTC)", "Order Update Time (UTC)"
    ];
    const highlightRows = {
      "Order Place Time(UTC)": true,
      "Stop Price": true,
      "Order ID": true,
      "Symbol": true,
      "Liquidation": true
    };

    return (
      <div className="modal-preview-grid">
        <label className="label">{t.pasteGridPreview}</label>
        <table>
          <thead>
            <tr>
              <th>{t.pasteGridTitle}</th>
              <th>{t.pasteGridValue}</th>
            </tr>
          </thead>
          <tbody>
            {GRID_KEYS.map((key) => (
              <tr
                key={key}
                className={highlightRows[key] ? 'highlight' : ''}
                title={keysToShow.includes(key) ? "Bu veri forma aktarılacak" : "Bu veri forma aktarılmayacak"}
                style={{ opacity: keysToShow.includes(key) || key === "Liquidation" ? 1 : 0.4 }}
              >
                <td>{key}</td>
                <td>{previewDataMap[key] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="panel">
      {/* Grid Parse Modal */}
      {showParseModal && (
        <div className="modal-overlay" onClick={() => setShowParseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowParseModal(false)}>×</button>
            <h3>{t.pasteModalTitle}</h3>
            <p className="helper">{t.pasteModalHelper}</p>

            <div className="modal-grid">
              <div className="modal-grid-col">
                <textarea
                  className="textarea"
                  rows={15}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Buraya yapıştırın..."
                />
              </div>
              <div className="modal-grid-col">
                {renderPreviewGrid()}
              </div>
            </div>

            {parseError && (
              <div className="helper" style={{ color: "#ffb4b4", marginTop: 10 }}>
                <strong>{t.error}</strong> {parseError}
              </div>
            )}
            <button className="btn" style={{ marginTop: 12 }} onClick={handleParseAndFill}>
              {t.pasteModalButton}
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="col-12" style={{ marginBottom: 16 }}>
        <button className="btn secondary" onClick={openParseModal}>
          {t.pasteButtonLabel}
        </button>
      </div>
      <div className="hr" style={{ margin: "0 0 18px 0" }} />

      <div className="grid">
        {/* Smart Detect Input */}
        <div className="col-12" style={{ marginBottom: 12 }}>
          <label className="label" style={{ color: '#8b5cf6' }}>
            {lang === 'tr' ? "🔍 Akıllı Tespit / Smart Detect" : "🔍 Smart Detect (Describe Issue)"}
          </label>
          <textarea
            className="input"
            rows={2}
            placeholder={lang === 'tr' ? "Müşteri ne diyor? (Örn: 'Stopum çalışmadı', 'Fiyat kaydı')..." : "Paste customer complaint here (e.g., 'Stop didn't trigger')..."}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            style={{
              borderColor: detectedIntent ? '#8b5cf6' : '',
              backgroundColor: detectedIntent ? '#f5f3ff' : ''
            }}
          />
          {detectedIntent && (
            <div className="helper" style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
              🤖 Detected: {detectedIntent.reason} (Confidence: {Math.round(detectedIntent.confidence * 100)}%)
            </div>
          )}
        </div>

        <div className="col-12">
          <label className="label">{t.macroLabel}</label>
          <select
            className="select"
            value={macroId}
            onChange={(e) => setMacroId(e.target.value)}
          >
            {macros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Output Mode & Tone */}
        <div className="col-12" style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">{t.modeLabel}</label>
            <select
              className="select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="detailed">{t.modeDetailed}</option>
              <option value="summary">{t.modeSummary}</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">{lang === 'tr' ? "Üslup / Ton" : "Tone"}</label>
            <select
              className="select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="standard">{lang === 'tr' ? "Standart (Eğitici)" : "Standard (Educational)"}</option>
              <option value="professional">{lang === 'tr' ? "Kurumsal (Resmi)" : "Professional (Formal)"}</option>
              <option value="empathetic">{lang === 'tr' ? "Empatik (Nazik)" : "Empathetic (Soft)"}</option>
              <option value="direct">{lang === 'tr' ? "Net (Kısa)" : "Direct (Concise)"}</option>
            </select>
          </div>
        </div>

        {activeMacro && activeMacro.formConfig.map(renderFormField)}

        <div className="col-12">
          <button
            className="btn"
            id="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? t.generating : t.generate}
          </button>
        </div>

        <div className="col-12">
          <button
            className="btn secondary"
            id="copy-btn"
            onClick={handleCopy}
            disabled={!result}
          >
            {t.copy}
          </button>
        </div>
      </div>

      <div className="hr" />

      {err && (
        <div className="helper" style={{ color: "#ffb4b4" }}>
          <strong>{t.error}</strong> {err}
          <div className="helper" style={{ marginTop: 6 }}>
            {t.errorTip}
          </div>
        </div>
      )}

      <div ref={outRef} className="grid" style={{ marginTop: 10 }}>
        <div className="col-12">
          <label className="label">{t.resultLabel}</label>
          <textarea className="textarea" rows={14} value={result} readOnly />
        </div>
      </div>
    </div>
  );
}
