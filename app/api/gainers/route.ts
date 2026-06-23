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

type DollarBand = "APPROACHING_1" | "AT_1" | "ABOVE_1";

type RubiconItem = {
  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;
  gainPct: number;
  volume: number;
  averageVolume: number;
  relativeVolume: number;
  dollarVolume: number;

  dollarBand: DollarBand;
  dollarDistance: number;
  rubiconScore: number;

  lastTradeTimestampMs: number | null;
  quoteAgeMinutes: number | null;
  isFreshTrade: boolean;

  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;

  catalystScore: number;
  catalystLabel: string;
  catalystNote: string;
  isStrongPositiveCatalyst: boolean;
};

const SOURCE = "polygon-rubicon-hunter";
const MODE = "RUBICON_HUNTER";

function getApiKey(): string {
  return (
    process.env.POLYGON_API_KEY ||
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    ""
  );
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

function isJunkTicker(symbol: string): boolean {
  const ticker = cleanTicker(symbol);

  if (!ticker) return true;
  if (ticker.includes(".") || ticker.includes("-") || ticker.length > 5) return true;

  return (
    ticker.endsWith("W") ||
    ticker.endsWith("WS") ||
    ticker.endsWith("WT") ||
    ticker.endsWith("U") ||
    ticker.endsWith("R") ||
    ticker.endsWith("RT")
  );
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

function getDollarBand(price: number): DollarBand {
  if (price < 0.99) return "APPROACHING_1";
  if (price <= 1.01) return "AT_1";
  return "ABOVE_1";
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

function scoreCatalystHeadline(headline: string): {
  score: number;
  label: string;
  note: string;
  isStrongPositive: boolean;
} {
  const text = headline.toLowerCase();

  const veryStrong = [
    "fda",
    "approval",
    "cleared",
    "phase 3",
    "phase iii",
    "topline",
    "acquired",
    "acquisition",
    "merger",
    "awarded contract",
    "contract award",
    "uplist",
    "uplisting",
  ];

  const strong = [
    "partnership",
    "collaboration",
    "agreement",
    "strategic",
    "patent",
    "licensing",
    "order",
    "expansion",
    "launch",
    "guidance raised",
    "earnings beat",
    "beats earnings",
    "breakthrough",
    "grant",
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
    "miss earnings",
    "guidance cut",
  ];

  let score = 0;

  for (const keyword of veryStrong) {
    if (text.includes(keyword)) score += 5;
  }

  for (const keyword of strong) {
    if (text.includes(keyword)) score += 3;
  }

  for (const keyword of hardNegative) {
    if (text.includes(keyword)) score -= 6;
  }

  for (const keyword of negative) {
    if (text.includes(keyword)) score -= 3;
  }

  const isStrongPositive = score >= 5;

  if (score >= 8) {
    return {
      score,
      label: "VERY STRONG",
      note: "Headline reads like a strong positive catalyst.",
      isStrongPositive,
    };
  }

  if (score >= 5) {
    return {
      score,
      label: "STRONG",
      note: "Headline reads like a positive catalyst.",
      isStrongPositive,
    };
  }

  if (score > 0) {
    return {
      score,
      label: "MEDIUM",
      note: "Headline has some positive catalyst language.",
      isStrongPositive: false,
    };
  }

  if (score < 0) {
    return {
      score,
      label: "NEGATIVE",
      note: "Headline contains negative or dilution-style language.",
      isStrongPositive: false,
    };
  }

  return {
    score,
    label: "WEAK",
    note: "Headline did not show a strong positive catalyst.",
    isStrongPositive: false,
  };
}

async function fetchTickerNews(
  ticker: string,
  apiKey: string
): Promise<{
  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;
  catalystScore: number;
  catalystLabel: string;
  catalystNote: string;
  isStrongPositiveCatalyst: boolean;
}> {
  const fallback = {
    newsHeadline: "",
    newsUrl: "",
    newsPublisher: "",
    newsCategory: "NO_NEWS" as NewsCategory,
    newsFreshness: "UNKNOWN_NEWS_AGE" as NewsFreshness,
    newsAgeMinutes: null,
    catalystScore: 0,
    catalystLabel: "NO CATALYST",
    catalystNote: "No recent headline found.",
    isStrongPositiveCatalyst: false,
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
    const catalyst = scoreCatalystHeadline(newsHeadline);

    const isFreshEnough =
      newsFreshness === "FRESH_CATALYST" || newsFreshness === "RECENT_CATALYST";

    return {
      newsHeadline,
      newsUrl,
      newsPublisher,
      newsCategory,
      newsFreshness,
      newsAgeMinutes,
      catalystScore: catalyst.score,
      catalystLabel: catalyst.label,
      catalystNote: isFreshEnough
        ? catalyst.note
        : "Headline exists, but it is not fresh enough to trust as a live catalyst.",
      isStrongPositiveCatalyst: catalyst.isStrongPositive && isFreshEnough,
    };
  } catch {
    return fallback;
  }
}

function buildBaseRow(row: AnyObj, maxTradeAgeMinutes: number) {
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

  const volume = pickNumber(row, [
    "day.v",
    "volume",
    "v",
    "min.av",
    "min.v",
  ]);

  const averageVolume = pickNumber(row, [
    "averageVolume",
    "avgVolume",
    "day.av",
    "averagePremarketVolume",
    "avgPremarketVolume",
  ]);

  const relativeVolume = averageVolume > 0 ? volume / averageVolume : 0;
  const dollarVolume = volume * price;

  const lastTradeTimestampMs = normalizeTimestampMs(
    getPath(row, "lastTrade.t") ??
      getPath(row, "lastTrade.timestamp") ??
      getPath(row, "updated")
  );

  const quoteAgeMinutes = getQuoteAgeMinutes(lastTradeTimestampMs);
  const isFreshTrade =
    quoteAgeMinutes !== null && quoteAgeMinutes >= 0 && quoteAgeMinutes <= maxTradeAgeMinutes;

  const dollarDistance = Math.abs(price - 1);
  const dollarClosenessScore = Math.max(0, 1 - dollarDistance / 0.05) * 100;

  return {
    ticker,
    symbol: ticker,
    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 2),
    volume: round(volume, 0),
    averageVolume: round(averageVolume, 0),
    relativeVolume: round(relativeVolume, 4),
    dollarVolume: round(dollarVolume, 2),
    dollarBand: getDollarBand(price),
    dollarDistance: round(dollarDistance, 4),
    dollarClosenessScore: round(dollarClosenessScore, 2),
    lastTradeTimestampMs,
    quoteAgeMinutes,
    isFreshTrade,
  };
}

function buildEmptyPayload(message: string, startedAt: string) {
  const candidates: RubiconItem[] = [];

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

  const minPrice = num(searchParams.get("minPrice")) || 0.95;
  const maxPrice = num(searchParams.get("maxPrice")) || 1.05;
  const minVolume = num(searchParams.get("minVolume")) || 1_000_000;
  const limit = Math.max(1, Math.min(num(searchParams.get("limit")) || 25, 100));
  const removeJunk = boolParam(searchParams.get("removeJunk"), true);
  const requireStrongCatalyst = boolParam(searchParams.get("requireStrongCatalyst"), true);

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

    const baseUniverse = rowsRaw
      .filter(isObj)
      .map((row) => buildBaseRow(row, maxTradeAgeMinutes))
      .filter((item) => Boolean(item.ticker))
      .filter((item) => !removeJunk || !isJunkTicker(item.ticker))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.volume >= minVolume)
      .filter((item) => item.isFreshTrade);

    const withNews = await Promise.all(
      baseUniverse.map(async (item) => {
        const news = await fetchTickerNews(item.ticker, apiKey);

        const rubiconScore =
          news.catalystScore * 20 +
          item.dollarClosenessScore +
          Math.min(item.volume / 1_000_000, 10) * 5 +
          Math.max(item.gainPct, 0);

        return {
          ticker: item.ticker,
          symbol: item.symbol,
          price: item.price,
          previousClose: item.previousClose,
          gainPct: item.gainPct,
          volume: item.volume,
          averageVolume: item.averageVolume,
          relativeVolume: item.relativeVolume,
          dollarVolume: item.dollarVolume,
          dollarBand: item.dollarBand,
          dollarDistance: item.dollarDistance,
          rubiconScore: round(rubiconScore, 2),
          lastTradeTimestampMs: item.lastTradeTimestampMs,
          quoteAgeMinutes: item.quoteAgeMinutes,
          isFreshTrade: item.isFreshTrade,

          newsHeadline: news.newsHeadline,
          newsUrl: news.newsUrl,
          newsPublisher: news.newsPublisher,
          newsCategory: news.newsCategory,
          newsFreshness: news.newsFreshness,
          newsAgeMinutes: news.newsAgeMinutes,
          catalystScore: news.catalystScore,
          catalystLabel: news.catalystLabel,
          catalystNote: news.catalystNote,
          isStrongPositiveCatalyst: news.isStrongPositiveCatalyst,
        } satisfies RubiconItem;
      })
    );

    const candidates = withNews
      .filter((item) => !requireStrongCatalyst || item.isStrongPositiveCatalyst)
      .sort((a, b) => {
        if (b.rubiconScore !== a.rubiconScore) return b.rubiconScore - a.rubiconScore;
        if (a.dollarDistance !== b.dollarDistance) return a.dollarDistance - b.dollarDistance;
        if (b.volume !== a.volume) return b.volume - a.volume;
        if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
        return a.ticker.localeCompare(b.ticker);
      })
      .slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        mode: MODE,
        marketMode: getMarketMode(),
        startedAt,
        finishedAt: new Date().toISOString(),
        filters: {
          minPrice,
          maxPrice,
          minVolume,
          limit,
          removeJunk,
          requireStrongCatalyst,
          maxTradeAgeMinutes,
        },
        rawCount: rowsRaw.length,
        showing: candidates.length,
        topTicker: candidates[0]?.ticker ?? null,
        candidates,
        tickers: candidates,
        results: candidates,
        data: {
          candidates,
          tickers: candidates,
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
