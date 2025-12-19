// src/components/FundingMacro.jsx
import React, { useState } from "react";
// ✅ DÜZELTME: Import yolu düzeltildi (../)
import { renderMacro } from "../macros";
import {
  // ✅ DÜZELTME: Import yolu düzeltildi (../)
  getNearestFunding,
  getMarkPriceClose1m,
  getAllSymbolPrecisions
} from "../pricing";
// ✅ DÜZELTME: Import yolu düzeltildi (../)
import { fmtNum } from "../macros/helpers";

// ✅ GÜNCELLENDİ: Propları alır
export default function FundingMacro({ lang, uiStrings }) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [fundingTime, setFundingTime] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [fundingSide, setFundingSide] = useState("Long"); // Default Long
  const [fundingInterval, setFundingInterval] = useState("8");
  const [mode, setMode] = useState("detailed");
  const [tone, setTone] = useState("standard");
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [rawMarkPrice, setRawMarkPrice] = useState<any>(null);
  const [lastInputs, setLastInputs] = useState<any>(null);

  const t = uiStrings; // Çeviri metinleri

  async function handleGenerate() {
    setErr("");
    setResult("");
    setLoading(true);

    const errSym = lang === 'tr' ? 'Sembol gerekli.' : 'Symbol is required.';
    const errTime = lang === 'tr' ? 'Funding Zamanı gerekli.' : 'Funding Time is required.';
    const errSize = lang === 'tr' ? 'Pozisyon Büyüklüğü gerekli.' : 'Position Size is required.';
    const errInt = lang === 'tr' ? 'Funding Aralığı (saat) gerekli.' : 'Funding Interval (hours) is required.';
    const errRec = lang === 'tr' ? 'Bu zamana yakın bir funding kaydı bulunamadı.' : 'No funding record found near that time.';
    const errMark = lang === 'tr' ? 'Mark price (1m) alınamadı' : 'Could not fetch mark price from 1m candles';


    try {
      if (!symbol) throw new Error(errSym);
      if (!fundingTime) throw new Error(errTime);
      if (!positionSize) throw new Error(errSize);
      if (!fundingInterval) throw new Error(errInt);

      const rec = await getNearestFunding(symbol, fundingTime);
      if (!rec) throw new Error(errRec);

      const fundingRate = rec.funding_rate;
      let markPrice = rec.mark_price;
      let fundingTimeStr = rec.funding_time;

      if (!markPrice) {
        const closeData = await getMarkPriceClose1m(symbol, rec.funding_time_ms);
        if (!closeData) throw new Error(errMark);
        markPrice = String(closeData.mark_price);
        fundingTimeStr = closeData.close_time;
      }

      console.log("[Generate] rawMarkPrice:", markPrice);

      const inputs = {
        symbol: symbol.toUpperCase(),
        funding_time: fundingTimeStr,
        funding_rate: fundingRate,
        mark_price: markPrice,
        position_size: positionSize,
        funding_side: fundingSide,
        funding_interval: fundingInterval,
        price_dp: 0,
        qty_dp: 0
      };

      // ✅ GÜNCELLENDİ: 'lang' parametresi eklendi
      const msg = renderMacro("funding_macro", inputs, {}, mode, lang, tone);
      setResult(msg);
      setRawMarkPrice(markPrice);
      setLastInputs(inputs);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyPrecision() {
    try {
      if (!lastInputs || rawMarkPrice == null) {
        throw new Error("Please generate the macro first.");
      }
      const allPrecisions = await getAllSymbolPrecisions();
      const pricePrecision = allPrecisions[lastInputs.symbol] || 2;

      console.log("[ApplyPrecision]", lastInputs.symbol, "raw:", rawMarkPrice, "pricePrecision:", pricePrecision);

      const truncated = fmtNum(rawMarkPrice, pricePrecision);

      const inputs2 = { ...lastInputs, mark_price: truncated };
      // ✅ GÜNCELLENDİ: 'lang' parametresi eklendi
      const msg2 = renderMacro("funding_macro", inputs2, {}, mode, lang, tone);

      setResult(msg2);
      setLastInputs(inputs2);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    // UI feedback handled in parent usually, keeping simple alert for consistency with MacroGenerator
    alert(t.copied || "Copied!");
  }

  return (
    <div className="panel">
      <h3>{t.fundingTitle}</h3>
      <div className="grid">
        <div className="col-6">
          <label className="label">{t.fundingSymbol}</label>
          <input
            className="input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
          />
        </div>

        <div className="col-6">
          <label className="label">{t.fundingTime}</label>
          <input
            className="input"
            placeholder="YYYY-MM-DD HH:MM:SS"
            value={fundingTime}
            onChange={(e) => setFundingTime(e.target.value)}
          />
        </div>

        <div className="col-6">
          <label className="label">{t.fundingPosSize}</label>
          <input
            className="input"
            placeholder="e.g. 0.05"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
          />
        </div>

        <div className="col-6">
          <label className="label">{t.fundingSide}</label>
          <select
            className="select"
            value={fundingSide}
            onChange={(e) => setFundingSide(e.target.value)}
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        <div className="col-6">
          <label className="label">{t.fundingInterval}</label>
          <input
            className="input"
            placeholder="e.g. 1, 2, 4, 8"
            value={fundingInterval}
            onChange={(e) => setFundingInterval(e.target.value)}
          />
        </div>

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

        <div className="col-12" style={{ marginTop: 12 }}>
          <button className="btn" onClick={handleGenerate} disabled={loading}>
            {loading ? t.fundingLoading : t.fundingButton}
          </button>
        </div>

        <div className="col-12" style={{ display: "flex", gap: 10 }}>
          <button
            className="btn secondary"
            id="funding-copy-btn"
            onClick={handleCopy}
            disabled={!result}
          >
            {t.copy}
          </button>

          <button
            className="btn secondary"
            onClick={handleApplyPrecision}
            disabled={!result}
            title="Apply exchangeInfo.pricePrecision (truncate, no rounding)"
          >
            {t.fundingApply}
          </button>
        </div>
      </div>

      {err && (
        <div className="helper" style={{ color: "#ff6b6b", marginTop: 10 }}>
          <strong>{t.error}</strong> {err}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <label className="label">{t.resultLabel}</label>
          <textarea className="textarea" rows={14} value={result} readOnly />
        </div>
      )}
    </div>
  );
}
