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
type LightStatus = "LIGHT_GREEN" | "LIGHT_YELLOW" | "LIGHT_GREY";

type PreviousScanEntry = {
  gainPct: number;
  speedPct: number;
};

type NewsCacheEntry = {
  fetchedAt: number;
  data: NewsData;
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

type NewsData = {
  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;
  headlineScore: number;
  liveCatalystScore: number;
};

type Candidate = {
  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;
  gainPct: number;
  priorGainPct: number | null;
  speedPct: number;
  priorSpeedPct: number;
  momentumPct: number;
  climbPercent: number;
  lastTradeTimestampMs: number | null;
  quoteAgeMinutes: number | null;
  isFreshTrade: boolean;
  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;
  headlineScore: number;
  liveCatalystScore: number;
  light: LightStatus;
};

const SOURCE = "polygon-blue-runner-hunter";
const MODE = "PERCENT_SPEED_MOMENTUM_CATALYST_ONLY";
const MEMORY_KEY = "__BLUE_RUNNER_HUNTER_MEMORY__";
const NEWS_CACHE_TTL_MS = 60_000;
const PRE_CANDIDATE_COUNT = 25;
const FINAL_LIMIT = 15;

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

  const price = pickNumber(row, [
    "lastTrade.p",
    "lastTrade.price",
  ]);

  const previousClose = pickNumber(row, [
    "prevDay.c",
    "previousClose",
    "prevClose",
    "pc",
  ]);

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
    quoteAgeMinutes !== null && quoteAgeMinutes >= 0 && quoteAgeMinutes <= maxTradeAgeMinutes;

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

function scoreHeadline(headline: string): number {
  const text = headline.toLowerCase();

  const veryPositive = [
    "fda",
    "approval",
    "cleared",
    "phase 3",
    "phase iii",
    "topline",
    "acquisition",
    "acquired",
    "merger",
    "contract award",
    "awarded contract",
    "uplist",
    "uplisting",
    "guidance raised",
    "earnings beat",
  ];

  const positive = [
    "partnership",
    "collaboration",
    "agreement",
    "strategic",
    "patent",
    "licensing",
    "order",
    "expansion",
    "launch",
    "grant",
    "breakthrough",
    "successful",
  ];

  const hardNegative = [
    "offering",
    "registered direct",
    "shelf",
    "atm",
    "dilution",
    "reverse split",
    "delisting",
    "bankruptcy",
    "going concern",
  ];

  const negative = [
    "lawsuit",
    "guidance cut",
    "miss earnings",
  ];

  let score = 0;

  for (const keyword of veryPositive) {
    if (text.includes(keyword)) score += 3;
  }

  for (const keyword of positive) {
    if (text.includes(keyword)) score += 2;
  }

  for (const keyword of hardNegative) {
    if (text.includes(keyword)) score -= 5;
  }

  for (const keyword of negative) {
    if (text.includes(keyword)) score -= 3;
  }

  return score;
}

async function fetchTickerNewsFromApi(ticker: string, apiKey: string): Promise<NewsData> {
  const fallback: NewsData = {
    newsHeadline: "",
    newsUrl: "",
    newsPublisher: "",
    newsCategory: "NO_NEWS",
    newsFreshness: "UNKNOWN_NEWS_AGE",
    newsAgeMinutes: null,
    headlineScore: 0,
    liveCatalystScore: 0,
  };

  try {
    if (!ticker || !apiKey) return fallback;

    const url =
      `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(ticker)}` +
      `&order=desc&sort=published_utc&limit=1&apiKey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return fallback;

    const json = (await res.json()) as { results?: unknown[] };
    const first = Array.isArray(json.results) ? json.results.find(isObj) : undefined;

    if (!first) return fallback;

    const newsHeadline = str(first.title);
    const newsUrl = str(first.article_url || first.url);
    const newsTime = str(first.published_utc);
    const publisherObj = isObj(first.publisher) ? first.publisher : {};
    const newsPublisher = str(publisherObj.name || first.publisher || first.source);

    if (!newsHeadline && !newsUrl) return fallback;

    const newsCategory = classifyNewsCategory(newsHeadline, newsPublisher, newsUrl);
    const { newsAgeMinutes, newsFreshness } = getNewsAgeData(newsTime);
    const headlineScore = scoreHeadline(newsHeadline);
    const isLiveCatalyst =
      newsFreshness === "FRESH_CATALYST" || newsFreshness === "RECENT_CATALYST";

    return {
      newsHeadline,
      newsUrl,
      newsPublisher,
      newsCategory,
      newsFreshness,
      newsAgeMinutes,
      headlineScore,
      liveCatalystScore: isLiveCatalyst ? headlineScore : 0,
    };
  } catch {
    return fallback;
  }
}

async function fetchTickerNewsCached(
  ticker: string,
  apiKey: string,
  memory: MemoryState
): Promise<NewsData> {
  const cached = memory.newsCache[ticker];

  if (cached && Date.now() - cached.fetchedAt <= NEWS_CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await fetchTickerNewsFromApi(ticker, apiKey);
  memory.newsCache[ticker] = {
    fetchedAt: Date.now(),
    data,
  };

  return data;
}

function deriveLight(
  gainPct: number,
  speedPct: number,
  momentumPct: number,
  liveCatalystScore: number
): LightStatus {
  if (
    liveCatalystScore >= 2 &&
    speedPct > 0.35 &&
    momentumPct >= -0.05 &&
    gainPct > 0
  ) {
    return "LIGHT_GREEN";
  }

  if (liveCatalystScore >= 1 && speedPct > 0.05 && gainPct > 0) {
    return "LIGHT_YELLOW";
  }

  return "LIGHT_GREY";
}

function buildEmptyPayload(message: string, startedAt: string) {
  const candidates: Candidate[] = [];

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

    const memory = getMemory();

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
        const climbPercent = item.gainPct + 3 * speedPct + 2 * momentumPct;

        return {
          ...item,
          priorGainPct,
          speedPct,
          priorSpeedPct,
          momentumPct,
          climbPercent,
        };
      });

    wholeMarket.sort((a, b) => {
      if (b.climbPercent !== a.climbPercent) return b.climbPercent - a.climbPercent;
      if (b.speedPct !== a.speedPct) return b.speedPct - a.speedPct;
      if (b.momentumPct !== a.momentumPct) return b.momentumPct - a.momentumPct;
      if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
      return a.ticker.localeCompare(b.ticker);
    });

    const preCandidates = wholeMarket.slice(0, PRE_CANDIDATE_COUNT);

    const candidatesWithNews: Candidate[] = await Promise.all(
      preCandidates.map(async (item) => {
        const news = await fetchTickerNewsCached(item.ticker, apiKey, memory);
        const climbPercent =
          item.gainPct +
          3 * item.speedPct +
          2 * item.momentumPct +
          2 * news.liveCatalystScore;

        return {
          ticker: item.ticker,
          symbol: item.symbol,
          price: item.price,
          previousClose: item.previousClose,
          gainPct: round(item.gainPct, 2),
          priorGainPct: item.priorGainPct === null ? null : round(item.priorGainPct, 2),
          speedPct: round(item.speedPct, 2),
          priorSpeedPct: round(item.priorSpeedPct, 2),
          momentumPct: round(item.momentumPct, 2),
          climbPercent: round(climbPercent, 2),
          lastTradeTimestampMs: item.lastTradeTimestampMs,
          quoteAgeMinutes: item.quoteAgeMinutes,
          isFreshTrade: item.isFreshTrade,
          newsHeadline: news.newsHeadline,
          newsUrl: news.newsUrl,
          newsPublisher: news.newsPublisher,
          newsCategory: news.newsCategory,
          newsFreshness: news.newsFreshness,
          newsAgeMinutes: news.newsAgeMinutes,
          headlineScore: news.headlineScore,
          liveCatalystScore: news.liveCatalystScore,
          light: deriveLight(item.gainPct, item.speedPct, item.momentumPct, news.liveCatalystScore),
        };
      })
    );

    candidatesWithNews.sort((a, b) => {
      if (b.climbPercent !== a.climbPercent) return b.climbPercent - a.climbPercent;
      if (b.speedPct !== a.speedPct) return b.speedPct - a.speedPct;
      if (b.momentumPct !== a.momentumPct) return b.momentumPct - a.momentumPct;
      if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
      return a.ticker.localeCompare(b.ticker);
    });

    const candidates = candidatesWithNews.slice(0, FINAL_LIMIT);

    const nextLastScan: Record<string, PreviousScanEntry> = {};

    for (const item of wholeMarket) {
      nextLastScan[item.ticker] = {
        gainPct: round(item.gainPct, 2),
        speedPct: round(item.speedPct, 2),
      };
    }

    memory.lastScan = nextLastScan;

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        mode: MODE,
        marketMode: getMarketMode(),
        startedAt,
        finishedAt: new Date().toISOString(),
        rawCount: rowsRaw.length,
        showing: candidates.length,
        topTicker: candidates[0]?.ticker ?? null,
        candidates: candidates.map((item) => ({
          ticker: item.ticker,
          symbol: item.symbol,
          light: item.light,
          newsUrl: item.newsUrl,
        })),
        tickers: candidates.map((item) => ({
          ticker: item.ticker,
          symbol: item.symbol,
          light: item.light,
          newsUrl: item.newsUrl,
        })),
        results: candidates.map((item) => ({
          ticker: item.ticker,
          symbol: item.symbol,
          light: item.light,
          newsUrl: item.newsUrl,
        })),
        data: {
          candidates: candidates.map((item) => ({
            ticker: item.ticker,
            symbol: item.symbol,
            light: item.light,
            newsUrl: item.newsUrl,
          })),
          tickers: candidates.map((item) => ({
            ticker: item.ticker,
            symbol: item.symbol,
            light: item.light,
            newsUrl: item.newsUrl,
          })),
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





