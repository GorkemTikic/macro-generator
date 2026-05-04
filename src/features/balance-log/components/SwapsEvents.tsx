import React from "react";
import Amount from "./Amount";
import { fmtTrim } from "../lib/format";
import {
  exchangeEventText,
  exchangeEventToTsvRow,
  type ExchangeEvent,
  type ExchangeLeg
} from "../lib/exchangeEvents";
import { buildEventContractLedger } from "../lib/eventContracts";
import { loadSpotMarketCheck, type SpotMarketCheck } from "../lib/spotMarket";

type TotalsMap = Record<string, { pos: number; neg: number; net: number }>;

const INITIAL_VISIBLE_EVENTS = 80;
const VISIBLE_EVENTS_STEP = 80;
const MAX_ROUTE_SUMMARY_ROWS = 6;

function legAmountValue(leg: ExchangeLeg, sign: "in" | "out") {
  const amount = Math.abs(leg.amount);
  return sign === "out" ? -amount : amount;
}

function renderLegs(legs: ExchangeLeg[], sign: "in" | "out") {
  if (!legs.length) return <span className="text-muted">-</span>;
  return (
    <span className="exchange-amount-list">
      {legs.map((leg) => {
        const value = legAmountValue(leg, sign);
        return (
          <Amount
            key={leg.asset}
            value={value}
            showPlus
            displayValue={`${value > 0 ? "+" : "-"}${fmtTrim(Math.abs(value))} ${leg.asset}`}
            className="mono"
          />
        );
      })}
    </span>
  );
}

function routeText(event: ExchangeEvent) {
  const out = event.outLegs.map((leg) => leg.asset).join(" + ") || "?";
  const inn = event.inLegs.map((leg) => leg.asset).join(" + ") || "?";
  return `${out} -> ${inn}`;
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

function copyEventsAsText(title: string, events: ExchangeEvent[]) {
  const lines = [`${title}`, "", ...events.map(exchangeEventText)];
  copyText(lines.join("\n"));
}

function copyEventsAsTsv(events: ExchangeEvent[]) {
  const headers = ["Date", "Given", "Received", "User answer"];
  const rows = events.map(exchangeEventToTsvRow);
  copyText([headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n"));
}

function addLegTotals(target: Map<string, number>, legs: ExchangeLeg[]) {
  for (const leg of legs) {
    const asset = leg.asset.toUpperCase();
    target.set(asset, (target.get(asset) || 0) + Math.abs(leg.amount));
  }
}

function renderTotals(totals: Map<string, number>, sign: "in" | "out") {
  const entries = Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return <span className="text-muted">-</span>;
  return (
    <span className="exchange-amount-list">
      {entries.map(([asset, amount]) => {
        const value = sign === "out" ? -Math.abs(amount) : Math.abs(amount);
        return (
          <Amount
            key={asset}
            value={value}
            showPlus
            displayValue={`${value > 0 ? "+" : "-"}${fmtTrim(Math.abs(value))} ${asset}`}
            className="mono"
          />
        );
      })}
    </span>
  );
}

function routeSummaries(events: ExchangeEvent[]) {
  const routes = new Map<
    string,
    {
      route: string;
      count: number;
      given: Map<string, number>;
      received: Map<string, number>;
    }
  >();

  for (const event of events) {
    const route = routeText(event);
    const summary =
      routes.get(route) ||
      routes
        .set(route, {
          route,
          count: 0,
          given: new Map(),
          received: new Map()
        })
        .get(route)!;

    summary.count += 1;
    addLegTotals(summary.given, event.outLegs);
    addLegTotals(summary.received, event.inLegs);
  }

  return Array.from(routes.values()).sort((a, b) => b.count - a.count || a.route.localeCompare(b.route));
}

/** Render rows to a canvas and download as PNG (no DOM screenshot). */
function exportRowsAsPNG(headers: string[], rows: string[][], filename: string) {
  const padX = 14;
  const padY = 10;
  const rowH = 30;
  const headH = 32;
  const gapX = 28;

  const font = "12px Menlo,Consolas,monospace";
  const fontBold = "700 12px Menlo,Consolas,monospace";

  const measure = (text: string, bold = false) => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = bold ? fontBold : font;
    return Math.ceil(ctx.measureText(text).width);
  };

  const cols = headers.map((header, i) => {
    const headerW = measure(header, true);
    const dataW = Math.max(...rows.map((row) => measure(row[i] || "")), 0);
    return Math.max(headerW, dataW) + padX * 2;
  });

  const width = Math.min(2200, cols.reduce((a, b) => a + b, 0) + gapX * 2);
  const height = headH + rows.length * rowH + padY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(gapX, padY, width - gapX * 2, headH);

  ctx.font = fontBold;
  ctx.fillStyle = "#111827";
  let x = gapX;
  const baseHeaderY = padY + headH / 2 + 4;
  headers.forEach((h, i) => {
    ctx.fillText(h, x + padX, baseHeaderY);
    x += cols[i];
  });

  ctx.font = font;
  let y = padY + headH;
  rows.forEach((row) => {
    y += rowH;
    let cx = gapX;
    row.forEach((cell, i) => {
      ctx.fillStyle = i === 1 ? "#dc2626" : i === 2 ? "#16a34a" : "#111827";
      ctx.fillText(cell, cx + padX, y);
      cx += cols[i];
    });
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function ExchangeLedgerRow({ event }: { event: ExchangeEvent }) {
  const [marketCheck, setMarketCheck] = React.useState<SpotMarketCheck | null>(null);
  const [marketError, setMarketError] = React.useState("");
  const [loadingMarket, setLoadingMarket] = React.useState(false);

  async function runMarketCheck() {
    setLoadingMarket(true);
    setMarketError("");
    try {
      setMarketCheck(await loadSpotMarketCheck(event));
    } catch (error) {
      setMarketCheck(null);
      setMarketError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingMarket(false);
    }
  }

  return (
    <>
      <tr className="exchange-ledger-row">
        <td className="mono">{event.time}</td>
        <td>
          <span className="exchange-route">{routeText(event)}</span>
        </td>
        <td>{renderLegs(event.outLegs, "out")}</td>
        <td>{renderLegs(event.inLegs, "in")}</td>
        <td className="exchange-rate">{event.rateText.replace(/^Rate:\s*/, "")}</td>
        <td>
          <div className="exchange-row-actions">
            <button className="btn small" onClick={() => copyText(event.summary)}>
              Copy
            </button>
            <button className="btn small" onClick={runMarketCheck} disabled={loadingMarket}>
              {loadingMarket ? "Checking" : marketCheck || marketError ? "Refresh" : "Market"}
            </button>
          </div>
        </td>
      </tr>
      {(marketCheck || marketError) && (
        <tr className="exchange-ledger-detail">
          <td colSpan={6}>
            <div className="market-check compact">
              <div className="market-check-head">
                <strong>Agent-only spot market context</strong>
                {marketCheck && (
                  <button className="btn small" onClick={() => copyText(marketCheck.explanation)}>
                    Copy market note
                  </button>
                )}
              </div>
              {marketCheck ? (
                <>
                  <p>{marketCheck.explanation}</p>
                  <div className="market-check-grid">
                    <span>Symbol: {marketCheck.symbol}</span>
                    <span>1s high: {marketCheck.highPriceText}</span>
                    <span
                      className={
                        marketCheck.difference < 0
                          ? "text-red"
                          : marketCheck.difference > 0
                            ? "text-green"
                            : "text-muted"
                      }
                    >
                      Difference: {marketCheck.difference >= 0 ? "+" : ""}
                      {fmtTrim(marketCheck.difference)} {marketCheck.quoteAsset}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-red">{marketError}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function RouteSummaryTable({ events }: { events: ExchangeEvent[] }) {
  const summaries = React.useMemo(() => routeSummaries(events), [events]);
  const visible = summaries.slice(0, MAX_ROUTE_SUMMARY_ROWS);
  const remaining = summaries.length - visible.length;

  return (
    <div className="exchange-route-summary">
      <div className="exchange-route-summary-head">
        <span className="metric-label">Routes</span>
        <span className="muted small">{summaries.length} unique</span>
      </div>
      <table className="exchange-route-table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Events</th>
            <th>Given total</th>
            <th>Received total</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((summary) => (
            <tr key={summary.route}>
              <td>{summary.route}</td>
              <td>{summary.count}</td>
              <td>{renderTotals(summary.given, "out")}</td>
              <td>{renderTotals(summary.received, "in")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && <p className="muted small">+{remaining} more routes in the ledger and exports.</p>}
    </div>
  );
}

function EventContractsSection({
  eventsOrdersByAsset,
  eventsPayoutsByAsset
}: {
  eventsOrdersByAsset: TotalsMap;
  eventsPayoutsByAsset: TotalsMap;
}) {
  const orders = React.useMemo(() => buildEventContractLedger(eventsOrdersByAsset, "orders"), [eventsOrdersByAsset]);
  const payouts = React.useMemo(() => buildEventContractLedger(eventsPayoutsByAsset, "payouts"), [eventsPayoutsByAsset]);

  if (!orders.length && !payouts.length) return null;

  // Per-asset net = orders (negative) + payouts (positive). One row per asset.
  const assets = new Set<string>();
  for (const r of orders) assets.add(r.asset);
  for (const r of payouts) assets.add(r.asset);
  const summary = Array.from(assets)
    .map((asset) => {
      const sent = Math.abs(orders.find((r) => r.asset === asset)?.amount ?? 0);
      const received = payouts.find((r) => r.asset === asset)?.amount ?? 0;
      return { asset, sent, received, net: received - sent };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.asset.localeCompare(b.asset));

  const hasNormalized =
    orders.some((r) => r.normalized) || payouts.some((r) => r.normalized);

  function copyNet() {
    const lines: string[] = ["Asset\tSent (orders)\tReceived (payouts)\tNet"];
    for (const r of summary) {
      lines.push(
        `${r.asset}\t-${r.sent}\t+${r.received}\t${r.net >= 0 ? "+" : ""}${r.net}`
      );
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
  }

  return (
    <div className="card">
      <div className="section-head exchange-section-head">
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            Event Contracts
          </h3>
          <p className="muted small" style={{ margin: 0 }}>
            Net result from event contract orders sent and payouts received.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn small" onClick={copyNet}>
            Copy net
          </button>
        </div>
      </div>

      {hasNormalized && (
        <p className="muted small" style={{ marginTop: 0, marginBottom: 8 }}>
          Some source rows had the opposite sign; this view normalizes direction so orders are never positive and payouts
          are never negative.
        </p>
      )}

      <div className="tablewrap">
        <table className="table mono small">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Asset</th>
              <th style={{ textAlign: "right" }}>Sent (orders)</th>
              <th style={{ textAlign: "right" }}>Received (payouts)</th>
              <th style={{ textAlign: "right" }}>Net</th>
              <th style={{ textAlign: "left" }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((r) => (
              <tr key={r.asset}>
                <td className="text-left bold">{r.asset}</td>
                <td className="text-right">
                  <Amount value={-r.sent} className="mono" />
                </td>
                <td className="text-right">
                  <Amount value={r.received} showPlus className="mono" />
                </td>
                <td className="text-right">
                  <Amount value={r.net} showPlus className="mono" bold />
                </td>
                <td className="text-left text-muted small">
                  {r.net > 0 ? "Profit" : r.net < 0 ? "Loss" : "Break-even"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventSection({
  title,
  accent,
  filename,
  events
}: {
  title: string;
  accent?: string;
  filename: string;
  events: ExchangeEvent[];
}) {
  const [visibleCount, setVisibleCount] = React.useState(Math.min(INITIAL_VISIBLE_EVENTS, events.length));
  const rows = events.map(exchangeEventToTsvRow);
  const headers = ["Date", "Given", "Received", "User answer"];
  const visibleEvents = events.slice(0, visibleCount);
  const remaining = Math.max(0, events.length - visibleCount);
  const earliest = events[0]?.time || "-";
  const latest = events[events.length - 1]?.time || "-";

  React.useEffect(() => {
    setVisibleCount(Math.min(INITIAL_VISIBLE_EVENTS, events.length));
  }, [events]);

  return (
    <div className="card" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <div className="section-head exchange-section-head">
        <div>
          <h3 className="section-title" style={{ marginBottom: 4, color: accent || undefined }}>
            {title}
          </h3>
          <p className="muted small" style={{ margin: 0 }}>
            Compact ledger for copy-ready user answers; market context stays separate for agents.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn small" onClick={() => exportRowsAsPNG(headers, rows, filename)}>
            Export PNG
          </button>
          <button className="btn small" onClick={() => copyEventsAsTsv(events)}>
            Copy TSV
          </button>
          <button className="btn small" onClick={() => copyEventsAsText(title, events)}>
            Copy answers
          </button>
        </div>
      </div>

      <div className="exchange-summary-strip">
        <span>
          <strong>{events.length}</strong> events
        </span>
        <span>
          <strong>{earliest}</strong> to <strong>{latest}</strong>
        </span>
        <span>
          Showing <strong>{visibleEvents.length}</strong> of <strong>{events.length}</strong>
        </span>
      </div>

      <RouteSummaryTable events={events} />

      <div className="exchange-ledger-scroll">
        <table className="exchange-ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Route</th>
              <th>Given</th>
              <th>Received</th>
              <th>Balance-log rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => (
              <ExchangeLedgerRow key={event.id} event={event} />
            ))}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <div className="exchange-load-more">
          <span className="muted small">{remaining} more events hidden to keep this tab readable.</span>
          <div className="btn-row">
            <button
              className="btn small"
              onClick={() => setVisibleCount((count) => Math.min(count + VISIBLE_EVENTS_STEP, events.length))}
            >
              Show {Math.min(VISIBLE_EVENTS_STEP, remaining)} more
            </button>
            <button className="btn small" onClick={() => setVisibleCount(events.length)}>
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SwapsEvents({
  coinSwapEvents,
  autoExchangeEvents,
  eventsOrdersByAsset,
  eventsPayoutsByAsset
}: {
  coinSwapEvents: ExchangeEvent[];
  autoExchangeEvents: ExchangeEvent[];
  eventsOrdersByAsset: TotalsMap;
  eventsPayoutsByAsset: TotalsMap;
}) {
  const hasCoin = coinSwapEvents && coinSwapEvents.length > 0;
  const hasAuto = autoExchangeEvents && autoExchangeEvents.length > 0;
  const hasEvents = Object.keys(eventsOrdersByAsset || {}).length > 0 || Object.keys(eventsPayoutsByAsset || {}).length > 0;

  if (!hasCoin && !hasAuto && !hasEvents) return null;

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      {hasCoin && <EventSection title="Coin Swaps" filename="coin-swaps.png" events={coinSwapEvents} />}

      {hasAuto && (
        <EventSection
          title="Auto-Exchange"
          accent="#9333ea"
          filename="auto-exchange.png"
          events={autoExchangeEvents}
        />
      )}

      {hasEvents && (
        <EventContractsSection
          eventsOrdersByAsset={eventsOrdersByAsset}
          eventsPayoutsByAsset={eventsPayoutsByAsset}
        />
      )}
    </div>
  );
}
