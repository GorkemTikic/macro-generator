// src/App.js
import React, { useState } from "react";
import "./styles.css";
import PriceLookup from "./components/PriceLookup";
import FundingMacro from "./components/FundingMacro";
import MacroGenerator from "./components/MacroGenerator"; // New Component Import
import LiveTicker from './components/LiveTicker';
import { uiStrings } from "./locales";
import { useApp } from "./context/AppContext";

export default function App() {
  const { activeSymbol } = useApp();
  const [activeTab, setActiveTab] = useState("macros");
  const [lang, setLang] = useState('en');

  const t = uiStrings[lang] || uiStrings['en'];

  return (
    <div className="container">
      <div className="header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
          Order Macro App <span className="badge">{t.badge}</span>
          <LiveTicker />
        </div>
        <div className="tabs">
          <button
            className={activeTab === "macros" ? "tab active" : "tab"}
            onClick={() => setActiveTab("macros")}
          >
            {t.tabMacro}
          </button>
          <button
            className={activeTab === "lookup" ? "tab active" : "tab"}
            onClick={() => setActiveTab("lookup")}
          >
            {t.tabLookup}
          </button>
          <button
            className={activeTab === "funding" ? "tab active" : "tab"}
            onClick={() => setActiveTab("funding")}
          >
            {t.tabFunding}
          </button>
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
    </div>
  );
}
