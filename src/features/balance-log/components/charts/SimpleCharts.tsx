import React, { useRef, useState, useEffect } from "react";
import { type Row } from "../../lib/story";
import { fmtTrim } from "../../lib/format";

/* ---------------- Tiny charts ---------------- */
export type LinePoint = { label: string; value: number };
export type BarDatum = { asset: string; net: number };

export function buildDailyNet(rows: Row[]): LinePoint[] {
  if (!rows?.length) return [];
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.time.split(" ")[0];
    map.set(d, (map.get(d) || 0) + r.amount);
  }
  const arr = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  let cum = 0;
  return arr.map(([d, v]) => {
    cum += v;
    return { label: d, value: cum };
  });
}

export function buildAssetNet(rows: Row[]): BarDatum[] {
  if (!rows?.length) return [];
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.asset, (map.get(r.asset) || 0) + r.amount);
  const arr = Array.from(map.entries()).map(([asset, net]) => ({ asset, net }));
  arr.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return arr.slice(0, 12);
}

export function ChartLine({ data, height = 240 }: { data: LinePoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(760);
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (ref.current) setW(Math.max(560, ref.current.clientWidth - 24));
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const pad = { t: 12, r: 12, b: 28, l: 44 };
  const width = w,
    h = height;
  const innerW = width - pad.l - pad.r,
    innerH = h - pad.t - pad.b;

  if (!data.length)
    return (
      <div ref={ref} style={{ padding: 12, color: "#6b7280" }}>
        No data
      </div>
    );

  const minY = Math.min(0, Math.min(...data.map((d) => d.value)));
  const maxY = Math.max(0, Math.max(...data.map((d) => d.value)));
  const yScale = (v: number) => pad.t + (maxY === minY ? innerH / 2 : innerH - ((v - minY) / (maxY - minY)) * innerH);
  const xScale = (i: number) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.value)}`).join(" ");
  const zeroY = yScale(0);

  return (
    <div ref={ref} style={{ overflow: "hidden" }}>
      <svg width={width} height={h}>
        <line x1={pad.l} y1={zeroY} x2={width - pad.r} y2={zeroY} stroke="#e5e7eb" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke="#e5e7eb" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
        {data.map((d, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={2.5} fill="#2563eb" />
        ))}
        {data.map(
          (d, i) =>
            i % Math.ceil(data.length / 6) === 0 && (
              <text key={"x" + i} x={xScale(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
                {d.label.slice(5)}
              </text>
            )
        )}
        {[minY, (minY + maxY) / 2, maxY].map((val, i) => (
          <g key={"y" + i}>
            <text x={8} y={yScale(val) + 4} fontSize="11" fill="#6b7280">
              {fmtTrim(val)}
            </text>
            <line x1={pad.l - 4} y1={yScale(val)} x2={pad.l} y2={yScale(val)} stroke="#9ca3af" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ChartBars({ data, height = 280 }: { data: { asset: string; net: number }[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(760);
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (ref.current) setW(Math.max(560, ref.current.clientWidth - 24));
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  if (!data.length)
    return (
      <div ref={ref} style={{ padding: 12, color: "#6b7280" }}>
        No data
      </div>
    );

  const width = w,
    pad = { t: 12, r: 12, b: 28, l: 56 };
  const innerW = width - pad.l - pad.r,
    innerH = height - pad.t - pad.b;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.net))) || 1;
  const barW = innerW / data.length - 8;

  return (
    <div ref={ref} style={{ overflow: "hidden" }}>
      <svg width={width} height={height}>
        <line x1={pad.l} y1={pad.t + innerH / 2} x2={width - pad.r} y2={pad.t + innerH / 2} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const x = pad.l + i * (innerW / data.length) + 4;
          const h = Math.max(1, (Math.abs(d.net) / maxAbs) * (innerH / 2));
          const y = d.net >= 0 ? pad.t + innerH / 2 - h : pad.t + innerH / 2;
          const fill = d.net >= 0 ? "#047857" : "#b91c1c";
          return (
            <g key={d.asset}>
              <rect x={x} y={y} width={barW} height={h} fill={fill} rx={3} />
              <text x={x + barW / 2} y={pad.t + innerH + 14} textAnchor="middle" fontSize="11" fill="#374151">
                {d.asset}
              </text>
            </g>
          );
        })}
        {[maxAbs, 0, -maxAbs].map((v, idx) => (
          <text key={idx} x={8} y={pad.t + innerH / 2 - (v / maxAbs) * (innerH / 2) + 4} fontSize="11" fill="#6b7280">
            {fmtTrim(v)}
          </text>
        ))}
      </svg>
    </div>
  );
}
