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

type RankStatus =
  | "NEW"
  | "RANK_CLIMBER"
  | "RANK_FADE"
  | "HOLDING"
  | "CONSISTENT_TOP_5";

type NewsCategory = "NO_NEWS" | "NEWS" | "PRESS_RELEASE" | "FILING_LIKE_NEWS";

type PreviousScanEntry = {
  rank: number;
  gainPct: number;
};

type TrackerEntry = {
  bestRank: number;
  topFiveHits: number;
  seenCount: number;
};

type RawHunterState = {
  lastScan: Record<string, PreviousScanEntry>;
  tracker: Record<string, TrackerEntry>;
};

type FormulaTicker = {
  rank: number;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  bestRank: number;
  topFiveHits: number;
  seenCount: number;
  rankStatus: RankStatus;

  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;

  gainPct: number;
  priorGainPct: number | null;
  gainChange: number;

  premarketVolume: number;
  averagePremarketVolume: number;
  relativeVolume: number;
  relativePremarketVolume: number;
  dollarVolume: number;

  rawHunterValue: number;

  status: string;
  phase: string;
  observations: string[];

  newsCategory: NewsCategory;
  newsHeadline: string;
  newsAgeMinutes: number | null;
  newsFreshness: NewsFreshness;
  isFreshCatalyst: boolean;
  newsObservation: string;

  hasNews: boolean;
  newsUrl: string;
  newsPublisher: string;
  newsTime: string;

  // Compatibility aliases.
  gainPctFromPriorScan: number | null;
  hunterScore: number;
  rawHunterScore: number;
  hunterStatus: string;
  hunterPhase: string;
  newsTitle: string;
  newsTag: string;
  reasons: string[];
  warnings: string[];
};

const SOURCE = "polygon-elite-dev-5-raw-hunter";
const BRANCH_PURPOSE = "ELITE_DEV_5_RAW_4AM_FORMULA_ONLY";
const STATE_KEY = "__ELITE_DEV_5_RAW_HUNTER_STATE__";

function getApiKey(): string {
  return (
    process.env.POLYGON_API_KEY ||
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    ""
  );
}

function getState(): RawHunterState {
  const root = globalThis as typeof globalThis & {
    [STATE_KEY]?: RawHunterState;
  };

  if (!root[STATE_KEY]) {
    root[STATE_KEY] = {
      lastScan: {},
      tracker: {},
    };
  }

  return root[STATE_KEY] as RawHunterState;
}

function resetState(): void {
  const state = getState();
  state.lastScan = {};
  state.tracker = {};
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

function getMarketMode(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 4 * 60) return "OVERNIGHT";
  if (totalMinutes < 9 * 60 + 30) return "PREMARKET";
  if (totalMinutes < 16 * 60) return "REGULAR_HOURS";
  return "AFTER_HOURS";
}

function classifyPhase(gainPct: number): string {
  if (gainPct < 10) return "SCANNING";
  if (gainPct < 25) return "EARLY";
  if (gainPct < 60) return "ACTIVE";
  return "EXTENDED";
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

  if (ageMinutes > 24 * 60) {
    return {
      newsAgeMinutes: null,
      newsFreshness: "STALE_NEWS",
    };
  }

  return {
    newsAgeMinutes: ageMinutes,
    newsFreshness: "BACKGROUND_NEWS",
  };
}

function buildNewsObservation(hasNews: boolean, newsFreshness: NewsFreshness): string {
  if (!hasNews) return "";

  if (newsFreshness === "FRESH_CATALYST" || newsFreshness === "RECENT_CATALYST") {
    return "Possible live catalyst.";
  }

  return "Background news only — not confirmed as current move catalyst.";
}

function buildBaseRow(row: AnyObj) {
  const ticker = cleanTicker(row.ticker || row.symbol || row.T);

  const price = pickNumber(row, [
    "lastTrade.p",
    "lastTrade.price",
    "min.c",
    "day.c",
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
    price > 0 && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0;

  const premarketVolume = pickNumber(row, [
    "day.v",
    "volume",
    "v",
    "min.av",
    "min.v",
  ]);

  const averagePremarketVolume = pickNumber(row, [
    "averagePremarketVolume",
    "avgPremarketVolume",
    "pmAvgVolume",
    "preMarket.averageVolume",
    "session.averagePremarketVolume",
  ]);

  const relativeVolume =
    averagePremarketVolume > 0 ? premarketVolume / averagePremarketVolume : 0;

  const dollarVolume = premarketVolume * price;

  return {
    ticker,
    symbol: ticker,
    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 2),
    premarketVolume: round(premarketVolume, 0),
    averagePremarketVolume: round(averagePremarketVolume, 0),
    relativeVolume: round(relativeVolume, 4),
    dollarVolume: round(dollarVolume, 2),
  };
}

function deriveRankStatus(
  previousRank: number | null,
  currentRank: number,
  topFiveHits: number
): RankStatus {
  if (previousRank === null) return "NEW";
  if (currentRank <= 5 && topFiveHits >= 3) return "CONSISTENT_TOP_5";
  if (currentRank < previousRank) return "RANK_CLIMBER";
  if (currentRank > previousRank) return "RANK_FADE";
  return "HOLDING";
}

function deriveStatus(
  previousRank: number | null,
  currentRank: number,
  topFiveHits: number,
  priorGainPct: number | null,
  gainChange: number
): string {
  const gainFlat = priorGainPct !== null && gainChange >= -0.25 && gainChange <= 0.25;
  const rankWorsened = previousRank !== null && currentRank > previousRank;
  const rankImproved = previousRank !== null && currentRank < previousRank;

  if (currentRank <= 5 && topFiveHits >= 3) return "CONSISTENT TOP 5";
  if (previousRank === null) return "NEW";
  if (rankImproved) return "RANK CLIMBER";
  if (rankWorsened && gainChange < -0.25) return "PUMP LOSING CONTROL";
  if (rankWorsened && gainFlat) return "RANK FADE";
  if (rankWorsened) return "RANK FADE";
  return "HOLDING";
}

function buildObservations(
  previousRank: number | null,
  currentRank: number,
  topFiveHits: number,
  priorGainPct: number | null,
  gainChange: number
): string[] {
  const notes: string[] = [];

  if (topFiveHits >= 3 && currentRank <= 5) {
    notes.push("Holding top 5 across scans.");
  }

  if (previousRank === null) {
    notes.push("New to this scan.");
  } else if (currentRank < previousRank) {
    notes.push(`Rank improved from #${previousRank} to #${currentRank}.`);
  } else if (currentRank > previousRank) {
    notes.push(`Rank faded from #${previousRank} to #${currentRank}.`);
  } else {
    notes.push("Holding rank across scans.");
  }

  if (priorGainPct !== null && gainChange >= -0.25 && gainChange <= 0.25) {
    notes.push("Gain is flat since last scan.");
  }

  return notes;
}

async function fetchTickerNews(
  ticker: string,
  apiKey: string
): Promise<{
  newsCategory: NewsCategory;
  newsHeadline: string;
  newsAgeMinutes: number | null;
  newsFreshness: NewsFreshness;
  isFreshCatalyst: boolean;
  newsObservation: string;
  hasNews: boolean;
  newsUrl: string;
  newsPublisher: string;
  newsTime: string;
}> {
  const fallback = {
    newsCategory: "NO_NEWS" as NewsCategory,
    newsHeadline: "",
    newsAgeMinutes: null,
    newsFreshness: "UNKNOWN_NEWS_AGE" as NewsFreshness,
    isFreshCatalyst: false,
    newsObservation: "",
    hasNews: false,
    newsUrl: "",
    newsPublisher: "",
    newsTime: "",
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
    const hasNews = Boolean(newsHeadline || newsUrl);

    if (!hasNews) return fallback;

    const newsCategory = classifyNewsCategory(newsHeadline, newsPublisher, newsUrl);
    const { newsAgeMinutes, newsFreshness } = getNewsAgeData(newsTime);
    const isFreshCatalyst =
      newsFreshness === "FRESH_CATALYST" || newsFreshness === "RECENT_CATALYST";

    return {
      newsCategory,
      newsHeadline,
      newsAgeMinutes,
      newsFreshness,
      isFreshCatalyst,
      newsObservation: buildNewsObservation(hasNews, newsFreshness),
      hasNews,
      newsUrl,
      newsPublisher,
      newsTime,
    };
  } catch {
    return fallback;
  }
}

function buildEmptyPayload(message: string, startedAt: string) {
  const formulaList: FormulaTicker[] = [];

  return {
    ok: false,
    source: SOURCE,
    branchPurpose: BRANCH_PURPOSE,
    marketMode: getMarketMode(),
    message,
    startedAt,
    finishedAt: new Date().toISOString(),
    rawCount: 0,
    showing: 0,
    topTicker: null,
    topScore: 0,
    formulaList,
    data: {
      tickers: formulaList,
      formulaList,
    },
    tickers: formulaList,
    results: formulaList,
    gainers: formulaList,
  };
}

export async function GET(req: Request) {
  const startedAt = new Date().toISOString();
  const apiKey = getApiKey();
  const { searchParams } = new URL(req.url);

  const minPrice = num(searchParams.get("minPrice")) || 0.1;
  const maxPrice = num(searchParams.get("maxPrice")) || 10;
  const minGain = num(searchParams.get("minGain")) || 0;
  const maxGain = num(searchParams.get("maxGain")) || 120;
  const minVolume = num(searchParams.get("minVolume")) || 0;
  const limit = Math.max(1, Math.min(num(searchParams.get("limit")) || 10, 100));
  const removeJunk = boolParam(searchParams.get("removeJunk"), true);
  const resetMemory = boolParam(searchParams.get("resetMemory"), false);

  if (resetMemory) {
    resetState();
  }

  if (!apiKey) {
    return NextResponse.json(buildEmptyPayload("Missing POLYGON_API_KEY or MASSIVE_API_KEY.", startedAt), {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  try {
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
        buildEmptyPayload(`Polygon/Massive request failed with status ${res.status}.`, startedAt),
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

    const state = getState();

    const candidates = rowsRaw
      .filter(isObj)
      .map((row) => buildBaseRow(row))
      .filter((item) => Boolean(item.ticker))
      .filter((item) => !removeJunk || !isJunkTicker(item.ticker))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.gainPct >= minGain)
      .filter((item) => item.gainPct <= maxGain)
      .filter((item) => item.premarketVolume >= minVolume)
      .map((item) => {
        const previous = state.lastScan[item.ticker];
        const priorGainPct = previous ? previous.gainPct : null;
        const gainChange = priorGainPct === null ? 0 : item.gainPct - priorGainPct;
        const rawHunterValue =
          item.gainPct + 2 * gainChange + 1.5 * item.relativeVolume;

        return {
          ...item,
          previousRank: previous ? previous.rank : null,
          priorGainPct,
          gainChange,
          rawHunterValue,
        };
      });

    candidates.sort((a, b) => {
      if (b.rawHunterValue !== a.rawHunterValue) {
        return b.rawHunterValue - a.rawHunterValue;
      }

      if (b.gainPct !== a.gainPct) {
        return b.gainPct - a.gainPct;
      }

      const aPreviousRank = a.previousRank ?? Number.MAX_SAFE_INTEGER;
      const bPreviousRank = b.previousRank ?? Number.MAX_SAFE_INTEGER;

      if (aPreviousRank !== bPreviousRank) {
        return aPreviousRank - bPreviousRank;
      }

      if (b.premarketVolume !== a.premarketVolume) {
        return b.premarketVolume - a.premarketVolume;
      }

      return a.ticker.localeCompare(b.ticker);
    });

    const nextLastScan: Record<string, PreviousScanEntry> = {};

    const rankedAll: FormulaTicker[] = candidates.map((item, index) => {
      const currentRank = index + 1;
      const tracker = state.tracker[item.ticker];
      const seenCount = (tracker?.seenCount ?? 0) + 1;
      const topFiveHits = (tracker?.topFiveHits ?? 0) + (currentRank <= 5 ? 1 : 0);
      const bestRank = tracker ? Math.min(tracker.bestRank, currentRank) : currentRank;
      const rankChange = item.previousRank === null ? null : item.previousRank - currentRank;
      const rankStatus = deriveRankStatus(item.previousRank, currentRank, topFiveHits);
      const status = deriveStatus(
        item.previousRank,
        currentRank,
        topFiveHits,
        item.priorGainPct,
        item.gainChange
      );
      const phase = classifyPhase(item.gainPct);
      const observations = buildObservations(
        item.previousRank,
        currentRank,
        topFiveHits,
        item.priorGainPct,
        item.gainChange
      );

      state.tracker[item.ticker] = {
        bestRank,
        topFiveHits,
        seenCount,
      };

      nextLastScan[item.ticker] = {
        rank: currentRank,
        gainPct: item.gainPct,
      };

      return {
        rank: currentRank,
        currentRank,
        previousRank: item.previousRank,
        rankChange,
        bestRank,
        topFiveHits,
        seenCount,
        rankStatus,

        ticker: item.ticker,
        symbol: item.symbol,
        price: item.price,
        previousClose: item.previousClose,

        gainPct: round(item.gainPct, 2),
        priorGainPct: item.priorGainPct === null ? null : round(item.priorGainPct, 2),
        gainChange: round(item.gainChange, 2),

        premarketVolume: round(item.premarketVolume, 0),
        averagePremarketVolume: round(item.averagePremarketVolume, 0),
        relativeVolume: round(item.relativeVolume, 4),
        relativePremarketVolume: round(item.relativeVolume, 4),
        dollarVolume: round(item.dollarVolume, 2),

        rawHunterValue: round(item.rawHunterValue, 2),

        status,
        phase,
        observations,

        newsCategory: "NO_NEWS",
        newsHeadline: "",
        newsAgeMinutes: null,
        newsFreshness: "UNKNOWN_NEWS_AGE",
        isFreshCatalyst: false,
        newsObservation: "",

        hasNews: false,
        newsUrl: "",
        newsPublisher: "",
        newsTime: "",

        gainPctFromPriorScan: item.priorGainPct === null ? null : round(item.priorGainPct, 2),
        hunterScore: round(item.rawHunterValue, 2),
        rawHunterScore: round(item.rawHunterValue, 2),
        hunterStatus: status,
        hunterPhase: phase,
        newsTitle: "",
        newsTag: "NO_NEWS",
        reasons: observations,
        warnings: [],
      };
    });

    state.lastScan = nextLastScan;

    const formulaList = await Promise.all(
      rankedAll.slice(0, limit).map(async (item) => {
        const news = await fetchTickerNews(item.ticker, apiKey);
        const observations = [...item.observations];

        if (news.newsObservation) {
          observations.push(news.newsObservation);
        }

        return {
          ...item,
          ...news,
          newsTitle: news.newsHeadline,
          newsTag: news.newsCategory,
          reasons: observations,
          observations,
        };
      })
    );

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        branchPurpose: BRANCH_PURPOSE,
        marketMode: getMarketMode(),
        startedAt,
        finishedAt: new Date().toISOString(),
        filters: {
          minPrice,
          maxPrice,
          minGain,
          maxGain,
          minVolume,
          limit,
          removeJunk,
        },
        rawCount: rowsRaw.length,
        showing: formulaList.length,
        topTicker: formulaList[0]?.ticker ?? null,
        topScore: formulaList[0]?.rawHunterValue ?? 0,
        formulaList,
        data: {
          tickers: formulaList,
          formulaList,
        },
        tickers: formulaList,
        results: formulaList,
        gainers: formulaList,
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

// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NewsFreshness =
  | "FRESH_CATALYST"
  | "RECENT_CATALYST"
  | "BACKGROUND_NEWS"
  | "STALE_NEWS"
  | "UNKNOWN_NEWS_AGE";

type RankStatus =
  | "NEW"
  | "RANK_CLIMBER"
  | "RANK_FADE"
  | "HOLDING"
  | "CONSISTENT_TOP_5";

type FormulaTicker = {
  rank?: number;
  currentRank?: number;
  previousRank?: number | null;
  rankChange?: number | null;
  bestRank?: number;
  topFiveHits?: number;
  seenCount?: number;
  rankStatus?: RankStatus;

  ticker?: string;
  symbol?: string;
  price?: number;
  previousClose?: number;

  gainPct?: number;
  priorGainPct?: number | null;
  gainChange?: number;

  premarketVolume?: number;
  averagePremarketVolume?: number;
  relativeVolume?: number;
  dollarVolume?: number;

  rawHunterValue?: number;

  status?: string;
  phase?: string;
  observations?: string[];

  newsCategory?: string;
  newsHeadline?: string;
  newsAgeMinutes?: number | null;
  newsFreshness?: NewsFreshness;
  isFreshCatalyst?: boolean;
  newsObservation?: string;

  hasNews?: boolean;
  newsUrl?: string;
  newsPublisher?: string;
  newsTime?: string;
};

type ApiResponse = {
  ok?: boolean;
  source?: string;
  branchPurpose?: string;
  marketMode?: string;
  message?: string;
  rawCount?: number;
  showing?: number;
  topTicker?: string | null;
  topScore?: number;
  formulaList?: FormulaTicker[];
  tickers?: FormulaTicker[];
  results?: FormulaTicker[];
  gainers?: FormulaTicker[];
  data?: {
    tickers?: FormulaTicker[];
    formulaList?: FormulaTicker[];
  };
};

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

function normalizeList(json: ApiResponse): FormulaTicker[] {
  if (Array.isArray(json.formulaList)) return json.formulaList;
  if (Array.isArray(json.tickers)) return json.tickers;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.gainers)) return json.gainers;
  if (Array.isArray(json.data?.formulaList)) return json.data.formulaList ?? [];
  if (Array.isArray(json.data?.tickers)) return json.data.tickers ?? [];
  return [];
}

function formatPrice(value: unknown): string {
  const n = num(value);
  if (n <= 0) return "—";
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatPct(value: unknown): string {
  return `${num(value).toFixed(2)}%`;
}

function formatNullablePct(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${num(value).toFixed(2)}%`;
}

function formatVol(value: unknown): string {
  const n = num(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatRank(value: number | null | undefined): string {
  if (!value) return "—";
  return `#${value}`;
}

function formatRankChange(value: number | null | undefined): string {
  if (value === null || value === undefined) return "NEW";
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatRawHunterValue(value: unknown): string {
  return num(value).toFixed(2);
}

function formatFreshness(item: FormulaTicker): string {
  if (!item.hasNews) return "—";

  const freshness = str(item.newsFreshness || "UNKNOWN_NEWS_AGE");
  const age = item.newsAgeMinutes;

  if (typeof age === "number" && Number.isFinite(age)) {
    return `${freshness} • ${age}m`;
  }

  return freshness;
}

function pillClass(text?: string): string {
  const t = str(text).toUpperCase();

  if (
    t.includes("FRESH_CATALYST") ||
    t.includes("RECENT_CATALYST") ||
    t.includes("CONSISTENT") ||
    t.includes("RANK_CLIMBER")
  ) {
    return "good";
  }

  if (
    t.includes("STALE") ||
    t.includes("BACKGROUND") ||
    t.includes("PUMP LOSING CONTROL") ||
    t.includes("RANK FADE")
  ) {
    return "bad";
  }

  if (
    t.includes("NEW") ||
    t.includes("HOLDING") ||
    t.includes("UNKNOWN") ||
    t.includes("PRESS") ||
    t.includes("FILING")
  ) {
    return "watch";
  }

  return "neutral";
}

function buildNotes(item: FormulaTicker): string[] {
  const notes = [...(item.observations || [])];

  if (item.newsObservation) {
    notes.push(item.newsObservation);
  }

  return Array.from(new Set(notes.filter(Boolean))).slice(0, 4);
}

export default function HomePage() {
  const [items, setItems] = useState<FormulaTicker[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [topScore, setTopScore] = useState(0);
  const [source, setSource] = useState("waiting");
  const [branchPurpose, setBranchPurpose] = useState("waiting");
  const [marketMode, setMarketMode] = useState("waiting");
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState("Never");
  const [loading, setLoading] = useState(false);

  const [minPrice, setMinPrice] = useState("0.10");
  const [maxPrice, setMaxPrice] = useState("10");
  const [minGain, setMinGain] = useState("0");
  const [maxGain, setMaxGain] = useState("120");
  const [minVolume, setMinVolume] = useState("0");
  const [limit, setLimit] = useState("10");
  const [removeJunk, setRemoveJunk] = useState(true);

  const fetchHunter = useCallback(
    async (resetMemory = false) => {
      setLoading(true);
      setMessage("");

      try {
        const params = new URLSearchParams({
          minPrice,
          maxPrice,
          minGain,
          maxGain,
          minVolume,
          limit,
          removeJunk: String(removeJunk),
          resetMemory: String(resetMemory),
        });

        const res = await fetch(`/api/gainers?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json()) as ApiResponse;
        const list = normalizeList(json);

        setItems(list);
        setRawCount(num(json.rawCount));
        setShowing(num(json.showing) || list.length);
        setTopTicker(json.topTicker || cleanTicker(list[0]?.ticker || list[0]?.symbol) || null);
        setTopScore(num(json.topScore) || num(list[0]?.rawHunterValue));
        setSource(str(json.source || "unknown"));
        setBranchPurpose(str(json.branchPurpose || "unknown"));
        setMarketMode(str(json.marketMode || "unknown"));
        setMessage(str(json.message || ""));
        setLastScan(new Date().toLocaleTimeString());
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown page error.";
        setMessage(text);
        setItems([]);
        setRawCount(0);
        setShowing(0);
        setTopTicker(null);
        setTopScore(0);
      } finally {
        setLoading(false);
      }
    },
    [minPrice, maxPrice, minGain, maxGain, minVolume, limit, removeJunk]
  );

  useEffect(() => {
    void fetchHunter();
  }, [fetchHunter]);

  const observationList = useMemo(() => items.slice(0, 12), [items]);

  return (
    <main className="shell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255,199,44,.15), transparent 35%),
            linear-gradient(135deg, #030303, #111, #050505);
          color: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          padding: 22px;
        }

        .hero, .panel {
          border: 1px solid rgba(255,199,44,.22);
          background: rgba(0,0,0,.7);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ffc72c;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 64px);
          line-height: .95;
          letter-spacing: -.06em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -.03em;
        }

        .sub {
          color: #cfcfcf;
          max-width: 980px;
          line-height: 1.5;
          margin-top: 12px;
          font-size: 14px;
        }

        button {
          border: 0;
          border-radius: 15px;
          padding: 12px 15px;
          font-weight: 950;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .gold {
          background: linear-gradient(135deg, #ffc72c, #c99000);
          color: #030303;
        }

        .dark {
          background: rgba(255,255,255,.08);
          color: #fff;
          border: 1px solid rgba(255,255,255,.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.055);
        }

        .label {
          color: #9f9f9f;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 950;
        }

        .value {
          font-size: 26px;
          font-weight: 950;
          margin-top: 5px;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        input {
          background: rgba(0,0,0,.55);
          border: 1px solid rgba(255,255,255,.14);
          color: #fff;
          border-radius: 13px;
          padding: 11px;
          font-weight: 850;
          outline: none;
          width: 100%;
        }

        input:focus {
          border-color: rgba(255,199,44,.75);
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 20px;
          font-weight: 850;
          color: #d8d8d8;
        }

        .check input {
          width: auto;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.45fr .85fr;
          gap: 16px;
          margin-top: 16px;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
        }

        table {
          width: 100%;
          min-width: 1480px;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          color: #aaa;
          background: rgba(255,255,255,.055);
          padding: 11px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        td {
          padding: 11px;
          border-top: 1px solid rgba(255,255,255,.08);
          font-weight: 850;
          vertical-align: top;
        }

        .ticker {
          color: #ffc72c;
          font-size: 18px;
          font-weight: 950;
        }

        .headline {
          margin-top: 6px;
          color: #cfcfcf;
          font-size: 12px;
          line-height: 1.35;
          max-width: 360px;
        }

        .muted {
          color: #aaa;
          font-size: 12px;
          line-height: 1.35;
        }

        .pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .05em;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.08);
          color: #ddd;
          white-space: nowrap;
          text-decoration: none;
        }

        .pill.good {
          color: #76ff9f;
          background: rgba(118,255,159,.09);
          border-color: rgba(118,255,159,.25);
        }

        .pill.watch {
          color: #ffc72c;
          background: rgba(255,199,44,.09);
          border-color: rgba(255,199,44,.25);
        }

        .pill.bad {
          color: #ff7b7b;
          background: rgba(255,123,123,.09);
          border-color: rgba(255,123,123,.25);
        }

        .pill-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .obs {
          border-top: 1px solid rgba(255,255,255,.08);
          padding: 12px 0;
        }

        .obs-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .obs-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .obs-meta {
          color: #aaa;
          font-size: 12px;
          line-height: 1.45;
        }

        .notes {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .note {
          color: #d7d7d7;
          background: rgba(255,255,255,.06);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.35;
        }

        .empty, .error {
          border-radius: 18px;
          padding: 18px;
          color: #aaa;
          border: 1px dashed rgba(255,255,255,.18);
          text-align: center;
          line-height: 1.45;
        }

        .error {
          margin-top: 12px;
          border-style: solid;
          color: #ffd1d1;
          background: rgba(255,90,90,.08);
          border-color: rgba(255,90,90,.25);
          font-weight: 850;
        }

        @media (max-width: 1200px) {
          .stats, .filters, .grid {
            grid-template-columns: 1fr;
          }

          button {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Elite Dev 5</div>
            <h1>Raw Hunter</h1>
            <div className="sub">
              Raw formula only. This scan tracks rank history, gain change, and clean news freshness.
              It does not use permission logic, support/resistance, candle confirmation, Level 2,
              spread logic, or trade advice.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gold" onClick={() => void fetchHunter()} disabled={loading}>
              {loading ? "Scanning..." : "New Scan"}
            </button>

            <button className="dark" onClick={() => void fetchHunter(true)} disabled={loading}>
              Clear Rank Memory
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="label">Top Ticker</div>
            <div className="value">{topTicker || "—"}</div>
          </div>

          <div className="stat">
            <div className="label">Top Raw Hunter</div>
            <div className="value">{topScore.toFixed(2)}</div>
          </div>

          <div className="stat">
            <div className="label">Market Mode</div>
            <div className="value">{marketMode}</div>
          </div>

          <div className="stat">
            <div className="label">Raw Count</div>
            <div className="value">{rawCount}</div>
          </div>

          <div className="stat">
            <div className="label">Showing</div>
            <div className="value">{showing}</div>
          </div>
        </div>

        <div className="filters">
          <div className="field">
            <label className="label">Min Price</label>
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Max Price</label>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Min Gain %</label>
            <input value={minGain} onChange={(e) => setMinGain(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Max Gain %</label>
            <input value={maxGain} onChange={(e) => setMaxGain(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Min Volume</label>
            <input value={minVolume} onChange={(e) => setMinVolume(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Limit</label>
            <input value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={removeJunk}
              onChange={(e) => setRemoveJunk(e.target.checked)}
            />
            Remove Junk
          </label>
        </div>

        <div className="muted" style={{ marginTop: 14 }}>
          Last scan: <b>{lastScan}</b>
          {" | "}
          Source: <b>{source}</b>
          {" | "}
          Branch: <b>{branchPurpose}</b>
        </div>

        {message ? <div className="error">{message}</div> : null}
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Current Raw Hunter List</h2>

          {items.length === 0 ? (
            <div className="empty">
              No live movers matched the current filters.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Previous Rank</th>
                    <th>Rank Change</th>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Gain</th>
                    <th>Prior Gain</th>
                    <th>Gain Change</th>
                    <th>Volume</th>
                    <th>Raw Hunter Value</th>
                    <th>Status</th>
                    <th>Phase</th>
                    <th>News Freshness</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const ticker = cleanTicker(item.ticker || item.symbol);

                    return (
                      <tr key={`${ticker}-${index}`}>
                        <td>{formatRank(item.currentRank || item.rank)}</td>
                        <td>{formatRank(item.previousRank)}</td>
                        <td>{formatRankChange(item.rankChange)}</td>

                        <td>
                          <div className="ticker">{ticker || "—"}</div>

                          {item.hasNews ? (
                            <div className="pill-row" style={{ marginTop: 6 }}>
                              {item.newsUrl ? (
                                <a
                                  className={`pill ${pillClass(item.newsCategory)}`}
                                  href={item.newsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={item.newsHeadline || "News"}
                                >
                                  {item.newsCategory || "NEWS"}
                                </a>
                              ) : (
                                <span className={`pill ${pillClass(item.newsCategory)}`}>
                                  {item.newsCategory || "NEWS"}
                                </span>
                              )}

                              <span className={`pill ${pillClass(item.newsFreshness)}`}>
                                {item.newsFreshness || "UNKNOWN_NEWS_AGE"}
                              </span>
                            </div>
                          ) : null}

                          {item.newsHeadline ? (
                            <div className="headline">{item.newsHeadline}</div>
                          ) : null}
                        </td>

                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPct(item.gainPct)}</td>
                        <td>{formatNullablePct(item.priorGainPct)}</td>
                        <td>{formatPct(item.gainChange)}</td>
                        <td>{formatVol(item.premarketVolume)}</td>
                        <td>{formatRawHunterValue(item.rawHunterValue)}</td>

                        <td>
                          <span className={`pill ${pillClass(item.status)}`}>
                            {item.status || "HOLDING"}
                          </span>
                        </td>

                        <td>
                          <span className="pill">{item.phase || "SCANNING"}</span>
                        </td>

                        <td>
                          <div>{formatFreshness(item)}</div>
                          {item.hasNews ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                              {item.isFreshCatalyst
                                ? "Possible live catalyst."
                                : "Background news only — not confirmed as current move catalyst."}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="panel">
          <h2>Rank History Observations</h2>

          {observationList.length === 0 ? (
            <div className="empty">
              Run scans to populate rank history and news freshness tracking.
            </div>
          ) : (
            observationList.map((item) => {
              const ticker = cleanTicker(item.ticker || item.symbol);
              const notes = buildNotes(item);

              return (
                <div className="obs" key={ticker}>
                  <div className="obs-top">
                    <div>
                      <div className="ticker">{ticker}</div>
                      <div className="obs-meta" style={{ marginTop: 6 }}>
                        Now: {formatRank(item.currentRank || item.rank)}
                        {" | "}
                        Prev: {formatRank(item.previousRank)}
                        {" | "}
                        Best: {formatRank(item.bestRank)}
                        {" | "}
                        Top 5 hits: {num(item.topFiveHits)}
                        {" | "}
                        Seen: {num(item.seenCount)}x
                      </div>
                    </div>

                    <div className="obs-badges">
                      <span className={`pill ${pillClass(item.rankStatus)}`}>
                        {item.rankStatus || "HOLDING"}
                      </span>

                      <span className={`pill ${pillClass(item.status)}`}>
                        {item.status || "HOLDING"}
                      </span>

                      {item.hasNews ? (
                        <span className={`pill ${pillClass(item.newsFreshness)}`}>
                          {formatFreshness(item)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="notes">
                    {notes.length === 0 ? (
                      <div className="note">No major change yet.</div>
                    ) : (
                      notes.map((note, index) => (
                        <div className="note" key={`${ticker}-note-${index}`}>
                          {note}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </aside>
      </section>
    </main>
  );
}
