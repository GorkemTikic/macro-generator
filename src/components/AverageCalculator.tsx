import React, { useState, useEffect, useRef } from "react";
import { trackDebounced } from "../analytics";

// Render a markdown-ish string with **bold** segments as React fragments —
// no HTML strings, no dangerouslySetInnerHTML. Anything that isn't a literal
// **...** delimiter is rendered as plain text, so unsanitized user input can
// never become a tag/attribute.
function RichText({ text }: { text: string }) {
  if (!text) return null;
  // Split on **bold** delimiters; even indices = plain, odd = bold.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i}>{part}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}

export default function AverageCalculator({ lang, uiStrings }) {
  const [positionType, setPositionType] = useState("LONG"); // "LONG" | "SHORT"
  const [rawInput, setRawInput] = useState("");
  const [parsedTrades, setParsedTrades] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [statusText, setStatusText] = useState("");
  const [errorStatus, setErrorStatus] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const t = uiStrings; 

  const normalizeSymbol = (value) => {
    const cleaned = String(value || "").toUpperCase().replace(/[^A-Z0-9_/-]/g, "");
    return cleaned || "UNKNOWN";
  };

  const handleClear = () => {
    setRawInput("");
    setParsedTrades([]);
    setGroupedResults({});
    setStatusText(t.avgSysReady);
    setErrorStatus(false);
  };

  useEffect(() => {
    if (!rawInput.trim()) {
      setParsedTrades([]);
      setGroupedResults({});
      setStatusText(t.avgSysReady);
      setErrorStatus(false);
      return;
    }
    parseData(rawInput);
  }, [rawInput, positionType, lang]);

  const parseData = (inputVal) => {
    const rawTokens = inputVal.trim().split(/\s+/);
    const tempParsed = [];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{1,2}:\d{1,2}:\d{1,2}$/;
    // Normalize parser-accepted single-digit hour/minute/second (e.g. "0:03:56")
    // to a zero-padded HH:MM:SS so every downstream display ("Position card",
    // copy block, narrative, per-trade card) shows a consistent timestamp.
    const padTime = (t: string) => t.split(':').map(p => p.padStart(2, '0')).join(':');

    for (let i = 0; i < rawTokens.length; i++) {
        if (dateRegex.test(rawTokens[i]) && i + 1 < rawTokens.length && timeRegex.test(rawTokens[i + 1])) {
            const dateStr = rawTokens[i] + ' ' + padTime(rawTokens[i + 1]);
            let symbol = "UNKNOWN";

            if (i + 2 < rawTokens.length) {
                symbol = normalizeSymbol(rawTokens[i + 2]);
            }

            let positionSide = "BOTH";
            for (let k = i + 2; k <= Math.min(rawTokens.length - 1, i + 8); k++) {
                const tk = rawTokens[k].toUpperCase();
                if (tk === 'BOTH' || tk === 'LONG' || tk === 'SHORT') {
                    if (tk !== symbol) { 
                        positionSide = tk;
                    }
                }
            }

            let numbersFound = [];
            let extractedSide = null;
            let orderId = "UNKNOWN_ID";

            for (let j = i - 1; j >= Math.max(0, i - 25); j--) { 
                let token = rawTokens[j].toUpperCase();

                if (!extractedSide && (token === 'BUY' || token === 'SELL')) {
                    extractedSide = token;

                    let idCandidates = [];
                    for (let k = j - 1; k >= Math.max(0, j - 10); k--) {
                        if (/^\d{8,}$/.test(rawTokens[k])) {
                            idCandidates.push(rawTokens[k]);
                        }
                    }
                    if (idCandidates.length > 0) {
                        orderId = idCandidates.reduce((a, b) => a.length > b.length ? a : b);
                    }
                    continue;
                }

                if (!extractedSide) {
                    let cleanNum = token.replace(/,/g, '');
                    if (!isNaN(parseFloat(cleanNum)) && isFinite(cleanNum) && !token.match(/[A-Za-z]/)) {
                        numbersFound.push(parseFloat(cleanNum));
                    }
                }
            }

            if (extractedSide && numbersFound.length >= 2) {
                let pIndex = numbersFound.length >= 3 ? 2 : 1;
                let qIndex = numbersFound.length >= 3 ? 1 : 0;

                tempParsed.push({
                    orderId: orderId,
                    price: numbersFound[pIndex],
                    qty: numbersFound[qIndex],
                    side: extractedSide,
                    date: dateStr,
                    symbol: symbol,
                    positionSide: positionSide,
                    _id: tempParsed.length 
                });
            }
        }
    }

    if (tempParsed.length === 0) {
        setParsedTrades([]);
        setGroupedResults({});
        setStatusText(`ERROR: 0 ${t.avgExtracted}`);
        setErrorStatus(true);
        return;
    }

    setStatusText(`${t.avgSysReady} // ${tempParsed.length} ${t.avgExtracted}`);
    setErrorStatus(false);
    setParsedTrades(tempParsed);

    const grouped = {};
    for (let tr of tempParsed) {
        if (typeof tr.price !== "number" || isNaN(tr.price) || typeof tr.qty !== "number" || isNaN(tr.qty)) continue;

        let groupKey = tr.symbol;
        if (tr.positionSide === 'LONG') groupKey = tr.symbol + '|HEDGE_LONG';
        else if (tr.positionSide === 'SHORT') groupKey = tr.symbol + '|HEDGE_SHORT';
        else groupKey = tr.symbol + '|BOTH';

        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(tr);
    }

    setGroupedResults(grouped);

    // Debounced — fires 1.5s after the user stops pasting data
    trackDebounced({
      event: 'average_calc_run',
      tab: 'average',
      props: { trade_count: tempParsed.length },
    });
  };

  const copyToClipboard = (textToCopy, index) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
        if (import.meta.env?.DEV) console.error('Failed to copy text: ', err);
    });
  };

  const processGroup = (groupKey, trades) => {
    let symbol = groupKey;
    let modeType = 'BOTH';
    if (groupKey.includes('|')) {
        const parts = groupKey.split('|');
        symbol = parts[0];
        modeType = parts[1];
    }

    let activeModeForTrade = positionType;
    let posDesc = positionType;
    let hedgeBadge = null;

    if (modeType === 'HEDGE_LONG') {
        activeModeForTrade = 'LONG';
        posDesc = 'HEDGE LONG';
        hedgeBadge = <span className="badge" style={{ background: 'rgba(0, 229, 168, 0.2)', color: 'var(--accent)' }}>{t.avgBadgeHedgeLong}</span>;
    } else if (modeType === 'HEDGE_SHORT') {
        activeModeForTrade = 'SHORT';
        posDesc = 'HEDGE SHORT';
        hedgeBadge = <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>{t.avgBadgeHedgeShort}</span>;
    }

    // Sort by date
    // Create a copy first since arrays from state or props might be read-only in strict mode
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const consolidatedOrders = [];
    for (let tr of sortedTrades) {
        let last = consolidatedOrders.length > 0 ? consolidatedOrders[consolidatedOrders.length - 1] : null;
        let isSameOrder = false;

        if (last) {
            if (last.orderId !== "UNKNOWN_ID" && tr.orderId !== "UNKNOWN_ID" && last.orderId === tr.orderId) {
                isSameOrder = true;
            } else if (last.date === tr.date && last.side === tr.side) {
                isSameOrder = true;
            }
        }

        if (isSameOrder) {
            let combinedQty = last.qty + tr.qty;
            let weightedPrice = ((last.price * last.qty) + (tr.price * tr.qty)) / combinedQty;

            last.qty = combinedQty;
            last.price = weightedPrice;
            last.subTradesCount = (last.subTradesCount || 1) + 1;
        } else {
            consolidatedOrders.push({ ...tr, subTradesCount: 1 });
        }
    }

    let entryQty = 0;
    let entryCost = 0;
    let averageEntry = 0;

    let closeQty = 0;
    let closeCost = 0;
    let averageClose = 0;
    
    let netPosition = 0; // Negative for Short, Positive for Long

    const historicalPositions = [];
    let curPosIndex = 1;
    let phaseStartDate = null;

    const processedList = [];
    let entryFormulaParts = [];
    let closeFormulaParts = [];
    let entryOrderIds = [];
    let closeOrderIds = [];

    for (let tr of consolidatedOrders) {
        if (!phaseStartDate) phaseStartDate = tr.date;

        let entryAmt = 0;
        let closeAmt = 0;
        let isFlipped = false;
        let flipAlertText = "";

        if (modeType === 'HEDGE_LONG') {
            if (tr.side === 'BUY') entryAmt = tr.qty; else closeAmt = tr.qty;
            netPosition += (tr.side === 'BUY' ? tr.qty : -tr.qty);
        } else if (modeType === 'HEDGE_SHORT') {
            if (tr.side === 'SELL') entryAmt = tr.qty; else closeAmt = tr.qty;
            netPosition += (tr.side === 'SELL' ? -tr.qty : tr.qty);
        } else {
            // BOTH Mode / One-Way: We determine Entry/Close dynamically based on true Net Position to detect flips.
            if (tr.side === 'BUY') {
                if (netPosition <= -0.00000001) {
                    closeAmt = Math.min(tr.qty, Math.abs(netPosition));
                    entryAmt = Math.max(0, tr.qty - closeAmt);
                } else {
                    entryAmt = tr.qty;
                }
                netPosition += tr.qty;
            } else { // SELL
                if (netPosition >= 0.00000001) {
                    closeAmt = Math.min(tr.qty, netPosition);
                    entryAmt = Math.max(0, tr.qty - closeAmt);
                } else {
                    entryAmt = tr.qty;
                }
                netPosition -= tr.qty;
            }

            if (entryAmt > 0.00000001 && closeAmt > 0.00000001) {
                isFlipped = true;
                let closedSide = tr.side === 'BUY' ? 'Short' : 'Long';
                let openedSide = tr.side === 'BUY' ? 'Long' : 'Short';
                flipAlertText = t.avgFlipCopy(tr.qty.toFixed(4), closeAmt.toFixed(4), symbol, closedSide, entryAmt.toFixed(4), openedSide);
            }
        }

        // --- Determine Dynamic Position Description ---
        let currentPosString = posDesc; // default from mode
        if (modeType === 'BOTH') {
            let posBeforeTrade = netPosition - (tr.side === 'BUY' ? tr.qty : -tr.qty);
            if (posBeforeTrade > 0.00000001) currentPosString = 'LONG';
            else if (posBeforeTrade < -0.00000001) currentPosString = 'SHORT';
            else {
                // If it was exactly 0 before this trade, what did the user select in UI?
                // Actually, if we're opening a brand new position, it's what the trade dictates.
                currentPosString = tr.side === 'BUY' ? 'LONG' : 'SHORT';
            }
        }

        let copyText = "";
        let localActionType = 'ENTRY'; // Default border color
        let verb = tr.side === 'BUY' ? t.avgVerbBought : t.avgVerbSold;

        // 1. Process CLOSE amount first (finishing off the old position)
        if (closeAmt > 0.00000001) {
            let oldQty = closeQty;
            let oldAvg = averageClose;

            closeCost += (closeAmt * tr.price);
            closeQty += closeAmt;
            averageClose = closeCost / closeQty;
            closeFormulaParts.push(`(${closeAmt.toFixed(4)} x ${tr.price.toFixed(4)})`);
            closeOrderIds.push(tr.orderId);

            let posBeforeTrade = netPosition - (tr.side === 'BUY' ? tr.qty : -tr.qty);
            let isFullyClosed = false;
            if (modeType === 'BOTH') {
               isFullyClosed = (Math.abs(posBeforeTrade) - closeAmt) <= 0.00000001;
            } else {
               isFullyClosed = (entryQty - closeQty) <= 0.00000001; 
            }
            
            let builderFunc = isFullyClosed ? t.avgBuildClosedText : t.avgBuildReducedText;
            
            let baseCopy = builderFunc(currentPosString, tr.orderId, closeAmt.toFixed(4), symbol, verb, tr.price.toFixed(4), false);

            copyText += baseCopy + `\n> ${t.avgCopyCloseNew} **${averageClose.toFixed(8)}**`;
            let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${closeAmt.toFixed(4)} x ${tr.price.toFixed(4)})) / ${closeQty.toFixed(4)}`;
            if (oldQty > 0) copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

            localActionType = 'CLOSE';
        }

        let isFullyClosedToZero = Math.abs(netPosition) < 0.00000001;

        // 2. Process FLIP Logic or Full Close (Ending the Phase)
        if (isFlipped || isFullyClosedToZero) {
            if (isFlipped) {
                copyText += flipAlertText;
                localActionType = 'FLIP';
            }

            // A phase naturally ends if the position is fully exhausted (to zero) OR flipped completely across zero.
            historicalPositions.push({
                index: curPosIndex,
                direction: currentPosString, // The direction BEFORE the flip or of the closed position
                startDate: phaseStartDate,
                endDate: tr.date,
                entryFormulaParts: entryFormulaParts,
                closeFormulaParts: closeFormulaParts,
                entryOrderIds: entryOrderIds,
                closeOrderIds: closeOrderIds,
                entryQty: entryQty,
                averageEntry: averageEntry,
                closeQty: closeQty,
                averageClose: averageClose
            });
            curPosIndex++;
            phaseStartDate = isFlipped ? tr.date : null; // If strictly closed to zero, next trade starts the new phase date

            entryQty = 0; entryCost = 0; averageEntry = 0;
            closeQty = 0; closeCost = 0; averageClose = 0;
            entryFormulaParts = []; closeFormulaParts = [];
            entryOrderIds = []; closeOrderIds = [];

            // Switch current position string for the emerging ENTRY amount
            if (isFlipped) {
                currentPosString = tr.side === 'BUY' ? 'LONG' : 'SHORT';
            }
        }

        // 3. Process ENTRY amount (expanding/starting the new position)
        if (entryAmt > 0.00000001) {
            let oldQty = entryQty;
            let oldAvg = averageEntry;

            entryCost += (entryAmt * tr.price);
            entryQty += entryAmt;
            averageEntry = entryCost / entryQty;
            entryFormulaParts.push(`(${entryAmt.toFixed(4)} x ${tr.price.toFixed(4)})`);
            entryOrderIds.push(tr.orderId);
            
            let builderFunc = Math.abs(oldQty) < 0.00000001 ? t.avgBuildStartedText : t.avgBuildExpandedText;

            if (closeAmt > 0) {
                copyText += '\n\n';
            }

            let baseCopy = builderFunc(currentPosString, tr.orderId, entryAmt.toFixed(4), symbol, verb, tr.price.toFixed(4), false);

            copyText += baseCopy + `\n> ${t.avgCopyEntryNew} **${averageEntry.toFixed(8)}**`;
            let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${entryAmt.toFixed(4)} x ${tr.price.toFixed(4)})) / ${entryQty.toFixed(4)}`;
            if (oldQty > 0) copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

            if (!isFlipped) localActionType = 'ENTRY';
        }

        processedList.push({ ...tr, actionType: localActionType, copyText });
    }

    let finalSummaryCopyText = "";
    // Phase descriptors for safe React rendering (replaces finalSummaryHtmlText)
    const phaseDescriptors: Array<{
      label?: string;
      narrative: string;
      // Structured fields powering the agent-friendly position card.
      // (The `narrative` string above is still emitted into the copy-block so
      //  the message the agent sends to the customer stays unchanged.)
      direction?: string;
      startDate?: string | null;
      endDate?: string | null;
      entryOrderIds?: string[];
      closeOrderIds?: string[];
      isClosed?: boolean;
      indexNumber?: number;
      isMultiPhase?: boolean;
      entryFormulaCopy?: string;
      entryFormulaText?: { parts: string[]; qty: string; avg: string };
      closeFormulaCopy?: string;
      closeFormulaText?: { parts: string[]; qty: string; avg: string };
    }> = [];

    let finalDirection = posDesc;
    if (modeType === 'BOTH') {
        if (netPosition > 0.00000001) finalDirection = 'LONG';
        else if (netPosition < -0.00000001) finalDirection = 'SHORT';
    }

    // Only add the final active position if there's actually trade data hanging (prevents empty phases from fully-closed tails)
    if (entryFormulaParts.length > 0 || closeFormulaParts.length > 0) {
        historicalPositions.push({
            index: curPosIndex,
            direction: finalDirection,
            startDate: phaseStartDate,
            endDate: consolidatedOrders.length > 0 ? consolidatedOrders[consolidatedOrders.length - 1].date : null,
            entryFormulaParts: entryFormulaParts,
            closeFormulaParts: closeFormulaParts,
            entryOrderIds: entryOrderIds,
            closeOrderIds: closeOrderIds,
            entryQty: entryQty,
            averageEntry: averageEntry,
            closeQty: closeQty,
            averageClose: averageClose
        });
    }

    // Localised phrases used in BOTH the on-screen card AND the copy-text
    // block, so the agent's clipboard reads the same as what they're looking at.
    const L = (en: string, tr: string, zh: string) =>
      lang === 'tr' ? tr : lang === 'zh' ? zh : en;
    const T_BUILT     = L('How this position was built', 'Bu pozisyon nasıl oluştu', '该仓位是如何建立的');
    const T_OPENED_ON = L('Opened on',    'Açılış',  '开仓于');
    const T_CLOSED_BY = L('Closed by',    'Kapanış', '平仓于');
    const T_STILL_OPEN_INLINE = L('still open', 'şu an hala açık', '当前仍持仓中');
    const T_ENTRY_ORDS = (n: number) => L(
      `${n} entry order${n > 1 ? 's' : ''} expanded the position`,
      `${n} giriş emri pozisyonu büyüttü`,
      `${n} 笔加仓订单`
    );
    const T_CLOSE_ORDS = (n: number) => L(
      `${n} close order${n > 1 ? 's' : ''} reduced the position`,
      `${n} kapanış emri pozisyonu küçülttü`,
      `${n} 笔减仓订单`
    );
    const T_POSITION     = L('POSITION',     'POZİSYON',    '仓位');
    const T_CLOSED_BADGE = L('✓ CLOSED',     '✓ KAPANDI',   '✓ 已平仓');
    const T_OPEN_BADGE   = L('◷ STILL OPEN', '◷ HALA AÇIK', '◷ 仍持仓');
    const T_AVG_ENTRY    = L('AVERAGE ENTRY', 'ORTALAMA GİRİŞ',   '平均开仓价');
    const T_AVG_CLOSE    = L('AVERAGE CLOSE', 'ORTALAMA KAPANIŞ', '平均平仓价');
    const T_TOTAL_QTY    = L('total quantity', 'toplam miktar',   '总数量');

    for (let pos of historicalPositions) {
        if (pos.entryFormulaParts.length === 0 && pos.closeFormulaParts.length === 0) continue;

        let needsTitle = historicalPositions.length > 1;
        let pLabel = `[Phase ${pos.index}] ${pos.direction}`;

        let isClosed = (pos.index < historicalPositions.length) || (pos.closeQty >= pos.entryQty - 0.000001);
        let narrText = t.avgPhaseNarration(pos.direction, pos.startDate, pos.endDate, pos.entryOrderIds, pos.closeOrderIds, isClosed, false);

        const descriptor: typeof phaseDescriptors[number] = {
            label: needsTitle ? pLabel : undefined,
            narrative: narrText,
            direction: pos.direction,
            startDate: pos.startDate,
            endDate: pos.endDate,
            entryOrderIds: pos.entryOrderIds,
            closeOrderIds: pos.closeOrderIds,
            isClosed,
            indexNumber: pos.index,
            isMultiPhase: needsTitle,
        };

        if (pos.entryFormulaParts.length > 0) {
            descriptor.entryFormulaCopy = t.avgFormulaEntryTitle;
            descriptor.entryFormulaText = {
                parts: pos.entryFormulaParts,
                qty: pos.entryQty.toFixed(4),
                avg: pos.averageEntry.toFixed(8),
            };
        }

        if (pos.closeFormulaParts.length > 0) {
            descriptor.closeFormulaCopy = t.avgFormulaCloseTitle;
            descriptor.closeFormulaText = {
                parts: pos.closeFormulaParts,
                qty: pos.closeQty.toFixed(4),
                avg: pos.averageClose.toFixed(8),
            };
        }

        // -----------------------------------------------------------------
        // Build the copy-text block for this position. Mirrors the on-screen
        // card layout so what the agent copies looks identical to what they
        // see (just rendered in plain text instead of styled HTML).
        // -----------------------------------------------------------------
        const headerLine = [
            needsTitle ? `${T_POSITION} #${pos.index}` : null,
            pos.direction,
            isClosed ? T_CLOSED_BADGE : T_OPEN_BADGE,
        ].filter(Boolean).join(' · ');

        const dateLine = pos.startDate
            ? `   ${pos.startDate}${isClosed && pos.endDate ? `  →  ${pos.endDate}` : ''}`
            : '';

        const built: string[] = [];
        built.push(`• ${T_OPENED_ON} ${pos.startDate || '—'}${isClosed && pos.endDate ? ` · ${T_CLOSED_BY} ${pos.endDate}` : ` · ${T_STILL_OPEN_INLINE}`}`);
        if (pos.entryOrderIds.length > 0) {
            built.push(`• ${T_ENTRY_ORDS(pos.entryOrderIds.length)}: ${pos.entryOrderIds.join(', ')}`);
        }
        if (pos.closeOrderIds.length > 0) {
            built.push(`• ${T_CLOSE_ORDS(pos.closeOrderIds.length)}: ${pos.closeOrderIds.join(', ')}`);
        }

        finalSummaryCopyText += `\n\n${'═'.repeat(60)}\n🔄 ${headerLine}`;
        if (dateLine) finalSummaryCopyText += `\n${dateLine}`;
        finalSummaryCopyText += `\n${'═'.repeat(60)}\n\n${T_BUILT}:\n${built.join('\n')}`;

        if (pos.entryFormulaParts.length > 0) {
            const lines: string[] = pos.entryFormulaParts.map((p, idx) => `${idx === 0 ? '  ' : '+ '}${p}`);
            finalSummaryCopyText += `\n\n${'─'.repeat(50)}\n[STEP 1] ${t.avgFormulaEntryTitle}\n${'─'.repeat(50)}\n${lines.join('\n')}\n${'─'.repeat(20)}\n÷ ${pos.entryQty.toFixed(4)}  (${T_TOTAL_QTY})\n\n${T_AVG_ENTRY} = ${pos.averageEntry.toFixed(8)}`;
        }

        if (pos.closeFormulaParts.length > 0) {
            const lines: string[] = pos.closeFormulaParts.map((p, idx) => `${idx === 0 ? '  ' : '+ '}${p}`);
            const stepNum = pos.entryFormulaParts.length > 0 ? 'STEP 2' : 'STEP 1';
            finalSummaryCopyText += `\n\n${'─'.repeat(50)}\n[${stepNum}] ${t.avgFormulaCloseTitle}\n${'─'.repeat(50)}\n${lines.join('\n')}\n${'─'.repeat(20)}\n÷ ${pos.closeQty.toFixed(4)}  (${T_TOTAL_QTY})\n\n${T_AVG_CLOSE} = ${pos.averageClose.toFixed(8)}`;
        }

        phaseDescriptors.push(descriptor);
    }

    let masterCopyStringPlain = processedList.map(item => `[${item.date}]\n${item.copyText}`).join('\n\n');
    masterCopyStringPlain += finalSummaryCopyText;
    
    return {
        symbol,
        hedgeBadge,
        entryQty,
        averageEntry,
        closeQty,
        averageClose,
        historicalPositions,
        processedList,
        phaseDescriptors,
        masterCopyStringPlain,
        index: groupKey // Using groupKey as unique map key
    };
  };

  const hasData = Object.keys(groupedResults).length > 0;

  return (
    <div className="panel">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
         <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{t.avgInputTitle}</h3>
            <span className="helper" style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.avgInputSub}</span>
         </div>
      </div>

      <div className="grid">
        {/* Left Column: Input */}
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span className="helper" style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace', color: errorStatus ? 'var(--danger)' : 'var(--accent)' }}>
                {statusText || t.avgSysReady}
            </span>

            <div className="lookup-tabs" style={{ marginBottom: 0 }}>
                <div 
                    className={`lookup-tab ${positionType === 'LONG' ? 'active' : ''}`}
                    onClick={() => setPositionType('LONG')}
                >
                    LONG
                </div>
                <div 
                    className={`lookup-tab ${positionType === 'SHORT' ? 'active' : ''}`}
                    style={{ 
                        background: positionType === 'SHORT' ? 'var(--danger)' : '',
                        boxShadow: positionType === 'SHORT' ? '0 0 12px rgba(239, 68, 68, 0.4)' : ''
                    }}
                    onClick={() => setPositionType('SHORT')}
                >
                    SHORT
                </div>
            </div>

            <button className="btn secondary" onClick={handleClear} style={{ fontSize: '12px', padding: '8px', zIndex: 1 }}>
                {t.avgClearBtn} 🗑️
            </button>

            <textarea 
                className="textarea" 
                style={{ flexGrow: 1, minHeight: '350px', fontSize: '12px', background: 'rgba(0,0,0,0.2)' }}
                placeholder={t.avgPlaceholder}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
            />
        </div>

        {/* Right Column: Results */}
        <div className="col-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!hasData && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', opacity: 0.6, background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</span>
                      <div className="label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {errorStatus ? t.avgErrorNoTrades : t.avgAwaiting}
                      </div>
                  </div>
              )}

              {hasData && Object.entries(groupedResults).map(([groupKey, trades], idx) => {
                  const results = processGroup(groupKey, trades);

                  return (
                      <div key={results.index} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{results.symbol}</span>
                                      {results.hedgeBadge}
                                  </div>
                                  <div style={{ display: 'flex', gap: '24px' }}>
                                      {results.historicalPositions && results.historicalPositions.length > 1 ? (
                                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', height: '100%', padding: '4px 0' }}>
                                              <span style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'monospace', opacity: 0.9, background: 'rgba(0, 229, 168, 0.1)', padding: '6px 12px', borderRadius: '4px', border: '1px dashed rgba(0, 229, 168, 0.3)' }}>
                                                  {t.avgMultiPhaseDetected}
                                              </span>
                                          </div>
                                      ) : (
                                          <>
                                              <div style={{ textAlign: 'right' }}>
                                                  <div className="label">{t.avgEntry} {results.historicalPositions[0]?.entryQty.toFixed(4) || '0.0000'})</div>
                                                  <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                                      {results.historicalPositions[0]?.averageEntry > 0 ? results.historicalPositions[0].averageEntry.toFixed(8).replace(/\.?0+$/, '') : '0.00'}
                                                  </div>
                                              </div>
                                              <div style={{ textAlign: 'right' }}>
                                                  <div className="label">{t.avgClose} {results.historicalPositions[0]?.closeQty.toFixed(4) || '0.0000'})</div>
                                                  <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-2)' }}>
                                                      {results.historicalPositions[0]?.averageClose > 0 ? results.historicalPositions[0].averageClose.toFixed(8).replace(/\.?0+$/, '') : '0.00'}
                                                  </div>
                                              </div>
                                          </>
                                      )}
                                  </div>
                              </div>
                              
                              <button 
                                  className="btn secondary" 
                                  style={{ padding: '8px', fontSize: '12px' }}
                                  onClick={() => copyToClipboard(results.masterCopyStringPlain, idx)}
                              >
                                  {copiedIndex === idx ? `✅ ${t.avgCopiedToast}` : `📋 ${t.avgCopyBtn}`}
                              </button>
                          </div>

                          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {results.processedList.map((item, i) => {
                                  const isFlip = item.actionType === 'FLIP';
                                  const accentColor = isFlip ? '#eab308' : (item.actionType === 'ENTRY' ? 'var(--accent)' : 'var(--accent-2)');
                                  return (
                                  <div key={i} style={{
                                      background: isFlip
                                          ? 'linear-gradient(180deg, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0.04) 100%)'
                                          : 'rgba(0,0,0,0.2)',
                                      padding: '16px',
                                      borderRadius: '8px',
                                      borderLeft: `${isFlip ? '5px' : '3px'} solid ${accentColor}`,
                                      border: isFlip ? '1px solid rgba(234,179,8,0.45)' : undefined,
                                      borderLeftWidth: isFlip ? '5px' : undefined,
                                      boxShadow: isFlip ? '0 0 0 1px rgba(234,179,8,0.15), 0 4px 16px rgba(234,179,8,0.06)' : undefined,
                                      position: 'relative'
                                  }}>
                                      {isFlip && (
                                          <div style={{
                                              position: 'absolute',
                                              top: -10,
                                              right: 12,
                                              background: '#eab308',
                                              color: '#0d1117',
                                              fontSize: 11,
                                              fontWeight: 800,
                                              letterSpacing: '0.08em',
                                              padding: '3px 10px',
                                              borderRadius: 999,
                                              boxShadow: '0 2px 6px rgba(234,179,8,0.45)',
                                              textTransform: 'uppercase',
                                              fontFamily: 'inherit'
                                          }}>
                                              ⚠ POSITION FLIP
                                          </div>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                          <div className="helper" style={{ margin: 0, fontFamily: 'monospace', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                              🕒 {item.date}
                                              {item.subTradesCount > 1 && (
                                                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                                      {t.avgMergedFills.replace('{n}', item.subTradesCount)}
                                                  </span>
                                              )}
                                          </div>
                                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                              {isFlip && (
                                                  <span style={{
                                                      background: 'rgba(234,179,8,0.18)',
                                                      color: '#eab308',
                                                      fontSize: 10,
                                                      fontWeight: 700,
                                                      letterSpacing: '0.06em',
                                                      padding: '3px 8px',
                                                      borderRadius: 4,
                                                      border: '1px solid rgba(234,179,8,0.45)',
                                                      textTransform: 'uppercase'
                                                  }}>
                                                      Long ↔ Short
                                                  </span>
                                              )}
                                              <span className="badge" style={{
                                                  background: item.side === 'BUY' ? 'rgba(0, 229, 168, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                  color: item.side === 'BUY' ? 'var(--accent)' : 'var(--danger)'
                                              }}>
                                                  {item.side}
                                              </span>
                                          </div>
                                      </div>
                                      <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                          <RichText text={item.copyText} />
                                      </div>
                                  </div>
                                  );
                              })}
                              {results.phaseDescriptors.map((pd, pi) => {
                                  const isLong = (pd.direction || '').toUpperCase() === 'LONG';
                                  const dirColor = isLong ? 'var(--accent)' : 'var(--danger)';
                                  const dirSoft = isLong ? 'rgba(0,229,168,0.10)' : 'rgba(239,68,68,0.10)';
                                  const dirBorder = isLong ? 'rgba(0,229,168,0.35)' : 'rgba(239,68,68,0.35)';
                                  const closed = !!pd.isClosed;
                                  const eIds = pd.entryOrderIds || [];
                                  const cIds = pd.closeOrderIds || [];
                                  return (
                                  <div key={pi} style={{
                                      marginTop: 24,
                                      borderRadius: 12,
                                      overflow: 'hidden',
                                      border: `1px solid ${dirBorder}`,
                                      background: 'rgba(0,0,0,0.18)'
                                  }}>
                                      {/* Header — direction · status · date range */}
                                      <div style={{
                                          padding: '12px 16px',
                                          background: dirSoft,
                                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 10,
                                          flexWrap: 'wrap'
                                      }}>
                                          {pd.isMultiPhase && (
                                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
                                                  POSITION #{pd.indexNumber}
                                              </span>
                                          )}
                                          <span style={{
                                              fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                                              background: dirColor, color: '#0d1117', letterSpacing: '0.06em'
                                          }}>
                                              {pd.direction || '—'}
                                          </span>
                                          <span style={{
                                              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                                              background: closed ? 'rgba(0,229,168,0.18)' : 'rgba(234,179,8,0.18)',
                                              color: closed ? 'var(--accent)' : '#eab308',
                                              border: `1px solid ${closed ? 'rgba(0,229,168,0.45)' : 'rgba(234,179,8,0.45)'}`,
                                              letterSpacing: '0.06em'
                                          }}>
                                              {closed ? '✓ CLOSED' : '◷ STILL OPEN'}
                                          </span>
                                          {pd.startDate && (
                                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
                                                  {pd.startDate}{closed && pd.endDate ? `  →  ${pd.endDate}` : ''}
                                              </span>
                                          )}
                                      </div>

                                      {/* Body — plain English breakdown */}
                                      <div style={{ padding: '14px 16px 4px', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                                          <div style={{ fontWeight: 700, marginBottom: 8, color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                              How this position was built
                                          </div>
                                          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                              <li>
                                                  Opened on <strong>{pd.startDate || '—'}</strong>
                                                  {closed && pd.endDate ? <> · Closed by <strong>{pd.endDate}</strong></> : <> · <em style={{ color: '#eab308' }}>still open as of the last fill above</em></>}
                                              </li>
                                              {eIds.length > 0 && (
                                                  <li>
                                                      <strong>{eIds.length}</strong> entry order{eIds.length > 1 ? 's' : ''} expanded the position:
                                                      <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                          {eIds.map((id, k) => (
                                                              <code key={k} style={{ fontSize: 11, background: 'rgba(0,229,168,0.08)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(0,229,168,0.2)' }}>{id}</code>
                                                          ))}
                                                      </div>
                                                  </li>
                                              )}
                                              {cIds.length > 0 && (
                                                  <li>
                                                      <strong>{cIds.length}</strong> close order{cIds.length > 1 ? 's' : ''} reduced the position:
                                                      <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                          {cIds.map((id, k) => (
                                                              <code key={k} style={{ fontSize: 11, background: 'rgba(59,130,246,0.10)', color: 'var(--accent-2)', padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(59,130,246,0.25)' }}>{id}</code>
                                                          ))}
                                                      </div>
                                                  </li>
                                              )}
                                          </ul>
                                      </div>

                                      {/* Average ENTRY price calculation */}
                                      {pd.entryFormulaText && (
                                          <div style={{
                                              margin: '14px 16px',
                                              padding: '14px 16px',
                                              background: 'linear-gradient(180deg, rgba(0,229,168,0.10) 0%, rgba(0,229,168,0.02) 100%)',
                                              border: '1px solid rgba(0,229,168,0.35)',
                                              borderRadius: 8
                                          }}>
                                              <div style={{ fontSize: 11, letterSpacing: '0.10em', color: 'var(--accent)', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ background: 'var(--accent)', color: '#0d1117', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>STEP 1</span>
                                                  Average Entry Price — calculation
                                              </div>
                                              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7 }}>
                                                  {pd.entryFormulaText.parts.map((part, idx) => (
                                                      <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                          <span style={{ width: 14, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{idx === 0 ? ' ' : '+'}</span>
                                                          <span>{part}</span>
                                                      </div>
                                                  ))}
                                                  <div style={{ borderTop: '1px dashed rgba(0,229,168,0.45)', marginTop: 8, paddingTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                      <span style={{ width: 14, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>÷</span>
                                                      <span>{pd.entryFormulaText.qty} <span style={{ color: 'var(--muted)', fontSize: 11 }}>(total quantity)</span></span>
                                                  </div>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,229,168,0.30)' }}>
                                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Average entry =</span>
                                                  <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.02em' }}>
                                                      {pd.entryFormulaText.avg}
                                                  </span>
                                              </div>
                                          </div>
                                      )}

                                      {/* Average CLOSE price calculation */}
                                      {pd.closeFormulaText && (
                                          <div style={{
                                              margin: '0 16px 16px',
                                              padding: '14px 16px',
                                              background: 'linear-gradient(180deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.02) 100%)',
                                              border: '1px solid rgba(59,130,246,0.35)',
                                              borderRadius: 8
                                          }}>
                                              <div style={{ fontSize: 11, letterSpacing: '0.10em', color: 'var(--accent-2)', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ background: 'var(--accent-2)', color: '#0d1117', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>STEP 2</span>
                                                  Average Close Price — calculation
                                              </div>
                                              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7 }}>
                                                  {pd.closeFormulaText.parts.map((part, idx) => (
                                                      <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                          <span style={{ width: 14, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{idx === 0 ? ' ' : '+'}</span>
                                                          <span>{part}</span>
                                                      </div>
                                                  ))}
                                                  <div style={{ borderTop: '1px dashed rgba(59,130,246,0.45)', marginTop: 8, paddingTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                      <span style={{ width: 14, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>÷</span>
                                                      <span>{pd.closeFormulaText.qty} <span style={{ color: 'var(--muted)', fontSize: 11 }}>(total quantity)</span></span>
                                                  </div>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(59,130,246,0.30)' }}>
                                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Average close =</span>
                                                  <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: 'var(--accent-2)', letterSpacing: '0.02em' }}>
                                                      {pd.closeFormulaText.avg}
                                                  </span>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
