// src/macros/take_profit_slippage_mark_price.js
import { fmtNum, upper, buildFullOHLCBlock } from "./helpers";

export const takeProfitSlippageMarkPrice = {
  id: "tp_slippage_mark_price",
  price_required: "both",

  translations: {
    en: {
      title: "Take Profit (TP) · Slippage / Unexpected Result (Trigger Mark Price)",
      formConfig: [
        { name: "order_id", label: "Order ID", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Status", type: "select", options: ["EXECUTED"], defaultValue: "EXECUTED", locked: true, col: 6 },
        { name: "symbol", label: "Symbol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Side (of the TP order)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Placed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Trigger Type", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Trigger Price", type: "text", placeholder: "e.g. 4393.00", col: 6 },
        { name: "executed_price", label: "Executed Price", type: "text", placeholder: "e.g. 4392.50", col: 6 },
        { name: "triggered_at_utc", label: "Executed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 },
        {
          name: "scenario_modifier", label: "Scenario (User Complaint)", type: "select",
          options: [
            "Take Profit resulted in less profit than expected",
            "Take Profit order closed with a loss"
          ],
          defaultValue: "Take Profit resulted in less profit than expected",
          col: 12
        }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildFullOHLCBlock(prices, 'en', precision);
          if (inputs.scenario_modifier === "Take Profit resulted in less profit than expected") {
            return `All the dates and times below are UTC+0, so please adjust them to your own time-zone:

**Order ID:** ${inputs.order_id}
**Symbol:** ${inputs.symbol} (${upper(inputs.side)} TP Order)
${inputs.placed_at_utc} UTC+0 = You placed this Take Profit (Stop-Market) order.

**Trigger Condition:** ${inputs.trigger_type}
**Trigger Price:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = The **Mark Price** reached your trigger price, and the Market order was triggered.

Market order executed at the price of: **${fmtNum(inputs.executed_price, precision)}**

We understand that you were expecting a higher profit but received less because the executed price was not as favorable as the trigger price.

This is an expected behavior due to two main factors:

**1) Order Type (Stop-Market):**
A Take Profit Stop-Market order triggers a market order when its set price is reached. While market orders ensure immediate execution, they do not guarantee a specific price. The difference between the trigger and execution price is known as slippage.

**2) Trigger Condition (Mark Price):**
Your order was set to trigger from the **Mark Price**. However, all orders execute at the **Last Price** (the actual market trade price).

During that minute, the prices were:

${priceBlock}

This shows that when the **Mark Price** reached your trigger of **${fmtNum(inputs.trigger_price, precision)}**, the system sent a market order. This order was then filled at the best available **Last Price**, which was **${fmtNum(inputs.executed_price, precision)}**.

This difference between the Mark Price (your trigger) and the Last Price (the execution) is the source of the slippage you experienced. This is one of the reasons, and slippage in the Last Price also affects it, so both the Mark Price and Last Price difference and Last Price slippage will affect the order.

For more information, you may check:
[What Is the Difference Between a Futures Contract’s Last Price and Mark Price?](https://www.binance.com/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)
[What Are Stop Orders in Binance Futures?](https://www.binance.com/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
          } else {
            // "Take Profit order closed with a loss"
            return `All the dates and times below are UTC+0, so please adjust them to your own time-zone:

**Order ID:** ${inputs.order_id}
**Symbol:** ${inputs.symbol} (${upper(inputs.side)} TP Order)
${inputs.placed_at_utc} UTC+0 = You placed this Take Profit (Stop-Market) order.

**Trigger Condition:** ${inputs.trigger_type}
**Trigger Price:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = The **Mark Price** reached your trigger price, and the Market order was triggered.

Market order executed at the price of: **${fmtNum(inputs.executed_price, precision)}**

We understand it is frustrating to see a Take Profit order close with a loss. This is a rare scenario that can occur during extreme market volatility, specifically when the **Mark Price** and **Last Price** diverge significantly, combined with market slippage.

Here is the sequence of events:

**1) Trigger Condition (Mark Price):**
Your order was a **Stop-Market** order, set to trigger when the **Mark Price** reached **${fmtNum(inputs.trigger_price, precision)}**.

**2) Market Order Execution:**
At ${inputs.triggered_at_utc} UTC+0, the Mark Price hit this level, and the system sent a Market Order. This Market Order executes at the best available **Last Price**.

**3) Volatility & Slippage:**
During this volatile minute, the Last Price was trading significantly lower/higher than the Mark Price, and the market order's execution (slippage) resulted in a fill at **${fmtNum(inputs.executed_price, precision)}**, which was unfortunately at a loss.

The prices during that minute show this divergence:

${priceBlock}

This outcome is a result of two combined factors: the difference between Mark Price (trigger) and Last Price (execution base) *and* the additional slippage from the Market Order executing in a volatile market.

For more information, you may check:
[What Is the Difference Between a Futures Contract’s Last Price and Mark Price?](https://www.binance.com/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
          }
        },
        summary: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildFullOHLCBlock(prices, 'en', precision);
          return `**Order ID:** ${inputs.order_id}  
**Trigger:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}  
**Executed:** ${fmtNum(inputs.executed_price, precision)}  
**Scenario:** ${inputs.scenario_modifier}  

${priceBlock}

➡️ Your TP order was triggered by **Mark Price** but executed at **Last Price**. The difference between these prices, combined with market order slippage, caused the unexpected result.`;
        }
      }
    },
    tr: {
      title: "Take Profit (TP) · Slipaj / Beklenmeyen Sonuç (Tetikleme Mark Price)",
      formConfig: [
        { name: "order_id", label: "Emir Numarası", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Durum", type: "select", options: ["EXECUTED"], defaultValue: "EXECUTED", locked: true, col: 6 },
        { name: "symbol", label: "Sembol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Taraf (TP Emri)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Verilme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Tetikleme Tipi", type: "text", defaultValue: "MARK", locked: true, col: 6 },
        { name: "trigger_price", label: "Tetikleme Fiyatı", type: "text", placeholder: "örn. 4393.00", col: 6 },
        { name: "executed_price", label: "Gerçekleşme Fiyatı", type: "text", placeholder: "örn. 4392.50", col: 6 },
        { name: "triggered_at_utc", label: "Gerçekleşme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 12:30:18", col: 12 },
        {
          name: "scenario_modifier", label: "Senaryo (Kullanıcı Şikayeti)", type: "select",
          options: [
            "Take Profit beklenenden az kâr getirdi",
            "Take Profit emri zararla kapandı"
          ],
          defaultValue: "Take Profit beklenenden az kâr getirdi",
          col: 12
        }
      ],
      templates: {
        detailed: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildFullOHLCBlock(prices, 'tr', precision);
          if (inputs.scenario_modifier === "Take Profit beklenenden az kâr getirdi") {
            return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
**Sembol:** ${inputs.symbol} (${upper(inputs.side)} TP Emri)
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Take Profit (Stop-Market) emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, **Mark Price**, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.

Piyasa emri de şu fiyattan gerçekleşmiştir: **${fmtNum(inputs.executed_price, precision)}**

Beklediğinizden daha yüksek bir kâr beklerken, gerçekleşme fiyatının tetikleme fiyatı kadar avantajlı olmaması nedeniyle daha az kâr elde ettiğinizi anlıyorum.

Bu durumun iki ana nedeni vardır:

**1) Emir Tipi (Stop-Market):**
Bir Take Profit (TP) emri, bir tür Stop-Market emridir. Belirlenen fiyata ulaşıldığında bir **Piyasa Emri** verir. Piyasa emirleri anında gerçekleşmeyi garanti eder ancak belirli bir fiyatı garanti etmez. Tetikleme ve gerçekleşme fiyatı arasındaki bu farka *Slipaj* denir.

**2) Tetikleme Koşulu (Mark Price):**
Emriniz **Mark Price** ile tetiklenecek şekilde ayarlanmıştı. Ancak, tüm piyasa emirleri **Last Price** (gerçek piyasa işlem fiyatı) üzerinden gerçekleşir.

O dakika içinde fiyatlar şöyleydi:

${priceBlock}

Bu, **Mark Price** tetikleme fiyatınız olan **${fmtNum(inputs.trigger_price, precision)}** seviyesine ulaştığında, sistemin bir piyasa emri gönderdiğini gösterir. Bu emir, o an mevcut olan en iyi **Last Price** olan **${fmtNum(inputs.executed_price, precision)}** seviyesinden dolmuştur.

Mark Price (tetikleyiciniz) ve Last Price (gerçekleşme) arasındaki bu fark, yaşadığınız slipajın kaynağıdır. Nedenlerden biri budur ve Last Price'taki slipaj da bunu etkiler, yani hem Mark Price ile Last Price farkı hem de Last Price slipajı emri etkileyecektir.

Daha fazla bilgi için:
[Binance Futures'ta Mark Price ve Last Price Arasındaki Fark Nedir?](https://www.binance.com/en/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)
[Binance Futures'ta Stop Emirler Nedir?](https://www.binance.com/en/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
          } else {
            // "Take Profit emri zararla kapandı"
            return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
**Sembol:** ${inputs.symbol} (${upper(inputs.side)} TP Emri)
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Take Profit (Stop-Market) emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, **Mark Price**, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.

Piyasa emri de şu fiyattan gerçekleşmiştir: **${fmtNum(inputs.executed_price, precision)}**

Bir Kâr Al (Take Profit) emrinin zararla kapanmasının sinir bozucu olduğunu anlıyorum. Bu, özellikle **Mark Price** ile **Last Price** arasında önemli bir fark olduğunda, aşırı piyasa oynaklığı sırasında meydana gelebilecek nadir bir durumdur.

Olayların sırası şöyledir:

**1) Tetikleme Koşulu (Mark Price):**
Stop-Market tipindeki Take Profit emriniz, **Mark Price** **${fmtNum(inputs.trigger_price, precision)}** seviyesine ulaştığında tetiklenecek şekilde ayarlanmıştı.

**2) Piyasa Emri Gerçekleşmesi:**
${inputs.triggered_at_utc} UTC+0 tarihinde, Mark Price bu seviyeye ulaştı ve sistem talimat verildiği gibi bir Piyasa Emri gönderdi. Bu Piyasa Emri, mevcut en iyi **Last Price** üzerinden gerçekleşir.

**3) Oynaklık ve Slipaj:**
Bu oynak dakika sırasında, Last Price, Mark Price'dan önemli ölçüde daha düşük/yüksek işlem görüyordu ve piyasa emrinin gerçekleşmesi (Slipaj) **${fmtNum(inputs.executed_price, precision)}** seviyesinden bir dolumla sonuçlandı, ki bu maalesef zararına bir işlemdi.

O dakikadaki fiyatlar bu farkı göstermektedir:

${priceBlock}

Bu sonuç, iki faktörün birleşiminden kaynaklanmaktadır: Mark Price (tetikleme) ile Last Price (gerçekleşme bazı) arasındaki fark *ve* oynak bir piyasada gerçekleşen Piyasa Emrinden kaynaklanan ek Slipaj.

Daha fazla bilgi için:
[Binance Futures'ta Mark Price ve Last Price Arasındaki Fark Nedir?](https://www.binance.com/en/blog/futures/what-is-the-difference-between-a-futures-contracts-last-price-and-mark-price-5704082076024731087)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
          }
        },
        summary: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildFullOHLCBlock(prices, 'tr', precision);
          const scenario_tr = inputs.scenario_modifier === "Take Profit resulted in less profit than expected"
            ? "Beklenenden az kâr"
            : "Zararla kapandı";
          return `**Emir Numarası:** ${inputs.order_id}  
**Tetikleme:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}  
**Gerçekleşme:** ${fmtNum(inputs.executed_price, precision)}  
**Senaryo:** ${scenario_tr}  

${priceBlock}

➡️ TP emriniz **Mark Price** ile tetiklendi ancak **Last Price** ile gerçekleşti. Bu fiyatlar arasındaki fark ve piyasa slipajı, beklenmeyen sonuca neden oldu.`;
        }
      }
    }
  }
};
