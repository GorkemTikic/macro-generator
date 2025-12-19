// src/macros/stop_market_loss_higher_than_expected_last_price.js
import { fmtNum, upper, statusLineFriendly } from "./helpers";

function buildLastPriceOHLCBlock(prices, lang = 'en') {
  return lang === 'tr'
    ? `> **Last Price (1d Mum):**
>   Açılış: ${fmtNum(prices?.last?.open)}
>   Yüksek: ${fmtNum(prices?.last?.high)}
>   Düşük:  ${fmtNum(prices?.last?.low)}
>   Kapanış: ${fmtNum(prices?.last?.close)}`
    : `> **Last Price (1m Candle):**
>   Open: ${fmtNum(prices?.last?.open)}
>   High: ${fmtNum(prices?.last?.high)}
>   Low:  ${fmtNum(prices?.last?.low)}
>   Close: ${fmtNum(prices?.last?.close)}`;
}

export const stopMarketLossHigherThanExpectedLastPrice = {
  id: "stop_market_loss_higher_than_expected_last_price",
  price_required: "last",

  translations: {
    en: {
      title: "Stop-Market Loss is Higher Than Expected (Trigger Last Price)",
      formConfig: [
        { name: "order_id", label: "Order ID", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Status", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "Symbol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Side (of the Stop order)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Placed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Trigger Type", type: "text", defaultValue: "LAST", locked: true, col: 6 },
        { name: "trigger_price", label: "Trigger Price", type: "text", placeholder: "e.g. 4393.00", col: 6 },
        { name: "executed_price", label: "Executed Price", type: "text", placeholder: "e.g. 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "Executed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'en');
          return `All the dates and times below are UTC+0, so please adjust them to your own time-zone:  

**Order ID:** ${inputs.order_id}  
${inputs.placed_at_utc} UTC+0 = You placed this Stop-Market order.  

**Trigger Condition:** ${inputs.trigger_type}  
**Trigger Price:** ${inputs.trigger_price}  

When you place a Stop-Market order with the Last Price trigger condition, it will trigger a market order as soon as Last Price reaches the trigger level, and the market order will be executed immediately.  

${inputs.triggered_at_utc} UTC+0 = The Last Price reached your trigger price and the Market order was triggered.  
Market order executed from the price of: **${inputs.executed_price}** The Last Price details for that minute were:  

${lastBlock}  

The reason your stop order was filled at a different price and resulted in higher losses is because a **Stop-Market order is a conditional market order**.  
Unlike limit orders, a market order doesn’t guarantee the filling price but ensures immediate execution at the best available price. This difference is called *slippage* and is expected when using stop-market orders in volatile conditions.  

For more information, you may check:  
[What Are Stop Orders in Binance Futures?](https://www.binance.com/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        },
        summary: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'en');
          return `**Order ID:** ${inputs.order_id}  
Placed: ${inputs.placed_at_utc} UTC+0  
Triggered: ${inputs.triggered_at_utc} UTC+0  
Executed at: ${inputs.executed_price}  

**Trigger:** ${inputs.trigger_type} @ ${inputs.trigger_price}  

${lastBlock}  

➡️ The Stop-Market order was triggered by **Last Price** and executed immediately at the best available market price.  
This caused the execution price to differ from your trigger level (*slippage*), resulting in a higher loss than expected.  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        }
      }
    },
    tr: {
      title: "Stop-Market Kayıp Beklenenden Yüksek (Tetikleme Last Price)",
      formConfig: [
        { name: "order_id", label: "Emir Numarası", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Durum", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "Sembol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Taraf (Stop Emri)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Verilme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Tetikleme Tipi", type: "text", defaultValue: "LAST", locked: true, col: 6 },
        { name: "trigger_price", label: "Tetikleme Fiyatı", type: "text", placeholder: "örn. 4393.00", col: 6 },
        { name: "executed_price", label: "Gerçekleşme Fiyatı", type: "text", placeholder: "örn. 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "Gerçekleşme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'tr');
          return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Stop-Market emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${inputs.trigger_price}

Last Price tetikleme koşuluna sahip bir Stop-Market emri verdiğinizde, Last Price tetikleme seviyesine ulaştığı anda bir piyasa emri tetiklenir ve bu piyasa emri hemen gerçekleşir.

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, Last Price, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.
Piyasa emri de şu fiyattan gerçekleşmiştir: **${inputs.executed_price}**

O dakikaya ait Last Price detayları:

${lastBlock}

Stop emrinizin farklı bir fiyattan dolmasının ve daha yüksek zarara yol açmasının nedeni, **Stop-Market emrinin koşullu bir piyasa emri** olmasıdır.
Limit emirlerinin aksine, piyasa emri dolum fiyatını garanti etmez, ancak o anki en iyi fiyattan anında gerçekleşmeyi sağlar. Bu farka *Slipaj* denir ve volatil koşullarda stop-market emirleri kullanırken beklenen bir durumdur.

Daha fazla bilgi için:
[Binance Futures'ta Stop Emirler Nedir?](https://www.binance.com/en/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        },
        summary: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'tr');
          return `**Emir Numarası:** ${inputs.order_id}
Verilme: ${inputs.placed_at_utc} UTC+0
Tetiklenme: ${inputs.triggered_at_utc} UTC+0
Gerçekleşme: ${inputs.executed_price}

**Tetikleme:** ${inputs.trigger_type} @ ${inputs.trigger_price}

${lastBlock}

➡️ Stop-Market emri **Last Price** ile tetiklendi ve o anki en iyi piyasa fiyatından gerçekleşti.
Bu durum, gerçekleşme fiyatının tetikleme seviyenizden farklı olmasına (Slipaj) neden oldu ve beklenenden daha yüksek bir zararla sonuçlandı.

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        }
      }
    }
  }
};
