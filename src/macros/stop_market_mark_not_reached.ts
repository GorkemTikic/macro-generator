// src/macros/stop_market_mark_not_reached.js
import { fmtNum, upper, statusLineFriendly } from "./helpers";

function buildSideAwareBlock(inputs, prices, lang = 'en') {
  const side = upper(inputs.side);
  const trig = Number(inputs.trigger_price);
  const precision = prices?.precision ?? 8;

  const mHigh = prices?.mark?.high;
  const mLow = prices?.mark?.low;
  const mHighT = prices?.mark?.highTime;
  const mLowT = prices?.mark?.lowTime;

  const lHigh = prices?.last?.high;
  const lLow = prices?.last?.low;
  const lHighT = prices?.last?.highTime;
  const lLowT = prices?.last?.lowTime;

  const fullRangeBlock = lang === 'tr'
    ? `> **Mark Price Aralığı:**
>   En Yüksek: ${fmtNum(mHigh, precision)} (tarih ${mHighT || "N/A"})
>   En Düşük:  ${fmtNum(mLow, precision)} (tarih ${mLowT || "N/A"})
> 
> **Last Price Aralığı:**
>   En Yüksek: ${fmtNum(lHigh, precision)} (tarih ${lHighT || "N/A"})
>   En Düşük:  ${fmtNum(lLow, precision)} (tarih ${lLowT || "N/A"})`
    : `> **Mark Price Range:**
>   Highest: ${fmtNum(mHigh, precision)} (at ${mHighT || "N/A"})
>   Lowest:  ${fmtNum(mLow, precision)} (at ${mLowT || "N/A"})
> 
> **Last Price Range:**
>   Highest: ${fmtNum(lHigh, precision)} (at ${lHighT || "N/A"})
>   Lowest:  ${fmtNum(lLow, precision)} (at ${lLowT || "N/A"})`;


  let explanation_en = "";
  let explanation_tr = "";

  if (side !== "BUY" && side !== "SELL") {
    explanation_en = `Because the trigger condition is **Mark Price**, the order can only activate when Mark Price crosses your trigger level (${fmtNum(inputs.trigger_price, precision)}).  
The Mark Price extremes within this period did not cross that level, so the order did not activate.`;
    explanation_tr = `Tetikleme koşulu **Mark Price** olduğundan, emir sadece Mark Price tetikleme seviyenizi (${fmtNum(inputs.trigger_price, precision)}) geçtiğinde aktif hale gelebilir.  
Bu dönemdeki Mark Price hareketleri bu seviyeye ulaşmadığı için emir tetiklenmemiştir.`;
    return { table: fullRangeBlock, explanation_en, explanation_tr };
  }

  if (side === "SELL") {
    const lastCrossed = Number.isFinite(lLow) && Number.isFinite(trig) ? lLow <= trig : false;
    const markCrossed = Number.isFinite(mLow) && Number.isFinite(trig) ? mLow <= trig : false;

    explanation_en = `Since you placed a **SELL Stop-Market**, the Mark Price needed to fall to **${fmtNum(inputs.trigger_price, precision)}**.  
However, the lowest Mark Price was **${fmtNum(mLow, precision)}**, which stayed *above* your trigger price, so the order did not activate.`;
    explanation_tr = `Bir **SELL (Satış) Stop-Market** emri verdiğiniz için, Mark Price'ın **${fmtNum(inputs.trigger_price, precision)}** seviyesine düşmesi gerekiyordu.  
Ancak, en düşük Mark Price **${fmtNum(mLow, precision)}** olarak gerçekleşti ve tetikleme fiyatınızın *üzerinde* kaldı, bu nedenle emir tetiklenmedi.`;

    if (lastCrossed && !markCrossed) {
      explanation_en += `  

➡️ Even though the **Last Price** reached/passed your trigger level (Lowest: ${fmtNum(lLow, precision)}), the **Mark Price** did not, therefore the Stop-Market order could not trigger.`;
      explanation_tr += `  

➡️ **Last Price** tetikleme seviyenize ulaşsa bile (En Düşük: ${fmtNum(lLow, precision)}), **Mark Price** ulaşmadığı için Stop-Market emri tetiklenemedi.`;
    }
    return { table: fullRangeBlock, explanation_en, explanation_tr };
  }

  // BUY
  const lastCrossed = Number.isFinite(lHigh) && Number.isFinite(trig) ? lHigh >= trig : false;
  const markCrossed = Number.isFinite(mHigh) && Number.isFinite(trig) ? mHigh >= trig : false;

  explanation_en = `Since you placed a **BUY Stop-Market**, the Mark Price needed to rise to **${fmtNum(inputs.trigger_price, precision)}**.  
However, the highest Mark Price was **${fmtNum(mHigh, precision)}**, which stayed *below* your trigger price, so the order did not activate.`;
  explanation_tr = `Bir **BUY (Alış) Stop-Market** emri verdiğiniz için, Mark Price'ın **${fmtNum(inputs.trigger_price, precision)}** seviyesine yükselmesi gerekiyordu.  
Ancak, en yüksek Mark Price **${fmtNum(mHigh, precision)}** olarak gerçekleşti ve tetikleme fiyatınızın *altında* kaldı, bu nedenle emir tetiklenmedi.`;

  if (lastCrossed && !markCrossed) {
    explanation_en += `  

➡️ Even though the **Last Price** reached/passed your trigger level (Highest: ${fmtNum(lHigh, precision)}), the **Mark Price** did not, therefore the Stop-Market order could not trigger.`;
    explanation_tr += `  

➡️ **Last Price** tetikleme seviyenize ulaşsa bile (En Yüksek: ${fmtNum(lHigh, precision)}), **Mark Price** ulaşmadığı için Stop-Market emri tetiklenemedi.`;
  }
  return { table: fullRangeBlock, explanation_en, explanation_tr };
}


export const stopMarketMarkNotReached = {
  id: "mark_not_reached_user_checked_last",
  price_required: "both",

  translations: {
    en: {
      title: "Stop-Market · Mark Price Not Reached (User Checks Last Price)",
      formConfig: [
        { name: "order_id", label: "Order ID", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Status", type: "select", options: ["OPEN", "CANCELED", "EXPIRED"], defaultValue: "OPEN", col: 6 },
        { name: "symbol", label: "Symbol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Side (of the Stop order)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Placed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Trigger Type", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Trigger Price", type: "text", placeholder: "e.g. 4393.00", col: 6 },
        { name: "final_status_utc", label: "Final Status At (Open/Canceled/Expired)", type: "text", placeholder: "2025-09-11 12:30:19", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const stillOpen = upper(inputs.status) === "OPEN";
          const statusLine = statusLineFriendly(inputs);
          const { table, explanation_en } = buildSideAwareBlock(inputs, prices, 'en');
          const precision = prices?.precision ?? 8;

          return `**Order ID:** ${inputs.order_id}

${inputs.placed_at_utc} UTC+0 = At this date and time you placed a Stop-Market order (**${upper(inputs.side) || "N/A"}**) for **${inputs.symbol}**.  

**Order Type:** Stop-Market  
**Trigger Condition:** ${inputs.trigger_type}  
**Trigger Price:** ${fmtNum(inputs.trigger_price, precision)}  

${statusLine}

When we check the **${inputs.symbol} Price Chart** From: ${inputs.placed_at_utc} UTC+0  
To: ${inputs.final_status_utc} UTC+0  

${table}  

${explanation_en}${stillOpen ? `  

⚠️ *Please note: this order is still OPEN and may trigger in the future if Mark Price crosses the trigger price.*` : ""}  

*Experienced traders often use **Mark Price** for stop-orders near liquidation risk, while they may choose **Last Price** for entry or take-profit orders.* [Mark Price vs. Last Price on Binance Futures – What’s the Difference?](https://www.binance.com/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        },
        summary: ({ inputs, prices }) => {
          const statusLine = statusLineFriendly(inputs);
          const side = upper(inputs.side);
          const precision = prices?.precision ?? 8;
          const { table, explanation_en } = buildSideAwareBlock(inputs, prices, 'en');
          let lines = [];
          lines.push(`**Order ID:** ${inputs.order_id}  `);
          lines.push(``);
          lines.push(`${inputs.placed_at_utc} UTC+0 = You placed a Stop-Market order for **${inputs.symbol}**.`);
          lines.push(statusLine);
          lines.push(``);
          lines.push(`**Trigger:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}${side ? `  \n**Side:** ${side}` : ""}`);
          lines.push(``);
          lines.push(`**Price Range (${inputs.placed_at_utc} → ${inputs.final_status_utc}):**`);
          lines.push(table);
          lines.push(``);
          lines.push(explanation_en);
          return lines.join("\n");
        }
      }
    },
    tr: {
      title: "Stop-Market · Mark Price Ulaşmadı (Kullanıcı Last Price Kontrol Ediyor)",
      formConfig: [
        { name: "order_id", label: "Emir Numarası", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Durum", type: "select", options: ["OPEN", "CANCELED", "EXPIRED"], defaultValue: "OPEN", col: 6 },
        { name: "symbol", label: "Sembol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Taraf (Stop Emri)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Verilme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Tetikleme Tipi", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Tetikleme Fiyatı", type: "text", placeholder: "örn. 4393.00", col: 6 },
        { name: "final_status_utc", label: "Son Durum Zamanı (Açık/İptal/Süresi Doldu)", type: "text", placeholder: "2025-09-11 12:30:19", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const stillOpen = upper(inputs.status) === "OPEN";
          const statusLine = statusLineFriendly(inputs);
          const { table, explanation_tr } = buildSideAwareBlock(inputs, prices, 'tr');
          const precision = prices?.precision ?? 8;

          return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}

${inputs.placed_at_utc} UTC+0 = Bu tarih ve saatte **${inputs.symbol}** için bir Stop-Market emri (**${upper(inputs.side) || "N/A"}**) verdiniz.  

**Emir Tipi:** Stop-Market  
**Tetikleme Koşulu:** ${inputs.trigger_type}  
**Tetikleme Fiyatı:** ${fmtNum(inputs.trigger_price, precision)}  

${statusLine}

**${inputs.symbol}** Fiyat Grafiğini kontrol ettiğimde:
Başlangıç: ${inputs.placed_at_utc} UTC+0  
Bitiş: ${inputs.final_status_utc} UTC+0  

${table}  

${explanation_tr}${stillOpen ? `  

⚠️ *Lütfen unutmayın: Bu emir hala AÇIKTIR ve gelecekte Mark Price tetikleme fiyatını geçerse tetiklenebilir.*` : ""}  

*Deneyimli yatırımcılar, likidasyon riskine yakın stop emirleri için genellikle **Mark Price** kullanırken, piyasaya giriş veya kâr al emirleri için **Last Price** tercih edebilirler.* [Binance Futures'ta Mark Price ve Last Price Arasındaki Fark Nedir?](https://www.binance.com/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)  

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        },
        summary: ({ inputs, prices }) => {
          const statusLine = statusLineFriendly(inputs);
          const side = upper(inputs.side);
          const precision = prices?.precision ?? 8;
          const { table, explanation_tr } = buildSideAwareBlock(inputs, prices, 'tr');
          let lines = [];
          lines.push(`**Emir Numarası:** ${inputs.order_id}  `);
          lines.push(``);
          lines.push(`${inputs.placed_at_utc} UTC+0 = **${inputs.symbol}** için Stop-Market emri verdiniz.`);
          lines.push(statusLine);
          lines.push(``);
          lines.push(`**Tetikleme:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}${side ? `  \n**Taraf:** ${side}` : ""}`);
          lines.push(``);
          lines.push(`**Fiyat Aralığı (${inputs.placed_at_utc} → ${inputs.final_status_utc}):**`);
          lines.push(table);
          lines.push(``);
          lines.push(explanation_tr);
          return lines.join("\n");
        }
      }
    }
  }
};
