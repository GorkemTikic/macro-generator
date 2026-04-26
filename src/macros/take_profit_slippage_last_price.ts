// src/macros/take_profit_slippage_last_price.js
import { fmtNum, upper, buildLastPriceOHLCBlock } from "./helpers";

export const takeProfitSlippageLastPrice = {
  id: "tp_slippage_last_price",
  price_required: "last",

  translations: {
    en: {
      title: "Take Profit (TP) · Slippage / Unexpected Result (Trigger Last Price)",
      formConfig: [
        { name: "order_id", label: "Order ID", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Status", type: "select", options: ["EXECUTED"], defaultValue: "EXECUTED", locked: true, col: 6 },
        { name: "symbol", label: "Symbol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Side (of the TP order)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Placed At (UTC, YYYY-MM-DD HH:MM:SS)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Trigger Type", type: "text", defaultValue: "LAST", locked: true, col: 6 },
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
          const priceBlock = buildLastPriceOHLCBlock(prices, 'en', precision);
          if (inputs.scenario_modifier === "Take Profit resulted in less profit than expected") {
            return `All the dates and times below are UTC+0, so please adjust them to your own time-zone:

**Order ID:** ${inputs.order_id}
**Symbol:** ${inputs.symbol} (${upper(inputs.side)} TP Order)
${inputs.placed_at_utc} UTC+0 = You placed this Take Profit (Stop-Market) order.

**Trigger Condition:** ${inputs.trigger_type}
**Trigger Price:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = The **Last Price** reached your trigger price, and the Market order was triggered.

Market order executed at the price of: **${fmtNum(inputs.executed_price, precision)}**

We understand that you were expecting a higher profit but received less because the executed price was not as favorable as the trigger price.

This is an expected behavior for a **Stop-Market** order. Here is why:

**1) Order Type (Stop-Market):**
A Take Profit (TP) order is a type of Stop-Market order. It is a conditional market order.

**2) Market Execution:**
When the **Last Price** (which you selected as your trigger) reached **${fmtNum(inputs.trigger_price, precision)}**, the system immediately sent a **Market Order**.

**3) Slippage:**
Market orders guarantee execution time, not a specific price. Your order was filled at the *next best available price* in the market, which was **${fmtNum(inputs.executed_price, precision)}**.

This difference between the trigger price and the execution price is called *slippage* and is a normal part of trading in fast-moving markets.

The Last Price details for that minute were:

${priceBlock}

As you can see, the price may have moved instantly within that minute, causing your order to fill at a slightly different price than your trigger.

For more information, you may check:
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

${inputs.triggered_at_utc} UTC+0 = The **Last Price** reached your trigger price, and the Market order was triggered.

Market order executed at the price of: **${fmtNum(inputs.executed_price, precision)}**

We understand it is frustrating to see a Take Profit order close with a loss. This can happen during a "flash crash" or a moment of extreme market volatility when using a Stop-Market order.

Here is the sequence of events:

**1) Order Type (Stop-Market):**
Your order was a **Stop-Market** order, set to trigger when the **Last Price** reached **${fmtNum(inputs.trigger_price, precision)}**.

**2) Market Execution:**
At ${inputs.triggered_at_utc} UTC+0, the Last Price hit this level, and the system sent a **Market Order** as instructed.

**3) Volatility & Slippage:**
A Market Order executes immediately at the *best available price*. Due to extreme volatility, the market moved so fast that the *next* best available price to fill your order was **${fmtNum(inputs.executed_price, precision)}**, which was unfortunately at a loss.

The Last Price details for that minute show the high volatility:

${priceBlock}

Because your order was a **Market Order**, it had to be filled instantly at the available market price. Unlike a Limit order, it does not guarantee a price, which in this volatile moment resulted in a loss.

For more information, you may check:
[What Are Stop Orders in Binance Futures?](https://www.binance.com/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`;
          }
        },
        summary: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildLastPriceOHLCBlock(prices, 'en', precision);
          return `**Order ID:** ${inputs.order_id}  
**Trigger:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}  
**Executed:** ${fmtNum(inputs.executed_price, precision)}  
**Scenario:** ${inputs.scenario_modifier}  

${priceBlock}

➡️ Your TP order was triggered by **Last Price**. The difference between your trigger and execution is due to standard market order slippage.`;
        }
      }
    },
    tr: {
      title: "Take Profit (TP) · Slipaj / Beklenmeyen Sonuç (Tetikleme Last Price)",
      formConfig: [
        { name: "order_id", label: "Emir Numarası", type: "text", placeholder: "8389...", col: 6 },
        { name: "status", label: "Durum", type: "select", options: ["EXECUTED"], defaultValue: "EXECUTED", locked: true, col: 6 },
        { name: "symbol", label: "Sembol", type: "text", placeholder: "ETHUSDT", defaultValue: "ETHUSDT", col: 6 },
        { name: "side", label: "Taraf (TP Emri)", type: "select", options: ["SELL", "BUY"], defaultValue: "SELL", col: 6 },
        { name: "placed_at_utc", label: "Verilme Zamanı (UTC)", type: "text", placeholder: "2025-09-11 06:53:08", col: 6 },
        { name: "trigger_type", label: "Tetikleme Tipi", type: "text", defaultValue: "LAST", locked: true, col: 6 },
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
          const priceBlock = buildLastPriceOHLCBlock(prices, 'tr', precision);
          if (inputs.scenario_modifier === "Take Profit beklenenden az kâr getirdi") {
            return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
**Sembol:** ${inputs.symbol} (${upper(inputs.side)} TP Emri)
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Take Profit (Stop-Market) emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, **Last Price**, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.

Piyasa emri de şu fiyattan gerçekleşmiştir: **${fmtNum(inputs.executed_price, precision)}**

Beklediğinizden daha yüksek bir kâr beklerken, gerçekleşme fiyatının tetikleme fiyatı kadar avantajlı olmaması nedeniyle daha az kâr elde ettiğinizi anlıyorum.

Bu, bir **Stop-Market** emri için beklenen bir davranıştır. Nedeni şudur:

**1) Emir Tipi (Stop-Market):**
Bir Take Profit (TP) emri, bir tür Stop-Market emridir. Koşullu bir piyasa emridir.

**2) Piyasa Gerçekleşmesi:**
**Last Price** (tetikleyici olarak seçtiğiniz) **${fmtNum(inputs.trigger_price, precision)}** seviyesine ulaştığında, sistem hemen bir **Piyasa Emri** gönderdi.

**3) Slipaj (Slippage):**
Piyasa emirleri gerçekleşme zamanını garanti eder, ancak belirli bir fiyatı garanti etmez. Emriniz, piyasadaki *bir sonraki en iyi mevcut fiyattan* doldu, ki bu **${fmtNum(inputs.executed_price, precision)}** idi.

Tetikleme fiyatı ile gerçekleşme fiyatı arasındaki bu farka *Slipaj* denir ve hızlı hareket eden piyasalarda alım satım yapmanın normal bir parçasıdır.

O dakikaya ait Last Price detayları:

${priceBlock}

Gördüğünüz gibi, fiyat o dakika içinde anlık olarak hareket etmiş olabilir, bu da emrinizin tetikleme fiyatınızdan biraz farklı bir fiyattan dolmasına neden olmuştur.

Daha fazla bilgi için:
[What Are Stop Orders in Binance Futures?](https://www.binance.com/en/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
          } else {
            // "Take Profit emri zararla kapandı"
            return `Paylaşacağım tüm tarih ve saatler UTC+0 formatındadır, lütfen kendi saat diliminize göre düzenlemeyi unutmayın:

**Emir Numarası:** ${inputs.order_id}
**Sembol:** ${inputs.symbol} (${upper(inputs.side)} TP Emri)
${inputs.placed_at_utc} UTC+0 = Tarih ve saatinde bu Take Profit (Stop-Market) emrini vermişsiniz.

**Tetikleme Koşulu:** ${inputs.trigger_type}
**Tetikleme Fiyatı:** ${fmtNum(inputs.trigger_price, precision)}

${inputs.triggered_at_utc} UTC+0 = Tarih ve saatinde, **Last Price**, tetikleme fiyatınıza ulaşmış ve Piyasa emirini tetiklemiştir.

Piyasa emri de şu fiyattan gerçekleşmiştir: **${fmtNum(inputs.executed_price, precision)}**

Bir Kâr Al (Take Profit) emrinin zararla kapanmasının sinir bozucu olduğunu anlıyorum. Bu, bir Stop-Market emri kullanırken "ani düşüş" veya aşırı piyasa oynaklığı anlarında meydana gelebilir.

Olayların sırası şöyledir:

**1) Emir Tipi (Stop-Market):**
Emriniz, **Last Price** **${fmtNum(inputs.trigger_price, precision)}** seviyesine ulaştığında tetiklenecek bir **Stop-Market** emriydi.

**2) Piyasa Gerçekleşmesi:**
${inputs.triggered_at_utc} UTC+0 tarihinde, Last Price bu seviyeye ulaştı ve sistem talimat verildiği gibi bir **Piyasa Emri** gönderdi.

**3) Oynaklık ve Slipaj:**
Bir Piyasa Emri, *mevcut en iyi fiyattan* anında gerçekleşir. Aşırı oynaklık nedeniyle, piyasa o kadar hızlı hareket etti ki, emrinizi doldurmak için *bir sonraki* en iyi mevcut fiyat **${fmtNum(inputs.executed_price, precision)}** idi, ki bu maalesef zararına bir işlemdi.

O dakikadaki Last Price detayları yüksek oynaklığı göstermektedir:

${priceBlock}

Emriniz bir **Piyasa Emri** olduğu için, mevcut piyasa fiyatından anında doldurulmak zorundaydı. Bir Limit emrinin aksine, bir fiyatı garanti etmez, bu da bu oynak anda bir kayıpla sonuçlanmıştır.

Daha fazla bilgi için:
[What Are Stop Orders in Binance Futures?](https://www.binance.com/en/blog/futures/what-are-stop-orders-in-binance-futures-2094497753519691034)

Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`;
          }
        },
        summary: ({ inputs, prices }) => {
          const precision = prices?.precision ?? 8;
          const priceBlock = buildLastPriceOHLCBlock(prices, 'tr', precision);
          const scenario_tr = inputs.scenario_modifier === "Take Profit resulted in less profit than expected"
            ? "Beklenenden az kâr"
            : "Zararla kapandı";
          return `**Emir Numarası:** ${inputs.order_id}  
**Tetikleme:** ${inputs.trigger_type} @ ${fmtNum(inputs.trigger_price, precision)}  
**Gerçekleşme:** ${fmtNum(inputs.executed_price, precision)}  
**Senaryo:** ${scenario_tr}  

${priceBlock}

➡️ TP emriniz **Last Price** ile tetiklendi. Tetikleme ve gerçekleşme arasındaki fark, standart piyasa emri slipajından kaynaklanmaktadır.`;
        }
      }
    }
  }
};
