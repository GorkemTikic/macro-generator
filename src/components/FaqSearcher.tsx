import React, { useEffect, useMemo, useState } from "react";
import { track } from "../analytics";
import {
  buildCitationPack,
  catalogStats,
  searchFaqCatalog,
  type FaqSearchResult,
} from "../faqSearch";

type Lang = "en" | "tr" | "zh";

type CopyPayload = {
  text: string;
  label: string;
};

function textFor(lang: Lang, en: string, tr: string, zh: string): string {
  if (lang === "tr") return tr;
  if (lang === "zh") return zh;
  return en;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const usableTerms = terms
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 5);

  if (!usableTerms.length) return <>{text}</>;

  const regex = new RegExp(`(${usableTerms.map(escapeRegExp).join("|")})`, "ig");
  return (
    <>
      {text.split(regex).map((part, index) => {
        const isMatch = usableTerms.some((term) => part.toLowerCase() === term.toLowerCase());
        return isMatch
          ? <mark key={`${part}-${index}`}>{part}</mark>
          : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </>
  );
}

function resultCitation(result: FaqSearchResult): string {
  const entry = result.entry;
  const topics = entry.keyTopics.length ? `\nTopics: ${entry.keyTopics.slice(0, 5).join(", ")}` : "";
  return `${entry.title}\n${entry.url}\nProduct: ${entry.product} | Source: ${entry.source} | Priority: ${entry.priority}${topics}`;
}

export default function FaqSearcher({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const stats = useMemo(() => catalogStats(), []);
  const trimmedQuery = query.trim();

  const t = {
    title: textFor(lang, "FAQ Searcher", "FAQ Arayıcı", "FAQ 搜索器"),
    eyebrow: textFor(lang, "Official References", "Resmi Referanslar", "官方参考"),
    keyword: textFor(lang, "Keyword", "Anahtar kelime", "关键词"),
    placeholder: textFor(lang, "liquidation, STP, funding, mark price", "tasfiye, STP, fonlama, mark price", "强平, STP, 资金费率, 标记价格"),
    copyPack: textFor(lang, "Copy Pack", "Paketi Kopyala", "复制引用包"),
    copyCitation: textFor(lang, "Copy Citation", "Referansı Kopyala", "复制引用"),
    openReference: textFor(lang, "Open Reference", "Referansı Aç", "打开参考"),
    results: textFor(lang, "Results", "Sonuçlar", "结果"),
    waiting: textFor(lang, "Search by keyword to find FAQ references.", "FAQ referanslarını bulmak için keyword girin.", "输入关键词查找 FAQ 参考。"),
    noResults: textFor(lang, "No matching FAQ reference found.", "Eşleşen FAQ referansı bulunamadı.", "未找到匹配的 FAQ 参考。"),
    copied: textFor(lang, "Copied", "Kopyalandı", "已复制"),
    total: textFor(lang, "References", "Referans", "参考"),
    p0: textFor(lang, "P0 sources", "P0 kaynak", "P0 来源"),
    sourceTypes: textFor(lang, "Source types", "Kaynak tipi", "来源类型"),
    match: textFor(lang, "Matched", "Eşleşme", "匹配"),
  };

  const results = useMemo(
    () => trimmedQuery.length >= 2 ? searchFaqCatalog(trimmedQuery, { limit: 30 }) : [],
    [trimmedQuery]
  );

  const citationPack = useMemo(() => buildCitationPack(results, trimmedQuery), [results, trimmedQuery]);

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const timer = window.setTimeout(() => {
      track({
        event: "faq_search",
        tab: "faq",
        props: {
          query: trimmedQuery.slice(0, 80),
          count: results.length,
        },
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery, results.length]);

  async function copy({ text, label }: CopyPayload) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} ${t.copied}`);
      window.setTimeout(() => setToast(""), 1800);
      track({ event: "faq_copy", tab: "faq", props: { label, query: trimmedQuery.slice(0, 80) } });
    } catch {
      setToast(textFor(lang, "Copy failed", "Kopyalanamadı", "复制失败"));
      window.setTimeout(() => setToast(""), 1800);
    }
  }

  return (
    <div className="panel faq-shell">
      {toast && <div className="mg-toast">{toast}</div>}

      <div className="faq-hero">
        <div className="faq-hero-copy">
          <div className="faq-eyebrow">{t.eyebrow}</div>
          <h3>{t.title}</h3>
        </div>
        <div className="faq-stats" aria-label="FAQ catalog stats">
          <div className="faq-stat">
            <span>{stats.total}</span>
            <small>{t.total}</small>
          </div>
          <div className="faq-stat">
            <span>{stats.p0Count}</span>
            <small>{t.p0}</small>
          </div>
          <div className="faq-stat">
            <span>{stats.sourceCount}</span>
            <small>{t.sourceTypes}</small>
          </div>
        </div>
      </div>

      <div className="faq-control-panel">
        <label className="label" htmlFor="faq-query">{t.keyword}</label>
        <div className="faq-search-row">
          <input
            id="faq-query"
            className="input faq-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.placeholder}
          />
          <button
            type="button"
            className="btn faq-copy-pack"
            onClick={() => copy({ text: citationPack, label: t.copyPack })}
            disabled={!results.length}
          >
            {t.copyPack}
          </button>
        </div>
      </div>

      <section className="faq-results">
        <div className="faq-results-head">
          <div>
            <span className="panel-title">{t.results}</span>
            <strong>{results.length}</strong>
          </div>
        </div>

        {trimmedQuery.length < 2 && (
          <div className="faq-empty">{t.waiting}</div>
        )}

        {trimmedQuery.length >= 2 && !results.length && (
          <div className="faq-empty">{t.noResults}</div>
        )}

        <div className="faq-result-list">
          {results.map((result) => {
            const entry = result.entry;
            const tags = [...entry.keyTopics, ...entry.supportUseCases].slice(0, 5);
            return (
              <article className="faq-card" key={entry.id}>
                <div className="faq-card-head">
                  <div>
                    <div className="faq-kicker">{entry.product} / {entry.subcategory}</div>
                    <h4><Highlight text={entry.title} terms={result.matchedTerms} /></h4>
                  </div>
                  <span className={`faq-priority faq-priority-${entry.priority.toLowerCase()}`}>{entry.priority}</span>
                </div>

                <div className="faq-meta-line">
                  <span>{entry.source}</span>
                  <span>{entry.pageType}</span>
                  <span>{entry.confidence}</span>
                  <span>{Math.round(result.score)}</span>
                </div>

                {result.matchedTerms.length > 0 && (
                  <div className="faq-match-line">
                    <span>{t.match}</span>
                    {result.matchedTerms.slice(0, 6).map((term) => (
                      <code key={term}>{term}</code>
                    ))}
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="faq-tags">
                    {tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                )}

                <div className="faq-actions">
                  <a className="faq-action-link" href={entry.url} target="_blank" rel="noreferrer">{t.openReference}</a>
                  <button type="button" className="faq-action-button" onClick={() => copy({ text: resultCitation(result), label: t.copyCitation })}>
                    {t.copyCitation}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
