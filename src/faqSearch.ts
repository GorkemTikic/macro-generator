import { faqCatalog, type FaqEntry, type FaqPriority, type FaqSource } from "./faqCatalog";

export type FaqSearchFilters = {
  product?: string;
  source?: FaqSource | "all";
  priority?: FaqPriority | "all";
  limit?: number;
};

export type FaqSearchResult = {
  entry: FaqEntry;
  score: number;
  matchedTerms: string[];
};

type AliasGroup = {
  canonical: string;
  aliases: string[];
};

const PRIORITY_WEIGHT: Record<FaqPriority, number> = {
  P0: 42,
  P1: 24,
  P2: 10,
  P3: 2,
};

const SOURCE_WEIGHT: Record<FaqSource, number> = {
  FAQ: 18,
  "Developer Docs": 15,
  "Live Data": 13,
  "FAQ Index": 10,
  Announcement: 8,
  "Official Page": 8,
  "Academy/Blog": 4,
};

const ALIAS_GROUPS: AliasGroup[] = [
  { canonical: "liquidation", aliases: ["liquidation", "liquidation price", "liq", "tasfiye", "likidasyon", "强平", "爆仓", "清算"] },
  { canonical: "mark price", aliases: ["mark price", "mark", "index price", "isaret fiyati", "endeks fiyati", "标记价格", "指数价格"] },
  { canonical: "last price", aliases: ["last price", "contract price", "son fiyat", "latest price", "最新价", "合约价格"] },
  { canonical: "funding", aliases: ["funding", "funding rate", "funding fee", "fonlama", "资金费率", "资金费"] },
  { canonical: "fees", aliases: ["fee", "fees", "commission", "ucret", "komisyon", "手续费", "费用"] },
  { canonical: "pnl", aliases: ["pnl", "profit and loss", "profit loss", "kar zarar", "盈亏"] },
  { canonical: "adl", aliases: ["adl", "auto deleveraging", "auto-deleveraging", "otomatik kaldirac", "自动减仓"] },
  { canonical: "insurance fund", aliases: ["insurance fund", "sigorta fonu", "保险基金"] },
  { canonical: "hedge mode", aliases: ["hedge mode", "hedge", "one way", "one-way", "cift yon", "tek yon", "双向持仓", "单向持仓"] },
  { canonical: "cross isolated margin", aliases: ["cross margin", "isolated margin", "cross isolated", "capraz", "izole", "全仓", "逐仓"] },
  { canonical: "stop order", aliases: ["stop", "stop loss", "stop order", "zarar durdur", "止损", "条件单"] },
  { canonical: "take profit", aliases: ["take profit", "tp sl", "tp/sl", "kar al", "止盈"] },
  { canonical: "trailing stop", aliases: ["trailing", "trailing stop", "iz suren", "跟踪止损"] },
  { canonical: "self trade prevention", aliases: ["stp", "self trade prevention", "self-trade prevention", "kendisiyle islem", "自成交保护"] },
  { canonical: "error code", aliases: ["error code", "error codes", "hata kodu", "错误码"] },
  { canonical: "portfolio margin", aliases: ["portfolio margin", "pm pro", "portfoy marjin", "组合保证金"] },
  { canonical: "multi assets mode", aliases: ["multi assets", "multi-assets", "multi asset", "coklu varlik", "多资产模式"] },
  { canonical: "options", aliases: ["options", "option", "opsiyon", "期权"] },
  { canonical: "copy trading", aliases: ["copy trading", "copy trade", "kopya trade", "跟单"] },
  { canonical: "leverage", aliases: ["leverage", "kaldirac", "杠杆"] },
  { canonical: "margin", aliases: ["margin", "maintenance margin", "margin ratio", "marjin", "保证金", "维持保证金"] },
  { canonical: "price protection", aliases: ["price protection", "fiyat koruma", "价格保护"] },
  { canonical: "cooling period", aliases: ["cooling period", "cooling off", "cooling-off", "soguma", "冷静期"] },
  { canonical: "quantitative rules", aliases: ["quantitative rules", "risk control", "trading rules", "kurallar", "风控", "交易规则"] },
  { canonical: "contract specifications", aliases: ["contract specification", "contract specs", "contract specifications", "sozlesme ozellikleri", "合约规格"] },
  { canonical: "api", aliases: ["api", "websocket", "ws", "endpoint", "developer", "接口", "开发者"] },
  { canonical: "order failure", aliases: ["failed order", "order failure", "rejected order", "emir hatasi", "订单失败", "拒单"] },
];

export const FAQ_PRODUCTS = ["all", ...Array.from(new Set(faqCatalog.map((entry) => entry.product))).sort()];
export const FAQ_SOURCES = ["all", ...Array.from(new Set(faqCatalog.map((entry) => entry.source))).sort()] as Array<FaqSource | "all">;
export const FAQ_PRIORITIES: Array<FaqPriority | "all"> = ["all", "P0", "P1", "P2", "P3"];

export function normalizeFaqText(value: string): string {
  return String(value || "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ⓢ/g, "s")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeFaqText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function includesPhrase(haystack: string, phrase: string): boolean {
  return phrase.length > 1 && haystack.includes(phrase);
}

function groupMatchesText(group: AliasGroup, normalizedText: string): boolean {
  return [group.canonical, ...group.aliases].some((alias) => {
    const normalizedAlias = normalizeFaqText(alias);
    return normalizedAlias && normalizedText.includes(normalizedAlias);
  });
}

function entryAliases(entry: FaqEntry): string[] {
  const baseText = normalizeFaqText([
    entry.title,
    entry.product,
    entry.productArea,
    entry.subcategory,
    entry.section,
    entry.pageType,
    ...entry.keyTopics,
    ...entry.supportUseCases,
  ].join(" "));

  const aliases = new Set<string>();
  for (const group of ALIAS_GROUPS) {
    if (groupMatchesText(group, baseText)) {
      aliases.add(group.canonical);
      for (const alias of group.aliases) aliases.add(alias);
    }
  }
  return Array.from(aliases);
}

function expandQueryTokens(query: string): string[] {
  const normalizedQuery = normalizeFaqText(query);
  const expanded = new Set(tokenize(normalizedQuery));

  for (const group of ALIAS_GROUPS) {
    if (groupMatchesText(group, normalizedQuery)) {
      for (const token of tokenize(group.canonical)) expanded.add(token);
    }
  }

  return Array.from(expanded);
}

function entrySearchText(entry: FaqEntry): string {
  return normalizeFaqText([
    entry.title,
    entry.url,
    entry.product,
    entry.productArea,
    entry.subcategory,
    entry.section,
    entry.pageType,
    entry.source,
    entry.priority,
    entry.confidence,
    ...entry.keyTopics,
    ...entry.supportUseCases,
    ...entryAliases(entry),
  ].join(" "));
}

function compactMatches(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms
    .map((term) => term.trim())
    .filter((term) => term.length > 1)
    .filter((term) => {
      if (seen.has(term)) return false;
      seen.add(term);
      return true;
    })
    .slice(0, 8);
}

export function searchFaqCatalog(query: string, filters: FaqSearchFilters = {}): FaqSearchResult[] {
  const normalizedQuery = normalizeFaqText(query);
  const queryTokens = expandQueryTokens(normalizedQuery);
  const originalTokens = tokenize(normalizedQuery);
  const limit = filters.limit ?? 24;

  return faqCatalog
    .filter((entry) => !filters.product || filters.product === "all" || entry.product === filters.product)
    .filter((entry) => !filters.source || filters.source === "all" || entry.source === filters.source)
    .filter((entry) => !filters.priority || filters.priority === "all" || entry.priority === filters.priority)
    .map((entry) => {
      const titleText = normalizeFaqText(entry.title);
      const categoryText = normalizeFaqText(`${entry.product} ${entry.subcategory} ${entry.section}`);
      const topicText = normalizeFaqText([...entry.keyTopics, ...entry.supportUseCases, ...entryAliases(entry)].join(" "));
      const fullText = entrySearchText(entry);
      const matchedTerms: string[] = [];
      let relevance = 0;

      if (!normalizedQuery) {
        relevance = 1;
      } else {
        if (includesPhrase(titleText, normalizedQuery)) {
          relevance += 140;
          matchedTerms.push(normalizedQuery);
        } else if (includesPhrase(fullText, normalizedQuery)) {
          relevance += 86;
          matchedTerms.push(normalizedQuery);
        }

        for (const token of queryTokens) {
          if (titleText.includes(token)) {
            relevance += 34;
            matchedTerms.push(token);
          } else if (topicText.includes(token)) {
            relevance += 26;
            matchedTerms.push(token);
          } else if (categoryText.includes(token)) {
            relevance += 16;
            matchedTerms.push(token);
          } else if (fullText.includes(token)) {
            relevance += 8;
            matchedTerms.push(token);
          }
        }

        if (originalTokens.length > 1 && originalTokens.every((token) => fullText.includes(token))) {
          relevance += 38;
        }
      }

      const score = relevance + PRIORITY_WEIGHT[entry.priority] + SOURCE_WEIGHT[entry.source];
      return { entry, score, matchedTerms: compactMatches(matchedTerms) };
    })
    .filter((result) => !normalizedQuery || result.matchedTerms.length > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit);
}

export function buildCitationPack(results: FaqSearchResult[], query: string): string {
  const title = query.trim()
    ? `Official Binance references for \"${query.trim()}\"`
    : "Official Binance references";

  const lines = [title, ""];
  results.slice(0, 6).forEach((result, index) => {
    const entry = result.entry;
    lines.push(`${index + 1}. ${entry.title}`);
    lines.push(`   URL: ${entry.url}`);
    lines.push(`   Product: ${entry.product} | Source: ${entry.source} | Priority: ${entry.priority}`);
    if (entry.supportUseCases[0]) lines.push(`   Agent fit: ${entry.supportUseCases[0]}`);
    if (entry.keyTopics.length) lines.push(`   Topics: ${entry.keyTopics.slice(0, 5).join(", ")}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

export function catalogStats() {
  const p0Count = faqCatalog.filter((entry) => entry.priority === "P0").length;
  const officialCount = faqCatalog.filter((entry) => entry.confidence === "high").length;
  const sourceCount = new Set(faqCatalog.map((entry) => entry.source)).size;
  return {
    total: faqCatalog.length,
    p0Count,
    officialCount,
    sourceCount,
  };
}
