// All Balance Log markup is wrapped in `.balance-log-app` so its global-looking
// class names (.container, .header, .btn, .tab, .card, .kpi, ...) only match
// styles in `./balance-log.css`, which scopes every selector under that wrapper.
import { useMemo, useState, useEffect, lazy, Suspense } from "react";
import GridPasteBox from "./components/GridPasteBox";
import FilterBar from "./components/FilterBar";
import SwapsEvents from "./components/SwapsEvents";
import SymbolTable from "./components/SymbolTable";
import RpnTable from "./components/RpnTable";
import Tabs, { TabKey, type TabLabels } from "./components/Tabs";
import KpiStat from "./components/KpiStat";
import TypeFilter from "./components/TypeFilter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import type { Row } from "./lib/story";
import type { LocalLang } from "./lib/i18n";
import { parseText, type ParseResult } from "./lib/balanceLog";
import { buildExchangeEvents } from "./lib/exchangeEvents";
import "./balance-log.css";
import "./balance-log-overrides.css";

/**
 * Strings the host app passes in for the BL analyzer chrome (header, KPIs,
 * inner tabs, diagnostics). The StoryDrawer carries its own 10-language i18n
 * via `lib/i18n.ts` (Narrative/Audit/Charts/Raw); this only covers the surface
 * an agent sees before opening the drawer.
 */
export type BalanceLogStrings = {
  blTitle: string;
  blSubtitle: string;
  blClear: string;
  blClearTooltip: string;
  blOpenStory: string;
  blRowsTotal: string;
  blRowsFiltered: string;
  blSymbolsFiltered: string;
  blTabSummary: string;
  blTabBySymbol: string;
  blTabSwaps: string;
  blTabDiagnostics: string;
  blDiagTotalPasted: string;
  blDiagIncluded: string;
  blDiagExcluded: string;
  blDiagInvalid: string;
  blDiagAfterFilters: string;
  blDiagSymbols: string;
  blDiagTypes: string;
  blDiagFormat: string;
  blDiagHeader: string;
  blDiagRawTypes: string;
  blDiagWarnings: string;
  blDiagExcludedTitle: string;
  blDiagInvalidTitle: string;
  blNoRowsProblems: string;
  blNoRows: string;
};

const StoryDrawer = lazy(() => import("./components/StoryDrawer"));

type TotalsMap = Record<string, { pos: number; neg: number; net: number }>;
type TotalsByType = Record<string, TotalsMap>;

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

function parseBalanceLog(text: string): { rows: Row[]; meta: ParseResult } {
  const meta = parseText(text);
  const rows: Row[] = meta.included.map((p) => ({
    id: p.id,
    uid: p.uid,
    asset: p.asset,
    type: p.type,
    amountStr: p.amountStr,
    amount: p.amount,
    time: p.time,
    ts: p.ts,
    symbol: p.symbol,
    extra: p.extra,
    raw: p.raw
  }));
  return { rows, meta };
}

function sumByAsset(rows: Row[]): TotalsMap {
  const acc: TotalsMap = {};
  for (const r of rows) {
    const a = (acc[r.asset] ||= { pos: 0, neg: 0, net: 0 });
    if (r.amount >= 0) a.pos += r.amount;
    else a.neg += Math.abs(r.amount);
    a.net += r.amount;
  }
  return acc;
}

function groupByTypeAndAsset(rows: Row[]): TotalsByType {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.type || "(unknown)";
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(r);
  }
  const out: TotalsByType = {};
  for (const [t, list] of map.entries()) out[t] = sumByAsset(list);
  return out;
}

function humanize(t: string) {
  return t.replace(/_/g, " ").replace(/\b[a-z]/g, (s) => s.toUpperCase());
}

function BalanceLogInner({ lang, t }: { lang: LocalLang; t: BalanceLogStrings }) {
  const [rawRows, setRows] = useState<Row[]>([]);
  const [parseMeta, setParseMeta] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  // Bumped on Clear to force GridPasteBox to reset its internal grid preview.
  const [pasteBoxKey, setPasteBoxKey] = useState(0);

  const [hiddenTypes, setHiddenTypes] = useLocalStorage<readonly string[]>("bl.types.hidden", []);
  const hiddenTypeSet = useMemo(() => new Set(hiddenTypes), [hiddenTypes]);

  const [tab, setTab] = useState<TabKey>("summary");
  const [drawerOpen, setDrawerOpen] = useLocalStorage<boolean>("bl.story.open", false);

  // One-time migration: clear stale keys from earlier balance-log versions
  // ("bl.filters.v4", "bl.types.selected"). Guarded by a sentinel so the
  // migration runs at most once per browser. Without the guard, a future user
  // who legitimately writes to those keys would have them silently wiped on
  // every mount.
  useEffect(() => {
    const SENTINEL = "bl.migrated.v5";
    try {
      if (localStorage.getItem(SENTINEL) === "1") return;
      localStorage.removeItem("bl.filters.v4");
      localStorage.removeItem("bl.types.selected");
      localStorage.setItem(SENTINEL, "1");
    } catch {
      // localStorage may be unavailable in private/restricted contexts.
    }
  }, []);

  function runParse(tsv: string) {
    try {
      const { rows: rs, meta } = parseBalanceLog(tsv);
      setRows(rs);
      setParseMeta(meta);
      const problems = meta.invalid.length + meta.excluded.length;
      if (!rs.length) {
        setError(
          problems
            ? t.blNoRowsProblems
                .replace("{n_excluded}", String(meta.excluded.length))
                .replace("{n_invalid}", String(meta.invalid.length))
            : t.blNoRows
        );
      } else {
        setError("");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setRows([]);
      setParseMeta(null);
    }
  }

  function clearAll() {
    setRows([]);
    setParseMeta(null);
    setError("");
    setPasteBoxKey((k) => k + 1);
  }

  const detectedTypes = useMemo(() => {
    const s = new Set<string>();
    for (const r of rawRows) s.add(r.type || "(unknown)");
    return Array.from(s).sort();
  }, [rawRows]);

  const rows = useMemo(() => {
    if (hiddenTypeSet.size === 0) return rawRows;
    return rawRows.filter((r) => !hiddenTypeSet.has(r.type || "(unknown)"));
  }, [rawRows, hiddenTypeSet]);

  const totalsByType = useMemo(() => groupByTypeAndAsset(rows), [rows]);

  const coinSwapEvents = useMemo(() => buildExchangeEvents(rows, "coinSwap"), [rows]);
  const autoExchangeEvents = useMemo(() => buildExchangeEvents(rows, "autoExchange"), [rows]);
  const eventsOrdersByAsset = useMemo(() => sumByAsset(rows.filter((r) => r.type === "EVENT_CONTRACTS_ORDER")), [rows]);
  const eventsPayoutsByAsset = useMemo(
    () => sumByAsset(rows.filter((r) => r.type === "EVENT_CONTRACTS_PAYOUT")),
    [rows]
  );

  const kpiTotal = rawRows.length;
  const kpiFiltered = rows.length;
  const kpiSymbols = new Set(rows.map((r) => r.symbol).filter(Boolean)).size;

  const typeOrder = useMemo(() => {
    const entries = Object.entries(totalsByType);
    const magnitude = (m: TotalsMap) => Object.values(m).reduce((a, v) => a + Math.abs(v.net) + v.pos + v.neg, 0);
    return entries.sort((a, b) => magnitude(b[1]) - magnitude(a[1]));
  }, [totalsByType]);

  const typeCounts = useMemo(
    () =>
      rawRows.reduce((acc: Record<string, number>, r) => {
        const k = r.type || "(unknown)";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
    [rawRows]
  );

  const tabLabels: TabLabels = {
    summary: t.blTabSummary,
    symbol: t.blTabBySymbol,
    swaps: t.blTabSwaps,
    diag: t.blTabDiagnostics
  };

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">{t.blTitle}</h1>
          <div className="subtitle">{t.blSubtitle}</div>
        </div>
        <div className="toolbar bl-toolbar">
          <button
            className="btn bl-toolbar-btn bl-toolbar-btn-secondary"
            onClick={clearAll}
            disabled={rawRows.length === 0 && !error}
            title={t.blClearTooltip}
          >
            {t.blClear}
          </button>
          <button
            className="btn btn-dark bl-toolbar-btn"
            onClick={() => setDrawerOpen(true)}
          >
            {t.blOpenStory}
          </button>
        </div>
      </header>

      <FilterBar rows={rows} />

      <TypeFilter
        types={detectedTypes}
        hidden={hiddenTypeSet}
        onChange={(next) => setHiddenTypes(Array.from(next))}
        onShowAll={() => setHiddenTypes([])}
        onHideAll={() => setHiddenTypes(detectedTypes)}
        counts={typeCounts}
      />

      <section className="space">
        <GridPasteBox key={pasteBoxKey} onUseTSV={runParse} onError={setError} />
        {error && (
          <div className="error" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}
      </section>

      <section className="kpi-row">
        <KpiStat label={t.blRowsTotal} value={kpiTotal} />
        <KpiStat label={t.blRowsFiltered} value={kpiFiltered} />
        <KpiStat label={t.blSymbolsFiltered} value={kpiSymbols} />
      </section>

      <Tabs active={tab} onChange={setTab} labels={tabLabels} />

      {tab === "summary" && (
        <section className="grid-2">
          {typeOrder.map(([typeKey, totals]) => (
            <RpnTable key={typeKey} title={humanize(typeKey)} map={totals} />
          ))}
        </section>
      )}

      {tab === "symbol" && (
        <section style={{ marginTop: 12 }}>
          <SymbolTable
            rows={rows.map((r) => ({
              symbol: r.symbol,
              asset: r.asset,
              type: r.type,
              amount: r.amount
            }))}
          />
        </section>
      )}

      {tab === "swaps" && (
        <section style={{ marginTop: 12 }}>
          <SwapsEvents
            coinSwapEvents={coinSwapEvents}
            autoExchangeEvents={autoExchangeEvents}
            eventsOrdersByAsset={eventsOrdersByAsset}
            eventsPayoutsByAsset={eventsPayoutsByAsset}
          />
        </section>
      )}

      {tab === "diag" && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>
            {t.blTabDiagnostics}
          </h3>
          <ul className="mono small" style={{ lineHeight: "20px", marginTop: 8 }}>
            <li>{t.blDiagTotalPasted}: {parseMeta?.totalInputRows ?? rawRows.length}</li>
            <li>{t.blDiagIncluded}: {rawRows.length}</li>
            <li>{t.blDiagExcluded}: {parseMeta?.excluded.length ?? 0}</li>
            <li>{t.blDiagInvalid}: {parseMeta?.invalid.length ?? 0}</li>
            <li>{t.blDiagAfterFilters}: {rows.length}</li>
            <li>{t.blDiagSymbols}: {kpiSymbols}</li>
            <li>{t.blDiagTypes}: {Object.keys(totalsByType).length}</li>
            <li>{t.blDiagFormat}: {parseMeta?.inputFormat ?? "—"}</li>
            <li>{t.blDiagHeader}: {parseMeta?.headerUsed ? parseMeta.headerUsed.join(" | ") : "—"}</li>
          </ul>
          {parseMeta && Object.keys(parseMeta.rawTypes).length > 0 && (
            <>
              <h4 className="section-title" style={{ marginTop: 16, marginBottom: 6 }}>{t.blDiagRawTypes}</h4>
              <ul className="mono small">
                {Object.entries(parseMeta.rawTypes).sort((a, b) => b[1] - a[1]).map(([typeKey, n]) => (
                  <li key={typeKey}>{typeKey} <span style={{ opacity: 0.6 }}>× {n}</span>{parseMeta.unknownTypes.includes(typeKey) ? " [UNKNOWN]" : ""}</li>
                ))}
              </ul>
            </>
          )}
          {parseMeta && parseMeta.warnings.length > 0 && (
            <>
              <h4 className="section-title" style={{ marginTop: 16, marginBottom: 6 }}>{t.blDiagWarnings}</h4>
              <ul className="mono small">
                {parseMeta.warnings.map((w, i) => (
                  <li key={i}>{w.rowIndex ? `row ${w.rowIndex}: ` : ""}{w.message}</li>
                ))}
              </ul>
            </>
          )}
          {parseMeta && parseMeta.excluded.length > 0 && (
            <>
              <h4 className="section-title" style={{ marginTop: 16, marginBottom: 6 }}>{t.blDiagExcludedTitle}</h4>
              <ul className="mono small" style={{ maxHeight: 240, overflow: "auto" }}>
                {parseMeta.excluded.slice(0, 200).map((r, i) => (
                  <li key={i}>row {r.rowIndex} – {r.asset} {r.type} {r.amountStr} – {r.excludeReason}</li>
                ))}
              </ul>
            </>
          )}
          {parseMeta && parseMeta.invalid.length > 0 && (
            <>
              <h4 className="section-title" style={{ marginTop: 16, marginBottom: 6 }}>{t.blDiagInvalidTitle}</h4>
              <ul className="mono small" style={{ maxHeight: 240, overflow: "auto" }}>
                {parseMeta.invalid.slice(0, 200).map((r, i) => (
                  <li key={i}>row {r.rowIndex} – {r.reason} – <span style={{ opacity: 0.6 }}>{r.raw}</span></li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <Suspense fallback={null}>
        <StoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} rows={rows} initialLang={lang} />
      </Suspense>
    </div>
  );
}

export default function BalanceLogAnalyzer({
  lang = "en",
  uiStrings
}: {
  /** Host language. The drawer's own language selector still lets the agent
   *  pick any of 10 supported drawer languages independently. */
  lang?: LocalLang;
  uiStrings: BalanceLogStrings;
}) {
  return (
    <div className="balance-log-app">
      <ErrorBoundary>
        <ToastProvider>
          <BalanceLogInner lang={lang} t={uiStrings} />
        </ToastProvider>
      </ErrorBoundary>
    </div>
  );
}
