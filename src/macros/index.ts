// src/macros/index.js
import { stopMarketMarkNotReached } from "./stop_market_mark_not_reached";
import { stopMarketLossHigherThanExpectedMarkPrice } from "./stop_market_loss_higher_than_expected_mark_price";
import { stopMarketLossHigherThanExpectedLastPrice } from "./stop_market_loss_higher_than_expected_last_price";
import { takeProfitSlippageMarkPrice } from "./take_profit_slippage_mark_price";
import { takeProfitSlippageLastPrice } from "./take_profit_slippage_last_price";
import { stopLimitMarkPriceNotFilled } from "./stop_limit_mark_price";
import { stopLimitLastPriceNotFilled } from "./stop_limit_last_price";

import { fundingMacro } from "./funding_macro"; // normal import
import { generateMacro, applyTone } from "./helpers"; // Re-export generateMacro and import applyTone
export { generateMacro } from "./helpers";

export const MACROS = [
  stopMarketMarkNotReached,
  stopMarketLossHigherThanExpectedMarkPrice,
  stopMarketLossHigherThanExpectedLastPrice,
  takeProfitSlippageMarkPrice,
  takeProfitSlippageLastPrice,
  stopLimitMarkPriceNotFilled,
  stopLimitLastPriceNotFilled
] as any[];

// ✅ GÜNCELLENDİ: Artık 'm.translations' objesini okur
export const listMacros = (lang = 'en') =>
  MACROS.map((m) => {
    // 'translations' objesinden doğru dili (veya 'en' fallback) al
    const t = m.translations?.[lang] || m.translations?.['en'];

    return {
      id: m.id,
      title: t?.title || m.title || m.id, // Çevrilmiş başlığı al
      formConfig: t?.formConfig || [], // Çevrilmiş formu al
      price_required: m.price_required
    };
  });

// ✅ GÜNCELLENDİ: Artık 'm.translations' objesini okur
export function renderMacro(macroId, inputs, prices, mode = "detailed", lang = 'en', tone = 'standard') {
  let result = "";

  // Funding makrosu özel ele alınır
  if (macroId === "funding_macro") {
    const t = fundingMacro.translations[lang] || fundingMacro.translations['en'];
    const tpl = t.templates?.[mode];
    if (!tpl)
      throw new Error(`Template for mode "${mode}" not found in funding_macro`);
    result = tpl({ inputs, prices });
  } else {
    const m = MACROS.find((x) => x.id === macroId);
    if (!m) throw new Error("Macro not found");

    // 'translations' objesinden doğru şablonu al
    const t = m.translations?.[lang] || m.translations?.['en'];
    const tpl = t?.templates?.[mode];

    if (!tpl) throw new Error(`Template for mode "${mode}" not found in macro "${macroId}"`);
    result = tpl({ inputs, prices });
  }

  return applyTone(result, tone, lang);
}
