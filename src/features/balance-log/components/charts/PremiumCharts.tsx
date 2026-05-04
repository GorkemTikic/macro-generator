import React from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { fmtTrim, fmtMoney } from "../../lib/format";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const CustomTooltip = ({ active, payload, label, mode }: any) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        const formatted = mode === "money" ? fmtMoney(val, "") : fmtTrim(val);
        const color = val >= 0 ? "#10b981" : "#ef4444";
        return (
            <div style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "10px 14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)"
            }}>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>{label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color }}>
                    {mode === "money" && (val > 0 ? "+" : "")}{formatted}
                </p>
            </div>
        );
    }
    return null;
};

/* -------------------------------------------------------------------------- */
/*                           Daily Performance                                */
/* -------------------------------------------------------------------------- */

export function DailyPerformanceChart({
    data,
    height = 260,
    emptyText = "No data available"
}: {
    data: { label: string; value: number }[];
    height?: number;
    emptyText?: string;
}) {
    if (!data || !data.length) {
        return <div className="muted text-center" style={{ padding: 20 }}>{emptyText}</div>;
    }

    // Determine gradient color based on final value (positive=green, negative=red)
    // Or just use a nice neutral "Sky" blue for the "Performance" line generally.
    // Let's use Sky Blue (#38bdf8) as the primary curve color.
    const color = "#38bdf8";

    return (
        <div style={{ height, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                        tickFormatter={(label) => label.substring(5)} // remove year "2023-"
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => fmtTrim(val)}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip mode="number" />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorVal)"
                        animationDuration={800}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                            Asset Distribution                              */
/* -------------------------------------------------------------------------- */

export function AssetDistributionChart({
    data,
    height = 300,
    emptyText = "No data available"
}: {
    data: { asset: string; net: number }[];
    height?: number;
    emptyText?: string;
}) {
    if (!data || !data.length) {
        return <div className="muted text-center" style={{ padding: 20 }}>{emptyText}</div>;
    }

    return (
        <div style={{ height, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="horizontal" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="asset"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => fmtTrim(val)}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip mode="money" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <ReferenceLine y={0} stroke="#475569" />
                    <Bar dataKey="net" radius={[4, 4, 4, 4]} animationDuration={800}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.net >= 0 ? "#10b981" : "#ef4444"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
