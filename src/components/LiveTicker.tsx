import React, { useEffect, useState } from 'react';
import { useApp } from "../context/AppContext";

export default function LiveTicker() {
    const { activeSymbol } = useApp();
    const [price, setPrice] = useState<string>("---");
    const [prevPrice, setPrevPrice] = useState<number | null>(null);
    const [color, setColor] = useState<string>("");

    useEffect(() => {
        if (!activeSymbol) return;
        setPrice("---");

        // Using Binance Futures WebSocket
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${activeSymbol.toLowerCase()}@markPrice`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.p) {
                    const current = parseFloat(data.p);
                    setPrice(current.toFixed(2));

                    if (prevPrice !== null) {
                        if (current > prevPrice) setColor("ticker-up");
                        else if (current < prevPrice) setColor("ticker-down");
                    }
                    setPrevPrice(current);
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
