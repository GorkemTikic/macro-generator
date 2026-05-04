// src/macros/funding_macro.js
import { fmtNum } from "./helpers";

function decideSides(fundingRateNum) {
  const rate = Number(fundingRateNum);
  if (!Number.isFinite(rate)) {
    return { payer: "N/A", receiver: "N/A" };
  }
  if (rate < 0) {
    return { payer: "Short", receiver: "Long" };
  } else {
    return { payer: "Long", receiver: "Short" };
  }
}

function formatFundingRatePct(fundingRateStr) {
  const rateNum = parseFloat(fundingRateStr);
  const rawPct = rateNum * 100;
  const truncated = Math.floor(rawPct * 1e6) / 1e6; // 6 decimal truncate
  return truncated.toFixed(6);
}

export const fundingMacro = {
  id: "funding_macro",
  price_required: "funding",

  translations: {
    en: {
      title: "Funding Rate · Fee Calculation",
      formConfig: null, // Form handled by FundingMacro.jsx
      templates: {
        detailed: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval, qty_dp } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer, receiver } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          const actionText = userIsPayer ? "had to pay funding fees to" : "received funding fees from";
          const counterparty = userIsPayer ? receiver : payer;
          const actionTextSmall = userIsPayer ? "pay it to" : "receive it from";

          const mathAction = userIsPayer ? "Payment" : "Income";

          return (
            `You can see the Funding Countdown and Current Funding Rate for each symbol/contract on the Futures Trading page.  

When that countdown is finished (every ${funding_interval || 8} hours for ${symbol}) if you have any open positions, you get affected by the funding fee payment.  

If the funding rate is **negative**, all open **Short** positions will pay funding fees to the **Long** position holders.  
If the funding rate is **positive**, all open **Long** positions will pay funding fees to the **Short** position holders.  

If we check the funding rate history:  
[Funding Fee History](https://www.binance.com/en/futures/funding-history/perpetual/funding-fee-history)  

We can see that on **${funding_time}**:  
- **${symbol} Funding Rate:** ${ratePctStr}%  
- **Mark Price:** ${mark} USDT  

So all **${payer}** positions which were open at funding time had to pay funding fees to **${receiver}** position holders, based on their position size.  

Your position was a **${funding_side}** position, so you ${actionText} **${counterparty}** position holders.  

**Your Position Size:** ${size} ${symbol}  

**Calculation:** 
- ${size} × ${mark} = ${fmtNum(notional, 8)} USDT → Notional size of the position  
- ${fmtNum(notional, 8)} × ${ratePctStr}% = ${fmtNum(Math.abs(fundingFee), 8)} USDT → Funding fee ${mathAction} from this position  

For further details, you may check the official guide:  
[Introduction to Binance Futures Funding Rates](https://www.binance.com/en/support/faq/introduction-to-binance-futures-funding-rates-360033525031)
[What Is Futures Funding Rate And Why It Matters](https://www.binance.com/en/blog/futures/what-is-futures-funding-rate-and-why-it-matters-421499824684903247)  

⚠️ *There is a 15-second deviation in the actual funding fee transaction time. For example, when you open a position at 08:00:05 UTC, the funding fee could still apply (you'll either pay or receive the funding fee).* Hope this clarifies your queries 🙏 If you have any further questions, don’t hesitate to share them with me.`
          );
        },
        summary: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval, qty_dp } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          const mathAction = userIsPayer ? "Payment" : "Income";

          return (
            `**Contract:** ${symbol}  
**Funding Time (UTC+0):** ${funding_time}  
**Funding Rate:** ${ratePctStr}%  
**Mark Price:** ${mark}  
**Funding Interval:** Every ${funding_interval || 8} hours  

**Position Size:** ${size} ${symbol}  
Notional: ${fmtNum(notional, 8)} USDT  
Your position: **${funding_side}** Funding Fee: ${fmtNum(Math.abs(fundingFee), 8)} USDT (${mathAction})`
          );
        }
      }
    },
    zh: {
      title: "资金费率 · 费用计算",
      formConfig: null,
      templates: {
        detailed: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer, receiver } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          const sideZh = (s: string) => s === 'Long' ? '多头' : s === 'Short' ? '空头' : s;
          const actionText = userIsPayer
            ? `需要向 ${sideZh(receiver)} 仓位持有者支付资金费`
            : `从 ${sideZh(payer)} 仓位持有者那里收取了资金费`;
          const mathAction = userIsPayer ? "支出" : "收入";

          return (
            `您可以在合约交易页面查看每个交易对/合约的资金费倒计时和当前资金费率。

当倒计时结束时(${symbol} 每 ${funding_interval || 8} 小时一次),如果您持有未平仓位,就会受到资金费结算的影响。

如果资金费率为**负**,所有持有**空头**仓位的用户将向**多头**仓位持有者支付资金费。
如果资金费率为**正**,所有持有**多头**仓位的用户将向**空头**仓位持有者支付资金费。

您可以在资金费率历史中确认:
[资金费率历史](https://www.binance.com/zh-CN/futures/funding-history/perpetual/funding-fee-history)

我们查到在 **${funding_time}**:
- **${symbol} 资金费率:** ${ratePctStr}%
- **Mark Price:** ${mark} USDT

因此,在资金费结算时间持仓的所有 **${sideZh(payer)}** 仓位,都需要按各自的仓位规模向 **${sideZh(receiver)}** 仓位持有者支付资金费。

您当时的仓位是 **${sideZh(funding_side)}** 仓位,因此您 ${actionText}。

**您的仓位大小:** ${size} ${symbol}

**计算:**
- ${size} × ${mark} = ${fmtNum(notional, 8)} USDT → 仓位的名义价值
- ${fmtNum(notional, 8)} × ${ratePctStr}% = ${fmtNum(Math.abs(fundingFee), 8)} USDT → 此仓位产生的资金费${mathAction}

如需进一步了解,可参考官方说明:
[币安合约资金费率介绍](https://www.binance.com/zh-CN/support/faq/introduction-to-binance-futures-funding-rates-360033525031)
[什么是合约资金费率,为什么它很重要](https://www.binance.com/zh-CN/blog/futures/what-is-futures-funding-rate-and-why-it-matters-421499824684903247)

⚠️ *实际的资金费结算时间存在 15 秒的浮动。例如,在 08:00:05 UTC 开仓时,资金费仍可能适用(您可能需要支付或收取资金费)。* 希望以上说明能解答您的疑问 🙏 如还有其他问题,请随时告诉我。`
          );
        },
        summary: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          const sideZh = (s: string) => s === 'Long' ? '多头' : s === 'Short' ? '空头' : s;
          const mathAction = userIsPayer ? "支出" : "收入";

          return (
            `**合约:** ${symbol}
**资金费时间 (UTC+0):** ${funding_time}
**资金费率:** ${ratePctStr}%
**Mark Price:** ${mark}
**资金费周期:** 每 ${funding_interval || 8} 小时一次

**仓位大小:** ${size} ${symbol}
名义价值: ${fmtNum(notional, 8)} USDT
您的仓位: **${sideZh(funding_side)}**  资金费: ${fmtNum(Math.abs(fundingFee), 8)} USDT (${mathAction})`
          );
        }
      }
    },
    tr: {
      title: "Funding Oranı · Ücret Hesaplaması",
      formConfig: null,
      templates: {
        detailed: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval, qty_dp } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer, receiver } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          // "sizden" = from you, "size" = to you. 
          // userIsPayer -> You paid to receiver.
          // else -> You received from payer.
          const actionText = userIsPayer
            ? `Funding ücretini ${receiver} pozisyonu taşıyanlara ödemek durumunda kaldınız`
            : `Funding ücretini ${payer} pozisyonu taşıyanlardan aldınız (gelir elde ettiniz)`;

          const mathAction = userIsPayer ? "Ödemesi" : "Geliri";

          return (
            `Vadeli İşlemler alım-satım sayfasında her bir sembol/sözleşme için Funding Geri Sayımını ve Güncel Funding Oranını görebilirsiniz.  

Bu geri sayım sona erdiğinde (${symbol} için her ${funding_interval || 8} saatte bir), açık pozisyonunuz varsa funding ücreti ödemesinden etkilenirsiniz.  

Eğer funding oranı **negatif** ise, tüm açık **Short (Kısa)** pozisyonlar, **Long (Uzun)** pozisyon sahiplerine funding ücreti öder.  
Eğer funding oranı **pozitif** ise, tüm açık **Long (Uzun)** pozisyonlar, **Short (Kısa)** pozisyon sahiplerine funding ücreti öder.  

Funding oranı geçmişini kontrol ettiğimde:  
[Funding Ücreti Geçmişi](https://www.binance.com/en/futures/funding-history/perpetual/funding-fee-history)  

**${funding_time}** tarihinde:  
- **${symbol} Funding Oranı:** ${ratePctStr}%  
- **Mark Price:** ${mark} USDT  

Bu durumda, funding zamanında açık olan tüm **${payer}** pozisyonları, pozisyon büyüklüklerine göre **${receiver}** pozisyon sahiplerine funding ücreti ödemek zorundaydı.  

Sizin pozisyonunuz bir **${funding_side}** pozisyonuydu, bu nedenle **${actionText}**.  

**Pozisyon Büyüklüğünüz:** ${size} ${symbol}  

**Hesaplama:**
- ${size} × ${mark} = ${fmtNum(notional, 8)} USDT → Pozisyonun Nosyonal (İtibari) Büyüklüğü  
- ${fmtNum(notional, 8)} × ${ratePctStr}% = ${fmtNum(Math.abs(fundingFee), 8)} USDT → Bu pozisyondan kaynaklanan Funding Ücreti ${mathAction}  

Daha fazla detay için resmi rehberlerimizi inceleyebilirsiniz:  
[Binance Vadeli İşlemler Funding Oranlarına Giriş](https://www.binance.com/en/support/faq/introduction-to-binance-futures-funding-rates-360033525031)
[Vadeli İşlemler Funding Oranı Nedir ve Neden Önemlidir?](https://www.binance.com/en/blog/futures/what-is-futures-funding-rate-and-why-it-matters-421499824684903247)  

⚠️ *Gerçek funding ücreti işlem saatinde 15 saniyelik bir sapma olabilir. Örneğin, 08:00:05 UTC'de bir pozisyon açtığınızda, funding ücreti yine de uygulanabilir (funding ücretini ya ödersiniz ya da alırsınız).* Umarım bu açıklama yardımcı olmuştur 🙏 Başka sorularınız olursa çekinmeden paylaşabilirsiniz.`
          );
        },
        summary: ({ inputs }) => {
          const { symbol, funding_time, funding_rate, mark_price, position_size, funding_side, funding_interval, qty_dp } = inputs;
          const rateNum = parseFloat(funding_rate);
          const ratePctStr = formatFundingRatePct(funding_rate);
          const mark = mark_price;
          const size = Number(position_size);
          const { payer } = decideSides(rateNum);
          const notional = Number.isFinite(size) && Number.isFinite(Number(mark)) ? size * Number(mark) : NaN;
          const fundingFee = Number.isFinite(notional) && Number.isFinite(rateNum) ? notional * rateNum : NaN;

          const userIsPayer = funding_side === payer;
          const mathAction = userIsPayer ? "Ödeme" : "Gelir";

          return (
            `**Sözleşme:** ${symbol}  
**Funding Zamanı (UTC+0):** ${funding_time}  
**Funding Oranı:** ${ratePctStr}%  
**Mark Price:** ${mark}  
**Funding Aralığı:** Her ${funding_interval || 8} saatte bir  

**Pozisyon Büyüklüğü:** ${size} ${symbol}  
Nosyonal Değer: ${fmtNum(notional, 8)} USDT  
Pozisyonunuz: **${funding_side}** Funding Ücreti: ${fmtNum(Math.abs(fundingFee), 8)} USDT (${mathAction})`
          );
        }
      }
    }
  }
};

