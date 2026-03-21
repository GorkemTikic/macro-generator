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

