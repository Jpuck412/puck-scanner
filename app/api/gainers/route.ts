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
type DayLight = "POSITIVE_DAY" | "NEGATIVE_DAY";
type DayBias = "POSITIVE_DAY" | "NEGATIVE_DAY" | "NO_DAY_SIGNAL";

type NewsCacheEntry = {
  fetchedAt: number;
  items: NewsArticle[];
};

type MemoryState = {
  newsCache: Record<string, NewsCacheEntry>;
};

type GainerItem = {
  ticker: string;
  symbol: string;
  gainPct: number;
};

type NewsArticle = {
  title: string;
  url: string;
  publisher: string;
  publishedUtc: string;
  publishedMs: number | null;
  freshness: NewsFreshness;
  category: NewsCategory;
  articleScore: number;
};

type NewsHunterItem = {
  ticker: string;
  symbol: string;
  light: DayLight;
  newsUrl: string;
  latestHeadline: string;
  gainPct: number;
  dayBiasScore: number;
  todayArticleCount: number;
};

const SOURCE = "polygon-super-news-hunter";
const MODE = "SUPER_NEWS_HUNTER";
const MEMORY_KEY = "__SUPER_NEWS_HUNTER_MEMORY__";
const NEWS_CACHE_TTL_MS = 60_000;
const NEWS_LIMIT = 50;
const LOOKBACK_DAYS = 5;

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
      newsCache: {},
    };
  }

  return root[MEMORY_KEY] as MemoryState;
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

function getNewsFreshness(publishedMs: number | null): NewsFreshness {
  if (!publishedMs) return "UNKNOWN_NEWS_AGE";

  const ageMinutes = Math.round((Date.now() - publishedMs) / 60000);

  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) return "UNKNOWN_NEWS_AGE";
  if (ageMinutes <= 90) return "FRESH_CATALYST";
  if (ageMinutes <= 12 * 60) return "RECENT_CATALYST";
  if (ageMinutes <= 24 * 60) return "BACKGROUND_NEWS";
  return "STALE_NEWS";
}

function formatEasternDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parsePublishedMs(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function scoreArticle(title: string): number {
  const text = title.toLowerCase();

  const hardPositive = [
    "fda",
    "approval",
    "cleared",
    "phase 3",
    "phase iii",
    "topline",
    "acquired",
    "acquisition",
    "merger",
    "contract award",
    "awarded contract",
    "uplist",
    "uplisting",
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
    "guidance raised",
    "earnings beat",
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
    "downgrade",
  ];

  let score = 0;

  for (const keyword of hardPositive) {
    if (text.includes(keyword)) score += 2;
  }

  for (const keyword of positive) {
    if (text.includes(keyword)) score += 1;
  }

  for (const keyword of hardNegative) {
    if (text.includes(keyword)) score -= 2;
  }

  for (const keyword of negative) {
    if (text.includes(keyword)) score -= 1;
  }

  return score;
}

async function fetchGainers(apiKey: string): Promise<GainerItem[]> {
  const url =
    `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers` +
    `?apiKey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Polygon movers request failed with status ${res.status}.`);
  }

  const json = (await res.json()) as AnyObj;
  const rows = Array.isArray(json.tickers)
    ? json.tickers
    : Array.isArray(json.results)
      ? json.results
      : [];

  return rows
    .filter(isObj)
    .map((row) => {
      const ticker = cleanTicker(row.ticker || row.symbol || row.T);
      const suppliedGain = pickNumber(row, [
        "todaysChangePerc",
        "changePercent",
        "percentChange",
        "gainPct",
      ]);

      const price = pickNumber(row, [
        "lastTrade.p",
        "lastTrade.price",
        "day.c",
        "min.c",
        "price",
        "close",
        "c",
      ]);

      const previousClose = pickNumber(row, [
        "prevDay.c",
        "previousClose",
        "prevClose",
        "pc",
      ]);

      const gainPct =
        suppliedGain !== 0
          ? suppliedGain
          : price > 0 && previousClose > 0
            ? ((price - previousClose) / previousClose) * 100
            : 0;

      return {
        ticker,
        symbol: ticker,
        gainPct,
      };
    })
    .filter((item) => Boolean(item.ticker));
}

async function fetchTickerNewsRaw(ticker: string, apiKey: string): Promise<NewsArticle[]> {
  const url =
    `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(ticker)}` +
    `&order=desc&sort=published_utc&limit=${NEWS_LIMIT}` +
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

      return {
        title,
        url,
        publisher,
        publishedUtc,
        publishedMs,
        freshness: getNewsFreshness(publishedMs),
        category: classifyNewsCategory(title, publisher, url),
        articleScore: scoreArticle(title),
      };
    })
    .filter((item) => Boolean(item.title || item.url));
}

async function fetchTickerNewsCached(
  ticker: string,
  apiKey: string,
  memory: MemoryState
): Promise<NewsArticle[]> {
  const cached = memory.newsCache[ticker];

  if (cached && Date.now() - cached.fetchedAt <= NEWS_CACHE_TTL_MS) {
    return cached.items;
  }

  const items = await fetchTickerNewsRaw(ticker, apiKey);
  memory.newsCache[ticker] = {
    fetchedAt: Date.now(),
    items,
  };

  return items;
}

function classifyDayBias(articles: NewsArticle[]): {
  bias: DayBias;
  dayBiasScore: number;
  todayArticleCount: number;
  latestHeadline: string;
  latestUrl: string;
} {
  const now = new Date();
  const todayEt = formatEasternDay(now);
  const cutoffMs = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const inLookback = articles
    .filter((article) => article.publishedMs !== null && article.publishedMs >= cutoffMs)
    .sort((a, b) => (b.publishedMs ?? 0) - (a.publishedMs ?? 0));

  let todayScore = 0;
  let priorScore = 0;
  let todayArticleCount = 0;

  for (const article of inLookback) {
    const dayKey = article.publishedMs ? formatEasternDay(new Date(article.publishedMs)) : "";
    if (dayKey === todayEt) {
      todayScore += article.articleScore;
      todayArticleCount += 1;
    } else {
      priorScore += article.articleScore;
    }
  }

  const dayBiasScore = todayScore * 2 + priorScore;
  const latest = inLookback[0];

  if (dayBiasScore > 0) {
    return {
      bias: "POSITIVE_DAY",
      dayBiasScore,
      todayArticleCount,
      latestHeadline: latest?.title || "",
      latestUrl: latest?.url || "",
    };
  }

  if (dayBiasScore < 0) {
    return {
      bias: "NEGATIVE_DAY",
      dayBiasScore,
      todayArticleCount,
      latestHeadline: latest?.title || "",
      latestUrl: latest?.url || "",
    };
  }

  return {
    bias: "NO_DAY_SIGNAL",
    dayBiasScore,
    todayArticleCount,
    latestHeadline: latest?.title || "",
    latestUrl: latest?.url || "",
  };
}

function buildEmptyPayload(message: string, startedAt: string) {
  const positiveDay: NewsHunterItem[] = [];
  const negativeDay: NewsHunterItem[] = [];

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
    positiveDay,
    negativeDay,
    data: {
      positiveDay,
      negativeDay,
    },
  };
}

export async function GET() {
  const startedAt = new Date().toISOString();
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(buildEmptyPayload("Missing POLYGON_API_KEY or MASSIVE_API_KEY.", startedAt), {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  try {
    const memory = getMemory();
    const gainers = await fetchGainers(apiKey);

    const analyzed = await Promise.all(
      gainers.map(async (gainer) => {
        const articles = await fetchTickerNewsCached(gainer.ticker, apiKey, memory);
        const bias = classifyDayBias(articles);

        if (bias.bias === "NO_DAY_SIGNAL") {
          return null;
        }

        return {
          ticker: gainer.ticker,
          symbol: gainer.symbol,
          light: bias.bias,
          newsUrl: bias.latestUrl,
          latestHeadline: bias.latestHeadline,
          gainPct: gainer.gainPct,
          dayBiasScore: bias.dayBiasScore,
          todayArticleCount: bias.todayArticleCount,
        } satisfies NewsHunterItem;
      })
    );

    const filtered = analyzed.filter((item): item is NewsHunterItem => item !== null);

    const positiveDay = filtered
      .filter((item) => item.light === "POSITIVE_DAY")
      .sort((a, b) => {
        if (Math.abs(b.dayBiasScore) !== Math.abs(a.dayBiasScore)) {
          return Math.abs(b.dayBiasScore) - Math.abs(a.dayBiasScore);
        }
        if (b.todayArticleCount !== a.todayArticleCount) {
          return b.todayArticleCount - a.todayArticleCount;
        }
        if (b.gainPct !== a.gainPct) {
          return b.gainPct - a.gainPct;
        }
        return a.ticker.localeCompare(b.ticker);
      });

    const negativeDay = filtered
      .filter((item) => item.light === "NEGATIVE_DAY")
      .sort((a, b) => {
        if (Math.abs(b.dayBiasScore) !== Math.abs(a.dayBiasScore)) {
          return Math.abs(b.dayBiasScore) - Math.abs(a.dayBiasScore);
        }
        if (b.todayArticleCount !== a.todayArticleCount) {
          return b.todayArticleCount - a.todayArticleCount;
        }
        if (b.gainPct !== a.gainPct) {
          return b.gainPct - a.gainPct;
        }
        return a.ticker.localeCompare(b.ticker);
      });

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        mode: MODE,
        marketMode: getMarketMode(),
        startedAt,
        finishedAt: new Date().toISOString(),
        rawCount: gainers.length,
        showing: positiveDay.length + negativeDay.length,
        topTicker: positiveDay[0]?.ticker || negativeDay[0]?.ticker || null,
        positiveDay: positiveDay.map((item) => ({
          ticker: item.ticker,
          symbol: item.symbol,
          light: item.light,
          newsUrl: item.newsUrl,
          latestHeadline: item.latestHeadline,
        })),
        negativeDay: negativeDay.map((item) => ({
          ticker: item.ticker,
          symbol: item.symbol,
          light: item.light,
          newsUrl: item.newsUrl,
          latestHeadline: item.latestHeadline,
        })),
        data: {
          positiveDay: positiveDay.map((item) => ({
            ticker: item.ticker,
            symbol: item.symbol,
            light: item.light,
            newsUrl: item.newsUrl,
            latestHeadline: item.latestHeadline,
          })),
          negativeDay: negativeDay.map((item) => ({
            ticker: item.ticker,
            symbol: item.symbol,
            light: item.light,
            newsUrl: item.newsUrl,
            latestHeadline: item.latestHeadline,
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
