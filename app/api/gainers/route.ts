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

type ActionLabel =
  | "NEW"
  | "CLIMBING"
  | "RUNNING"
  | "SPRINTING"
  | "HOLDING"
  | "FADING"
  | "WATCHING";

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

type MemoryState = {
  lastScan: Record<string, PreviousScanEntry>;
  tracker: Record<string, TrackerEntry>;
};

type BaseRow = {
  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;
  gainPct: number;
  volume: number;
  averageVolume: number;
  relativeVolume: number;
  dollarVolume: number;
};

type AlgoItem = BaseRow & {
  rank: number;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  bestRank: number;
  topFiveHits: number;
  seenCount: number;
  rankStatus: RankStatus;

  priorGainPct: number | null;
  gainChange: number;
  algoPercent: number;

  action: ActionLabel;
  status: string;
  observations: string[];

  newsCategory: NewsCategory;
  newsHeadline: string;
  newsAgeMinutes: number | null;
  newsFreshness: NewsFreshness;
  isFreshCatalyst: boolean;
  newsObservation: string;
  newsUrl: string;
  newsPublisher: string;
  newsTime: string;
};

const SOURCE = "polygon-algo-runner-hunter";
const MODE = "ALGO_RUNNER_HUNTER";
const MEMORY_KEY = "__ALGO_RUNNER_HUNTER_MEMORY__";

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
      tracker: {},
    };
  }

  return root[MEMORY_KEY] as MemoryState;
}

function resetMemory(): void {
  const memory = getMemory();
  memory.lastScan = {};
  memory.tracker = {};
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

function buildBaseRow(row: AnyObj): BaseRow {
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

  const volume = pickNumber(row, ["day.v", "volume", "v", "min.av", "min.v"]);

  const averageVolume = pickNumber(row, [
    "averagePremarketVolume",
    "avgPremarketVolume",
    "pmAvgVolume",
    "averageVolume",
    "avgVolume",
    "day.av",
  ]);

  const relativeVolume = averageVolume > 0 ? volume / averageVolume : 0;
  const dollarVolume = volume * price;

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

function deriveAction(
  previousRank: number | null,
  currentRank: number,
  gainChange: number
): ActionLabel {
  if (previousRank === null) return "NEW";

  const rankChange = previousRank - currentRank;

  if (rankChange >= 5 && gainChange > 1.5) return "SPRINTING";
  if (rankChange >= 3 && gainChange > 0.75) return "RUNNING";
  if (currentRank < previousRank && gainChange > 0.25) return "CLIMBING";
  if (currentRank === previousRank && gainChange >= -0.25 && gainChange <= 0.25) return "HOLDING";
  if (currentRank > previousRank && gainChange < -0.25) return "FADING";
  return "WATCHING";
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

function buildNewsObservation(newsFreshness: NewsFreshness): string {
  if (newsFreshness === "FRESH_CATALYST" || newsFreshness === "RECENT_CATALYST") {
    return "Possible live catalyst.";
  }

  return "Background news only — not confirmed as current move catalyst.";
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

    if (!newsHeadline && !newsUrl) return fallback;

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
      newsObservation: buildNewsObservation(newsFreshness),
      newsUrl,
      newsPublisher,
      newsTime,
    };
  } catch {
    return fallback;
  }
}

function buildEmptyPayload(message: string, startedAt: string) {
  const runnerHunter: AlgoItem[] = [];
  const leaderHunter: AlgoItem[] = [];

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
    topAlgoPercent: 0,
    runnerHunter,
    leaderHunter,
    data: {
      runnerHunter,
      leaderHunter,
    },
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
  const runnerMaxRank = Math.max(6, Math.min(num(searchParams.get("runnerMaxRank")) || 30, 100));
  const runnerLimit = Math.max(1, Math.min(num(searchParams.get("runnerLimit")) || 15, 50));
  const removeJunk = boolParam(searchParams.get("removeJunk"), true);
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

    const filteredUniverse = rowsRaw
      .filter(isObj)
      .map((row) => buildBaseRow(row))
      .filter((item) => Boolean(item.ticker))
      .filter((item) => !removeJunk || !isJunkTicker(item.ticker))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.gainPct >= minGain)
      .filter((item) => item.gainPct <= maxGain)
      .filter((item) => item.volume >= minVolume)
      .map((item) => {
        const previous = memory.lastScan[item.ticker];
        const priorGainPct = previous ? previous.gainPct : null;
        const gainChange = priorGainPct === null ? 0 : item.gainPct - priorGainPct;
        const algoPercent = item.gainPct + 2 * gainChange + 1.5 * item.relativeVolume;

        return {
          ...item,
          previousRank: previous ? previous.rank : null,
          priorGainPct,
          gainChange,
          algoPercent,
        };
      });

    filteredUniverse.sort((a, b) => {
      if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
      if (b.gainChange !== a.gainChange) return b.gainChange - a.gainChange;
      if (b.volume !== a.volume) return b.volume - a.volume;
      return a.ticker.localeCompare(b.ticker);
    });

    const nextLastScan: Record<string, PreviousScanEntry> = {};

    const rankedUniverse: AlgoItem[] = filteredUniverse.map((item, index) => {
      const currentRank = index + 1;
      const tracker = memory.tracker[item.ticker];
      const seenCount = (tracker?.seenCount ?? 0) + 1;
      const topFiveHits = (tracker?.topFiveHits ?? 0) + (currentRank <= 5 ? 1 : 0);
      const bestRank = tracker ? Math.min(tracker.bestRank, currentRank) : currentRank;
      const rankChange = item.previousRank === null ? null : item.previousRank - currentRank;
      const rankStatus = deriveRankStatus(item.previousRank, currentRank, topFiveHits);
      const action = deriveAction(item.previousRank, currentRank, item.gainChange);
      const status = deriveStatus(
        item.previousRank,
        currentRank,
        topFiveHits,
        item.priorGainPct,
        item.gainChange
      );
      const observations = buildObservations(
        item.previousRank,
        currentRank,
        topFiveHits,
        item.priorGainPct,
        item.gainChange
      );

      memory.tracker[item.ticker] = {
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

        volume: round(item.volume, 0),
        averageVolume: round(item.averageVolume, 0),
        relativeVolume: round(item.relativeVolume, 4),
        dollarVolume: round(item.dollarVolume, 2),

        algoPercent: round(item.algoPercent, 2),

        action,
        status,
        observations,

        newsCategory: "NO_NEWS",
        newsHeadline: "",
        newsAgeMinutes: null,
        newsFreshness: "UNKNOWN_NEWS_AGE",
        isFreshCatalyst: false,
        newsObservation: "",
        newsUrl: "",
        newsPublisher: "",
        newsTime: "",
      };
    });

    memory.lastScan = nextLastScan;

    const leadersBase = rankedUniverse
      .filter((item) => item.currentRank <= 5)
      .sort((a, b) => a.currentRank - b.currentRank);

    const runnersBase = rankedUniverse
      .filter((item) => item.currentRank > 5 && item.currentRank <= runnerMaxRank)
      .sort((a, b) => {
        if (b.algoPercent !== a.algoPercent) return b.algoPercent - a.algoPercent;
        if (b.gainChange !== a.gainChange) return b.gainChange - a.gainChange;
        if ((b.rankChange ?? -999) !== (a.rankChange ?? -999)) {
          return (b.rankChange ?? -999) - (a.rankChange ?? -999);
        }
        if (b.volume !== a.volume) return b.volume - a.volume;
        return a.ticker.localeCompare(b.ticker);
      })
      .slice(0, runnerLimit);

    const uniqueTickers = Array.from(
      new Set([...leadersBase, ...runnersBase].map((item) => item.ticker).filter(Boolean))
    );

    const newsMap = new Map<string, Awaited<ReturnType<typeof fetchTickerNews>>>();

    await Promise.all(
      uniqueTickers.map(async (ticker) => {
        newsMap.set(ticker, await fetchTickerNews(ticker, apiKey));
      })
    );

    const attachNews = (item: AlgoItem): AlgoItem => {
      const news = newsMap.get(item.ticker);

      if (!news) return item;

      const observations = [...item.observations];
      if (news.newsObservation) {
        observations.push(news.newsObservation);
      }

      return {
        ...item,
        ...news,
        observations,
      };
    };

    const leaderHunter = leadersBase.map(attachNews);
    const runnerHunter = runnersBase.map(attachNews);

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
          minGain,
          maxGain,
          minVolume,
          runnerMaxRank,
          runnerLimit,
          removeJunk,
        },
        rawCount: rowsRaw.length,
        showing: runnerHunter.length + leaderHunter.length,
        topTicker: runnerHunter[0]?.ticker || leaderHunter[0]?.ticker || null,
        topAlgoPercent: runnerHunter[0]?.algoPercent || leaderHunter[0]?.algoPercent || 0,
        runnerHunter,
        leaderHunter,
        data: {
          runnerHunter,
          leaderHunter,
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
