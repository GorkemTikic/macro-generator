// src/components/PriceLookup.jsx
import React, { useState } from "react";
import {
  getTriggerMinuteCandles,
  getRangeHighLow,
  getLastPriceAtSecond,
  findPriceOccurrences,
  checkTrailingStop, // ✅ Added
  findClosestMiss,
  analyzeMarkVsLastGap,
} from "../pricing";

import { useApp } from "../context/AppContext";
import { track } from "../analytics";

export default function PriceLookup({ lang, uiStrings }) {
  const { activeSymbol, setActiveSymbol } = useApp();
  const [market, setMarket] = useState("futures"); // "futures" | "spot"
  const [mode, setMode] = useState("trigger"); // "trigger" | "range" | "last1s" | "findPrice"
  const [priceType, setPriceType] = useState("last"); // "last" | "mark"
  const [at, setAt] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [targetPrice, setTargetPrice] = useState(""); // ✅ New Input
  const [activationPrice, setActivationPrice] = useState(""); // ✅ Trailing Stop
  const [callbackRate, setCallbackRate] = useState(""); // ✅ Trailing Stop
  const [direction, setDirection] = useState("short"); // "short" | "long"
  const [gapTriggerType, setGapTriggerType] = useState(""); // "" | "MARK" | "LAST"
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const t = uiStrings; // Çeviri metinleri

  const setPresentTime = () => {
    const now = new Date();
    // 1 minute ago UTC
    const past = new Date(now.getTime() - 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${past.getUTCFullYear()}-${pad(past.getUTCMonth() + 1)}-${pad(past.getUTCDate())} ${pad(past.getUTCHours())}:${pad(past.getUTCMinutes())}:00`;
    setTo(formatted);
  };

  async function handleLookup() {
    setResult("");
    setError("");
    const errTime = lang === 'tr' ? 'Lütfen bir "Tetiklenme Zamanı" girin.' : 'Please enter a Triggered At timestamp.';
    const errRange = lang === 'tr' ? 'Lütfen Başlangıç ve Bitiş zamanlarını girin.' : 'Please enter both From and To.';
    const errPrice = lang === 'tr' ? 'Lütfen bir hedef Fiyat girin.' : 'Please enter a target Price.';
    const errLast1s = lang === 'tr' ? 'Lütfen bir Tarih/Zaman (UTC) girin.' : 'Please enter a DateTime (UTC).';
    const errCallback = lang === 'tr' ? 'Lütfen Geri Dönüş Oranı girin.' : 'Please enter Callback Rate.';

    try {
      if (mode === "trigger") {
        if (!at) return setError(errTime);
        const { mark, last } = await getTriggerMinuteCandles(activeSymbol, at, market);

        if (!mark && !last) return setResult(t.lookupNotFound);

        let msg = `### 🕒 ${at} UTC+0\n` +
          `**Symbol:** ${activeSymbol} | **Market:** ${market.toUpperCase()}\n\n` +
          (lang === 'tr' ? `#### Fiyat Verileri:` : `#### Price Data:`) + `\n\n`;

        if (market === "futures") {
          msg += `> **Mark Price:**\n` +
            `> - ` + (lang === 'tr' ? `Açılış` : `Open`) + `: ${mark?.open ?? "N/A"}\n` +
            `> - ` + (lang === 'tr' ? `Yüksek` : `High`) + `: ${mark?.high ?? "N/A"}\n` +
            `> - ` + (lang === 'tr' ? `Düşük` : `Low`) + `: ${mark?.low ?? "N/A"}\n` +
            `> - ` + (lang === 'tr' ? `Kapanış` : `Close`) + `: ${mark?.close ?? "N/A"}\n\n`;
        }

        msg += `> **Last Price:**\n` +
          `> - ` + (lang === 'tr' ? `Açılış` : `Open`) + `: ${last?.open ?? "N/A"}\n` +
          `> - ` + (lang === 'tr' ? `Yüksek` : `High`) + `: ${last?.high ?? "N/A"}\n` +
          `> - ` + (lang === 'tr' ? `Düşük` : `Low`) + `: ${last?.low ?? "N/A"}\n` +
          `> - ` + (lang === 'tr' ? `Kapanış` : `Close`) + `: ${last?.close ?? "N/A"}`;

        setResult(msg);

      } else if (mode === "range") {
        if (!from || !to) return setError(errRange);
        const range = await getRangeHighLow(activeSymbol, from, to, market);
        if (!range) return setResult(t.lookupNotFound);

        let msg = `### 📊 ` + (lang === 'tr' ? `Aralık Özeti` : `Range Summary`) + `\n` +
          `**Symbol:** ${activeSymbol} | **Market:** ${market.toUpperCase()}\n` +
          `**Period:** ${from} → ${to}\n\n` +
          (lang === 'tr' ? `#### Analiz Sonuçları:` : `#### Analysis Results:`) + `\n\n`;

        if (market === "futures") {
          msg += `✅ **Mark Price:**\n` +
            `- ` + (lang === 'tr' ? `Zirve` : `Peak`) + `: ${range.mark.high} (${range.mark.highTime})\n` +
            `- ` + (lang === 'tr' ? `Dip` : `Bottom`) + `: ${range.mark.low} (${range.mark.lowTime})\n` +
            `- ` + (lang === 'tr' ? `Değişim` : `Volatility`) + `: ${range.mark.changePct}\n\n`;
        }

        msg += `✅ **Last Price:**\n` +
          `- ` + (lang === 'tr' ? `Zirve` : `Peak`) + `: ${range.last.high} (${range.last.highTime})\n` +
          `- ` + (lang === 'tr' ? `Dip` : `Bottom`) + `: ${range.last.low} (${range.last.lowTime})\n` +
          `- ` + (lang === 'tr' ? `Değişim` : `Volatility`) + `: ${range.last.changePct}`;

        setResult(msg);

      } else if (mode === "last1s") {
        if (!at) return setError(errLast1s);
        const ohlc = await getLastPriceAtSecond(activeSymbol, at, market);
        if (!ohlc) return setResult(t.lookupNoTradeData);

        const msg = `### ⚡ ` + (lang === 'tr' ? `Saniyelik Hassasiyet` : `Second Precision`) + `\n` +
          `**Time:** ${at} UTC+0 (${market.toUpperCase()})\n\n` +
          `> **Last Price Details:**\n` +
          `> - ` + (lang === 'tr' ? `Açılış` : `Open`) + `: ${ohlc.open}\n` +
          `> - ` + (lang === 'tr' ? `Yüksek` : `High`) + `: ${ohlc.high}\n` +
          `> - ` + (lang === 'tr' ? `Düşük` : `Low`) + `: ${ohlc.low}\n` +
          `> - ` + (lang === 'tr' ? `Kapanış` : `Close`) + `: ${ohlc.close}\n\n` +
          `ℹ️ ` + (lang === 'tr' ? `Bu veri o saniye içindeki **${ohlc.count}** işleme dayanmaktadır.` : `Derived from **${ohlc.count}** individual trades in this second.`);
        setResult(msg);

      } else if (mode === "findPrice") {
        if (!from || !to) return setError(errRange);
        if (!targetPrice) return setError(errPrice);

        const finalType = (market === 'futures') ? priceType : 'last';
        const data = await findPriceOccurrences(activeSymbol, from, to, parseFloat(targetPrice), market, finalType);

        if (!data || !data.first) {
          // Closest Miss analysis — instead of a generic "not reached", show
          // how close the market got and when.
          const target = parseFloat(targetPrice);
          const miss = await findClosestMiss(activeSymbol, from, to, target, market, finalType);
          const noReachMsg = t.lookupPriceNotReached.replace("{price}", targetPrice);

          if (!miss) {
            track({
              event: 'lookup_query',
              tab: 'lookup',
              props: { mode: 'findPrice', symbol: activeSymbol, market, price_type: priceType, result_state: 'closest_miss' },
            });
            return setResult(`${t.lookupNotFoundTitle}\n\n${noReachMsg}`);
          }

          const priceTypeLabel = (miss.priceTypeUsed === 'mark') ? 'Mark Price' : 'Last Price';
          const sideLabel = miss.side === 'high' ? t.closestMissSideHigh : t.closestMissSideLow;
          const closestStr = String(miss.closestPrice);
          const distStr = miss.missDistance.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
          const pctStr = miss.missPct.toFixed(4) + '%';
          // Edge case: hierarchical search in findPriceOccurrences may skip
          // matches in very long ranges. If the simple range high/low says the
          // target was technically inside the range, surface that honestly.
          const reachedHeader = miss.reached
            ? `⚠️ **${t.closestMissTargetReached}:** ${t.closestMissYes} (approx — exact moment not pinpointed)`
            : `❌ **${t.closestMissTargetReached}:** ${t.closestMissNo}`;

          let msg = `## ${t.closestMissTitle}\n\n` +
            `**Symbol:** ${activeSymbol} (${market.toUpperCase()})\n` +
            `**${lang === 'tr' ? 'Fiyat Tipi' : 'Price Type'}:** ${priceTypeLabel}\n` +
            `**Period:** ${from} → ${to} UTC+0\n` +
            `**${lang === 'tr' ? 'Hedef Fiyat' : 'Target Price'}:** ${targetPrice}\n\n` +
            `${reachedHeader}\n\n` +
            `${t.closestMissClosestPrice}:\n` +
            `- ${lang === 'tr' ? 'Fiyat' : 'Price'}: **${closestStr}** (${sideLabel})\n` +
            `- ${t.closestMissTime}: **${miss.closestTime}**\n` +
            `- ${t.closestMissDistance}: **${distStr}**\n` +
            `- ${t.closestMissPercent}: **${pctStr}**\n\n` +
            `--- \n\n` +
            `### 💡 ${t.closestMissSupportSummary}\n` +
            `> ${t.closestMissSummaryLine(targetPrice, priceTypeLabel, closestStr, miss.closestTime, distStr, sideLabel)}\n`;

          setResult(msg);
          track({
            event: 'lookup_query',
            tab: 'lookup',
            props: { mode: 'findPrice', symbol: activeSymbol, market, price_type: priceType, result_state: 'closest_miss' },
          });
          return;
        }

        const typeLabel = finalType === 'mark' ? 'Mark Price' : 'Last Price';
        let msg = `## ${t.lookupFoundTitle}\n\n` +
          `**Symbol:** ${activeSymbol} (${market.toUpperCase()})\n` +
          `**Target:** ${targetPrice} (${typeLabel})\n` +
          `**Search Period:** ${from} → ${to}\n\n` +
          `--- \n\n` +
          `✅ **` + (lang === 'tr' ? `İLK TEMAS ZAMANI` : `FIRST CONTACT TIME`) + `:**\n` +
          `### 🕒 ${data.first.fmt} UTC+0\n` +
          (data.first.isExact ? (lang === 'tr' ? `(🛡️ İşlem verileriyle milisaniye bazında doğrulandı)` : `(🛡️ Verified at millisecond level via AggTrades)`) : (lang === 'tr' ? `(📊 1 dakikalık mum verisiyle tespit edildi)` : `(📊 Detected via 1m Candle data)`)) + `\n\n`;

        if (data.others.length > 0) {
          msg += `🔄 **` + (lang === 'tr' ? `DİĞER EŞLEŞMELER` : `OTHER MATCHES`) + ` (` + (lang === 'tr' ? `Yaklaşık` : `Approx`) + `):**\n`;
          const limit = 10;
          data.others.slice(0, limit).forEach(tMatch => {
            msg += `- ${tMatch} UTC+0\n`;
          });
          if (data.others.length > limit) {
            msg += `\n*...` + (lang === 'tr' ? `ve ${data.others.length - limit} kez daha.` : `and ${data.others.length - limit} more instances.*`);
          }
        }
        setResult(msg);
        track({
          event: 'lookup_query',
          tab: 'lookup',
          props: { mode: 'findPrice', symbol: activeSymbol, market, price_type: priceType, result_state: 'reached' },
        });
        return;

      } else if (mode === "gapExplainer") {
        if (!from || !to) return setError(errRange);
        if (market !== "futures") return setError(t.gapExplainerFuturesOnly);

        const targetNum = targetPrice ? parseFloat(targetPrice) : null;
        const data = await analyzeMarkVsLastGap(activeSymbol, from, to, targetNum);
        if (!data) return setResult(t.lookupNotFound);

        const fmtNum = (n: number) => Number(n).toString();

        const lastReachedTxt = data.last.reached ? `✅ ${t.closestMissYes}` : `❌ ${t.closestMissNo}`;
        const markReachedTxt = data.mark.reached ? `✅ ${t.closestMissYes}` : `❌ ${t.closestMissNo}`;
        const triggerLabel = gapTriggerType || t.gapExplainerTriggerNone;

        let msg = `## ${t.gapExplainerTitle}\n\n` +
          `**Symbol:** ${activeSymbol} | **Market:** FUTURES\n` +
          `**Period:** ${from} → ${to} UTC+0\n` +
          (targetNum != null ? `**${lang === 'tr' ? 'Hedef Fiyat' : 'Target Price'}:** ${targetPrice}\n` : '') +
          `**${t.gapExplainerTriggerType}:** ${triggerLabel}\n\n` +
          `--- \n\n` +
          `### ${t.gapExplainerLastPrice}\n` +
          (targetNum != null ? `- ${t.gapExplainerReachedTarget}: ${lastReachedTxt}\n` : '') +
          (data.last.firstTouch ? `- ${t.gapExplainerFirstTouch}: **${data.last.firstTouch.fmt}**\n` : '') +
          (data.last.summary ? `- ${t.gapExplainerClosestHigh}: **${fmtNum(data.last.summary.high)}** (${data.last.summary.highTime})\n` : '') +
          (data.last.summary ? `- ${t.gapExplainerClosestLow}: **${fmtNum(data.last.summary.low)}** (${data.last.summary.lowTime})\n` : '') +
          (data.last.miss && !data.last.miss.reached ? `- ${t.closestMissDistance}: **${fmtNum(data.last.miss.missDistance)}**\n` : '') +
          `\n### ${t.gapExplainerMarkPrice}\n` +
          (targetNum != null ? `- ${t.gapExplainerReachedTarget}: ${markReachedTxt}\n` : '') +
          (data.mark.firstTouch ? `- ${t.gapExplainerFirstTouch}: **${data.mark.firstTouch.fmt}**\n` : '') +
          (data.mark.summary ? `- ${t.gapExplainerClosestHigh}: **${fmtNum(data.mark.summary.high)}** (${data.mark.summary.highTime})\n` : '') +
          (data.mark.summary ? `- ${t.gapExplainerClosestLow}: **${fmtNum(data.mark.summary.low)}** (${data.mark.summary.lowTime})\n` : '') +
          (data.mark.miss && !data.mark.miss.reached ? `- ${t.closestMissDistance}: **${fmtNum(data.mark.miss.missDistance)}**\n` : '') +
          `\n### ${t.gapExplainerLargestGap}\n`;

        if (data.largestGap) {
          msg += `- ${t.closestMissTime}: **${data.largestGap.fmt}**\n` +
            `- Last high: **${fmtNum(data.largestGap.lastHigh)}**\n` +
            `- Mark high: **${fmtNum(data.largestGap.markHigh)}**\n` +
            `- Last low: **${fmtNum(data.largestGap.lastLow)}**\n` +
            `- Mark low: **${fmtNum(data.largestGap.markLow)}**\n` +
            `- Gap: **${fmtNum(data.largestGap.gap)}**\n`;
        } else {
          msg += `- ${t.gapExplainerNoGapData}\n`;
        }

        // Support Summary — basic English / Turkish, explicit on MARK vs LAST.
        let summary = "";
        if (targetNum == null) {
          summary = t.gapExplainerSummaryNoTarget;
        } else if (data.last.reached && data.mark.reached) {
          summary = t.gapExplainerSummaryBothReached;
          if (gapTriggerType === 'LAST') summary += " " + t.gapExplainerSummaryLast;
        } else if (data.last.reached && !data.mark.reached) {
          if (gapTriggerType === 'MARK') summary = t.gapExplainerSummaryMark;
          else if (gapTriggerType === 'LAST') summary = t.gapExplainerSummaryLast;
          else summary = t.gapExplainerSummaryLastReachedMarkNot;
        } else if (!data.last.reached && data.mark.reached) {
          summary = t.gapExplainerSummaryMarkReachedLastNot;
        } else {
          summary = t.gapExplainerSummaryNeitherReached;
        }

        msg += `\n--- \n\n### 💡 ${t.gapExplainerSupportSummary}\n> ${summary}\n`;

        setResult(msg);

        track({
          event: 'lookup_query',
          tab: 'lookup',
          props: {
            mode: 'gapExplainer',
            symbol: activeSymbol,
            market,
            trigger_type: gapTriggerType || null,
            has_target: !!targetNum,
          },
        });
        track({
          event: 'gap_explainer_checked',
          tab: 'lookup',
          props: {
            symbol: activeSymbol,
            market,
            trigger_type: gapTriggerType || null,
            has_target: !!targetNum,
            last_reached: !!data.last.reached,
            mark_reached: !!data.mark.reached,
          },
        });
        return;

      } else if (mode === "trailing") {
        if (!from || !to) return setError(errRange);
        if (!callbackRate) return setError(errCallback);
        if (!activationPrice) return setError(lang === 'tr' ? 'Lütfen Aktivasyon Fiyatı girin.' : 'Please enter Activation Price.');

        const actPrice = parseFloat(activationPrice);
        const cbRate = parseFloat(callbackRate);
        const finalType = (market === 'futures') ? priceType : 'last';
        const sTrim = activeSymbol.trim();
        const fTrim = from.trim();
        const tTrim = to.trim();

        const data = await checkTrailingStop(sTrim, fTrim, tTrim, actPrice, cbRate, direction, market, finalType);

        if (data.status === "not_found") {
          return setResult(t.lookupNotFound);
        }

        let msg = `## ${data.status === 'triggered' ? t.trailingTriggeredTitle : t.trailingNotTriggeredTitle}\n\n`;

        if (data.isActivated) {
          // STEP 1: Activation
          msg += `### ${t.trailingResultActivated}\n` +
            `> ${t.trailingStep1Desc}\n` +
            `> 🕒 **${data.activationTime || from}**\n\n`;

          // STEP 2: Peak/Bottom Tracking
          msg += `### ${direction === 'short' ? t.trailingResultPeakLabel : t.trailingResultTroughLabel}\n` +
            `> **${lang === 'tr' ? 'Referans Noktası' : 'Reference Point'}:** ${t.trailingStep2Desc}\n` +
            `> 💎 **${data.peakPrice}** (🕒 ${data.peakTime})\n\n`;

          const rbRate = data.maxObservedCallback || 0;
          const currentTrigger = direction === 'short'
            ? (data.peakPrice * (1 - cbRate / 100)).toFixed(5)
            : (data.peakPrice * (1 + cbRate / 100)).toFixed(5);

          // STEP 3: Trigger or Waiting
          if (data.status === "triggered") {
            msg += `### ${t.trailingResultTrigger}\n` +
              `> ${direction === 'short'
                ? (lang === 'tr' ? 'Fiyat zirveden yeterince geri çekilerek emri tetikledi.' : 'The price pulled back from the peak enough to trigger.')
                : (lang === 'tr' ? 'Fiyat alttan (Bottom) yeterince sıçrayarak emri tetikledi.' : 'The price bounced up from the bottom enough to trigger.')}\n` +
              `> 🕒 **${data.triggerTime}**\n` +
              `> 💵 Triggered at: **${data.triggerPrice?.toFixed(5)}**\n\n`;
          } else {
            msg += `### ${t.trailingResultTrigger}\n` +
              `> ${t.trailingStepNoTriggerDesc}\n\n` +
              `> 💡 **${t.trailingNextTriggerTip}: ${currentTrigger}**\n\n`;
          }

          // AGENT SUMMARY (SCRIBABLE FOR CUSTOMER)
          msg += `--- \n` +
            `### ${t.trailingAgentSummary}\n` +
            `> ${lang === 'tr'
              ? `Emriniz **${data.activationTime || from}** tarihinde aktifleşti. Aktivasyondan sonra fiyatın ulaştığı ${direction === 'short' ? 'en yüksek nokta (Peak)' : 'en düşük nokta (Bottom)'} **${data.peakPrice}** oldu. Emrin tetiklenmesi için fiyatın bu noktadan **${cbRate}%** ${direction === 'short' ? 'geri çekilerek' : 'yukarı sıçrayarak'} **${currentTrigger}** seviyesine ulaşması gerekiyordu. ` +
              (data.status === 'triggered'
                ? `Fiyat bu seviyeye **${data.triggerTime}** tarihinde ulaştı ve tetiklendi.`
                : `Fiyat şu ana kadar en fazla **%${rbRate.toFixed(2)}** ${direction === 'short' ? 'geri çekildi' : 'yukarı sıçradı'}, bu yüzden henüz tetiklenmedi.`)
              : `Your order was activated at **${data.activationTime || from}**. After activation, the price reached its ${direction === 'short' ? 'highest point (Peak)' : 'lowest point (Bottom)'} at **${data.peakPrice}**. To trigger, the price needed to move **${cbRate}%** ${direction === 'short' ? 'down' : 'up'} from that point to reach **${currentTrigger}**. ` +
              (data.status === 'triggered'
                ? `The price reached this level at **${data.triggerTime}** and triggered.`
                : `The price has only ${direction === 'short' ? 'pulled back' : 'rebounded'} **${rbRate.toFixed(2)}%** so far, which is why it hasn't triggered yet.`)}\n\n`;

          // TECHNICAL BREAKDOWN
          msg += `--- \n` +
            `📝 **${t.trailingReboundFormula}**\n` +
            `> • ${direction === 'short' ? t.trailingPullback : t.trailingRebound}: **${rbRate.toFixed(2)}%**\n` +
            `> • ${lang === 'tr' ? 'Hedef' : 'Target'}: **${cbRate}%** \n` +
            `> *(${direction === 'short' ? lang === 'tr' ? '(Zirve - En Düşük) / Zirve' : '(Peak - Bottom) / Peak' : lang === 'tr' ? '(En Yüksek - Dip) / Dip' : '(Rebound - Trough) / Trough'} = ${rbRate.toFixed(2)}%)*\n\n` +
            `**${t.trailingAgentInternalTitle}:**\n` +
            `> *${direction === 'short' ? t.trailingAgentInternalDescShort : t.trailingAgentInternalDescLong}*` +
            (data.isEstimated ? `\n\n${t.trailingEstimatedNotice}` : "");

        } else {
          msg += `### ❌ ${t.trailingResultNotActivated}\n` +
            `> ${t.trailingWaitDesc}\n` +
            `> *(${direction === 'short' ? lang === 'tr' ? 'Fiyat Aktivasyon Fiyatına ulaşmadı' : 'Price never reached Activation Price' : lang === 'tr' ? 'Fiyat Aktivasyon Fiyatına düşmedi' : 'Price never dropped to Activation Price'})*`;
        }
        setResult(msg);
        track({
          event: 'trailing_stop_checked',
          tab: 'lookup',
          props: { symbol: activeSymbol, direction, market, price_type: priceType, status: data.status },
        });
      }

      // Track all successful lookup queries (placed here so all modes above reach this point)
      track({
        event: 'lookup_query',
        tab: 'lookup',
        props: { mode, symbol: activeSymbol, market, price_type: priceType },
      });

    } catch (err: any) {
      setError(err.message || String(err));
      track({
        event: 'lookup_error',
        tab: 'lookup',
        props: { mode, symbol: activeSymbol, market, error: String(err?.message || err).slice(0, 120) },
      });
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
      <div className="option-cards" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
        <div
          className={`option-card ${mode === 'trigger' ? 'active' : ''}`}
          onClick={() => setMode('trigger')}
        >
          <span>Trigger</span>
        </div>
        <div
          className={`option-card ${mode === 'range' ? 'active' : ''}`}
          onClick={() => setMode('range')}
        >
          <span>Range</span>
        </div>
        <div
          className={`option-card ${mode === 'findPrice' ? 'active' : ''}`}
          onClick={() => setMode('findPrice')}
        >
          <span>Find 🔍</span>
        </div>
        <div
          className={`option-card ${mode === 'trailing' ? 'active' : ''}`}
          onClick={() => setMode('trailing')}
        >
          <span>Trailing 🔄</span>
        </div>
        <div
          className={`option-card ${mode === 'last1s' ? 'active' : ''}`}
          onClick={() => setMode('last1s')}
        >
          <span>Last 1s</span>
        </div>
        <div
          className={`option-card ${mode === 'gapExplainer' ? 'active' : ''}`}
          onClick={() => setMode('gapExplainer')}
        >
          <span>{t.gapExplainerModeLabel}</span>
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
            onBlur={(e) => setActiveSymbol(e.target.value.trim().toUpperCase())}
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

        {(mode === "range" || mode === "findPrice" || mode === "trailing" || mode === "gapExplainer") && (
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
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t.lookupTo}
                <button
                  type="button"
                  className="tab"
                  style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                  onClick={setPresentTime}
                >
                  ✨ {t.trailingPresentBtn}
                </button>
              </label>
              <input
                className="input"
                placeholder="YYYY-MM-DD HH:MM:SS"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <div className="helper" style={{ fontSize: 10, marginTop: 4 }}>
                ℹ️ {t.trailingPresentNote}
              </div>
            </div>
          </>
        )}

        {mode === "findPrice" && (
          <div className="col-12">
            <label className="label">{lang === 'tr' ? 'Hedef Fiyat' : 'Target Price'}</label>
            <input
              className="input"
              type="number"
              placeholder="Price (e.g. 95000)"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
            <div className="helper" style={{ fontSize: 11, marginTop: 4, color: '#aaa' }}>
              ℹ️ {lang === 'tr'
                ? 'Hedef fiyata ulaşılmadıysa, en yakın gözlemlenen fiyat ve sapma otomatik olarak gösterilir.'
                : 'If the target is not reached, the closest observed price and miss distance are shown automatically.'}
            </div>
          </div>
        )}

        {mode === "trailing" && (
          <>
            <div className="col-12" style={{ marginBottom: 4 }}>
              <label className="label">{lang === 'tr' ? 'İşlem Yönü' : 'Trade Direction'}</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`btn ${direction === 'long' ? 'active' : 'secondary'}`}
                  style={{
                    flex: 1,
                    background: direction === 'long' ? '#2ebd85' : 'rgba(255,255,255,0.05)',
                    color: direction === 'long' ? '#fff' : '#999',
                    border: '1px solid ' + (direction === 'long' ? '#2ebd85' : 'rgba(255,255,255,0.1)'),
                    boxShadow: direction === 'long' ? '0 0 15px rgba(46, 189, 133, 0.4)' : 'none',
                    fontWeight: 800
                  }}
                  onClick={() => setDirection('long')}
                >
                  {t.trailingLong}
                </button>
                <button
                  type="button"
                  className={`btn ${direction === 'short' ? 'active' : 'secondary'}`}
                  style={{
                    flex: 1,
                    background: direction === 'short' ? '#f6465d' : 'rgba(255,255,255,0.05)',
                    color: direction === 'short' ? '#fff' : '#999',
                    border: '1px solid ' + (direction === 'short' ? '#f6465d' : 'rgba(255,255,255,0.1)'),
                    boxShadow: direction === 'short' ? '0 0 15px rgba(246, 70, 93, 0.4)' : 'none',
                    fontWeight: 800
                  }}
                  onClick={() => setDirection('short')}
                >
                  {t.trailingShort}
                </button>
              </div>
            </div>

            <div className="col-12">
              <div className="helper" style={{ color: '#aaa', fontSize: 11, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.1)', marginBottom: 8 }}>
                💡 <b>Tip:</b> {lang === 'tr' ? 'Emir verildikten sonraki değişimi görebilmek için "Bitiş" zamanını emrin güncel durumundan 1-2 saat sonrasına ayarlayın.' : 'To see the movements after order placement, set the "To" time at least 1-2 hours after the "From" time.'}
              </div>
            </div>

            <div className="col-6">
              <label className="label">{t.trailingActivation}</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 95000"
                value={activationPrice}
                onChange={(e) => setActivationPrice(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="label">{t.trailingCallback}</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 1.5"
                value={callbackRate}
                onChange={(e) => setCallbackRate(e.target.value)}
              />
            </div>

            {market === "futures" && (
              <div className="col-12">
                <label className="label">{t.trailingPriceType}</label>
                <div style={{ display: 'flex', gap: 20, background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="ptype_trailing"
                      checked={priceType === 'last'}
                      onChange={() => setPriceType('last')}
                    />
                    <span style={{ marginLeft: 6 }}>Last Price (Exact Trades)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="ptype_trailing"
                      checked={priceType === 'mark'}
                      onChange={() => setPriceType('mark')}
                    />
                    <span style={{ marginLeft: 6 }}>Mark Price (1m High/Low)</span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "findPrice" && (
          <>
            {market === "futures" && (
              <div className="col-12" style={{ marginTop: -8 }}>
                <div style={{ display: 'flex', gap: 15 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="ptype_find"
                      checked={priceType === 'last'}
                      onChange={() => setPriceType('last')}
                    />
                    <span style={{ marginLeft: 6 }}>Last Price</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="ptype_find"
                      checked={priceType === 'mark'}
                      onChange={() => setPriceType('mark')}
                    />
                    <span style={{ marginLeft: 6 }}>Mark Price</span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "gapExplainer" && (
          <>
            <div className="col-12">
              <div className="helper" style={{ color: '#aaa', fontSize: 11, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.1)', marginBottom: 8 }}>
                💡 {t.gapExplainerHelp}
              </div>
            </div>
            <div className="col-6">
              <label className="label">{t.gapExplainerTargetOptional}</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 95000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="label">{t.gapExplainerTriggerType}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="tab"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12, opacity: gapTriggerType === '' ? 1 : 0.6 }}
                  onClick={() => setGapTriggerType('')}
                >
                  {t.gapExplainerTriggerNone}
                </button>
                <button
                  type="button"
                  className="tab"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12, opacity: gapTriggerType === 'MARK' ? 1 : 0.6 }}
                  onClick={() => setGapTriggerType('MARK')}
                >
                  {t.gapExplainerTriggerMark}
                </button>
                <button
                  type="button"
                  className="tab"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12, opacity: gapTriggerType === 'LAST' ? 1 : 0.6 }}
                  onClick={() => setGapTriggerType('LAST')}
                >
                  {t.gapExplainerTriggerLast}
                </button>
              </div>
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

