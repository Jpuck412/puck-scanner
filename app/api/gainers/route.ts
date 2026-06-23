// app/api/gainers/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, unknown>;

type NewsFreshness =
  | "FRESH_CATALYST"
  | "RECENT_CATALYST"
  | "BACKGROUND_NEWS"
  | "STALE_NEWS"
  | "UNKNOWN_NEWS_AGE";

type NewsCategory = "NO_NEWS" | "NEWS" | "PRESS_RELEASE" | "FILING_LIKE_NEWS";
type RunnerLight = "LIGHT_GREEN" | "LIGHT_YELLOW" | "LIGHT_GREY";
type DayBias = "POSITIVE_DAY" | "NEGATIVE_DAY" | "NO_DAY_SIGNAL";
type FinalLight = "SUPER_GREEN" | "SUPER_YELLOW" | "SUPER_RED";
type NewsBiasLabel =
  | "SUPER_POSITIVE"
  | "POSITIVE"
  | "MILD_POSITIVE"
  | "MIXED"
  | "NEGATIVE"
  | "SUPER_NEGATIVE"
  | "NEUTRAL";

type PreviousScanEntry = {
  gainPct: number;
  speedPct: number;
};

type NewsArticle = {
  title: string;
  url: string;
  publisher: string;
  publishedUtc: string;
  publishedMs: number | null;
  freshness: NewsFreshness;
  category: NewsCategory;
  biasLabel: NewsBiasLabel;
  articleScore: number;
};

type NewsCacheEntry = {
  fetchedAt: number;
  latest: LatestNewsData;
  items5d: NewsArticle[];
};

type MemoryState = {
  lastScan: Record<string, PreviousScanEntry>;
  newsCache: Record<string, NewsCacheEntry>;
};

type BaseRow = {
  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;
  gainPct: number;
  lastTradeTimestampMs: number | null;
  quoteAgeMinutes: number | null;
  isFreshTrade: boolean;
};

type LatestNewsData = {
  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;
  biasLabel: NewsBiasLabel;
  headlineScore: number;
  liveCatalystScore: number;
};

type SuperCandidate = {
  ticker: string;
  symbol: string;
  finalLight: FinalLight;
  runnerLight: RunnerLight;
  dayBias: DayBias;
  latestHeadline: string;
  newsUrl: string;
  latestNewsBias: NewsBiasLabel;
  superScore: number;
  climbPercent: number;
  dayBiasScore: number;
};

const SOURCE = "polygon-super-runner-hunter";
const MODE = "SUPER_RUNNER_HUNTER";
const MEMORY_KEY = "__SUPER_RUNNER_HUNTER_MEMORY__";
const NEWS_CACHE_TTL_MS = 60_000;
const LOOKBACK_DAYS = 5;
const PRE_CANDIDATE_COUNT = 35;
const FINAL_LIMIT = 20;

const SUPER_POSITIVE_KEYWORDS = [
  "fda approval",
  "fda cleared",
  "fda clearance",
  "510(k) clearance",
  "de novo clearance",
  "breakthrough device designation",
  "fast track designation",
  "orphan drug designation",
  "priority review",
  "accelerated approval",
  "ind cleared",
  "nda accepted",
  "bla accepted",
  "pdufa",
  "met primary endpoint",
  "statistically significant",
  "positive topline data",
  "clinical hold lifted",
  "acquired by",
  "acquisition agreement",
  "definitive merger agreement",
  "buyout",
  "tender offer",
  "all-cash transaction",
  "awarded contract",
  "department of defense",
  "dod contract",
  "nasa contract",
  "government contract",
  "contract valued at",
  "purchase order",
  "strategic partnership",
  "commercial agreement",
  "licensing agreement",
  "supply agreement",
  "fortune 500",
  "record revenue",
  "raises guidance",
  "increased guidance",
  "profitability achieved",
  "cash flow positive",
  "record backlog",
  "regained compliance",
  "nasdaq compliance",
  "uplisting",
  "strategic investment",
  "investment at premium",
  "insider purchase",
  "ceo purchased shares",
] as const;

const POSITIVE_KEYWORDS = [
  "partnership",
  "collaboration",
  "new customer",
  "customer win",
  "new order",
  "initial order",
  "repeat order",
  "product launch",
  "commercial launch",
  "rollout",
  "patent granted",
  "patent issued",
  "exclusive license",
  "analyst upgrade",
  "price target raised",
  "initiated coverage",
  "outperform rating",
  "appoints new ceo",
  "appoints new cfo",
  "industry veteran",
  "ai platform",
  "artificial intelligence",
  "machine learning",
  "generative ai",
  "robotics",
  "quantum computing",
  "cybersecurity",
  "bitcoin treasury",
  "crypto treasury",
  "mining capacity increased",
  "hash rate increased",
] as const;

const MILD_POSITIVE_KEYWORDS = [
  "investor conference",
  "presenting at",
  "fireside chat",
  "keynote",
  "industry conference",
  "clinical presentation",
  "new chairman",
  "board appointment",
  "leadership transition",
  "available now",
  "market release",
  "expansion launch",
] as const;

const MIXED_KEYWORDS = [
  "reverse split",
  "reverse stock split",
  "share consolidation",
  "1-for-",
  "one-for-",
  "atm offering",
  "at-the-market offering",
  "shelf registration",
  "s-3",
  "s-1",
  "prospectus supplement",
  "resale registration",
  "securities purchase agreement",
  "warrant exercise",
  "warrants exercised",
  "inducement letter",
  "warrant repricing",
  "exercise price",
  "strategic alternatives",
  "exploring alternatives",
  "retained advisor",
  "evaluating options",
  "restructuring alternatives",
  "debt restructuring",
  "credit facility amended",
  "loan extension",
  "maturity extended",
  "debt exchange",
  "note conversion",
  "exploring",
  "plans to",
  "intends to",
  "may",
  "non-binding",
  "letter of intent",
  "pilot program",
] as const;

const NEGATIVE_KEYWORDS = [
  "public offering",
  "registered direct offering",
  "private placement",
  "priced offering",
  "securities offering",
  "common stock offering",
  "units offering",
  "warrant offering",
  "offering priced at",
  "below market",
  "dilution",
  "shares issued",
  "equity financing",
  "capital raise",
  "atm offering",
  "at-the-market offering",
  "shelf registration",
  "s-3",
  "s-1",
  "prospectus supplement",
  "resale registration",
  "nasdaq deficiency",
  "delisting notice",
  "non-compliance",
  "minimum bid requirement",
  "bid price deficiency",
  "listing deficiency",
  "compliance deadline",
  "reverse split",
  "reverse stock split",
  "share consolidation",
  "warrant exercise",
  "warrant repricing",
  "convertible note",
  "variable rate conversion",
  "ceo resigns",
  "cfo resigns",
  "abrupt resignation",
  "terminated for cause",
  "class action",
  "shareholder lawsuit",
  "securities litigation",
  "lost customer",
  "contract terminated",
  "order cancellation",
  "guidance lowered",
  "cuts guidance",
  "weak outlook",
  "net loss widened",
  "cash burn increased",
] as const;

const SUPER_NEGATIVE_KEYWORDS = [
  "bankruptcy",
  "chapter 11",
  "chapter 7",
  "going concern",
  "substantial doubt",
  "insolvency",
  "liquidation",
  "default",
  "debt default",
  "fda rejection",
  "complete response letter",
  "crl received",
  "failed to meet primary endpoint",
  "trial failed",
  "not statistically significant",
  "clinical hold",
  "safety concerns",
  "study terminated",
  "sec investigation",
  "doj investigation",
  "wells notice",
  "fraud investigation",
  "securities fraud",
  "accounting irregularities",
  "restatement",
  "auditor resignation",
  "toxic financing",
  "floorless convertible",
  "death spiral",
  "trading suspension",
  "delisting determination",
] as const;

function getApiKey(): string {
  return (
    process.env.POLYGON_API_KEY ||
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    ""
  );
}

function getMemory(): MemoryState {
  const root = globalThis as typeof globalThis & {
    [MEMORY_KEY]?: MemoryState;
  };

  if (!root[MEMORY_KEY]) {
    root[MEMORY_KEY] = {
      lastScan: {},
      newsCache: {},
    };
  }

  return root[MEMORY_KEY] as MemoryState;
}

function resetMemory(): void {
  const memory = getMemory();
  memory.lastScan = {};
  memory.newsCache = {};
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function boolParam(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;

  const v = value.toLowerCase();

  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;

  return fallback;
}

function isObj(value: unknown): value is AnyObj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(obj: unknown, path: string): unknown {
  if (!isObj(obj)) return undefined;

  let current: unknown = obj;

  for (const part of path.split(".")) {
    if (!isObj(current)) return undefined;
    current = current[part];
  }

  return current;
}

function pickNumber(obj: unknown, paths: string[]): number {
  for (const path of paths) {
    const value = getPath(obj, path);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getEasternMinutes(now = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function getMarketMode(now = new Date()): string {
  const totalMinutes = getEasternMinutes(now);

  if (totalMinutes < 4 * 60) return "OVERNIGHT";
  if (totalMinutes < 9 * 60 + 30) return "PREMARKET";
  if (totalMinutes < 16 * 60) return "REGULAR_HOURS";
  return "AFTER_HOURS";
}

function getMaxTradeAgeMinutes(now = new Date()): number {
  const totalMinutes = getEasternMinutes(now);

  if (totalMinutes >= 4 * 60 && totalMinutes < 8 * 60) return 10;
  if (totalMinutes >= 8 * 60 && totalMinutes < 9 * 60 + 30) return 15;
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60) return 15;
  return 20;
}

function normalizeTimestampMs(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n > 1e18) return Math.round(n / 1_000_000);
  if (n > 1e15) return Math.round(n / 1_000);
  if (n > 1e12) return Math.round(n);
  if (n > 1e9) return Math.round(n * 1000);

  return null;
}

function getQuoteAgeMinutes(lastTradeTimestampMs: number | null): number | null {
  if (!lastTradeTimestampMs) return null;

  const ageMs = Date.now() - lastTradeTimestampMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;

  return Math.round(ageMs / 60000);
}

function buildBaseRow(row: AnyObj, maxTradeAgeMinutes: number): BaseRow {
  const ticker = cleanTicker(row.ticker || row.symbol || row.T);

  const price = pickNumber(row, ["lastTrade.p", "lastTrade.price"]);
  const previousClose = pickNumber(row, ["prevDay.c", "previousClose", "prevClose", "pc"]);

  const gainPct =
    price > 0 && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0;

  const lastTradeTimestampMs = normalizeTimestampMs(
    getPath(row, "lastTrade.t") ??
      getPath(row, "lastTrade.timestamp") ??
      getPath(row, "updated")
  );

  const quoteAgeMinutes = getQuoteAgeMinutes(lastTradeTimestampMs);
  const isFreshTrade =
    quoteAgeMinutes !== null &&
    quoteAgeMinutes >= 0 &&
    quoteAgeMinutes <= maxTradeAgeMinutes;

  return {
    ticker,
    symbol: ticker,
    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 2),
    lastTradeTimestampMs,
    quoteAgeMinutes,
    isFreshTrade,
  };
}

function classifyNewsCategory(headline: string, publisher: string, url: string): NewsCategory {
  const text = `${headline} ${publisher} ${url}`.toLowerCase();

  const filingLike = [
    "8-k",
    "10-q",
    "10-k",
    "s-1",
    "s-3",
    "424b",
    "prospectus",
    "offering",
    "shelf",
    "registration",
    "reverse split",
    "atm",
    "edgar",
  ].some((value) => text.includes(value));

  if (filingLike) return "FILING_LIKE_NEWS";

  const pressLike = [
    "globenewswire",
    "pr newswire",
    "business wire",
    "accesswire",
    "press release",
    "announces",
    "reports",
    "launches",
    "receives",
    "agreement",
  ].some((value) => text.includes(value));

  if (pressLike) return "PRESS_RELEASE";
  return "NEWS";
}

function getNewsAgeData(newsTime: string): {
  newsAgeMinutes: number | null;
  newsFreshness: NewsFreshness;
} {
  if (!newsTime) {
    return {
      newsAgeMinutes: null,
      newsFreshness: "UNKNOWN_NEWS_AGE",
    };
  }

  const publishedAt = new Date(newsTime).getTime();

  if (!Number.isFinite(publishedAt)) {
    return {
      newsAgeMinutes: null,
      newsFreshness: "UNKNOWN_NEWS_AGE",
    };
  }

  const ageMinutes = Math.round((Date.now() - publishedAt) / 60000);

  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) {
    return {
      newsAgeMinutes: null,
      newsFreshness: "UNKNOWN_NEWS_AGE",
    };
  }

  if (ageMinutes <= 90) {
    return {
      newsAgeMinutes: ageMinutes,
      newsFreshness: "FRESH_CATALYST",
    };
  }

  if (ageMinutes <= 12 * 60) {
    return {
      newsAgeMinutes: ageMinutes,
      newsFreshness: "RECENT_CATALYST",
    };
  }

  if (ageMinutes <= 24 * 60) {
    return {
      newsAgeMinutes: ageMinutes,
      newsFreshness: "BACKGROUND_NEWS",
    };
  }

  return {
    newsAgeMinutes: null,
    newsFreshness: "STALE_NEWS",
  };
}

function parsePublishedMs(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatEasternDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function scoreHeadlineByGlossary(textRaw: string): {
  biasLabel: NewsBiasLabel;
  score: number;
} {
  const text = textRaw.toLowerCase();

  const hasSuperNegative = includesAny(text, SUPER_NEGATIVE_KEYWORDS);
  const hasNegative = includesAny(text, NEGATIVE_KEYWORDS);
  const hasMixed = includesAny(text, MIXED_KEYWORDS);
  const hasSuperPositive = includesAny(text, SUPER_POSITIVE_KEYWORDS);
  const hasPositive = includesAny(text, POSITIVE_KEYWORDS);
  const hasMildPositive = includesAny(text, MILD_POSITIVE_KEYWORDS);

  if (hasSuperNegative) {
    return { biasLabel: "SUPER_NEGATIVE", score: -5 };
  }

  if (hasNegative) {
    return { biasLabel: "NEGATIVE", score: -3 };
  }

  if (hasMixed && (hasSuperPositive || hasPositive || hasMildPositive)) {
    return { biasLabel: "MIXED", score: 0 };
  }

  if (hasMixed) {
    return { biasLabel: "MIXED", score: 0 };
  }

  if (hasSuperPositive) {
    return { biasLabel: "SUPER_POSITIVE", score: 5 };
  }

  if (hasPositive) {
    return { biasLabel: "POSITIVE", score: 3 };
  }

  if (hasMildPositive) {
    return { biasLabel: "MILD_POSITIVE", score: 1 };
  }

  return { biasLabel: "NEUTRAL", score: 0 };
}

async function fetchTickerNewsRaw(ticker: string, apiKey: string): Promise<NewsArticle[]> {
  const url =
    `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(ticker)}` +
    `&order=desc&sort=published_utc&limit=50` +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(json.results) ? json.results : [];

  return results
    .filter(isObj)
    .map((row) => {
      const title = str(row.title);
      const url = str(row.article_url || row.url);
      const publishedUtc = str(row.published_utc);
      const publisherObj = isObj(row.publisher) ? row.publisher : {};
      const publisher = str(publisherObj.name || row.publisher || row.source);
      const publishedMs = parsePublishedMs(publishedUtc);
      const scored = scoreHeadlineByGlossary(title);

      return {
        title,
        url,
        publisher,
        publishedUtc,
        publishedMs,
        freshness: getNewsAgeData(publishedUtc).newsFreshness,
        category: classifyNewsCategory(title, publisher, url),
        biasLabel: scored.biasLabel,
        articleScore: scored.score,
      };
    })
    .filter((item) => Boolean(item.title || item.url));
}

function buildLatestNewsData(items: NewsArticle[]): LatestNewsData {
  const latest = items[0];

  if (!latest) {
    return {
      newsHeadline: "",
      newsUrl: "",
      newsPublisher: "",
      newsCategory: "NO_NEWS",
      newsFreshness: "UNKNOWN_NEWS_AGE",
      newsAgeMinutes: null,
      biasLabel: "NEUTRAL",
      headlineScore: 0,
      liveCatalystScore: 0,
    };
  }

  const age = getNewsAgeData(latest.publishedUtc);
  const liveCatalystScore =
    age.newsFreshness === "FRESH_CATALYST" || age.newsFreshness === "RECENT_CATALYST"
      ? latest.articleScore
      : 0;

  return {
    newsHeadline: latest.title,
    newsUrl: latest.url,
    newsPublisher: latest.publisher,
    newsCategory: latest.category,
    newsFreshness: age.newsFreshness,
    newsAgeMinutes: age.newsAgeMinutes,
    biasLabel: latest.biasLabel,
    headlineScore: latest.articleScore,
    liveCatalystScore,
  };
}

async function fetchTickerNewsCached(
  ticker: string,
  apiKey: string,
  memory: MemoryState
): Promise<{ latest: LatestNewsData; items5d: NewsArticle[] }> {
  const cached = memory.newsCache[ticker];

  if (cached && Date.now() - cached.fetchedAt <= NEWS_CACHE_TTL_MS) {
    return {
      latest: cached.latest,
      items5d: cached.items5d,
    };
  }

  const items = await fetchTickerNewsRaw(ticker, apiKey);
  const latest = buildLatestNewsData(items);

  memory.newsCache[ticker] = {
    fetchedAt: Date.now(),
    latest,
    items5d: items,
  };

  return {
    latest,
    items5d: items,
  };
}

function classifyDayBias(articles: NewsArticle[]): {
  dayBias: DayBias;
  dayBiasScore: number;
} {
  const now = new Date();
  const todayEt = formatEasternDay(now);
  const cutoffMs = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const inLookback = articles
    .filter((article) => article.publishedMs !== null && article.publishedMs >= cutoffMs)
    .sort((a, b) => (b.publishedMs ?? 0) - (a.publishedMs ?? 0));

  let todayScore = 0;
  let priorScore = 0;

  for (const article of inLookback) {
    const dayKey = article.publishedMs ? formatEasternDay(new Date(article.publishedMs)) : "";
    if (dayKey === todayEt) {
      todayScore += article.articleScore;
    } else {
      priorScore += article.articleScore;
    }
  }

  const dayBiasScore = todayScore * 2 + priorScore;

  if (dayBiasScore > 0) {
    return {
      dayBias: "POSITIVE_DAY",
      dayBiasScore,
    };
  }

  if (dayBiasScore < 0) {
    return {
      dayBias: "NEGATIVE_DAY",
      dayBiasScore,
    };
  }

  return {
    dayBias: "NO_DAY_SIGNAL",
    dayBiasScore,
  };
}

function deriveRunnerLight(
  gainPct: number,
  speedPct: number,
  momentumPct: number,
  liveCatalystScore: number
): RunnerLight {
  if (
    liveCatalystScore >= 3 &&
    speedPct > 0.35 &&
    momentumPct >= -0.05 &&
    gainPct > 0
  ) {
    return "LIGHT_GREEN";
  }

  if (liveCatalystScore >= 0 && speedPct > 0.05 && gainPct > 0) {
    return "LIGHT_YELLOW";
  }

  return "LIGHT_GREY";
}

function deriveFinalLight(
  gainPct: number,
  speedPct: number,
  momentumPct: number,
  liveCatalystScore: number,
  dayBiasScore: number
): FinalLight {
  if (
    liveCatalystScore > 0 &&
    speedPct > 0.2 &&
    momentumPct >= -0.05 &&
    dayBiasScore > 0 &&
    gainPct > 0
  ) {
    return "SUPER_GREEN";
  }

  if (speedPct > 0.05 && gainPct > 0 && dayBiasScore >= 0) {
    return "SUPER_YELLOW";
  }

  return "SUPER_RED";
}

function buildEmptyPayload(message: string, startedAt: string) {
  const candidates: SuperCandidate[] = [];

  return {
    ok: false,
    source: SOURCE,
    mode: MODE,
    marketMode: getMarketMode(),
    message,
    startedAt,
    finishedAt: new Date().toISOString(),
    rawCount: 0,
    showing: 0,
    topTicker: null,
    candidates,
    tickers: candidates,
    results: candidates,
    data: {
      candidates,
      tickers: candidates,
    },
  };
}

export async function GET(req: Request) {
  const startedAt = new Date().toISOString();
  const apiKey = getApiKey();
  const { searchParams } = new URL(req.url);
  const reset = boolParam(searchParams.get("resetMemory"), false);

  if (reset) {
    resetMemory();
  }

  if (!apiKey) {
    return NextResponse.json(buildEmptyPayload("Missing POLYGON_API_KEY or MASSIVE_API_KEY.", startedAt), {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  try {
    const maxTradeAgeMinutes = getMaxTradeAgeMinutes();
    const memory = getMemory();

    const url =
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers` +
      `?apiKey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        buildEmptyPayload(`Polygon request failed with status ${res.status}.`, startedAt),
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const json = (await res.json()) as AnyObj;
    const rowsRaw = Array.isArray(json.tickers)
      ? json.tickers
      : Array.isArray(json.results)
        ? json.results
        : [];

    const wholeMarket = rowsRaw
      .filter(isObj)
      .map((row) => buildBaseRow(row, maxTradeAgeMinutes))
      .filter((item) => Boolean(item.ticker))
      .filter((item) => item.price > 0)
      .filter((item) => item.previousClose > 0)
      .filter((item) => item.isFreshTrade)
      .map((item) => {
        const previous = memory.lastScan[item.ticker];
        const priorGainPct = previous ? previous.gainPct : null;
        const speedPct = priorGainPct === null ? 0 : item.gainPct - priorGainPct;
        const priorSpeedPct = previous ? previous.speedPct : 0;
        const momentumPct = speedPct - priorSpeedPct;
        const seedScore = item.gainPct + 3 * speedPct + 2 * momentumPct;

        return {
          ...item,
          priorGainPct,
          speedPct,
          priorSpeedPct,
          momentumPct,
          seedScore,
        };
      });

    wholeMarket.sort((a, b) => {
      if (b.seedScore !== a.seedScore) return b.seedScore - a.seedScore;
      if (b.speedPct !== a.speedPct) return b.speedPct - a.speedPct;
      if (b.momentumPct !== a.momentumPct) return b.momentumPct - a.momentumPct;
      if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
      return a.ticker.localeCompare(b.ticker);
    });

    const preCandidates = wholeMarket.slice(0, PRE_CANDIDATE_COUNT);

    const candidatesWithNews = await Promise.all(
      preCandidates.map(async (item) => {
        const news = await fetchTickerNewsCached(item.ticker, apiKey, memory);
        const latest = news.latest;
        const bias = classifyDayBias(news.items5d);

        const climbPercent =
          item.gainPct +
          3 * item.speedPct +
          2 * item.momentumPct +
          2 * latest.liveCatalystScore;

        const superScore = climbPercent + 2 * bias.dayBiasScore;

        return {
          ticker: item.ticker,
          symbol: item.symbol,
          finalLight: deriveFinalLight(
            item.gainPct,
            item.speedPct,
            item.momentumPct,
            latest.liveCatalystScore,
            bias.dayBiasScore
          ),
          runnerLight: deriveRunnerLight(
            item.gainPct,
            item.speedPct,
            item.momentumPct,
            latest.liveCatalystScore
          ),
          dayBias: bias.dayBias,
          latestHeadline: latest.newsHeadline,
          newsUrl: latest.newsUrl,
          latestNewsBias: latest.biasLabel,
          superScore: round(superScore, 2),
          climbPercent: round(climbPercent, 2),
          dayBiasScore: bias.dayBiasScore,
        } satisfies SuperCandidate;
      })
    );

    candidatesWithNews.sort((a, b) => {
      if (b.superScore !== a.superScore) return b.superScore - a.superScore;
      if (b.climbPercent !== a.climbPercent) return b.climbPercent - a.climbPercent;
      if (b.dayBiasScore !== a.dayBiasScore) return b.dayBiasScore - a.dayBiasScore;
      return a.ticker.localeCompare(b.ticker);
    });

    const finalCandidates = candidatesWithNews.slice(0, FINAL_LIMIT);

    const nextLastScan: Record<string, PreviousScanEntry> = {};

    for (const item of wholeMarket) {
      nextLastScan[item.ticker] = {
        gainPct: round(item.gainPct, 2),
        speedPct: round(item.speedPct, 2),
      };
    }

    memory.lastScan = nextLastScan;

    const payloadItems = finalCandidates.map((item) => ({
      ticker: item.ticker,
      symbol: item.symbol,
      finalLight: item.finalLight,
      runnerLight: item.runnerLight,
      dayBias: item.dayBias,
      latestHeadline: item.latestHeadline,
      newsUrl: item.newsUrl,
      latestNewsBias: item.latestNewsBias,
    }));

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        mode: MODE,
        marketMode: getMarketMode(),
        startedAt,
        finishedAt: new Date().toISOString(),
        rawCount: rowsRaw.length,
        showing: payloadItems.length,
        topTicker: payloadItems[0]?.ticker ?? null,
        candidates: payloadItems,
        tickers: payloadItems,
        results: payloadItems,
        data: {
          candidates: payloadItems,
          tickers: payloadItems,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown route error.";

    return NextResponse.json(buildEmptyPayload(message, startedAt), {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
