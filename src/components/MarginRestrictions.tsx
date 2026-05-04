// src/components/MarginRestrictions.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRestricted,
  getApiKey,
  setApiKey,
  hasSharedKey,
  hasApiKey,
  isUsingWorkerProxy,
  getCached,
  getHistory,
  diagnoseTransfer,
  type CachedPayload,
  type AssetRestriction,
} from "../margin/restrictedAssets";
import { track } from "../analytics";

type Mode = "check" | "list" | "history";

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
}

export default function MarginRestrictions({ lang }: { lang: string }) {
  const isTr = lang === "tr";
  const workerProxy = isUsingWorkerProxy();
  const [mode, setMode] = useState<Mode>("check");
  const [data, setData] = useState<CachedPayload | null>(() => getCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(() => hasApiKey());
  const [showKey, setShowKey] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(() => !hasApiKey());
  const sharedKey = hasSharedKey();

  // Asset input for restriction check
  const [asset, setAsset] = useState("CHZ");

  // List filter
  const [filter, setFilter] = useState("");

  const refresh = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const fresh = await fetchRestricted({ force });
      setData(fresh);
      if (force) {
        track({ event: 'margin_refresh', tab: 'margin', props: { has_api_key: hasApiKey() } });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg === "MISSING_API_KEY") {
        setError(isTr ? "Binance API anahtarı gerekli. Aşağıdan girin." : "Binance API key required. Enter it below.");
      } else {
        setError(msg);
      }
      track({ event: 'margin_error', tab: 'margin', props: { error: String(msg).slice(0, 120) } });
    } finally {
      setLoading(false);
    }
  };

  // auto-load on mount if a key is present (or Worker proxy is active) and cache is stale
  useEffect(() => {
    track({ event: 'margin_view', tab: 'margin', props: { has_api_key: hasApiKey() } });
    if (keySaved && (!data || Date.now() - data.fetchedAt > 60_000)) {
      refresh(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveKey = () => {
    setApiKey(keyInput);
    const ok = Boolean(keyInput.trim()) || sharedKey;
    setKeySaved(ok);
    if (ok) {
      setShowKeyPanel(false);
      refresh(true);
    }
  };

  const diagnosis: AssetRestriction | null = useMemo(() => {
    if (!data || !asset.trim()) return null;
    return diagnoseTransfer(asset, data);
  }, [asset, data]);

  const filteredLists = useMemo(() => {
    if (!data) return null;
    const f = filter.trim().toUpperCase();
    const openLong = f
      ? data.openLongRestrictedAsset.filter(a => a.includes(f))
      : data.openLongRestrictedAsset;
    const maxCollat = f
      ? data.maxCollateralExceededAsset.filter(a => a.includes(f))
      : data.maxCollateralExceededAsset;
    return { openLong, maxCollat };
  }, [data, filter]);

  const history = useMemo(() => getHistory().slice().reverse(), [data]);

  const copyReply = async () => {
    if (!diagnosis?.customerReply) return;
    try {
      await navigator.clipboard.writeText(diagnosis.customerReply);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="panel">
      <h3>{isTr ? "Margin Kısıtlamaları" : "Margin Restrictions"}</h3>

      {/* No key configured — only shown when Worker proxy is off and no key available */}
      {!keySaved && !sharedKey && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px dashed rgba(239,68,68,0.5)",
            padding: 12,
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
            color: "#fca5a5",
          }}
        >
          {isTr
            ? "Bu özellik Binance API anahtarı gerektirir (MARKET_DATA)."
            : "This feature requires a Binance API key (MARKET_DATA endpoint)."}
        </div>
      )}

      {/* Shared / Worker key indicator */}
      {sharedKey && !showKeyPanel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#9aa4b2",
            marginBottom: 10,
          }}
        >
          <span>
            {workerProxy
              ? (isTr ? "🔑 Sunucu tarafı API anahtarı etkin (Cloudflare Worker)." : "🔑 Server-side API key active (Cloudflare Worker).")
              : (isTr ? "🔑 Ortak API anahtarı kullanımda." : "🔑 Shared API key in use.")}
          </span>
          {/* Only show override when not using Worker proxy — browser-side key is meaningless when Worker handles auth */}
          {!workerProxy && (
            <button
              type="button"
              className="tab"
              style={{ padding: "2px 8px", fontSize: 11, height: "auto" }}
              onClick={() => setShowKeyPanel(true)}
            >
              {isTr ? "Anahtarı Geçersiz Kıl" : "Override Key"}
            </button>
          )}
        </div>
      )}

      {showKeyPanel && !workerProxy && (
        <div className="grid" style={{ marginBottom: 10 }}>
          <div className="col-12">
            <label className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{isTr ? "API Anahtarı (yalnızca bu tarayıcı için geçersiz kılma)" : "API Key (override for this browser only)"}</span>
              {sharedKey && (
                <button
                  type="button"
                  className="tab"
                  style={{ padding: "2px 8px", fontSize: 11, height: "auto" }}
                  onClick={() => {
                    setApiKey("");
                    setKeyInput("");
                    setKeySaved(true);
                    setShowKeyPanel(false);
                  }}
                >
                  {isTr ? "Ortağa Dön" : "Use Shared"}
                </button>
              )}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="input"
                type={showKey ? "text" : "password"}
                placeholder="X-MBX-APIKEY"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="tab" type="button" onClick={() => setShowKey(s => !s)} title="toggle visibility">
                {showKey ? "🙈" : "👁"}
              </button>
              <button className="btn" type="button" onClick={handleSaveKey} style={{ width: "auto", padding: "0 14px" }}>
                {isTr ? "Kaydet" : "Save"}
              </button>
            </div>
            <div className="helper" style={{ fontSize: 11, marginTop: 4 }}>
              {isTr
                ? "İpucu: Yalnızca okunur, IP ile kısıtlı bir anahtar kullanın. Gizli anahtar GEREKMEZ."
                : "Tip: read-only, IP-whitelisted key. No secret needed."}
            </div>
          </div>
        </div>
      )}

      {/* Data freshness + refresh */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 12px",
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12,
        }}
      >
        <div>
          {data ? (
            <span>
              {isTr ? "Veri tarihi" : "Data as of"}: <b>{fmtTime(data.fetchedAt)}</b>
              {"  ·  "}
              {isTr ? "Buy Long kısıtlı" : "Buy Long restricted"}:{" "}
              <b>{data.openLongRestrictedAsset.length}</b>
              {"  ·  "}
              {isTr ? "Teminat limiti aşıldı" : "Max collateral exceeded"}:{" "}
              <b>{data.maxCollateralExceededAsset.length}</b>
            </span>
          ) : (
            <span style={{ color: "#9aa4b2" }}>{isTr ? "Henüz yüklenmedi." : "No data loaded yet."}</span>
          )}
        </div>
        <button className="tab" type="button" onClick={() => refresh(true)} disabled={loading || !keySaved}>
          {loading ? (isTr ? "Yükleniyor..." : "Loading...") : isTr ? "Yenile" : "Refresh"}
        </button>
      </div>

      {/* Mode tabs */}
      <label className="label">{isTr ? "Mod" : "Mode"}</label>
      <div className="option-cards" role="tablist" aria-label={isTr ? "Mod" : "Mode"} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <button type="button" role="tab" aria-selected={mode === "check"} className={`option-card ${mode === "check" ? "active" : ""}`} onClick={() => setMode("check")}>
          <span>{isTr ? "Kısıtlama Kontrolü" : "Restriction Check"}</span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "list"} className={`option-card ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}>
          <span>{isTr ? "Tam Liste" : "Full List"}</span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "history"} className={`option-card ${mode === "history" ? "active" : ""}`} onClick={() => setMode("history")}>
          <span>{isTr ? "Değişim Günlüğü" : "Changes"}</span>
        </button>
      </div>

      {/* RESTRICTION CHECK */}
      {mode === "check" && (
        <div className="grid">
          <div className="col-12">
            <label className="label">{isTr ? "Varlık (ör. CHZ)" : "Asset (e.g. CHZ)"}</label>
            <input
              className="input"
              placeholder="CHZ"
              value={asset}
              onChange={e => setAsset(e.target.value.toUpperCase())}
            />
            <div className="helper" style={{ fontSize: 11, marginTop: 4 }}>
              {isTr
                ? "Binance Margin Alım (Long) Risk Kontrolü: bu varlıkta açık/artan long kısıtı var mı? Pozisyon kapatma ve borç geri ödeme her zaman mümkündür."
                : "Checks for Binance Margin Buy (Long) Risk Control. Open/increase long may be restricted; close position and repay debt are always allowed."}
            </div>
          </div>

          {diagnosis && (
            <div className="col-12">
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 10,
                  background: diagnosis.canBuyLong ? "rgba(46,189,133,0.08)" : "rgba(239,68,68,0.08)",
                  border: "1px solid " + (diagnosis.canBuyLong ? "rgba(46,189,133,0.4)" : "rgba(239,68,68,0.4)"),
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {diagnosis.canBuyLong && diagnosis.canTransferIn
                    ? `🟢 ${diagnosis.asset}: ${isTr ? "KISITLAMA YOK" : "NO RESTRICTIONS"}`
                    : diagnosis.reasonCode === "OPEN_LONG_RESTRICTED"
                    ? `🔴 ${diagnosis.asset}: ${isTr ? "MARGIN ALIM (LONG) KISITLI" : "MARGIN BUY (LONG) RESTRICTED"}`
                    : diagnosis.reasonCode === "MAX_COLLATERAL_EXCEEDED"
                    ? `🟡 ${diagnosis.asset}: ${isTr ? "TEMİNAT LİMİTİ AŞILDI" : "MAX COLLATERAL EXCEEDED"}`
                    : `🔴 ${diagnosis.asset}: ${isTr ? "KISITLAMALAR AKTİF" : "RESTRICTIONS ACTIVE"}`}
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 10, whiteSpace: "pre-wrap" }}>
                  {diagnosis.plainEnglish}
                </div>
                {diagnosis.customerReply && (
                  <>
                    <label className="label">{isTr ? "Müşteri Yanıtı (Kopyala-Yapıştır)" : "Customer Reply (copy-paste)"}</label>
                    <textarea className="textarea" value={diagnosis.customerReply} readOnly rows={10} />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="tab" type="button" onClick={copyReply}>
                        📋 {isTr ? "Yanıtı Kopyala" : "Copy Reply"}
                      </button>
                      {(diagnosis.faqLinks.length ? diagnosis.faqLinks : [{ label: "FAQ", url: diagnosis.faqUrl }]).map(link => (
                        <a
                          key={link.url}
                          className="tab"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
                        >
                          🔗 {isTr ? "FAQ Aç" : link.label}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL LIST */}
      {mode === "list" && filteredLists && (
        <div className="grid">
          <div className="col-12">
            <label className="label">{isTr ? "Filtrele" : "Filter"}</label>
            <input className="input" placeholder="BTC" value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <div className="col-6">
            <label className="label">
              🔴 {isTr ? "Margin Buy (Long) Kısıtlı" : "Margin Buy (Long) Restricted"} ({filteredLists.openLong.length})
            </label>
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: 1.6,
              }}
            >
              {filteredLists.openLong.length === 0
                ? (isTr ? "Eşleşme yok." : "No matches.")
                : filteredLists.openLong.map(a => <div key={a}>{a}</div>)}
            </div>
          </div>
          <div className="col-6">
            <label className="label">
              🟡 {isTr ? "Teminat limiti aşıldı" : "Max collateral exceeded"} ({filteredLists.maxCollat.length})
            </label>
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: 1.6,
              }}
            >
              {filteredLists.maxCollat.length === 0
                ? (isTr ? "Eşleşme yok." : "No matches.")
                : filteredLists.maxCollat.map(a => <div key={a}>{a}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {mode === "history" && (
        <div style={{ marginTop: 10 }}>
          {history.length === 0 ? (
            <div className="helper" style={{ color: "#9aa4b2" }}>
              {isTr
                ? "Henüz kayıt yok. Liste her yenilemede karşılaştırılır ve değişiklikler buraya yazılır."
                : "No entries yet. The list is compared on each refresh and changes are logged here."}
            </div>
          ) : (
            history.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  marginBottom: 8,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{fmtTime(h.ts)}</div>
                {h.added.openLong.length > 0 && (
                  <div>🔴 +Buy Long restricted: <code>{h.added.openLong.join(", ")}</code></div>
                )}
                {h.removed.openLong.length > 0 && (
                  <div>🟢 -Buy Long restriction lifted: <code>{h.removed.openLong.join(", ")}</code></div>
                )}
                {h.added.maxCollateral.length > 0 && (
                  <div>🟡 +MaxCollateral: <code>{h.added.maxCollateral.join(", ")}</code></div>
                )}
                {h.removed.maxCollateral.length > 0 && (
                  <div>🟢 -MaxCollateral lifted: <code>{h.removed.maxCollateral.join(", ")}</code></div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <div className="helper" style={{ color: "#ff6b6b", marginTop: 10 }}>
          {isTr ? "Hata:" : "Error:"} {error}
        </div>
      )}
    </div>
  );
}
