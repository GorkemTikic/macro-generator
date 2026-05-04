// src/macros/stop_market_loss_higher_than_expected_mark_price.js
import { fmtNum, upper, statusLineFriendly, prettyTriggerType } from "./helpers";

function buildFullOHLCBlock(prices, lang = 'en') {
  if (lang === 'zh') {
    return `> **Mark Price(1分钟 K 线):**
>   开盘: ${fmtNum(prices?.mark?.open)}
>   最高: ${fmtNum(prices?.mark?.high)}
>   最低: ${fmtNum(prices?.mark?.low)}
>   收盘: ${fmtNum(prices?.mark?.close)}

> **Last Price(1分钟 K 线):**
>   开盘: ${fmtNum(prices?.last?.open)}
>   最高: ${fmtNum(prices?.last?.high)}
>   最低: ${fmtNum(prices?.last?.low)}
>   收盘: ${fmtNum(prices?.last?.close)}`;
  }
  return lang === 'tr'
    ? `> **Mark Price (1d Mum):**
>   Açılış: ${fmtNum(prices?.mark?.open)}
>   Yüksek: ${fmtNum(prices?.mark?.high)}
>   Düşük:  ${fmtNum(prices?.mark?.low)}
>   Kapanış: ${fmtNum(prices?.mark?.close)}

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

**Trigger Condition:** ${prettyTriggerType(inputs.trigger_type)}  
**Trigger Price:** ${inputs.trigger_price}  

When you place a Stop-Market order with the **Mark Price** trigger condition, the system sends a market order as soon as the Mark Price reaches your trigger price. The resulting market order is then executed against the **Last Price** (the actual market trade price).

${inputs.triggered_at_utc} UTC+0 = The Mark Price reached your trigger price, and the market order was triggered.

The market order was executed at the price of: **${inputs.executed_price}**

The reason for this difference can be seen by checking the Mark Price and Last Price for that minute:

${priceBlock}  

There are two reasons why your stop order filled at a different price and increased the loss beyond what you expected:

**1) Stop-Market is a market order.**
A stop-market is a conditional market order. Unlike a limit order, a market order does not guarantee a fill price — it guarantees immediate execution at the best available price. Once your stop condition was satisfied, the order filled at the best available market price at that moment.

**2) The trigger uses Mark Price, but the fill uses Last Price.**
Your order was triggered by **Mark Price** but filled by **Last Price**. As seen in the data above, the Last Price was trading at a less favorable level than the Mark Price at the moment of execution. Combined with normal market-order slippage, this produced the final execution price.

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

**Trigger:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}  

${priceBlock}  

➡️ Your Stop-Market order was triggered when **Mark Price** reached the trigger, but it was executed at **Last Price**.  
Since a Stop-Market is a conditional market order, it fills at the best available market price, which may differ from your trigger level.  

As a result, the execution price differed from your expectation, causing a higher loss.  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        }
      }
    },
    zh: {
      title: "Stop-Market 损失高于预期(Mark Price 触发)",
      formConfig: [
        { name: "order_id", label: "订单号", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "状态", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "交易对", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "方向(Stop 订单)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "下单时间(UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "触发类型", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "触发价", type: "text", placeholder: "例如 4393.00", col: 6 },
        { name: "executed_price", label: "成交价", type: "text", placeholder: "例如 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "成交时间(UTC)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'zh');
          return `下面分享的所有时间均为 UTC+0,请根据您所在时区进行换算:

**订单号:** ${inputs.order_id}

${inputs.placed_at_utc} UTC+0 = 您在该时间下了这笔 Stop-Market 订单。

**触发条件:** ${prettyTriggerType(inputs.trigger_type)}
**触发价:** ${inputs.trigger_price}

当您使用 **Mark Price** 触发条件下一笔 Stop-Market 订单时,只要 Mark Price 触及触发价,系统就会发送一笔市价单。该市价单会按照 **Last Price**(实际市场成交价格)成交。

${inputs.triggered_at_utc} UTC+0 = Mark Price 触及了您的触发价,市价单已被触发。

市价单的成交价格为:**${inputs.executed_price}**

价差产生的原因可以从该分钟的 Mark Price 与 Last Price 看出:

${priceBlock}

止损单成交价与触发价不同、损失高于预期,主要有两个原因:

**1) Stop-Market 是市价单。**
Stop-Market 是一种条件市价单。与限价单不同,市价单不保证成交价,而是保证以当时最优价格立即成交。一旦止损条件满足,订单就会按当时最优市场价格成交。

**2) 触发使用 Mark Price,但成交以 Last Price 进行。**
您的订单由 **Mark Price** 触发,但由 **Last Price** 成交。从上方数据可以看出,在成交瞬间 Last Price 处于比 Mark Price 更不利的水平。结合市价单常见的滑点,最终成交价就是这样形成的。

如需进一步了解,可参考下列说明:
[Mark Price 与 Last Price 在币安合约的区别](https://www.binance.com/zh-CN/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)
[币安合约的 Stop 订单是什么?](https://www.binance.com/zh-CN/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

希望以上说明能解答您的疑问 🙏 如还有其他问题,请随时告诉我。`;
        },
        summary: ({ inputs, prices }) => {
          const priceBlock = buildFullOHLCBlock(prices, 'zh');
          return `**订单号:** ${inputs.order_id}
下单: ${inputs.placed_at_utc} UTC+0
触发: ${inputs.triggered_at_utc} UTC+0
成交价: ${inputs.executed_price}

**触发:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}

${priceBlock}

➡️ 您的 Stop-Market 订单在 **Mark Price** 触及触发价时被触发,但实际由 **Last Price** 成交。
由于 Stop-Market 属于条件市价单,会按当时最优市场价成交,这一价格可能与触发价存在差异。

最终成交价与您的预期不一致,导致了高于预期的损失。

希望以上说明能解答您的疑问 🙏 如还有其他问题,请随时告诉我。`;
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

${inputs.placed_at_utc} UTC+0 = Bu tarih ve saatte bu Stop-Market emrini verdiniz.

**Tetikleme Koşulu:** ${prettyTriggerType(inputs.trigger_type)}
**Tetikleme Fiyatı:** ${inputs.trigger_price}

**Mark Price** tetikleme koşulu seçili bir Stop-Market emri verdiğinizde, Mark Price tetikleme fiyatınıza ulaştığı anda sistem bir piyasa emri gönderir. Bu piyasa emri ise **Last Price** (gerçek piyasa işlem fiyatı) üzerinden gerçekleşir.

${inputs.triggered_at_utc} UTC+0 = Bu tarih ve saatte Mark Price tetikleme fiyatınıza ulaştı ve piyasa emri tetiklendi.

Piyasa emri şu fiyattan gerçekleşti: **${inputs.executed_price}**

Bu farkın nedeni, o dakikaya ait Mark Price ve Last Price verisinde görülebilir:

${priceBlock}

Stop emrinizin farklı bir fiyattan dolmasının ve beklenenden daha fazla zarara yol açmasının iki nedeni vardır:

**1) Stop-Market bir piyasa emridir.**
Stop-market koşullu bir piyasa emridir. Limit emirlerinin aksine, piyasa emri dolum fiyatını garanti etmez — o anki en iyi piyasa fiyatından anında gerçekleşmeyi garanti eder. Stop koşulunuz sağlandığında, emir o andaki en iyi piyasa fiyatından doldu.

**2) Tetikleme Mark Price'tan, doluş Last Price'tan gerçekleşir.**
Emriniz **Mark Price** ile tetiklendi ancak **Last Price** üzerinden doldu. Yukarıdaki veriden de görüldüğü gibi, Last Price gerçekleşme anında Mark Price'tan daha az avantajlı bir seviyedeydi. Buna piyasa emrinin doğal kayması (Slipaj) eklenince nihai gerçekleşme fiyatı oluştu.

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

**Tetikleme:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}

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
