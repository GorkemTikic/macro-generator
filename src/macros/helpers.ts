// src/macros/helpers.js

/**
 * Format number safely with fixed digits.
 * If precision is provided, use it. Otherwise default to 8.
 */
export function fmtNum(v, digits = 8) {
  if (v === null || v === undefined || Number.isNaN(v)) return "N/A";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  return n.toFixed(digits);
}

// Convert string to uppercase safely
export function upper(s) {
  return (s || "").toString().trim().toUpperCase();
}

// Build user-friendly status line with timestamp
export function statusLineFriendly(inputs) {
  const st = upper(inputs.status);

  // 'final_status_utc' (Stop-Limit, Not-Reached) önceliklidir.
  // Yoksa, 'triggered_at_utc' (SL/TP Slippage) kullanılır.
  const t = inputs.final_status_utc || inputs.triggered_at_utc || "";

  if (st === "CANCELED" || st === "CANCELLED") {
    return `${t} UTC+0 = This is the date and time the order was **cancelled**.`;
  } else if (st === "EXECUTED") {
    return `${t} UTC+0 = This is the date and time your order **executed**.`;
  } else if (st === "TRIGGERED") {
    // Bu 'Stop-Limit' için 'Triggered At' ile çakışmayacak,
    // çünkü 'Stop-Limit' 'final_status_utc' kullanır.
    return `${t} UTC+0 = This is the date and time the order was **triggered**.`;
  } else if (st === "OPEN") {
    return `${t} UTC+0 = Current status: **OPEN** (order still active).`;
  } else if (st === "EXPIRED") {
    return `${t} UTC+0 = This is the date and time the order **expired**.`;
  }

  return `${t} UTC+0 = Status: **${st || "N/A"}**.`;
}

/**
 * Truncate a raw numeric string to given pricePrecision WITHOUT rounding.
 */
export function truncateToPrecision(raw, prec) {
  if (raw === null || raw === undefined) return "N/A";
  const s = String(raw);
  const [intPart, decPart = ""] = s.split(".");
  if (prec <= 0) return intPart;
  const sliced = decPart.slice(0, prec);
  return sliced ? `${intPart}.${sliced}` : intPart;
}

/**
 * Centralized way to build OHLC block for Mark and Last prices.
 */
export function buildFullOHLCBlock(prices, lang = 'en', precision = 8) {
  const isTr = lang === 'tr';
  const mark = prices?.mark;
  const last = prices?.last;

  if (isTr) {
    return `> **Mark Price (1dk Mum):**
>   Açılış: ${fmtNum(mark?.open, precision)}
>   Yüksek: ${fmtNum(mark?.high, precision)}
>   Düşük:  ${fmtNum(mark?.low, precision)}
>   Kapanış: ${fmtNum(mark?.close, precision)}
> 
> **Last Price (1dk Mum):**
>   Açılış: ${fmtNum(last?.open, precision)}
>   Yüksek: ${fmtNum(last?.high, precision)}
>   Düşük:  ${fmtNum(last?.low, precision)}
>   Kapanış: ${fmtNum(last?.close, precision)}`;
  }

  return `> **Mark Price (1m Candle):**
>   Open: ${fmtNum(mark?.open, precision)}
>   High: ${fmtNum(mark?.high, precision)}
>   Low:  ${fmtNum(mark?.low, precision)}
>   Close: ${fmtNum(mark?.close, precision)}
> 
> **Last Price (1m Candle):**
>   Open: ${fmtNum(last?.open, precision)}
>   High: ${fmtNum(last?.high, precision)}
>   Low:  ${fmtNum(last?.low, precision)}
>   Close: ${fmtNum(last?.close, precision)}`;
}

/**
 * Centralized way to build OHLC block ONLY for Last price.
 */
export function buildLastPriceOHLCBlock(prices, lang = 'en', precision = 8) {
  const isTr = lang === 'tr';
  const last = prices?.last;

  if (isTr) {
    return `> **Last Price (1dk Mum):**
>   Açılış: ${fmtNum(last?.open, precision)}
>   Yüksek: ${fmtNum(last?.high, precision)}
>   Düşük:  ${fmtNum(last?.low, precision)}
>   Kapanış: ${fmtNum(last?.close, precision)}`;
  }

  return `> **Last Price (1m Candle):**
>   Open: ${fmtNum(last?.open, precision)}
>   High: ${fmtNum(last?.high, precision)}
>   Low:  ${fmtNum(last?.low, precision)}
>   Close: ${fmtNum(last?.close, precision)}`;
}

/**
 * Generates a mock macro string based on inputs.
 */
export async function generateMacro(params: any) {
  const { symbol, orderId, orderType, orderSide, triggerCondition, triggerPrice, executedPrice, status, placedAt, triggeredAt, executedAt, canceledAt, modifiers } = params;

  const lines = [];
  lines.push(`**Macro Generated for ${symbol}**`);
  lines.push(`Order ID: ${orderId || "N/A"}`);
  lines.push(`Type: ${orderType} | Side: ${orderSide}`);
  lines.push(`Status: ${status}`);

  if (status === "Triggered" || status === "Executed") {
    lines.push(`Trigger: ${triggerCondition} @ ${triggerPrice}`);
    lines.push(`Triggered At: ${triggeredAt}`);
  }

  if (status === "Executed") {
    lines.push(`Executed Price: ${executedPrice}`);
    lines.push(`Executed At: ${executedAt}`);
  }

  lines.push(`Placed At: ${placedAt}`);
  if (status === "Canceled") lines.push(`Canceled At: ${canceledAt}`);

  lines.push("");
  lines.push("**Scenario Modifiers:**");
  if (modifiers.higherLoss) lines.push("- Higher Loss Than Expected");
  if (modifiers.lessProfit) lines.push("- Take Profit With Less Profit");
  if (modifiers.endedLoss) lines.push("- Take Profit Ended With Loss");
  if (modifiers.slippage) lines.push("- Triggered Late (Slippage)");

  return lines.join("\n");
}

export function applyTone(text, tone, lang = 'en') {
  if (!tone || tone === 'standard') return text;

  const isTr = lang === 'tr';
  let prefix = "";
  let suffix = "";

  switch (tone) {
    case 'professional':
      prefix = isTr
        ? "Sayın Kullanıcımız,\n\nİlettiğiniz durum incelenmiştir. Teknik detaylar aşağıdadır:\n"
        : "Dear User,\n\nWe have reviewed your inquiry. Please find the technical details below:\n";
      suffix = isTr
        ? "\n\nSaygılarımızla,\nBinance Destek Ekibi"
        : "\n\nBest Regards,\nBinance Support Team";
      break;

    case 'empathetic':
      prefix = isTr
        ? "Merhaba,\n\nYaşadığınız durumun kafa karıştırıcı olabileceğini anlıyorum. Sizin için kontrolleri sağladım.\n"
        : "Hello,\n\nI understand this situation might be confusing. I have checked the details for you.\n";
      suffix = isTr
        ? "\n\nUmarım bu açıklama endişenizi gidermiştir. Her zaman yanınızdayız. 🙏"
        : "\n\nI hope this explanation helps put your mind at ease. We are here for you. 🙏";
      break;

    case 'direct':
      return text;

    default:
      return text;
  }

  return prefix + "\n" + text + suffix;
}
