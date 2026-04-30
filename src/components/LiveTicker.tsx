import React, { useEffect, useRef, useState } from 'react';
import { useApp } from "../context/AppContext";

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

        // Using Binance Futures WebSocket
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${activeSymbol.toLowerCase()}@markPrice`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.p) {
                    const current = parseFloat(data.p);
                    setPrice(current.toFixed(2));

                    const prev = prevPriceRef.current;
                    if (prev !== null) {
                        if (current > prev) setColor("ticker-up");
                        else if (current < prev) setColor("ticker-down");
                    }
                    prevPriceRef.current = current;
                }
            } catch (e) {
                console.error("Ticker Parse Error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [activeSymbol]); // Re-connect when symbol changes

    return (
        <div className={`ticker-badge ${color}`}>
            {activeSymbol}: <span className="ticker-price">{price}</span>
        </div>
    );
}
