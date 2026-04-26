// src/components/MarginRestrictions.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRestricted,
  getApiKey,
  setApiKey,
  hasSharedKey,
  hasApiKey,
  getCached,
  getHistory,
  diagnoseTransfer,
  type CachedPayload,
  type TransferDiagnosis,
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
  const [mode, setMode] = useState<Mode>("check");
  const [data, setData] = useState<CachedPayload | null>(() => getCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(() => hasApiKey());
  const [showKey, setShowKey] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(() => !hasApiKey());
  const sharedKey = hasSharedKey();

  // Asset input for transfer check
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

  // auto-load on mount if a key is present and cache is empty/stale
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

  const diagnosis: TransferDiagnosis | null = useMemo(() => {
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

      {/* API key setup — only visible when no key is configured, or user toggles override */}
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
          <span>{isTr ? "🔑 Ortak API anahtarı kullanımda." : "🔑 Shared API key in use."}</span>
          <button
            type="button"
            className="tab"
            style={{ padding: "2px 8px", fontSize: 11, height: "auto" }}
            onClick={() => setShowKeyPanel(true)}
          >
            {isTr ? "Anahtarı Geçersiz Kıl" : "Override Key"}
          </button>
        </div>
      )}

      {showKeyPanel && (
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
              {isTr ? "Open-long kısıtlı" : "Open-long restricted"}:{" "}
              <b>{data.openLongRestrictedAsset.length}</b>
              {"  ·  "}
              {isTr ? "Teminat aşımı" : "Max collateral exceeded"}:{" "}
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
      <div className="option-cards" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className={`option-card ${mode === "check" ? "active" : ""}`} onClick={() => setMode("check")}>
          <span>{isTr ? "Transfer Kontrolü" : "Transfer Check"}</span>
        </div>
        <div className={`option-card ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}>
          <span>{isTr ? "Tam Liste" : "Full List"}</span>
        </div>
        <div className={`option-card ${mode === "history" ? "active" : ""}`} onClick={() => setMode("history")}>
          <span>{isTr ? "Değişim Günlüğü" : "Changes"}</span>
        </div>
      </div>

      {/* TRANSFER CHECK */}
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
                ? "Kontrol edilen: Bu varlık cross-margin hesabına TRANSFER edilebilir mi? Mevcut bakiyeleri ilgilendirmez."
                : "Checks whether this asset can be TRANSFERRED into the cross-margin account. Does not affect existing balances."}
            </div>
          </div>

          {diagnosis && (
            <div className="col-12">
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 10,
                  background: diagnosis.canTransferIn ? "rgba(46,189,133,0.08)" : "rgba(239,68,68,0.08)",
                  border: "1px solid " + (diagnosis.canTransferIn ? "rgba(46,189,133,0.4)" : "rgba(239,68,68,0.4)"),
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {diagnosis.canTransferIn
                    ? `🟢 ${diagnosis.asset}: ${isTr ? "TRANSFER EDİLEBİLİR" : "TRANSFER IN ALLOWED"}`
                    : `🔴 ${diagnosis.asset}: ${isTr ? "TRANSFER ENGELLİ" : "TRANSFER IN BLOCKED"} — ${diagnosis.reasonCode}`}
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 10 }}>{diagnosis.plainEnglish}</div>
                {diagnosis.customerReply && (
                  <>
                    <label className="label">{isTr ? "Müşteri Yanıtı (Kopyala-Yapıştır)" : "Customer Reply (copy-paste)"}</label>
                    <textarea className="textarea" value={diagnosis.customerReply} readOnly />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="tab" type="button" onClick={copyReply}>
                        📋 {isTr ? "Yanıtı Kopyala" : "Copy Reply"}
                      </button>
                      <a
                        className="tab"
                        href={diagnosis.faqUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
                      >
                        🔗 {isTr ? "FAQ Aç" : "Open FAQ"}
                      </a>
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
              🔴 {isTr ? "Transfer engelli (open-long kısıt.)" : "Transfer blocked (open-long restriction)"} ({filteredLists.openLong.length})
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
              🔴 {isTr ? "Transfer engelli (teminat limiti aşıldı)" : "Transfer blocked (max collateral exceeded)"} ({filteredLists.maxCollat.length})
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
                  <div>🔴 +Open-long: <code>{h.added.openLong.join(", ")}</code></div>
                )}
                {h.removed.openLong.length > 0 && (
                  <div>🟢 -Open-long: <code>{h.removed.openLong.join(", ")}</code></div>
                )}
                {h.added.maxCollateral.length > 0 && (
                  <div>🔴 +MaxCollateral: <code>{h.added.maxCollateral.join(", ")}</code></div>
                )}
                {h.removed.maxCollateral.length > 0 && (
                  <div>🟢 -MaxCollateral: <code>{h.removed.maxCollateral.join(", ")}</code></div>
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
