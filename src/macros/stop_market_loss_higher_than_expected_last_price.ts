// src/macros/stop_market_loss_higher_than_expected_last_price.js
import { fmtNum, upper, statusLineFriendly, prettyTriggerType } from "./helpers";

function buildLastPriceOHLCBlock(prices, lang = 'en') {
  if (lang === 'zh') {
    return `> **Last Price(1分钟 K 线):**
>   开盘: ${fmtNum(prices?.last?.open)}
>   最高: ${fmtNum(prices?.last?.high)}
>   最低: ${fmtNum(prices?.last?.low)}
>   收盘: ${fmtNum(prices?.last?.close)}`;
  }
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

**Trigger Condition:** ${prettyTriggerType(inputs.trigger_type)}  
**Trigger Price:** ${inputs.trigger_price}  

When you place a Stop-Market order with the Last Price trigger condition, it will trigger a market order as soon as Last Price reaches the trigger level, and the market order will be executed immediately.  

${inputs.triggered_at_utc} UTC+0 = The Last Price reached your trigger price, and the market order was triggered.

The market order was executed at the price of: **${inputs.executed_price}**

The Last Price details for that minute were:

${lastBlock}  

The reason your stop order was filled at a different price — and resulted in higher losses — is that a **Stop-Market order is a conditional market order**.

Unlike a limit order, a market order does not guarantee the fill price — it guarantees immediate execution at the best available price. This difference is called *slippage* and is expected when using stop-market orders in volatile conditions.

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

**Trigger:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}  

${lastBlock}  

➡️ The Stop-Market order was triggered by **Last Price** and executed immediately at the best available market price.  
This caused the execution price to differ from your trigger level (*slippage*), resulting in a higher loss than expected.  

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
        }
      }
    },
    zh: {
      title: "Stop-Market 损失高于预期(Last Price 触发)",
      formConfig: [
        { name: "order_id", label: "订单号", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "状态", type: "select", options: ["EXECUTED", "TRIGGERED"], defaultValue: "EXECUTED", col: 6 },
        { name: "symbol", label: "交易对", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "方向(Stop 订单)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "下单时间(UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "触发类型", type: "text", defaultValue: "LAST", locked: true, col: 6 },
        { name: "trigger_price", label: "触发价", type: "text", placeholder: "例如 4393.00", col: 6 },
        { name: "executed_price", label: "成交价", type: "text", placeholder: "例如 4331.67", col: 6 },
        { name: "triggered_at_utc", label: "成交时间(UTC)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'zh');
          return `下面分享的所有时间均为 UTC+0,请根据您所在时区进行换算:

**订单号:** ${inputs.order_id}

${inputs.placed_at_utc} UTC+0 = 您在该时间下了这笔 Stop-Market 订单。

**触发条件:** ${prettyTriggerType(inputs.trigger_type)}
**触发价:** ${inputs.trigger_price}

当您使用 **Last Price** 触发条件下一笔 Stop-Market 订单时,只要 Last Price 触及触发价,系统就会立即发送一笔市价单并按当时最优市场价格成交。

${inputs.triggered_at_utc} UTC+0 = Last Price 触及了您的触发价,市价单已被触发。

市价单的成交价格为:**${inputs.executed_price}**

该分钟的 Last Price 详情如下:

${lastBlock}

止损单成交价与触发价不同、损失高于预期的原因在于:**Stop-Market 是一种条件市价单**。

与限价单不同,市价单不保证成交价,而是保证以当时最优市场价格立即成交。这种价差被称为*滑点 (slippage)*,在波动较大的行情中使用 Stop-Market 订单时是常见现象。

如需进一步了解,可参考下列说明:
[币安合约的 Stop 订单是什么?](https://www.binance.com/zh-CN/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

希望以上说明能解答您的疑问 🙏 如还有其他问题,请随时告诉我。`;
        },
        summary: ({ inputs, prices }) => {
          const lastBlock = buildLastPriceOHLCBlock(prices, 'zh');
          return `**订单号:** ${inputs.order_id}
下单: ${inputs.placed_at_utc} UTC+0
触发: ${inputs.triggered_at_utc} UTC+0
成交价: ${inputs.executed_price}

**触发:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}

${lastBlock}

➡️ Stop-Market 订单由 **Last Price** 触发,并立即按当时最优市场价格成交。
这导致成交价与您的触发水平存在差异(*滑点*),损失高于预期。

希望以上说明能解答您的疑问 🙏 如还有其他问题,请随时告诉我。`;
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

${inputs.placed_at_utc} UTC+0 = Bu tarih ve saatte bu Stop-Market emrini verdiniz.

**Tetikleme Koşulu:** ${prettyTriggerType(inputs.trigger_type)}
**Tetikleme Fiyatı:** ${inputs.trigger_price}

Last Price tetikleme koşuluna sahip bir Stop-Market emri verdiğinizde, Last Price tetikleme seviyesine ulaştığı anda bir piyasa emri tetiklenir ve bu piyasa emri hemen gerçekleşir.

${inputs.triggered_at_utc} UTC+0 = Bu tarih ve saatte Last Price tetikleme fiyatınıza ulaştı ve piyasa emri tetiklendi.

Piyasa emri şu fiyattan gerçekleşti: **${inputs.executed_price}**

O dakikaya ait Last Price detayları:

${lastBlock}

Stop emrinizin farklı bir fiyattan dolmasının ve daha yüksek zarara yol açmasının nedeni, **Stop-Market emrinin koşullu bir piyasa emri** olmasıdır.

Limit emirlerinin aksine, piyasa emri dolum fiyatını garanti etmez — o anki en iyi piyasa fiyatından anında gerçekleşmeyi garanti eder. Bu farka *Slipaj* denir ve volatil koşullarda stop-market emirleri kullanırken beklenen bir durumdur.

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

**Tetikleme:** ${prettyTriggerType(inputs.trigger_type)} @ ${inputs.trigger_price}

${lastBlock}

➡️ Stop-Market emri **Last Price** ile tetiklendi ve o anki en iyi piyasa fiyatından gerçekleşti.
Bu durum, gerçekleşme fiyatının tetikleme seviyenizden farklı olmasına (Slipaj) neden oldu ve beklenenden daha yüksek bir zararla sonuçlandı.

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
        }
      }
    }
  }
};
