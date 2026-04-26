// src/App.js
import React, { useState, useEffect, useRef } from "react";
import "./styles.css";
import PriceLookup from "./components/PriceLookup";
import FundingMacro from "./components/FundingMacro";
import MacroGenerator from "./components/MacroGenerator"; // New Component Import
import AverageCalculator from "./components/AverageCalculator";
import MarginRestrictions from "./components/MarginRestrictions";
import AdminDashboard from "./components/AdminDashboard";
import LiveTicker from './components/LiveTicker';
import { uiStrings } from "./locales";
import { useApp } from "./context/AppContext";
import { track } from "./analytics";

// Admin tab is shown only when the admin token is set in localStorage
function hasAdminToken() {
  try { return Boolean(localStorage.getItem('_fd_admin_token')); } catch { return false; }
}

export default function App() {
  const { activeSymbol } = useApp();
  const [activeTab, setActiveTab] = useState("macros");
  const [lang, setLang] = useState('en');
  const [showAdmin, setShowAdmin] = useState(hasAdminToken);
  const prevTab = useRef("macros");
  const prevLang = useRef('en');

  const t = uiStrings[lang] || uiStrings['en'];

  // Track page_view on mount
  useEffect(() => {
    track({ event: 'page_view', tab: 'macros', props: { lang, initial_tab: 'macros' } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Re-check admin token visibility whenever tabs are clicked
    setShowAdmin(hasAdminToken());
  };

  return (
    <div className="container">
      <div className="header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
            FD Macro Generator <span className="badge">{t.badge}</span>
            <LiveTicker />
          </div>
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
              title="Switch to English"
            >
              EN
            </button>
            <button
              className={`lang-btn ${lang === 'tr' ? 'active' : ''}`}
              onClick={() => setLang('tr')}
              title="Türkçe'ye geç"
            >
              TR
            </button>
          </div>
        </div>
        <div className="tabs" style={{ margin: 0, paddingBottom: '4px', flexWrap: 'wrap' }}>
          <button
            className={activeTab === "macros" ? "tab active" : "tab"}
            onClick={() => handleTabChange("macros")}
          >
            {t.tabMacro}
          </button>
          <button
            className={activeTab === "lookup" ? "tab active" : "tab"}
            onClick={() => handleTabChange("lookup")}
          >
            {t.tabLookup}
          </button>
          <button
            className={activeTab === "funding" ? "tab active" : "tab"}
            onClick={() => handleTabChange("funding")}
          >
            {t.tabFunding}
          </button>
          <button
            className={activeTab === "average" ? "tab active" : "tab"}
            onClick={() => handleTabChange("average")}
          >
            {t.tabAverage}
          </button>
          <button
            className={activeTab === "margin" ? "tab active" : "tab"}
            onClick={() => handleTabChange("margin")}
          >
            {t.tabMargin}
          </button>
          {showAdmin && (
            <button
              className={activeTab === "admin" ? "tab active" : "tab"}
              onClick={() => handleTabChange("admin")}
              title="Internal analytics dashboard"
              style={{ opacity: 0.7, fontSize: 12 }}
            >
              ⚙ Admin
            </button>
          )}
        </div>
      </div>

      {/* Makro Oluşturucu Paneli */}
      <div style={{ display: activeTab === "macros" ? "block" : "none" }}>
        <MacroGenerator lang={lang} uiStrings={t} />
      </div>

      {/* Fiyat Sorgulama Paneli */}
      <div style={{ display: activeTab === "lookup" ? "block" : "none" }}>
        <PriceLookup lang={lang} uiStrings={t} />
      </div>

      {/* Funding Makrosu Paneli */}
      <div style={{ display: activeTab === "funding" ? "block" : "none" }}>
        <FundingMacro lang={lang} uiStrings={t} />
      </div>

      {/* Average Calculator Paneli */}
      <div style={{ display: activeTab === "average" ? "block" : "none" }}>
        <AverageCalculator lang={lang} uiStrings={t} />
      </div>

      {/* Margin Restrictions Paneli */}
      <div style={{ display: activeTab === "margin" ? "block" : "none" }}>
        <MarginRestrictions lang={lang} />
      </div>

      {/* Admin Analytics Dashboard — only mounted when the tab is active */}
      {activeTab === "admin" && (
        <div>
          <AdminDashboard />
        </div>
      )}
    </div>
  );
}
