
export interface DetectedIntent {
    macroId?: string;
    tone?: string;
    confidence: number;
    reason?: string;
}

export function detectMacro(text: string): DetectedIntent | null {
    const t = text.toLowerCase();

    // 1. Funding / Fonlama
    if (t.includes('funding') || t.includes('fonlama') || t.includes('fee') || t.includes('komisyon')) {
        // If specifically about funding fee
        return {
            macroId: 'funding_macro', // Note: This might need redirection to Funding Tab if possible, or we just handle it here if macro generic supports it?
            // Actually Funding is a separate tab. Maybe we just warn/suggest? 
            // For now, let's focus on the macros in the dropdown.
            confidence: 0.9,
            reason: "Detected 'funding' keywords."
        };
    }

    // 2. Stop Limit Not Triggered / Çalışmadı
    if (
        (t.includes('stop') && (t.includes('çalışmadı') || t.includes('tetiklenmedi') || t.includes('not trigger') || t.includes('skipped'))) ||
        t.includes('stopum patlamadı')
    ) {
        return {
            macroId: 'stop_limit_not_triggered',
            tone: 'empathetic',
            confidence: 0.95,
            reason: "Detected complaint about stop not triggering."
        };
    }

    // 3. Stop Limit Triggered But Not Filled / Tetiklendi Ama Dolmadı
    if (
        (t.includes('stop') && (t.includes('dolmadı') || t.includes('not fill'))) ||
        t.includes('limit order not filled')
    ) {
        return {
            macroId: 'stop_limit_not_filled',
            tone: 'professional',
            confidence: 0.85,
            reason: "Detected stop triggered but not filled."
        };
    }

    // 4. Slippage / Fiyat Kayması
    if (
        t.includes('slippage') ||
        t.includes('kayma') ||
        t.includes('farklı fiyat') ||
        (t.includes('market') && t.includes('price') && t.includes('high'))
    ) {
        return {
            macroId: 'high_frequency_slippage', // Or general slippage if exists
            tone: 'direct',
            confidence: 0.8,
            reason: "Detected slippage/price difference keywords."
        };
    }

    // 5. Not Reached / Gelmedi
    if (
        t.includes('fiyat gelmedi') ||
        t.includes('not reached') ||
        t.includes('didn\'t hit') ||
        t.includes('değmedi')
    ) {
        return {
            macroId: 'limit_order_not_reached',
            tone: 'direct',
            confidence: 0.85,
            reason: "Detected price not reached keywords."
        };
    }

    return null;
}
