export const uiStrings = {
  en: {
    badge: "Binance 1m OHLC",
    tabMacro: "Macro Generator",
    tabLookup: "Price Lookup",
    tabFunding: "Funding Macro",
    macroLabel: "Macro",
    modeLabel: "Output Mode",
    modeDetailed: "Detailed / Professional",
    modeSummary: "Summary / Simplified",
    generate: "Generate",
    generating: "Generating...",
    copy: "Copy",
    copied: "Copied! (Markdown-ready for chat)",
    error: "Error:",
    errorTip: "Tip: If you see 451 or CORS errors, set a corporate CORS proxy in src/pricing.js (PROXY constant).",
    resultLabel: "Result",
    // Price Lookup
    lookupTitle: "Price Lookup Tool",
    lookupSymbol: "Symbol",
    lookupMode: "Mode",
    lookupModeTrigger: "Trigger Minute (Mark+Last)",
    lookupModeRange: "Range (High/Low)",
    lookupModeLast1s: "Last Price 1s (max 7d)",
    lookupModeTrailing: "Trailing Stop Simulation",
    lookupAt: "At (UTC)",
    lookupFrom: "From (UTC)",
    lookupTo: "To (UTC)",
    lookupDateTime: "DateTime (UTC)",
    lookupButton: "Lookup",
    // Funding
    fundingTitle: "Funding Macro",
    fundingSymbol: "Symbol",
    fundingTime: "Funding Time (UTC)",
    fundingSide: "Position Side",
    fundingPosSize: "Position Size",
    fundingInterval: "Funding Interval (hours)",
    fundingButton: "✨ Generate Funding Macro",
    fundingLoading: "Loading...",
    fundingApply: "Apply Precision",
    // Modal
    pasteModalTitle: "Paste Order Grid Data",
    pasteModalButton: "✨ Parse & Auto-fill",
    // ✅ GÜNCELLENDİ (Yardımcı Metin)
    pasteModalHelper: "Paste 26 or 27 lines of *values only* (detects if 'Liquidation' is empty).",
    pasteButtonLabel: "📋 Paste Grid Data",
    pasteGridTitle: "Title (Fixed)",
    pasteGridValue: "Value (Pasted)",
    pasteGridPreview: "Data Mapping Preview",
    // Detailed Lookup Messages
    lookupNotFound: "Data not found.",
    lookupPriceNotReached: "The target price of {price} was NOT reached within this period.",
    lookupFoundTitle: "🎯 SUCCESS: TARGET REACHED",
    lookupNotFoundTitle: "❌ NOT REACHED",
    lookupNoTradeData: "No trade data found for that second (Last Price).",
    // Trailing Stop Results
    trailingActivation: "Activation Price",
    trailingCallback: "Callback Rate (%)",
    trailingLong: "Long (Buy Trigger)",
    trailingShort: "Short (Sell Trigger)",
    trailingTriggeredTitle: "🎯 TRAILING STOP TRIGGERED",
    trailingNotTriggeredTitle: "❌ NOT TRIGGERED",
    trailingResultActivated: "🌟 Step 1: Activation",
    trailingResultPeakLabel: "📈 Step 2: Peak (Highest)",
    trailingResultTroughLabel: "📉 Step 2: Bottom (Lowest)",
    trailingResultPeak: "Step 2: Tracking",
    trailingResultTrigger: "🚀 Step 3: Trigger Status",
    trailingResultNotActivated: "❌ NOT ACTIVATED",
    trailingStep1Desc: "The order is now ACTIVE and the system is tracking price movements.",
    trailingStep2Desc: "This is your **Reference Point**. The system measures the callback percentage from this price. If the market moves further in your favor, this point updates to follow it.",
    trailingStep3Desc: "The price moved away from the target point by your chosen rate.",
    trailingRebound: "Rebound (Bounce Up)",
    trailingPullback: "Pullback (Drop Down)",
    trailingStepNoTriggerDesc: "Active: Price hasn't pulled back enough from the peak to trigger yet.",
    trailingWaitDesc: "Waiting for price to reach the activation level.",
    trailingReboundFormula: "Technical Breakdown",
    trailingMaxDevLabel: "Current Pullback",
    trailingCalcFormula: "Calculation",
    trailingConditionMet: "Met",
    trailingConditionNotMet: "Not Met",
    trailingMarkPrecisionWarning: "Mark Price history has a 1-minute resolution. The sequence of events within a single minute (High vs Low) cannot be definitively determined from historical data.",
    trailingEstimatedNotice: "💡 **Note on Timing**: This event happened within a single 1-minute window. Since Mark Price history is recorded per minute, the exact second of activation vs trigger is an estimation based on the minute's price range.",
    trailingPresentBtn: "Present Time",
    trailingPresentNote: "Sets to 1 minute ago (UTC+0)",
    trailingNextTriggerTip: "Next Trigger Level",
    trailingAgentSummary: "💡 Summary for Customer",
    trailingAgentInternalTitle: "🛠 Internal Note for Agent",
    trailingAgentInternalDescLong: "In a LONG (Buy) Trailing Stop, we track the lowest point (Trough). The trigger occurs when the price rebounds UP from that trough by the callback rate.",
    trailingAgentInternalDescShort: "In a SHORT (Sell) Trailing Stop, we track the highest point (Peak). The trigger occurs when the price drops DOWN from that peak by the callback rate.",
    // Average Calculator
    tabAverage: "Position History Open & Close Price Calc.",
    avgInputTitle: "TRADE HISTORY INPUT",
    avgInputSub: "DATA INGESTION",
    avgClearBtn: "CLEAR DATA",
    avgPlaceholder: "Paste Binance Futures Trade History data here...\nExtraneous table text will be automatically ignored.",
    avgCalcBtn: "CALCULATE",
    avgResultsTitle: "CALCULATION RESULTS",
    avgResultsSubLong: "POSITION ANALYTICS - LONG MODE",
    avgResultsSubShort: "POSITION ANALYTICS - SHORT MODE",
    avgAwaiting: "Awaiting valid trade history...",
    avgErrorNoTrades: "No valid trades found. Verify Input.",
    avgSysReady: "SYSTEM_READY",
    avgExtracted: "TRADES EXTRACTED",
    avgBadgeHedgeLong: "HEDGE LONG",
    avgBadgeHedgeShort: "HEDGE SHORT",
    avgEntry: "Avg Entry Price (Net:",
    avgClose: "Avg Close Price (Net:",
    avgCopyBtn: "Copy Full Explanation",
    avgCopiedToast: "COPIED SUCCESSFULLY",
    avgMergedFills: "Merged {n} fills",
    avgFormulaEntryTitle: "Full Average ENTRY Calculation",
    avgFormulaCloseTitle: "Full Average CLOSE Calculation",
    avgCopyEntryNew: "Avg ENTRY price after this order is:",
    avgCopyEntryOld: "Current Avg ENTRY price is:",
    avgCopyCloseNew: "Avg CLOSE price after this order is:",
    avgCopyCloseOld: "Current Avg CLOSE price is:",
    avgCalcPrefix: "Calculation:",
    avgVerbBought: "bought",
    avgVerbSold: "sold",
    avgBuildStartedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Position Started] Order ID: ${id} - ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} amount of ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} was ${verb} to start the position at the price of ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'}.`,
    avgBuildExpandedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Position Expanded] Order ID: ${id} - ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} amount of ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} was ${verb} to expand the position at the price of ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'}.`,
    avgBuildClosedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Position Closed] Order ID: ${id} - ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} amount of ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} was ${verb} to close the position at the price of ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'}.`,
    avgBuildReducedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Position Reduced] Order ID: ${id} - ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} amount of ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} was ${verb} to reduce the position at the price of ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'}.`,
    avgFlipCopy: (totalAmt: string, closeAmt: string, sym: string, closedSide: string, entryAmt: string, openedSide: string) => `\n> ⚠️ FLIP: This ${totalAmt} ${sym} order closed your ${closeAmt} ${closedSide} position and the remaining ${entryAmt} opened a new ${openedSide} position!`,
    avgFlipHtml: (totalAmt: string, closeAmt: string, sym: string, closedSide: string, entryAmt: string, openedSide: string) => `
        <div style="margin-top: 12px; padding: 10px; background: rgba(234, 179, 8, 0.15); border-left: 3px solid #eab308; border-radius: 4px;">
            <div style="color: #eab308; font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                ⚡ FLIP DETECTED
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.85); line-height: 1.4;">
                This <strong>${totalAmt} ${sym}</strong> order closed your <strong>${closeAmt}</strong> ${closedSide} position, and the remaining <strong>${entryAmt}</strong> opened a new ${openedSide} position.
            </div>
        </div>
    `,
    avgMultiPhaseDetected: "🔄 Multi-Position Flow (See explanation below)",
    avgPhaseNarration: (direction: string, startDate: string, endDate: string, entryIds: string[], closeIds: string[], isClosed: boolean, isHtml: boolean) => {
        let b = isHtml ? '<strong>' : '**';
        let bEnd = isHtml ? '</strong>' : '**';
        let status = isClosed ? `was closed by ${b}${endDate}${bEnd}` : `is currently open`;
        let s = `This ${b}${direction}${bEnd} position was opened on ${b}${startDate}${bEnd} and ${status}. `;
        let detail = [];
        if (entryIds.length > 0) detail.push(`the following ${entryIds.length} order(s) (${entryIds.join(', ')}) expanded it`);
        if (closeIds.length > 0) detail.push(`the following ${closeIds.length} order(s) (${closeIds.join(', ')}) reduced it`);
        if (detail.length > 0) s += `Respectively, ${detail.join('; and ')}. `;
        s += `Based on this activity, the entry and close prices were calculated as follows:`;
        return s;
    },
  },
  tr: {
    badge: "Binance 1m OHLC",
    tabMacro: "Makro Oluşturucu",
    tabLookup: "Fiyat Sorgulama",
    tabFunding: "Funding Makrosu",
    macroLabel: "Makro",
    modeLabel: "Çıktı Modu",
    modeDetailed: "Detaylı / Profesyonel",
    modeSummary: "Özet / Basitleştirilmiş",
    generate: "Oluştur",
    generating: "Oluşturuluyor...",
    copy: "Kopyala",
    copied: "Kopyalandı! (Sohbete hazır)",
    error: "Hata:",
    errorTip: "İpucu: 451 veya CORS hatası alırsanız, src/pricing.js dosyasındaki PROXY sabitine bir proxy adresi girin.",
    resultLabel: "Sonuç",
    // Price Lookup
    lookupTitle: "Fiyat Sorgulama Aracı",
    lookupSymbol: "Sembol",
    lookupMode: "Mod",
    lookupModeTrigger: "Tetiklenme Dakikası (Mark Price + Last Price)",
    lookupModeRange: "Aralık (Yüksek/Düşük)",
    lookupModeLast1s: "Last Price 1s (max 7g)",
    lookupModeTrailing: "Trailing Stop Simülasyonu",
    lookupAt: "Tarih/Zaman (UTC)",
    lookupFrom: "Başlangıç (UTC)",
    lookupTo: "Bitiş (UTC)",
    lookupDateTime: "Tarih/Zaman (UTC)",
    lookupButton: "Sorgula",
    // Funding
    fundingTitle: "💰 Funding Makrosu",
    fundingSymbol: "Sembol",
    fundingTime: "Funding Zamanı (UTC)",
    fundingSide: "Pozisyon Yönü",
    fundingPosSize: "Pozisyon Büyüklüğü",
    fundingInterval: "Funding Aralığı (saat)",
    fundingButton: "✨ Funding Makrosu Oluştur",
    fundingLoading: "Yükleniyor...",
    fundingApply: "Kesinlik Uygula",
    // Modal
    pasteModalTitle: "Emir Verisini Yapıştır",
    pasteModalButton: "✨ Ayrıştır & Doldur",
    // ✅ GÜNCELLENDİ (Yardımcı Metin)
    pasteModalHelper: "26 veya 27 satırlık *sadece değerleri* yapıştırın ('Liquidation' boş olsa da algılar).",
    pasteButtonLabel: "📋 Emir Verisini Yapıştır",
    pasteGridTitle: "Başlık (Sabit)",
    pasteGridValue: "Değer (Yapıştırılan)",
    pasteGridPreview: "Veri Eşleştirme Önizlemesi",
    // Detailed Lookup Messages
    lookupNotFound: "Veri bulunamadı.",
    lookupPriceNotReached: "{price} hedef fiyatına bu zaman aralığında ULAŞILMAMIŞTIR.",
    lookupFoundTitle: "🎯 BAŞARILI: HEDEFE ULAŞILDI",
    lookupNotFoundTitle: "❌ ULAŞILAMADI",
    lookupNoTradeData: "O saniye için işlem verisi bulunamadı (Last Price).",
    // Trailing Stop Results
    trailingActivation: "Aktivasyon Fiyatı",
    trailingCallback: "Geri Dönüş Oranı (%)",
    trailingLong: "Long (Alım Tetikleyici)",
    trailingShort: "Short (Satış Tetikleyici)",
    trailingTriggeredTitle: "🎯 TRAILING STOP TETİKLENDİ",
    trailingNotTriggeredTitle: "❌ TETİKLENMEDİ",
    trailingResultActivated: "🌟 Adım 1: Aktivasyon",
    trailingResultPeakLabel: "📈 Adım 2: Zirve Seviyesi",
    trailingResultTroughLabel: "📉 Adım 2: Dip Seviyesi",
    trailingResultPeak: "Adım 2: Takip",
    trailingResultTrigger: "🚀 Adım 3: Tetiklenme Durumu",
    trailingResultNotActivated: "❌ AKTİF OLMADI",
    trailingStep1Desc: "Emir artık AKTİF ve sistem en iyi fiyatı aramaya başladı.",
    trailingStep2Desc: "Bu fiyat sizin **Referans Noktanızdır**. Sistem hesaplamayı bu fiyat üzerinden yapar. Fiyat lehinize ilerledikçe bu nokta da otomatik olarak güncellenir.",
    trailingStep3Desc: "Fiyat, referans alınan en uç noktadan seçtiğiniz oranda uzaklaştı.",
    trailingRebound: "Geri Sıçrama (Yukarı)",
    trailingPullback: "Geri Çekilme (Aşağı)",
    trailingStepNoTriggerDesc: "Aktif: Fiyat henüz zirveden tetiklenecek kadar geri çekilmedi.",
    trailingWaitDesc: "Fiyatın Aktivasyon Seviyesine ulaşması bekleniyor.",
    trailingReboundFormula: "Teknik Detaylar",
    trailingMaxDevLabel: "Mevcut Geri Çekilme",
    trailingCalcFormula: "Hesaplama",
    trailingConditionMet: "Sağlandı",
    trailingConditionNotMet: "Sağlanmadı",
    trailingMarkPrecisionWarning: "Mark Fiyatı geçmişi 1 dakikalık çözünürlüğe sahiptir. Dakika içindeki olayların (En Yüksek/Düşük) kesin sırası geçmiş verilerden tam olarak belirlenemez.",
    trailingEstimatedNotice: "💡 **Zamanlama Notu**: Bu olay tek bir 1 dakikalık pencere içinde gerçekleşti. Mark Fiyatı geçmişi dakikalık kaydedildiği için, aktivasyon ve tetiklenme saniyesi o dakikanın fiyat aralığına dayalı bir tahmindir.",
    trailingPresentBtn: "Şu anki Zaman",
    trailingPresentNote: "1 dakika öncesine ayarlar (UTC+0)",
    trailingNextTriggerTip: "Sıradaki Tetikleme Seviyesi",
    trailingAgentSummary: "💡 Müşteri İçin Özet",
    trailingAgentInternalTitle: "🛠 Agent İçin İç Not",
    trailingAgentInternalDescLong: "LONG (Alış) Trailing Stop'ta en düşük seviyeyi (Dip) takip ederiz. Tetiklenme, fiyatın bu dipten seçilen oran kadar YUKARI fırlamasıyla gerçekleşir.",
    trailingAgentInternalDescShort: "SHORT (Satış) Trailing Stop'ta en yüksek seviyeyi (Zirve) takip ederiz. Tetiklenme, fiyatın bu zirveden seçilen oran kadar AŞAĞI düşmesiyle gerçekleşir.",
    // Average Calculator
    tabAverage: "Position History Open & Close Price Calc.",
    avgInputTitle: "İŞLEM GEÇMİŞİ GİRİŞİ",
    avgInputSub: "VERİ PANOSU",
    avgClearBtn: "VERİLERİ TEMİZLE",
    avgPlaceholder: "Binance Vadeli İşlemler geçmişinizi buraya yapıştırın...\nTablodaki diğer gereksiz yazılar otomatik olarak yoksayılacaktır.",
    avgCalcBtn: "HESAPLA",
    avgResultsTitle: "HESAPLAMA SONUÇLARI",
    avgResultsSubLong: "POZİSYON ANALİZİ - LONG MODU",
    avgResultsSubShort: "POZİSYON ANALİZİ - SHORT MODU",
    avgAwaiting: "Geçerli işlem geçmişi bekleniyor...",
    avgErrorNoTrades: "Geçerli işlem bulunamadı. Girdiğinizi kontrol edin.",
    avgSysReady: "SİSTEM_HAZIR",
    avgExtracted: "İŞLEM ÇIKARILDI",
    avgBadgeHedgeLong: "HEDGE LONG",
    avgBadgeHedgeShort: "HEDGE SHORT",
    avgEntry: "Ort. Giriş Fiyatı (Net:",
    avgClose: "Ort. Kapanış Fiyatı (Net:",
    avgCopyBtn: "Tam Açıklamayı Kopyala",
    avgCopiedToast: "BAŞARIYLA KOPYALANDI",
    avgMergedFills: "{n} parça emri birleştirildi",
    avgFormulaEntryTitle: "Tam Ortalama GİRİŞ Hesaplaması",
    avgFormulaCloseTitle: "Tam Ortalama ÇIKIŞ Hesaplaması",
    avgCopyEntryNew: "Bu emir sonrası güncel Ort. GİRİŞ fiyatı:",
    avgCopyEntryOld: "Şu anki Ort. GİRİŞ fiyatı:",
    avgCopyCloseNew: "Bu emir sonrası güncel Ort. ÇIKIŞ fiyatı:",
    avgCopyCloseOld: "Şu anki Ort. ÇIKIŞ fiyatı:",
    avgCalcPrefix: "Hesaplama:",
    avgVerbBought: "alınarak",
    avgVerbSold: "satılarak",
    avgBuildStartedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Pozisyon Başlatıldı] Emir ID: ${id} - ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'} fiyatından ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} adet ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} ${verb} pozisyon başlatıldı.`,
    avgBuildExpandedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Pozisyon Büyütüldü] Emir ID: ${id} - ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'} fiyatından ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} adet ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} ${verb} pozisyon büyütüldü.`,
    avgBuildClosedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Pozisyon Kapatıldı] Emir ID: ${id} - ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'} fiyatından ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} adet ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} ${verb} pozisyon kapatıldı.`,
    avgBuildReducedText: (desc: string, id: string, qty: string, sym: string, verb: string, price: string, isHtml: boolean) => `[**${desc}** Pozisyon Küçültüldü] Emir ID: ${id} - ${isHtml?'<strong>':'**'}${price}${isHtml?'</strong>':'**'} fiyatından ${isHtml?'<strong>':'**'}${qty}${isHtml?'</strong>':'**'} adet ${isHtml?'<strong>':'**'}${sym}${isHtml?'</strong>':'**'} ${verb} pozisyon küçültüldü.`,
    avgFlipCopy: (totalAmt: string, closeAmt: string, sym: string, closedSide: string, entryAmt: string, openedSide: string) => `\n> ⚠️ YÖN DEĞİŞİMİ (FLIP): Bu ${totalAmt} ${sym} emri ile önce ${closeAmt} büyüklüğündeki ${closedSide} kapatıldı ve kalan ${entryAmt} ile yeni ${openedSide} açıldı!`,
    avgFlipHtml: (totalAmt: string, closeAmt: string, sym: string, closedSide: string, entryAmt: string, openedSide: string) => `
        <div style="margin-top: 12px; padding: 10px; background: rgba(234, 179, 8, 0.15); border-left: 3px solid #eab308; border-radius: 4px;">
            <div style="color: #eab308; font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                ⚡ YÖN DEĞİŞİMİ (FLIP) TESPİT EDİLDİ
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.85); line-height: 1.4;">
                Bu <strong>${totalAmt} ${sym}</strong> büyüklüğündeki tek emir; önce <strong>${closeAmt}</strong> büyüklüğündeki ${closedSide} pozisyonu kapatmış, kalan <strong>${entryAmt}</strong> büyüklüğü ile de yeni ${openedSide} pozisyon açmıştır.
            </div>
        </div>
    `,
    avgMultiPhaseDetected: "🔄 Çoklu Pozisyon (Aşağıdaki açıklamaları inceleyin)",
    avgPhaseNarration: (direction: string, startDate: string, endDate: string, entryIds: string[], closeIds: string[], isClosed: boolean, isHtml: boolean) => {
        let b = isHtml ? '<strong>' : '**';
        let bEnd = isHtml ? '</strong>' : '**';
        let status = isClosed ? `${b}${endDate}${bEnd} tarihinde kapatılmıştır` : `şu an hala açıktır`;
        let s = `${b}${startDate}${bEnd} tarihinde açılan bu ${b}${direction}${bEnd} pozisyonu ${status}. `;
        let detail = [];
        if (entryIds.length > 0) detail.push(`sırasıyla şu emirler (${entryIds.join(', ')}) bu pozisyonu büyütmüş`);
        if (closeIds.length > 0) detail.push(`şu emirler (${closeIds.join(', ')}) pozisyonu küçültmüştür`);
        if (detail.length > 0) s += `${detail.join(', ve ')}. `;
        s += `Buna göre pozisyonun detaylı giriş ve çıkış hesaplamaları şu şekildedir:`;
        return s;
    },
  }
};
