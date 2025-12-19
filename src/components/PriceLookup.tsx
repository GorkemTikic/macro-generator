// src/components/PriceLookup.jsx
import React, { useState } from "react";
import {
  // ✅ DÜZELTME: Import yolu düzeltildi (../)
  getTriggerMinuteCandles,
  getRangeHighLow,
  getLastPriceAtSecond,
} from "../pricing";

import { useApp } from "../context/AppContext";

// ✅ GÜNCELLENDİ: Propları alır
export default function PriceLookup({ lang, uiStrings }) {
  const { activeSymbol, setActiveSymbol } = useApp();
  // const [symbol, setSymbol] = useState("ETHUSDT"); // Removed local state
  const [market, setMarket] = useState("futures"); // "futures" | "spot"
  const [mode, setMode] = useState("trigger");
  const [at, setAt] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const t = uiStrings; // Çeviri metinleri

  async function handleLookup() {
    setResult("");
    setError("");
    const errNoData = lang === 'tr' ? 'Veri bulunamadı.' : 'No data found.';
    const errTime = lang === 'tr' ? 'Lütfen bir "Tetiklenme Zamanı" girin.' : 'Please enter a Triggered At timestamp.';
    const errRange = lang === 'tr' ? 'Lütfen Başlangıç ve Bitiş zamanlarını girin.' : 'Please enter both From and To.';
    const errLast1s = lang === 'tr' ? 'Lütfen bir Tarih/Zaman (UTC) girin.' : 'Please enter a DateTime (UTC).';
    const errLast1sData = lang === 'tr' ? 'O saniye için işlem verisi bulunamadı (Last Price).' : 'No trade data found for that second (Last Price).';

    try {
      if (mode === "trigger") {
        if (!at) return setError(errTime);
        const { mark, last } = await getTriggerMinuteCandles(activeSymbol, at, market);

        if (!mark && !last) return setResult(errNoData);

        let msg = `${at} UTC+0 (${market.toUpperCase()}) = ` + (lang === 'tr' ? `Bu tarih ve saatte:` : `At this date and time:`) + `\n\n`;

        // Mark Price (Sadece Futures)
        if (market === "futures") {
          msg += `**Mark Price:**\n` + (lang === 'tr' ? `Açılış` : `Opening`) + `: ${mark?.open ?? "N/A"}\n` + (lang === 'tr' ? `Yüksek` : `Highest`) + `: ${mark?.high ?? "N/A"}\n` + (lang === 'tr' ? `Düşük` : `Lowest`) + `: ${mark?.low ?? "N/A"}\n` + (lang === 'tr' ? `Kapanış` : `Closing`) + `: ${mark?.close ?? "N/A"}\n\n`;
        } else {
          msg += `**Mark Price:** N/A (Spot Market)\n\n`;
        }

        // Last Price (Her ikisi)
        msg += `**Last Price:**\n` + (lang === 'tr' ? `Açılış` : `Opening`) + `: ${last?.open ?? "N/A"}\n` + (lang === 'tr' ? `Yüksek` : `Highest`) + `: ${last?.high ?? "N/A"}\n` + (lang === 'tr' ? `Düşük` : `Lowest`) + `: ${last?.low ?? "N/A"}\n` + (lang === 'tr' ? `Kapanış` : `Closing`) + `: ${last?.close ?? "N/A"}`;

        setResult(msg);

      } else if (mode === "range") {
        if (!from || !to) return setError(errRange);
        const range = await getRangeHighLow(activeSymbol, from, to, market);
        if (!range) return setResult(errNoData);

        let msg = (lang === 'tr' ? `${activeSymbol} (${market.toUpperCase()}) Fiyat Grafiğini kontrol ettiğimizde` : `When we check the ${activeSymbol} (${market.toUpperCase()}) Price Chart`) + `\n\n` +
          (lang === 'tr' ? `Başlangıç` : `From`) + `: ${from}\n` + (lang === 'tr' ? `Bitiş` : `To`) + `: ${to}\n\n`;

        if (market === "futures") {
          msg += `${range.mark.highTime} > ` + (lang === 'tr' ? `Bu tarih ve saatte, en yüksek Mark Price ${range.mark.high} seviyesine ulaşıldı.` : `At this date and time, the highest Mark Price ${range.mark.high} was reached.`) + `\n`;
        }

        msg += `${range.last.highTime} > ` + (lang === 'tr' ? `Bu tarih ve saatte, en yüksek Last Price ${range.last.high} seviyesine ulaşıldı.` : `At this date and time, the highest Last Price ${range.last.high} was reached.`) + `\n\n`;

        if (market === "futures") {
          msg += `${range.mark.lowTime} > ` + (lang === 'tr' ? `Bu tarih ve saatte, en düşük Mark Price ${range.mark.low} seviyesine ulaşıldı.` : `At this date and time, the lowest Mark Price ${range.mark.low} was reached.`) + `\n`;
        }

        msg += `${range.last.lowTime} > ` + (lang === 'tr' ? `Bu tarih ve saatte, en düşük Last Price ${range.last.low} seviyesine ulaşıldı.` : `At this date and time, the lowest Last Price ${range.last.low} was reached.`) + `\n\n`;

        if (market === "futures") {
          msg += `**Mark Price ` + (lang === 'tr' ? `Değişim` : `Change`) + `:** ${range.mark.changePct}\n`;
        }
        msg += `**Last Price ` + (lang === 'tr' ? `Değişim` : `Change`) + `:** ${range.last.changePct}`;

        setResult(msg);

      } else if (mode === "last1s") {
        if (!at) return setError(errLast1s);
        const ohlc = await getLastPriceAtSecond(activeSymbol, at, market);
        if (!ohlc) return setResult(errLast1sData);
        const msg =
          `${at} UTC+0 (${market.toUpperCase()}) = ` + (lang === 'tr' ? `Bu tarih ve saatte, Last Price detayları:` : `At this date and time, the Last Price details are:`) + `\n\n` +
          `**` + (lang === 'tr' ? `Açılış` : `Opening`) + `:** ${ohlc.open}\n` + (lang === 'tr' ? `Yüksek` : `Highest`) + `: ${ohlc.high}\n` + (lang === 'tr' ? `Düşük` : `Lowest`) + `: ${ohlc.low}\n` + (lang === 'tr' ? `Kapanış` : `Closing`) + `: ${ohlc.close}\n` +
          (lang === 'tr' ? `(o saniyedeki ${ohlc.count} işleme göre)` : `(based on ${ohlc.count} trades in that second)`);
        setResult(msg);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <h3>{t.lookupTitle}</h3>

      {/* Market Tabs */}
      <div className="lookup-tabs">
        <div
          className={`lookup-tab ${market === 'futures' ? 'active' : ''}`}
          onClick={() => setMarket('futures')}
        >
          Futures
        </div>
        <div
          className={`lookup-tab ${market === 'spot' ? 'active' : ''}`}
          onClick={() => setMarket('spot')}
        >
          Spot
        </div>
      </div>

      {/* Mode Selection Cards */}
      <label className="label">{t.lookupMode}</label>
      <div className="option-cards">
        <div
          className={`option-card ${mode === 'trigger' ? 'active' : ''}`}
          onClick={() => setMode('trigger')}
        >
          <span>Trigger Minute</span>
        </div>
        <div
          className={`option-card ${mode === 'range' ? 'active' : ''}`}
          onClick={() => setMode('range')}
        >
          <span>Range</span>
        </div>
        <div
          className={`option-card ${mode === 'last1s' ? 'active' : ''}`}
          onClick={() => setMode('last1s')}
        >
          <span>Last 1s</span>
        </div>
      </div>

      {mode === "last1s" && (
        <div className="helper" style={{ marginTop: -14, marginBottom: 14 }}>
          Only available for the last 7 days.
        </div>
      )}

      <div className="grid">
        <div className="col-12">
          <label className="label">{t.lookupSymbol}</label>
          <input
            className="input"
            value={activeSymbol}
            onChange={(e) => setActiveSymbol(e.target.value.toUpperCase())}
          />
        </div>


        {mode === "trigger" && (
          <div className="col-12">
            <label className="label">{t.lookupAt}</label>
            <input
              className="input"
              placeholder="YYYY-MM-DD HH:MM:SS"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </div>
        )}

        {mode === "range" && (
          <>
            <div className="col-6">
              <label className="label">{t.lookupFrom}</label>
              <input
                className="input"
                placeholder="YYYY-MM-DD HH:MM:SS"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="label">{t.lookupTo}</label>
              <input
                className="input"
                placeholder="YYYY-MM-DD HH:MM:SS"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === "last1s" && (
          <div className="col-12">
            <label className="label">{t.lookupDateTime}</label>
            <input
              className="input"
              placeholder="YYYY-MM-DD HH:MM:SS"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </div>
        )}

        <div className="col-12">
          <button className="btn" onClick={handleLookup}>
            {t.lookupButton}
          </button>
        </div>
      </div>

      {error && (
        <div className="helper" style={{ color: "#ff6b6b" }}>
          {t.error} {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 12 }}>
          <label className="label">{t.resultLabel}</label>
          <textarea className="textarea" value={result} readOnly />
        </div>
      )}
    </div>
  );
}
