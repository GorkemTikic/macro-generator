import React, { useEffect, useRef, useState } from 'react';
import { useApp } from "../context/AppContext";
import { getAllSymbolPrecisions } from "../pricing";

// Production: route through the deployed Worker (its ALLOWED_ORIGIN matches
// the GitHub Pages origin). Dev: default to "" so the URL below is relative
// and Vite's /fapi proxy forwards it to Binance — the Worker rejects
// http://localhost:5173 with Access-Control-Allow-Origin: null, which would
// otherwise leave the ticker stuck at "---". See pricing.ts for the same trick
// and the boundary cast explanation.
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env) ?? ({} as ImportMetaEnv);
const _RAW_PROXY = _ENV.VITE_BINANCE_PROXY;
const _DEFAULT_PROXY = _ENV.DEV ? "" : "https://macro-analytics.grkmtkc94.workers.dev";
const WORKER_PROXY = (_RAW_PROXY ?? _DEFAULT_PROXY).trim().replace(/\/$/, "");

export default function LiveTicker() {
    const { activeSymbol } = useApp();
    const [price, setPrice] = useState<string>("---");
    const [color, setColor] = useState<string>("");
    // Ref so the WebSocket onmessage closure always reads the latest value;
    // a state-based prevPrice would be captured stale by the closure.
    const prevPriceRef = useRef<number | null>(null);
    const precisionRef = useRef<number>(2);

    useEffect(() => {
        if (!activeSymbol) return;
        setPrice("---");
        setColor("");
        prevPriceRef.current = null;
        precisionRef.current = 2;
        let closed = false;
        let fallbackStarted = false;
        let pollTimer: number | undefined;
        let firstMessageTimer: number | undefined;

        // Look up the symbol's price precision once per symbol so SHIB/PEPE
        // class tokens don't render as "0.00" all day. Failure falls back
        // to 2 decimals (sane default for BTC/ETH/major pairs).
        getAllSymbolPrecisions()
            .then((map) => {
                if (closed) return;
                const dp = map?.[activeSymbol.toUpperCase()];
                if (typeof dp === 'number' && dp >= 0 && dp <= 12) {
                    precisionRef.current = dp;
                }
            })
            .catch(() => { /* keep default precision */ });

        const applyPrice = (raw: string | number) => {
            const current = Number(raw);
            if (!Number.isFinite(current)) return;
            setPrice(current.toFixed(precisionRef.current));

            const prev = prevPriceRef.current;
            if (prev !== null) {
                if (current > prev) setColor("ticker-up");
                else if (current < prev) setColor("ticker-down");
            }
            prevPriceRef.current = current;
        };

        const pollMarkPrice = async () => {
            try {
                const path = `/fapi/v1/premiumIndex?symbol=${encodeURIComponent(activeSymbol.toUpperCase())}`;
                // Empty WORKER_PROXY → relative URL → handled by Vite dev proxy.
                // Non-empty → absolute URL prefixed by the Worker / custom proxy.
                const url = `${WORKER_PROXY}${path}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!closed) applyPrice(data?.markPrice);
            } catch (e) {
                if (!closed && import.meta.env?.DEV) {
                    console.warn("Ticker fallback fetch failed", e);
                }
            }
        };

        const startFallback = () => {
            if (fallbackStarted || closed) return;
            fallbackStarted = true;
            pollMarkPrice();
            pollTimer = window.setInterval(() => {
                // Pause polling when the tab is hidden — reduces wasted
                // requests + lowers the chance of getting the Worker IP
                // rate-limited (HTTP 418).
                if (typeof document !== 'undefined' && document.hidden) return;
                pollMarkPrice();
            }, 3_000);
        };

        // Using Binance Futures WebSocket
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${activeSymbol.toLowerCase()}@markPrice`);
        firstMessageTimer = window.setTimeout(startFallback, 5_000);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.p) {
                    if (firstMessageTimer) window.clearTimeout(firstMessageTimer);
                    applyPrice(data.p);
                }
            } catch (e) {
                if (import.meta.env?.DEV) console.error("Ticker Parse Error", e);
            }
        };

        ws.onerror = startFallback;
        ws.onclose = startFallback;

        return () => {
            closed = true;
            if (firstMessageTimer) window.clearTimeout(firstMessageTimer);
            if (pollTimer) window.clearInterval(pollTimer);
            ws.close();
        };
    }, [activeSymbol]); // Re-connect when symbol changes

    const arrow = color === 'ticker-up' ? '▲' : color === 'ticker-down' ? '▼' : '·';
    return (
        <div className={`ticker-badge ${color}`} role="status" aria-live="polite" aria-label={`Live ${activeSymbol} price`}>
            <span className="ticker-sym">{activeSymbol}</span>
            <span className="ticker-price">{price}</span>
            <span className="ticker-arrow" aria-hidden="true">{arrow}</span>
        </div>
    );
}
