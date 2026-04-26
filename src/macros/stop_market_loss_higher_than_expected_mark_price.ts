// src/macros/stop_market_loss_higher_than_expected_mark_price.js
import { fmtNum, upper, statusLineFriendly } from "./helpers";

function buildFullOHLCBlock(prices, lang = 'en') {
  return lang === 'tr'
    ? `> **Mark Price (1d Mum):**
>   Açılış: ${fmtNum(prices?.mark?.open)}
>   Yüksek: ${fmtNum(prices?.mark?.high)}
>   Düşük:  ${fmtNum(prices?.mark?.low)}
>   Kapanış: ${fmtNum(prices?.mark?.close)}
> 
> **Last Price (1d Mum):**
>   Açılış: ${fmtNum(prices?.last?.open)}
>   Yüksek: ${fmtNum(prices?.last?.high)}
>   Düşük:  ${fmtNum(prices?.last?.low)}
>   Kapanış: ${fmtNum(prices?.last?.close)}`
    : `> **Mark Price (1m Candle):**
>   Open: ${fmtNum(prices?.mark?.open)}
>   High: ${fmtNum(prices?.mark?.high)}
>   Low:  ${fmtNum(prices?.mark?.low)}
>   Close: ${fmtNum(prices?.mark?.close)}
> 
> **Last Price (1m Candle):**
>   Open: ${fmtNum(prices?.last?.open)}
>   High: ${fmtNum(prices?.last?.high)}
>   Low:  ${fmtNum(prices?.last?.low)}
>   Close: ${fmtNum(prices?.last?.close)}`;
}

export const stopMarketLossHigherThanExpectedMarkPrice = {
  id: "stop_market_loss_higher_than_expected_mark_price",
  price_required: "both",

  translations: {
    en: {
      title: "Stop-Market Loss is Higher Than Expected (Trigger Mark Price)",
      formConfig: [
        { name: "order_id", label: "Order ID", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Status", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "Symbol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Side (of the Stop order)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Placed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Trigger Type", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Trigger Price", type: "text", placeholder: "e.g. 4393.00", col: 6 },
        { name: "executed_price", label: "Executed Price", type: "text", placeholder: "e.g. 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "Executed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'en');
          return `All the dates and times below are UTC+0, so please adjust them to your own time-zone:  

**Order ID:** ${inputs.order_id}  
${inputs.placed_at_utc} UTC+0 = You placed this Stop-Market order.  

**Trigger Condition:** ${inputs.trigger_type}  
**Trigger Price:** ${inputs.trigger_price}  

When you place a Stop-Market order with the Mark Price trigger condition, it will trigger a market order when Mark Price reaches trigger price and market order will be executed from *Last Price.* ${inputs.triggered_at_utc} UTC+0 = The Mark Price reached your trigger price and the Market order was triggered.  
Market order executed from the price of: **${inputs.executed_price}** The reason for this difference can be seen on the price chart as well, if you check the Mark Price and Last Price Chart for that minute:  

${priceBlock}  

There are two reasons why your stop order was filled at a different price and increased the losses from the expected amount:  

**1) Stop-Market Order:** Please keep in mind that a stop-market order is a conditional market order. Unlike limit orders, a market order doesn’t guarantee the filling price but ensures immediate execution at the best available price. *This implies that a stop-market order will be immediately executed and filled in the market after the stop condition is satisfied, at the best available price at that moment.* **2) Trigger set as Mark Price:** Your order was triggered by **Mark Price** but filled by **Last Price**. As seen in the data above, the Last Price may have been trading at a less favorable level than the Mark Price at the moment of execution, which combined with market order slippage, resulted in the final execution price.  

For a better understanding of all these concepts, you can check these links:  
[What Is the Difference Between a Futures Contract’s Last Price and Mark Price?](https://www.binance.com/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)  
[What Are Stop Orders in Binance Futures?](https://www.binance.com/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        },
        summary: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'en');
          return `**Order ID:** ${inputs.order_id}  
Placed: ${inputs.placed_at_utc} UTC+0  
Triggered: ${inputs.triggered_at_utc} UTC+0  
Executed at: ${inputs.executed_price}  

**Trigger:** ${inputs.trigger_type} @ ${inputs.trigger_price}  

${priceBlock}  

➡️ Your Stop-Market order was triggered when **Mark Price** reached the trigger, but it was executed at **Last Price**.  
Since a Stop-Market is a conditional market order, it fills at the best available market price, which may differ from your trigger level.  

As a result, the execution price differed from your expectation, causing a higher loss.  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        }
      }
    },
    tr: {
      title: "Stop-Market Kayıp Beklenenden Yüksek (Tetikleme Mark Price)",
      formConfig: [
        { name: "order_id", label: "Emir Numarası", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Durum", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "Sembol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Taraf (Stop Emri)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Verilme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Tetikleme Tipi", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Tetikleme Fiyatı", type: "text", placeholder: "örn. 4393.00", col: 6 },
        { name: "executed_price", label: "Gerçekleşme Fiyatı", type: "text", placeholder: "örn. 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "Gerçekleşme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'tr');
          return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Stop-Market emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${inputs.trigger_price}

Mark Price'ı tetikleme koşuluna sahip bir Stop-Market emri verdiğinizde, Mark Price tetikleme fiyatına ulaştığında bir piyasa emri tetiklenir ve bu piyasa emri *Last Price* üzerinden gerçekleşir.

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, Mark Price, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.
Piyasa emri de şu fiyattan gerçekleşmiştir: **${inputs.executed_price}**

Bu farkın nedeni, o dakikadaki Mark Price ve Last Price grafiğini kontrol ederseniz görülebilir:

${priceBlock}

Stop emrinizin farklı bir fiyattan dolmasının ve beklenenden daha fazla zarara yol açmasının iki nedeni vardır:

**1) Stop-Market Emri:** Lütfen stop-market emrinin koşullu bir piyasa emri olduğunu unutmayın. Limit emirlerinin aksine, piyasa emri dolum fiyatını garanti etmez, ancak piyasaya anında girmeyi sağlar. *Bu, stop-market emrinin, stop koşulu sağlandıktan sonra o anki en iyi piyasa fiyatından hemen gerçekleşeceği anlamına gelir.*

**2) Tetikleme koşulu Mark Price Olarak Ayarlanmış:** Emriniz **Mark Price** ile tetiklenmiş ancak **Last Price** ile dolmuştur. Yukarıdaki verilerde de görüldüğü gibi, Last Price emrin gerçekleştiği anda Mark Price Fiyatından daha az avantajlı bir seviyede olabilir; bu da piyasa emri kayması (Slipaj) ile birleştiğinde nihai gerçekleşme fiyatına yol açmıştır.

Daha fazla bilgi için:
[Binance Futures'ta Mark Price ve Last Price Arasındaki Fark Nedir?](https://www.binance.com/en/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)
[Binance Futures'ta Stop Emirler Nedir?](https://www.binance.com/en/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        },
        summary: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'tr');
          return `**Emir Numarası:** ${inputs.order_id}
Verilme: ${inputs.placed_at_utc} UTC+0
Tetiklenme: ${inputs.triggered_at_utc} UTC+0
Gerçekleşme: ${inputs.executed_price}

**Tetikleme:** ${inputs.trigger_type} @ ${inputs.trigger_price}

${priceBlock}

➡️ Stop-Market emriniz **Mark Price** tetikleme seviyesine ulaştığında tetiklendi, ancak **Last Price** üzerinden gerçekleşti.
Bu bir piyasa emri olduğundan, o anki en iyi fiyattan doldu ve bu da tetikleme seviyenizden farklı olabilir.

Sonuç olarak, gerçekleşme fiyatı beklentinizden farklı oldu ve daha yüksek bir zarara neden oldu.

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        }
      }
    }
  }
};
