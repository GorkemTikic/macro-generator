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

/**
 * Convert a raw trigger-type token into the customer-facing label.
 * Binance UI conventions: "Mark Price" / "Last Price" (English kept in TR too,
 * matching the OHLC block style used by buildFullOHLCBlock).
 *   "MARK" / "mark" / " Mark "  → "Mark Price"
 *   "LAST" / "last"             → "Last Price"
 *   anything else (including empty) → returned unchanged so the agent sees
 *     whatever weird value reached the template instead of a silent default.
 */
export function prettyTriggerType(raw, _lang = 'en') {
  const t = upper(raw);
  if (t === 'MARK') return 'Mark Price';
  if (t === 'LAST') return 'Last Price';
  return raw == null ? '' : String(raw);
}

// Build user-friendly status line with timestamp
// Optional `lang` param falls back to English to preserve the original
// behaviour for templates that don't pass it.
export function statusLineFriendly(inputs, lang = 'en') {
  const st = upper(inputs.status);
  const t = inputs.final_status_utc || inputs.triggered_at_utc || "";

  if (lang === 'zh') {
    if (st === "CANCELED" || st === "CANCELLED") return `${t} UTC+0 = 这是订单**被取消**的时间。`;
    if (st === "EXECUTED") return `${t} UTC+0 = 这是您的订单**成交**的时间。`;
    if (st === "TRIGGERED") return `${t} UTC+0 = 这是订单**被触发**的时间。`;
    if (st === "OPEN") return `${t} UTC+0 = 当前状态:**OPEN**(订单仍然有效)。`;
    if (st === "EXPIRED") return `${t} UTC+0 = 这是订单**过期**的时间。`;
    return `${t} UTC+0 = 状态:**${st || "N/A"}**。`;
  }
  if (lang === 'tr') {
    if (st === "CANCELED" || st === "CANCELLED") return `${t} UTC+0 = Bu, emrin **iptal edildiği** tarih ve saattir.`;
    if (st === "EXECUTED") return `${t} UTC+0 = Bu, emrinizin **gerçekleştiği** tarih ve saattir.`;
    if (st === "TRIGGERED") return `${t} UTC+0 = Bu, emrin **tetiklendiği** tarih ve saattir.`;
    if (st === "OPEN") return `${t} UTC+0 = Mevcut durum: **OPEN** (emir hala aktif).`;
    if (st === "EXPIRED") return `${t} UTC+0 = Bu, emrin **süresinin dolduğu** tarih ve saattir.`;
    return `${t} UTC+0 = Durum: **${st || "N/A"}**.`;
  }

  if (st === "CANCELED" || st === "CANCELLED") {
    return `${t} UTC+0 = This is the date and time the order was **cancelled**.`;
  } else if (st === "EXECUTED") {
    return `${t} UTC+0 = This is the date and time your order **executed**.`;
  } else if (st === "TRIGGERED") {
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
  const mark = prices?.mark;
  const last = prices?.last;

  if (lang === 'zh') {
    return `> **Mark Price(1分钟 K 线):**
>   开盘: ${fmtNum(mark?.open, precision)}
>   最高: ${fmtNum(mark?.high, precision)}
>   最低: ${fmtNum(mark?.low, precision)}
>   收盘: ${fmtNum(mark?.close, precision)}

> **Last Price(1分钟 K 线):**
>   开盘: ${fmtNum(last?.open, precision)}
>   最高: ${fmtNum(last?.high, precision)}
>   最低: ${fmtNum(last?.low, precision)}
>   收盘: ${fmtNum(last?.close, precision)}`;
  }

  if (lang === 'tr') {
    return `> **Mark Price (1dk Mum):**
>   Açılış: ${fmtNum(mark?.open, precision)}
>   Yüksek: ${fmtNum(mark?.high, precision)}
>   Düşük:  ${fmtNum(mark?.low, precision)}
>   Kapanış: ${fmtNum(mark?.close, precision)}

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
  const last = prices?.last;

  if (lang === 'zh') {
    return `> **Last Price(1分钟 K 线):**
>   开盘: ${fmtNum(last?.open, precision)}
>   最高: ${fmtNum(last?.high, precision)}
>   最低: ${fmtNum(last?.low, precision)}
>   收盘: ${fmtNum(last?.close, precision)}`;
  }

  if (lang === 'tr') {
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

  let prefix = "";
  let suffix = "";

  switch (tone) {
    case 'professional':
      if (lang === 'zh') {
        prefix = "尊敬的用户,\n\n您反馈的情况已经核实。技术细节如下:\n";
        suffix = "\n\n此致,\n币安客服团队";
      } else if (lang === 'tr') {
        prefix = "Sayın Kullanıcımız,\n\nİlettiğiniz durum incelenmiştir. Teknik detaylar aşağıdadır:\n";
        suffix = "\n\nSaygılarımızla,\nBinance Destek Ekibi";
      } else {
        prefix = "Dear User,\n\nWe have reviewed your inquiry. Please find the technical details below:\n";
        suffix = "\n\nBest Regards,\nBinance Support Team";
      }
      break;

    case 'empathetic':
      if (lang === 'zh') {
        prefix = "您好,\n\n我能理解这种情况可能让您感到困惑。我已经为您仔细核实了相关数据。\n";
        suffix = "\n\n希望以上说明能让您安心。如有需要,我们随时为您提供帮助。🙏";
      } else if (lang === 'tr') {
        prefix = "Merhaba,\n\nYaşadığınız durumun kafa karıştırıcı olabileceğini anlıyorum. Sizin için kontrolleri sağladım.\n";
        suffix = "\n\nUmarım bu açıklama endişenizi gidermiştir. Her zaman yanınızdayız. 🙏";
      } else {
        prefix = "Hello,\n\nI understand this situation might be confusing. I have checked the details for you.\n";
        suffix = "\n\nI hope this explanation helps put your mind at ease. We are here for you. 🙏";
      }
      break;

    case 'direct':
      return text;

    default:
      return text;
  }

  return prefix + "\n" + text + suffix;
}
