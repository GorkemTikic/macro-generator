import React, { useEffect, useRef, useState } from 'react';
import { useApp } from "../context/AppContext";

const WORKER_PROXY = ((import.meta as any).env?.VITE_BINANCE_PROXY ?? "https://macro-analytics.grkmtkc94.workers.dev")
    .trim()
    .replace(/\/$/, "");

export default function LiveTicker() {
    const { activeSymbol } = useApp();
    const [price, setPrice] = useState<string>("---");
    const [color, setColor] = useState<string>("");
    // Ref so the WebSocket onmessage closure always reads the latest value;
    // a state-based prevPrice would be captured stale by the closure.
    const prevPriceRef = useRef<number | null>(null);

    useEffect(() => {
        if (!activeSymbol) return;
        setPrice("---");
        setColor("");
        prevPriceRef.current = null;
        let closed = false;
        let fallbackStarted = false;
        let pollTimer: number | undefined;
        let firstMessageTimer: number | undefined;

        const applyPrice = (raw: string | number) => {
            const current = Number(raw);
            if (!Number.isFinite(current)) return;
            setPrice(current.toFixed(2));

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
                const url = WORKER_PROXY ? `${WORKER_PROXY}${path}` : `https://fapi.binance.com${path}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!closed) applyPrice(data?.markPrice);
            } catch (e) {
                if (!closed) console.warn("Ticker fallback fetch failed", e);
            }
        };

        const startFallback = () => {
            if (fallbackStarted || closed) return;
            fallbackStarted = true;
            pollMarkPrice();
            pollTimer = window.setInterval(pollMarkPrice, 3_000);
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
                console.error("Ticker Parse Error", e);
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

    return (
        <div className={`ticker-badge ${color}`}>
            {activeSymbol}: <span className="ticker-price">{price}</span>
        </div>
    );
}
