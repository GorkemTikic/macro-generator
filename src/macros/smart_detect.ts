
export interface DetectedIntent {
    macroId?: string;
    tone?: string;
    confidence: number;
    reason?: string;
}

// Normalize text so the matcher is robust to Turkish capital I quirks AND
// English caps. JS's default toLowerCase() maps 'ÇALIŞMADI' to 'çalişmadi'
// (dotted i) instead of 'çalışmadı' (dotless ı), so a user typing in caps
// would silently miss every Turkish keyword. tr-locale lowercase fixes that
// but turns English ASCII 'I' into 'ı', breaking English literals like
// 'not trigger'. Collapsing dotless 'ı' down to plain 'i' afterwards
// canonicalizes both sides so the matcher works regardless of caps/locale.
function norm(s: string): string {
    return s.toLocaleLowerCase('tr').replace(/ı/g, 'i');
}

export function detectMacro(text: string): DetectedIntent | null {
    const t = norm(text);
    const has = (lit: string) => t.includes(norm(lit));

    // 1. Funding / Fonlama
    // Note: funding_macro lives in the Funding tab, not the Macro Generator dropdown.
    // We still surface the detection for the agent, but don't change the dropdown
    // selection — the agent should switch tabs manually.
    if (has('funding') || has('fonlama') || has('fee') || has('komisyon')) {
        return {
            confidence: 0.9,
            reason: "Detected 'funding' keywords (use the Funding Macro tab)."
        };
    }

    // 2. Stop didn't trigger / Çalışmadı — Mark didn't reach the stop level
    if (
        (has('stop') && (has('çalışmadı') || has('tetiklenmedi') || has('not trigger') || has('skipped'))) ||
        has('stopum patlamadı')
    ) {
        return {
            macroId: 'mark_not_reached_user_checked_last',
            tone: 'empathetic',
            confidence: 0.95,
            reason: "Detected complaint about stop not triggering."
        };
    }

    // 3. Stop Triggered But Not Filled / Tetiklendi Ama Dolmadı
    if (
        (has('stop') && (has('dolmadı') || has('not fill'))) ||
        has('limit order not filled')
    ) {
        return {
            macroId: 'stop_limit_mark_price_not_filled',
            tone: 'professional',
            confidence: 0.85,
            reason: "Detected stop triggered but not filled."
        };
    }

    // 4. Slippage / Fiyat Kayması
    if (
        has('slippage') ||
        has('kayma') ||
        has('farklı fiyat') ||
        (has('market') && has('price') && has('high'))
    ) {
        return {
            macroId: 'tp_slippage_mark_price',
            tone: 'direct',
            confidence: 0.8,
            reason: "Detected slippage/price difference keywords."
        };
    }

    // 5. Not Reached / Gelmedi
    if (
        has('fiyat gelmedi') ||
        has('not reached') ||
        has("didn't hit") ||
        has('değmedi')
    ) {
        return {
            macroId: 'mark_not_reached_user_checked_last',
            tone: 'direct',
            confidence: 0.85,
            reason: "Detected price not reached keywords."
        };
    }

    return null;
}
