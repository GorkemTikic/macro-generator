import { useState, useEffect, useRef } from "react";
import "./styles.css";
import PriceLookup from "./components/PriceLookup";
import FundingMacro from "./components/FundingMacro";
import MacroGenerator from "./components/MacroGenerator";
import AverageCalculator from "./components/AverageCalculator";
import MarginRestrictions from "./components/MarginRestrictions";
import AdminDashboard from "./components/AdminDashboard";
import LiveTicker from './components/LiveTicker';
import BalanceLogAnalyzer from "./features/balance-log/BalanceLogAnalyzer";
import { uiStrings } from "./locales";
import { track, type Tab } from "./analytics";

// Admin tab is shown only when the admin token is set in localStorage
function hasAdminToken() {
  try { return Boolean(localStorage.getItem('_fd_admin_token')); } catch { return false; }
}

type Lang = 'en' | 'tr' | 'zh';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("macros");
  const [lang, setLang] = useState<Lang>('en');
  const [showAdmin, setShowAdmin] = useState(hasAdminToken);
  // Tabs that have been opened at least once during this page load. We mount on
  // first activation, then keep the component mounted (toggled with display:none)
  // so an agent who pastes a balance log and switches to e.g. Price Lookup
  // doesn't lose the parsed rows when they come back. State only resets on a
  // full page refresh.
  const [openedTabs, setOpenedTabs] = useState<Set<Tab>>(() => new Set<Tab>(["macros"]));
  const prevTab = useRef<Tab>("macros");
  const prevLang = useRef<Lang>('en');

  const t = uiStrings[lang] || uiStrings['en'];

  // Track page_view exactly once on mount. We deliberately read the *current*
  // values of activeTab/lang at fire time rather than depending on them, so
  // future state hydration (e.g. lang from localStorage) doesn't double-fire
  // a page_view on every change.
  const pageViewFired = useRef(false);
  useEffect(() => {
    if (pageViewFired.current) return;
    pageViewFired.current = true;
    track({ event: 'page_view', tab: activeTab, props: { lang } });
  }, [activeTab, lang]);

  // Track tab_switch when activeTab changes
  useEffect(() => {
    if (prevTab.current !== activeTab) {
      track({ event: 'tab_switch', tab: activeTab, props: { from: prevTab.current, to: activeTab } });
      prevTab.current = activeTab;
    }
  }, [activeTab]);

  // Track lang_switch
  useEffect(() => {
    if (prevLang.current !== lang) {
      track({ event: 'lang_switch', props: { from: prevLang.current, to: lang } });
      prevLang.current = lang;
    }
  }, [lang]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setOpenedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    // Re-check admin token visibility whenever tabs are clicked
    setShowAdmin(hasAdminToken());
  };

  return (
    <div className="container">
      <div className="app-shell">
        {/* Header: brand-mark + name + subtitle | live ticker + source pill + lang + admin */}
        <div className="appbar">
          <div className="header brand">
            <div className="brand-mark" aria-hidden="true">FD</div>
            <div className="brand-name">Futures DeskMate</div>
            <span className="brand-sub">
              {lang === 'tr'
                ? 'Binance Futures destek çalışma alanı'
                : lang === 'zh'
                  ? '币安合约客服工作台'
                  : 'Binance Futures support workspace'}
            </span>
          </div>
          <div className="appbar-right">
            <LiveTicker />
            <span className="src-badge"><span className="dot" /> {t.badge}</span>
            <div className="lang-switcher" role="group" aria-label="Language">
              <button
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
                title="Switch to English"
              >
                <span className="lang-flag" aria-hidden="true">
                  {/* UK flag — inline SVG so it renders the same on every OS.
                      Windows' Segoe UI Emoji doesn't include 🇬🇧/🇹🇷 glyphs and
                      falls back to "GB"/"TR" letters. */}
                  <svg width="18" height="12" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <clipPath id="fd-uk-clip"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
                    <clipPath id="fd-uk-tri"><path d="M30,15 h30 v15 z v-15 h-30 z h-30 v-15 z v15 h30 z"/></clipPath>
                    <g clipPath="url(#fd-uk-clip)">
                      <rect width="60" height="30" fill="#012169"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#fd-uk-tri)" stroke="#C8102E" strokeWidth="4"/>
                      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                    </g>
                  </svg>
                </span>
                <span>EN</span>
              </button>
              <button
                className={`lang-btn ${lang === 'tr' ? 'active' : ''}`}
                onClick={() => setLang('tr')}
                title="Türkçe'ye geç"
              >
                <span className="lang-flag" aria-hidden="true">
                  {/* Turkish flag — inline SVG. Crescent = white circle minus a
                      slightly-offset red circle; star = 5-point star next to it. */}
                  <svg width="18" height="12" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect width="30" height="20" fill="#E30A17"/>
                    <circle cx="11.25" cy="10" r="4.5" fill="#fff"/>
                    <circle cx="12.4" cy="10" r="3.6" fill="#E30A17"/>
                    <polygon
                      fill="#fff"
                      transform="translate(17.5 10) scale(2.2) rotate(-9)"
                      points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"
                    />
                  </svg>
                </span>
                <span>TR</span>
              </button>
              <button
                className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
                onClick={() => setLang('zh')}
                title="切换到中文"
              >
                <span className="lang-flag" aria-hidden="true">
                  {/* China flag — 5:3 ratio, gold star + 4 small stars on red. */}
                  <svg width="18" height="12" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect width="30" height="20" fill="#DE2910"/>
                    {/* big star */}
                    <polygon
                      fill="#FFDE00"
                      transform="translate(5 5) scale(3)"
                      points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"
                    />
                    {/* 4 small stars in arc around big star */}
                    <polygon fill="#FFDE00" transform="translate(10 2) scale(0.9) rotate(23)"  points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"/>
                    <polygon fill="#FFDE00" transform="translate(12 4) scale(0.9) rotate(46)"  points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"/>
                    <polygon fill="#FFDE00" transform="translate(12 7) scale(0.9) rotate(70)"  points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"/>
                    <polygon fill="#FFDE00" transform="translate(10 9) scale(0.9) rotate(93)"  points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309"/>
                  </svg>
                </span>
                <span>ZH</span>
              </button>
            </div>
            {showAdmin && (
              <button
                className={`admin-chip ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => handleTabChange('admin')}
                title="Internal analytics dashboard"
              >
                <span className="admin-gear" aria-hidden="true">⚙</span>
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "macros"}
            className={activeTab === "macros" ? "tab active" : "tab"}
            onClick={() => handleTabChange("macros")}
          >
            <span className="ix">01</span> {t.tabMacro}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "lookup"}
            className={activeTab === "lookup" ? "tab active" : "tab"}
            onClick={() => handleTabChange("lookup")}
          >
            <span className="ix">02</span> {t.tabLookup}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "funding"}
            className={activeTab === "funding" ? "tab active" : "tab"}
            onClick={() => handleTabChange("funding")}
          >
            <span className="ix">03</span> {t.tabFunding}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "average"}
            className={activeTab === "average" ? "tab active" : "tab"}
            onClick={() => handleTabChange("average")}
          >
            <span className="ix">04</span> {t.tabAverage}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "margin"}
            className={activeTab === "margin" ? "tab active" : "tab"}
            onClick={() => handleTabChange("margin")}
          >
            <span className="ix">05</span> {t.tabMargin}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "balanceLog"}
            className={activeTab === "balanceLog" ? "tab active" : "tab"}
            onClick={() => handleTabChange("balanceLog")}
          >
            <span className="ix">06</span> {t.tabBalanceLog}
            <span style={{ fontSize: '9px', background: '#f6465d', color: '#fff', padding: '2px 5px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>NEW</span>
          </button>
        </div>
      </div>

      {/* Tab content panels. The `tab-panel` class only animates on the active
          panel — inactive panels are display:none so the keyframe never runs.
          Keying on activeTab forces React to re-attach the class for each
          switch, which triggers the 120 ms cross-fade per design deck slide 12. */}
      <main aria-label="Workspace">
      <h1 className="visually-hidden">Futures DeskMate</h1>
      <div style={{ display: activeTab === "macros" ? "block" : "none" }}
           className={activeTab === "macros" ? "tab-panel" : undefined}>
        <MacroGenerator lang={lang} uiStrings={t} />
      </div>

      <div style={{ display: activeTab === "lookup" ? "block" : "none" }}
           className={activeTab === "lookup" ? "tab-panel" : undefined}>
        <PriceLookup lang={lang} uiStrings={t} />
      </div>

      <div style={{ display: activeTab === "funding" ? "block" : "none" }}
           className={activeTab === "funding" ? "tab-panel" : undefined}>
        <FundingMacro lang={lang} uiStrings={t} />
      </div>

      <div style={{ display: activeTab === "average" ? "block" : "none" }}
           className={activeTab === "average" ? "tab-panel" : undefined}>
        <AverageCalculator lang={lang} uiStrings={t} />
      </div>

      <div style={{ display: activeTab === "margin" ? "block" : "none" }}
           className={activeTab === "margin" ? "tab-panel" : undefined}>
        <MarginRestrictions lang={lang} />
      </div>

      {/* Balance Log Analyzer Paneli — mounted on first activation, then kept
          mounted with display:none so pasted rows survive tab switches.
          State only resets on a full page refresh. recharts/html2canvas are
          lazy-loaded by the feature itself, so users who never open the tab
          don't pay their bundle cost. */}
      {openedTabs.has("balanceLog") && (
        <div style={{ display: activeTab === "balanceLog" ? "block" : "none" }}
             className={activeTab === "balanceLog" ? "tab-panel" : undefined}>
          <BalanceLogAnalyzer lang={lang} uiStrings={t} />
        </div>
      )}

      {/* Admin Analytics Dashboard — only mounted when the tab is active */}
      {activeTab === "admin" && (
        <div className="tab-panel">
          <AdminDashboard />
        </div>
      )}
      </main>
    </div>
  );
}
