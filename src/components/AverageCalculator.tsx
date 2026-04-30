import React, { useState, useEffect, useRef } from "react";
import { trackDebounced } from "../analytics";

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

    for (let i = 0; i < rawTokens.length; i++) {
        if (dateRegex.test(rawTokens[i]) && i + 1 < rawTokens.length && timeRegex.test(rawTokens[i + 1])) {
            const dateStr = rawTokens[i] + ' ' + rawTokens[i + 1];
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
        console.error('Failed to copy text: ', err);
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
    let isFlipped = false;

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
        let flipAlertHtml = "";

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
                flipAlertHtml = t.avgFlipHtml(tr.qty.toFixed(4), closeAmt.toFixed(4), symbol, closedSide, entryAmt.toFixed(4), openedSide);
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
        let htmlText = "";
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
            let baseHtml = builderFunc(currentPosString, tr.orderId, closeAmt.toFixed(4), symbol, verb, tr.price.toFixed(4), true);

            copyText += baseCopy + `\n> ${t.avgCopyCloseNew} **${averageClose.toFixed(8)}**`;
            let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${closeAmt.toFixed(4)} x ${tr.price.toFixed(4)})) / ${closeQty.toFixed(4)}`;
            if (oldQty > 0) copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

            htmlText += baseHtml + `<div style="margin-top: 8px; color: var(--accent-2); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyCloseNew} <strong>${averageClose.toFixed(8)}</strong></div>`;
            if (oldQty > 0) htmlText += `<div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 11px; opacity: 0.7;">${t.avgCalcPrefix} <em>${calcStr}</em></div>`;
            
            localActionType = 'CLOSE';
        }

        let isFullyClosedToZero = Math.abs(netPosition) < 0.00000001;

        // 2. Process FLIP Logic or Full Close (Ending the Phase)
        if (isFlipped || isFullyClosedToZero) {
            if (isFlipped) {
                copyText += flipAlertText;
                htmlText += flipAlertHtml;
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
                htmlText += '<div style="margin: 16px 0;"></div>';
            }

            let baseCopy = builderFunc(currentPosString, tr.orderId, entryAmt.toFixed(4), symbol, verb, tr.price.toFixed(4), false);
            let baseHtml = builderFunc(currentPosString, tr.orderId, entryAmt.toFixed(4), symbol, verb, tr.price.toFixed(4), true);

            copyText += baseCopy + `\n> ${t.avgCopyEntryNew} **${averageEntry.toFixed(8)}**`;
             let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${entryAmt.toFixed(4)} x ${tr.price.toFixed(4)})) / ${entryQty.toFixed(4)}`;
            if (oldQty > 0) copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

            htmlText += baseHtml + `<div style="margin-top: 8px; color: var(--accent); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyEntryNew} <strong>${averageEntry.toFixed(8)}</strong></div>`;
            if (oldQty > 0) htmlText += `<div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 11px; opacity: 0.7;">${t.avgCalcPrefix} <em>${calcStr}</em></div>`;
            
            if (!isFlipped) localActionType = 'ENTRY';
        }

        processedList.push({ ...tr, actionType: localActionType, copyText, htmlText });
    }

    let finalSummaryCopyText = "";
    let finalSummaryHtmlText = "";

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

    for (let pos of historicalPositions) {
        if (pos.entryFormulaParts.length === 0 && pos.closeFormulaParts.length === 0) continue;

        let needsTitle = historicalPositions.length > 1;
        let pLabel = `[Phase ${pos.index}] ${pos.direction}`;

        if (needsTitle) {
            finalSummaryCopyText += `\n\n--- 🔄 ${pLabel} ---`;
            finalSummaryHtmlText += `
                <div style="margin-top: 24px; padding: 8px 12px; background: rgba(255,255,255,0.05); border-left: 3px solid #8b5cf6; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 13px; color: #8b5cf6;">
                    🔄 ${pLabel}
                </div>`;
        }

        // Add the narrative text
        let isClosed = (pos.index < historicalPositions.length) || (pos.closeQty >= pos.entryQty - 0.000001);
        let narrText = t.avgPhaseNarration(pos.direction, pos.startDate, pos.endDate, pos.entryOrderIds, pos.closeOrderIds, isClosed, false);
        let narrHtml = t.avgPhaseNarration(pos.direction, pos.startDate, pos.endDate, pos.entryOrderIds, pos.closeOrderIds, isClosed, true);
        
        finalSummaryCopyText += `\n\n${narrText}`;
        finalSummaryHtmlText += `
            <div style="margin-top: 12px; padding: 12px; font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5; background: rgba(0,0,0,0.2); border-radius: 6px;">
                ${narrHtml}
            </div>`;

        if (pos.entryFormulaParts.length > 0) {
            let formulaStr = `${t.avgFormulaEntryTitle}:\n(${pos.entryFormulaParts.join(' + ')}) / ${pos.entryQty.toFixed(4)} = ${pos.averageEntry.toFixed(8)}`;
            finalSummaryCopyText += `\n\n${'-'.repeat(40)}\n${formulaStr}`;
            finalSummaryHtmlText += `
                <div style="margin-top: 12px; padding: 12px; background: rgba(0, 229, 168, 0.05); border-top: 1px solid var(--accent); border-radius: 0 0 8px 8px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 13px;">${t.avgFormulaEntryTitle}</h4>
                    <div style="font-family: monospace; font-size: 12px; word-break: break-all; color: var(--muted);">
                        (${pos.entryFormulaParts.join(' + ')}) / ${pos.entryQty.toFixed(4)} = <strong style="color: var(--accent);">${pos.averageEntry.toFixed(8)}</strong>
                    </div>
                </div>`;
        }

        if (pos.closeFormulaParts.length > 0) {
            let formulaStr = `${t.avgFormulaCloseTitle}:\n(${pos.closeFormulaParts.join(' + ')}) / ${pos.closeQty.toFixed(4)} = ${pos.averageClose.toFixed(8)}`;
            finalSummaryCopyText += `\n\n${(pos.entryFormulaParts.length<=0)?'':'-'.repeat(40)+'\n'}${formulaStr}`;
            finalSummaryHtmlText += `
                <div style="margin-top: 12px; padding: 12px; background: rgba(59, 130, 246, 0.05); border-top: 1px solid var(--accent-2); border-radius: 0 0 8px 8px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--accent-2); font-size: 13px;">${t.avgFormulaCloseTitle}</h4>
                    <div style="font-family: monospace; font-size: 12px; word-break: break-all; color: var(--muted);">
                        (${pos.closeFormulaParts.join(' + ')}) / ${pos.closeQty.toFixed(4)} = <strong style="color: var(--accent-2);">${pos.averageClose.toFixed(8)}</strong>
                    </div>
                </div>`;
        }
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
        finalSummaryHtmlText,
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
                              {results.processedList.map((item, i) => (
                                  <div key={i} style={{ 
                                      background: 'rgba(0,0,0,0.2)', 
                                      padding: '16px', 
                                      borderRadius: '8px',
                                      borderLeft: `3px solid ${item.actionType === 'FLIP' ? '#eab308' : (item.actionType === 'ENTRY' ? 'var(--accent)' : 'var(--accent-2)')}`
                                  }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                          <div className="helper" style={{ margin: 0, fontFamily: 'monospace', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                              🕒 {item.date}
                                              {item.subTradesCount > 1 && (
                                                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                                      {t.avgMergedFills.replace('{n}', item.subTradesCount)}
                                                  </span>
                                              )}
                                          </div>
                                          <span className="badge" style={{ 
                                              background: item.side === 'BUY' ? 'rgba(0, 229, 168, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                                              color: item.side === 'BUY' ? 'var(--accent)' : 'var(--danger)' 
                                          }}>
                                              {item.side}
                                          </span>
                                      </div>
                                      <div style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.htmlText }} />
                                  </div>
                              ))}
                              <div dangerouslySetInnerHTML={{ __html: results.finalSummaryHtmlText }} />
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
