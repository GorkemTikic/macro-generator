// src/components/FundingMacro.jsx
import React, { useState } from "react";
// ✅ DÜZELTME: Import yolu düzeltildi (../)
import { renderMacro } from "../macros";
import { track } from "../analytics";
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
  const L = (en: string, tr: string, zh?: string) =>
    lang === 'tr' ? tr : lang === 'zh' ? (zh ?? en) : en;
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
  const [toastMsg, setToastMsg] = useState("");

  const t = uiStrings; // Çeviri metinleri

  async function handleGenerate() {
    setErr("");
    setResult("");
    setLoading(true);

    const errSym = L('Symbol is required.', 'Sembol gerekli.', '请输入交易对。');
    const errTime = L('Funding Time is required.', 'Funding Zamanı gerekli.', '请输入资金费时间。');
    const errSize = L('Position Size is required.', 'Pozisyon Büyüklüğü gerekli.', '请输入仓位大小。');
    const errInt = L('Funding Interval (hours) is required.', 'Funding Aralığı (saat) gerekli.', '请输入资金费周期(小时)。');
    const errRec = L('No funding record found near that time.', 'Bu zamana yakın bir funding kaydı bulunamadı.', '在该时间附近未找到资金费记录。');
    const errMark = L('Could not fetch mark price from 1m candles', 'Mark price (1m) alınamadı', '无法从 1 分钟 K 线获取 Mark Price');


    try {
      if (!symbol) throw new Error(errSym);
      if (!fundingTime) throw new Error(errTime);
      if (!positionSize) throw new Error(errSize);
      if (!fundingInterval) throw new Error(errInt);

      // Funding-fee math here is the linear (USDⓈ-M) formula `notional = size *
      // mark`. Coin-margined contracts (BTCUSD_PERP, BTCUSD_240329…) are
      // inverse and would produce wrong numbers. Block early with a clear
      // message rather than silently emitting a misleading macro.
      const upSym = symbol.toUpperCase();
      const looksCoinM = /(_PERP|_\d{6})$/.test(upSym) || /USD$/.test(upSym);
      if (looksCoinM) {
        throw new Error(L(
          `${upSym} looks like a coin-margined contract. This tool only computes funding correctly for USDⓈ-M (linear) symbols. Coin-M needs the inverse formula — calculate manually.`,
          `${upSym} bir coin-margined sözleşme gibi görünüyor. Bu araç yalnızca USDⓈ-M (linear) sözleşmeleri için doğru sonuç verir. Coin-margined için manuel hesaplama yapın.`,
          `${upSym} 看起来是一个 coin-margined(币本位)合约。此工具仅适用于 USDⓈ-M(线性)合约。Coin-M 使用反向公式,请手动计算。`
        ));
      }

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

      track({
        event: 'funding_query',
        tab: 'funding',
        props: { symbol: symbol.toUpperCase(), side: fundingSide, interval: fundingInterval, mode, lang },
      });
    } catch (e: any) {
      setErr(e.message || String(e));
      track({
        event: 'funding_error',
        tab: 'funding',
        props: { symbol: symbol.toUpperCase(), error: String(e?.message || e).slice(0, 120) },
      });
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
    try {
      await navigator.clipboard.writeText(result);
      setToastMsg(t.copied || "Copied!");
      setTimeout(() => setToastMsg(""), 2000);
    } catch {
      setToastMsg(L("Copy failed", "Kopyalanamadı", "复制失败"));
      setTimeout(() => setToastMsg(""), 2000);
    }
  }

  return (
    <div className="panel">
      {toastMsg && (
        <div role="status" aria-live="polite" className="mg-toast">
          {toastMsg}
        </div>
      )}
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
            <label className="label">{L("Tone", "Üslup / Ton", "语气 / 语调")}</label>
            <select
              className="select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="standard">{L("Standard (Educational)", "Standart (Eğitici)", "标准(教学型)")}</option>
              <option value="professional">{L("Professional (Formal)", "Kurumsal (Resmi)", "专业(正式)")}</option>
              <option value="empathetic">{L("Empathetic (Soft)", "Empatik (Nazik)", "共情(柔和)")}</option>
              <option value="direct">{L("Direct (Concise)", "Net (Kısa)", "直接(简洁)")}</option>
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
          <div className="copy-block">{result}</div>
        </div>
      )}
    </div>
  );
}
