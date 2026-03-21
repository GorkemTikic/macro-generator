import React, { useState, useEffect } from "react";

export default function AverageCalculator({ lang, uiStrings }) {
  const [positionType, setPositionType] = useState("LONG"); // "LONG" | "SHORT"
  const [rawInput, setRawInput] = useState("");
  const [parsedTrades, setParsedTrades] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [statusText, setStatusText] = useState("");
  const [errorStatus, setErrorStatus] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const t = uiStrings; 

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
  }, [rawInput, positionType]);

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
                symbol = rawTokens[i + 2].toUpperCase();
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

    const processedList = [];
    const entryFormulaParts = [];
    const closeFormulaParts = [];

    for (let tr of consolidatedOrders) {
        let isEntrySide = false;

        if (activeModeForTrade === 'LONG') {
            isEntrySide = (tr.side === 'BUY');
        } else { 
            isEntrySide = (tr.side === 'SELL');
        }

        if (isEntrySide) {
            let oldQty = entryQty;
            let oldAvg = averageEntry;

            entryCost += (tr.qty * tr.price);
            entryQty += tr.qty;
            averageEntry = entryCost / entryQty;
            entryFormulaParts.push(`(${tr.qty.toFixed(4)} x ${tr.price.toFixed(4)})`);

            let verb = tr.side === 'BUY' ? t.avgVerbBought : t.avgVerbSold;
            
            let copyText, htmlText;

            if (Math.abs(oldQty) < 0.00000001) {
                let baseCopy = t.avgBuildStartedText(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), false);
                let baseHtml = t.avgBuildStartedText(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), true);
                
                copyText = baseCopy + `\n> ${t.avgCopyEntryOld} **${averageEntry.toFixed(8)}**`;
                htmlText = baseHtml + `<div style="margin-top: 8px; color: var(--accent); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyEntryOld} <strong>${averageEntry.toFixed(8)}</strong></div>`;
            } else {
                let baseCopy = t.avgBuildExpandedText(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), false);
                let baseHtml = t.avgBuildExpandedText(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), true);

                copyText = baseCopy + `\n> ${t.avgCopyEntryNew} **${averageEntry.toFixed(8)}**`;
                let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${tr.qty.toFixed(4)} x ${tr.price.toFixed(4)})) / ${entryQty.toFixed(4)}`;
                copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

                htmlText = baseHtml + `<div style="margin-top: 8px; color: var(--accent); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyEntryNew} <strong>${averageEntry.toFixed(8)}</strong></div>`;
                htmlText += `<div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 11px; opacity: 0.7;">${t.avgCalcPrefix} <em>${calcStr}</em></div>`;
            }

            processedList.push({ ...tr, actionType: 'ENTRY', copyText, htmlText });

        } else {
            let oldQty = closeQty;
            let oldAvg = averageClose;
            let openBeforeThis = entryQty - closeQty;
            let isFullyClosed = (tr.qty >= openBeforeThis - 0.00000001);

            closeCost += (tr.qty * tr.price);
            closeQty += tr.qty;
            averageClose = closeCost / closeQty;
            closeFormulaParts.push(`(${tr.qty.toFixed(4)} x ${tr.price.toFixed(4)})`);

            let verb = tr.side === 'BUY' ? t.avgVerbBought : t.avgVerbSold;
            
            let builderFunc = isFullyClosed ? t.avgBuildClosedText : t.avgBuildReducedText;
            let copyText, htmlText;

            if (Math.abs(oldQty) < 0.00000001) {
                let baseCopy = builderFunc(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), false);
                let baseHtml = builderFunc(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), true);

                copyText = baseCopy + `\n> ${t.avgCopyCloseOld} **${averageClose.toFixed(8)}**`;
                htmlText = baseHtml + `<div style="margin-top: 8px; color: var(--accent-2); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyCloseOld} <strong>${averageClose.toFixed(8)}</strong></div>`;
            } else {
                let baseCopy = builderFunc(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), false);
                let baseHtml = builderFunc(posDesc, tr.orderId, tr.qty.toFixed(4), symbol, verb, tr.price.toFixed(4), true);

                copyText = baseCopy + `\n> ${t.avgCopyCloseNew} **${averageClose.toFixed(8)}**`;
                let calcStr = `((${oldQty.toFixed(4)} x ${oldAvg.toFixed(4)}) + (${tr.qty.toFixed(4)} x ${tr.price.toFixed(4)})) / ${closeQty.toFixed(4)}`;
                copyText += `\n> ${t.avgCalcPrefix} ${calcStr}`;

                htmlText = baseHtml + `<div style="margin-top: 8px; color: var(--accent-2); font-family: monospace; font-size: 12px; opacity: 0.8;">${t.avgCopyCloseNew} <strong>${averageClose.toFixed(8)}</strong></div>`;
                htmlText += `<div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 11px; opacity: 0.7;">${t.avgCalcPrefix} <em>${calcStr}</em></div>`;
            }

            processedList.push({ ...tr, actionType: 'CLOSE', copyText, htmlText });
        }
    }

    let finalSummaryCopyText = "";
    let finalSummaryHtmlText = "";

    if (entryFormulaParts.length > 1) {
        let formulaStr = `${t.avgFormulaEntryTitle}:\n(${entryFormulaParts.join(' + ')}) / ${entryQty.toFixed(4)} = ${averageEntry.toFixed(8)}`;
        finalSummaryCopyText += `\n\n${'-'.repeat(40)}\n${formulaStr}`;
        finalSummaryHtmlText += `
            <div style="margin-top: 16px; padding: 12px; background: rgba(0, 229, 168, 0.05); border-top: 1px solid var(--accent); border-radius: 0 0 8px 8px;">
                <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 13px;">${t.avgFormulaEntryTitle}</h4>
                <div style="font-family: monospace; font-size: 12px; word-break: break-all; color: var(--muted);">
                    (${entryFormulaParts.join(' + ')}) / ${entryQty.toFixed(4)} = <strong style="color: var(--accent);">${averageEntry.toFixed(8)}</strong>
                </div>
            </div>`;
    }

    if (closeFormulaParts.length > 1) {
        let formulaStr = `${t.avgFormulaCloseTitle}:\n(${closeFormulaParts.join(' + ')}) / ${closeQty.toFixed(4)} = ${averageClose.toFixed(8)}`;
        finalSummaryCopyText += `\n\n${'-'.repeat(40)}\n${formulaStr}`;
        finalSummaryHtmlText += `
            <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.05); border-top: 1px solid var(--accent-2); border-radius: 0 0 8px 8px;">
                <h4 style="margin: 0 0 8px 0; color: var(--accent-2); font-size: 13px;">${t.avgFormulaCloseTitle}</h4>
                <div style="font-family: monospace; font-size: 12px; word-break: break-all; color: var(--muted);">
                    (${closeFormulaParts.join(' + ')}) / ${closeQty.toFixed(4)} = <strong style="color: var(--accent-2);">${averageClose.toFixed(8)}</strong>
                </div>
            </div>`;
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
                                      <div style={{ textAlign: 'right' }}>
                                          <div className="label">{t.avgEntry} {results.entryQty.toFixed(4)})</div>
                                          <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                              {results.averageEntry > 0 ? results.averageEntry.toFixed(8).replace(/\.?0+$/, '') : '0.00'}
                                          </div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                          <div className="label">{t.avgClose} {results.closeQty.toFixed(4)})</div>
                                          <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-2)' }}>
                                              {results.averageClose > 0 ? results.averageClose.toFixed(8).replace(/\.?0+$/, '') : '0.00'}
                                          </div>
                                      </div>
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
                                      borderLeft: `3px solid ${item.actionType === 'ENTRY' ? 'var(--accent)' : 'var(--accent-2)'}`
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
