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
type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";
type EstablishedLight = "ESTABLISHED_GREEN" | "ESTABLISHED_YELLOW" | "NOT_ESTABLISHED";

type PreviousScanEntry = {
  gainPct: number;
  speedPct: number;
  volume: number;
};

type MemoryState = {
  lastScan: Record<string, PreviousScanEntry>;
  newsCache: Record<string, NewsCacheEntry>;
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

type NewsCacheEntry = {
  fetchedAt: number;
  latest: LatestNewsData;
  items5d: NewsArticle[];
};

type ScannerConfig = {
  minPrice: number;
  maxPrice: number;
  minGainPct: number;
  maxGainPct: number;
  minVolume: number;
  minDollarVolume: number;
  maxSpreadPct: number;
  maxQuoteAgeMinutes: number;
  preCandidateCount: number;
  finalLimit: number;

  greenThreshold: number;
  yellowThreshold: number;

  useCatalyst: boolean;
  useHunter: boolean;
  useEstablished: boolean;
  useVwap: boolean;
  useSpread: boolean;
  useVolumeSpeed: boolean;

  pctWeight: number;
  speedWeight: number;
  accelWeight: number;
  volumeWeight: number;
  volumeSpeedWeight: number;
  vwapWeight: number;
  spreadWeight: number;
  catalystWeight: number;
  hunterWeight: number;
  establishedWeight: number;
  dayBiasWeight: number;
};

type BaseRow = {
  ticker: string;
  symbol: string;
  price: number;
  previousClose: number;
  gainPct: number;
  volume: number;
  dollarVolume: number;
  vwap: number;
  vwapDistancePct: number;
  bid: number;
  ask: number;
  spreadPct: number | null;
  lastTradeTimestampMs: number | null;
  quoteAgeMinutes: number | null;
  isFreshTrade: boolean;
};

type RankedRow = BaseRow & {
  priorGainPct: number | null;
  speedPct: number;
  priorSpeedPct: number;
  momentumPct: number;
  volumeSpeedPct: number;
  hunterStatus: HunterStatus;
  hunterPhase: HunterPhase;
  hunterScore: number;
  hunterReason: string;
  establishedLight: EstablishedLight;
  establishedScore: number;
  establishedReason: string;
};

type LatestNewsData = {
  newsHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;
  headlineScore: number;
  liveCatalystScore: number;
};

type ComponentScores = {
  pctScore: number;
  speedScore: number;
  accelScore: number;
  volumeScore: number;
  volumeSpeedScore: number;
  vwapScore: number;
  spreadScore: number;
  catalystScore: number;
  dayBiasScoreWeighted: number;
  hunterScoreWeighted: number;
  establishedScoreWeighted: number;
};

type SuperCandidate = {
  ticker: string;
  symbol: string;

  finalLight: FinalLight;
  runnerLight: RunnerLight;
  dayBias: DayBias;

  latestHeadline: string;
  newsUrl: string;
  newsPublisher: string;
  newsCategory: NewsCategory;
  newsFreshness: NewsFreshness;
  newsAgeMinutes: number | null;

  price: number;
  previousClose: number;
  gainPct: number;
  speedPct: number;
  momentumPct: number;
  volume: number;
  volumeSpeedPct: number;
  dollarVolume: number;
  vwap: number;
  vwapDistancePct: number;
  bid: number;
  ask: number;
  spreadPct: number | null;
  quoteAgeMinutes: number | null;

  hunterStatus: HunterStatus;
  hunterPhase: HunterPhase;
  hunterScore: number;
  hunterReason: string;

  establishedLight: EstablishedLight;
  establishedScore: number;
  establishedReason: string;

  superScore: number;
  climbPercent: number;
  dayBiasScore: number;
  headlineScore: number;
  liveCatalystScore: number;
  componentScores: ComponentScores;
};

const SOURCE = "polygon-configurable-catalyst-hunter-established";
const MODE = "CONFIGURABLE_SCANNER_ENGINE";
const MEMORY_KEY = "__CONFIGURABLE_SCANNER_ENGINE_MEMORY__";
const NEWS_CACHE_TTL_MS = 60_000;
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
  const root = globalThis as typeof globalThis & Record<string, unknown>;

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

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function boolParam(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;

  const v = value.toLowerCase();

  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;

  return fallback;
}

function numberParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Math.round(numberParam(value, fallback));
  return clamp(parsed, min, max);
}

function buildConfig(searchParams: URLSearchParams): ScannerConfig {
  return {
    minPrice: numberParam(searchParams.get("minPrice"), 0.1),
    maxPrice: numberParam(searchParams.get("maxPrice"), 20),
    minGainPct: numberParam(searchParams.get("minGainPct"), 0),
    maxGainPct: numberParam(searchParams.get("maxGainPct"), 0),
    minVolume: numberParam(searchParams.get("minVolume"), 0),
    minDollarVolume: numberParam(searchParams.get("minDollarVolume"), 0),
    maxSpreadPct: numberParam(searchParams.get("maxSpreadPct"), 0),
    maxQuoteAgeMinutes: numberParam(searchParams.get("maxQuoteAgeMinutes"), 15),
    preCandidateCount: intParam(searchParams.get("preCandidateCount"), 50, 5, 200),
    finalLimit: intParam(searchParams.get("finalLimit"), 20, 1, 100),

    greenThreshold: numberParam(searchParams.get("greenThreshold"), 80),
    yellowThreshold: numberParam(searchParams.get("yellowThreshold"), 45),

    useCatalyst: boolParam(searchParams.get("useCatalyst"), true),
    useHunter: boolParam(searchParams.get("useHunter"), true),
    useEstablished: boolParam(searchParams.get("useEstablished"), true),
    useVwap: boolParam(searchParams.get("useVwap"), true),
    useSpread: boolParam(searchParams.get("useSpread"), true),
    useVolumeSpeed: boolParam(searchParams.get("useVolumeSpeed"), true),

    pctWeight: numberParam(searchParams.get("pctWeight"), 1),
    speedWeight: numberParam(searchParams.get("speedWeight"), 1.25),
    accelWeight: numberParam(searchParams.get("accelWeight"), 0.75),
    volumeWeight: numberParam(searchParams.get("volumeWeight"), 0.35),
    volumeSpeedWeight: numberParam(searchParams.get("volumeSpeedWeight"), 1),
    vwapWeight: numberParam(searchParams.get("vwapWeight"), 0.75),
    spreadWeight: numberParam(searchParams.get("spreadWeight"), 0.8),
    catalystWeight: numberParam(searchParams.get("catalystWeight"), 1.25),
    hunterWeight: numberParam(searchParams.get("hunterWeight"), 0.9),
    establishedWeight: numberParam(searchParams.get("establishedWeight"), 0.7),
    dayBiasWeight: numberParam(searchParams.get("dayBiasWeight"), 1),
  };
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

function getSpreadPct(bid: number, ask: number): number | null {
  if (!bid || !ask || bid <= 0 || ask <= 0 || ask <= bid) return null;

  const mid = (bid + ask) / 2;
  if (!mid) return null;

  return round(((ask - bid) / mid) * 100, 4);
}

function buildBaseRow(row: AnyObj, config: ScannerConfig): BaseRow {
  const ticker = cleanTicker(row.ticker || row.symbol || row.T);

  const price = pickNumber(row, [
    "lastTrade.p",
    "lastTrade.price",
    "lastTrade.P",
    "day.c",
    "min.c",
    "price",
  ]);

  const previousClose = pickNumber(row, [
    "prevDay.c",
    "previousClose",
    "prevClose",
    "pc",
  ]);

  const volume = pickNumber(row, [
    "day.v",
    "day.volume",
    "min.av",
    "volume",
    "v",
  ]);

  const vwap = pickNumber(row, [
    "day.vw",
    "min.vw",
    "vwap",
  ]);

  const bid = pickNumber(row, [
    "lastQuote.p",
    "lastQuote.bid",
    "bid",
  ]);

  const ask = pickNumber(row, [
    "lastQuote.P",
    "lastQuote.ask",
    "ask",
  ]);

  const gainPct =
    price > 0 && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0;

  const vwapDistancePct =
    price > 0 && vwap > 0
      ? ((price - vwap) / vwap) * 100
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
    quoteAgeMinutes <= config.maxQuoteAgeMinutes;

  return {
    ticker,
    symbol: ticker,
    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 4),
    volume: round(volume, 0),
    dollarVolume: round(price * volume, 2),
    vwap: round(vwap, 4),
    vwapDistancePct: round(vwapDistancePct, 4),
    bid: round(bid, 4),
    ask: round(ask, 4),
    spreadPct: getSpreadPct(bid, ask),
    lastTradeTimestampMs,
    quoteAgeMinutes,
    isFreshTrade,
  };
}

function passesFilters(item: BaseRow, config: ScannerConfig): boolean {
  if (!item.ticker) return false;
  if (item.price <= 0) return false;
  if (item.previousClose <= 0) return false;
  if (!item.isFreshTrade) return false;

  if (item.price < config.minPrice) return false;
  if (config.maxPrice > 0 && item.price > config.maxPrice) return false;
  if (item.gainPct < config.minGainPct) return false;
  if (config.maxGainPct > 0 && item.gainPct > config.maxGainPct) return false;
  if (config.minVolume > 0 && item.volume < config.minVolume) return false;
  if (config.minDollarVolume > 0 && item.dollarVolume < config.minDollarVolume) return false;

  if (config.maxSpreadPct > 0) {
    if (item.spreadPct === null) return false;
    if (item.spreadPct > config.maxSpreadPct) return false;
  }

  return true;
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

function scoreLatestHeadline(headline: string): number {
  const text = headline.toLowerCase();

  const veryPositive = [
    "fda",
    "approval",
    "approved",
    "cleared",
    "clearance",
    "phase 3",
    "phase iii",
    "met primary endpoint",
    "positive topline",
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
    "distribution",
    "commercial",
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

function scoreArticle(title: string): number {
  const text = title.toLowerCase();

  const hardPositive = [
    "fda",
    "approval",
    "approved",
    "cleared",
    "clearance",
    "phase 3",
    "phase iii",
    "met primary endpoint",
    "positive topline",
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
    "distribution",
    "commercial",
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

      return {
        title,
        url,
        publisher,
        publishedUtc,
        publishedMs,
        freshness: getNewsAgeData(publishedUtc).newsFreshness,
        category: classifyNewsCategory(title, publisher, url),
        articleScore: scoreArticle(title),
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
      headlineScore: 0,
      liveCatalystScore: 0,
    };
  }

  const age = getNewsAgeData(latest.publishedUtc);
  const headlineScore = scoreLatestHeadline(latest.title);

  const liveCatalystScore =
    age.newsFreshness === "FRESH_CATALYST" || age.newsFreshness === "RECENT_CATALYST"
      ? headlineScore
      : 0;

  return {
    newsHeadline: latest.title,
    newsUrl: latest.url,
    newsPublisher: latest.publisher,
    newsCategory: latest.category,
    newsFreshness: age.newsFreshness,
    newsAgeMinutes: age.newsAgeMinutes,
    headlineScore,
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

function buildHunterEngine(item: RankedRow): {
  hunterStatus: HunterStatus;
  hunterPhase: HunterPhase;
  hunterScore: number;
  hunterReason: string;
} {
  const gainScore = clamp(item.gainPct * 0.7, 0, 45);
  const speedScore = clamp(item.speedPct * 25, -25, 35);
  const momentumScore = clamp(item.momentumPct * 25, -25, 25);
  const volumeSpeedScore = clamp(item.volumeSpeedPct * 3, -20, 25);
  const freshBonus =
    item.quoteAgeMinutes !== null && item.quoteAgeMinutes <= 5
      ? 10
      : item.quoteAgeMinutes !== null && item.quoteAgeMinutes <= 15
        ? 5
        : 0;

  const hunterScore = round(
    clamp(gainScore + speedScore + momentumScore + volumeSpeedScore + freshBonus, 0, 100),
    2
  );

  let hunterStatus: HunterStatus = "FADING";

  if (item.gainPct > 0 && item.speedPct > 0.05 && item.momentumPct >= -0.1) {
    hunterStatus = "CLIMBING";
  } else if (item.gainPct > 0 && item.speedPct >= -0.15) {
    hunterStatus = "FLAT";
  }

  let hunterPhase: HunterPhase = "BELOW_RADAR";

  if (item.gainPct >= 80 && item.speedPct >= -0.2) {
    hunterPhase = "EXTENDED_HOT";
  } else if (item.gainPct >= 18 && item.speedPct >= -0.2) {
    hunterPhase = "ESTABLISHED";
  } else if (item.gainPct > 0 && item.speedPct > 0.05) {
    hunterPhase = "CLIMBER";
  }

  const hunterReason =
    hunterStatus === "CLIMBING"
      ? "Percent move is rising scan-to-scan and momentum is not breaking."
      : hunterStatus === "FLAT"
        ? "Ticker is green but current scan speed is not strongly expanding."
        : "Ticker is losing scan-to-scan pressure or momentum is fading.";

  return {
    hunterStatus,
    hunterPhase,
    hunterScore,
    hunterReason,
  };
}

function buildEstablishedEngine(item: RankedRow): {
  establishedLight: EstablishedLight;
  establishedScore: number;
  establishedReason: string;
} {
  const fresh =
    item.quoteAgeMinutes !== null &&
    item.quoteAgeMinutes >= 0 &&
    item.quoteAgeMinutes <= 15;

  const gainBase = clamp(item.gainPct * 0.75, 0, 55);
  const holdScore = item.speedPct >= -0.08 ? 20 : item.speedPct >= -0.25 ? 10 : -10;
  const momentumHold = item.momentumPct >= -0.25 ? 15 : item.momentumPct >= -0.75 ? 5 : -10;
  const vwapHold = item.vwapDistancePct > 0 ? 10 : item.vwapDistancePct < -2 ? -10 : 0;
  const freshScore = fresh ? 10 : 0;

  const establishedScore = round(
    clamp(gainBase + holdScore + momentumHold + vwapHold + freshScore, 0, 100),
    2
  );

  let establishedLight: EstablishedLight = "NOT_ESTABLISHED";

  if (item.gainPct >= 20 && item.speedPct >= -0.1 && item.momentumPct >= -0.3 && fresh) {
    establishedLight = "ESTABLISHED_GREEN";
  } else if (item.gainPct >= 8 && item.speedPct >= -0.25 && item.momentumPct >= -0.75 && fresh) {
    establishedLight = "ESTABLISHED_YELLOW";
  }

  const establishedReason =
    establishedLight === "ESTABLISHED_GREEN"
      ? "Move is already proven and holding without major scan-to-scan failure."
      : establishedLight === "ESTABLISHED_YELLOW"
        ? "Move has proof, but continuation strength is not elite yet."
        : "Move is not holding strongly enough to be called established.";

  return {
    establishedLight,
    establishedScore,
    establishedReason,
  };
}

function buildComponentScores(params: {
  item: RankedRow;
  latest: LatestNewsData;
  dayBiasScore: number;
  config: ScannerConfig;
}): ComponentScores {
  const { item, latest, dayBiasScore, config } = params;

  const pctScore = clamp(item.gainPct, -50, 100) * config.pctWeight;
  const speedScore = clamp(item.speedPct * 25, -50, 75) * config.speedWeight;
  const accelScore = clamp(item.momentumPct * 25, -50, 75) * config.accelWeight;

  const volumeBase =
    item.volume > 0
      ? clamp((Math.log10(item.volume + 1) - 4) * 20, 0, 80)
      : 0;

  const volumeScore = volumeBase * config.volumeWeight;

  const volumeSpeedScore =
    config.useVolumeSpeed
      ? clamp(item.volumeSpeedPct * 4, -40, 80) * config.volumeSpeedWeight
      : 0;

  const vwapScore =
    config.useVwap
      ? item.vwap > 0
        ? item.vwapDistancePct >= 0
          ? clamp(item.vwapDistancePct * 3, 0, 60) * config.vwapWeight
          : clamp(item.vwapDistancePct * 2, -40, 0) * config.vwapWeight
        : 0
      : 0;

  const spreadScore =
    config.useSpread
      ? item.spreadPct === null
        ? 0
        : clamp(10 - item.spreadPct * 5, -40, 20) * config.spreadWeight
      : 0;

  const catalystScore =
    config.useCatalyst
      ? latest.liveCatalystScore * 10 * config.catalystWeight
      : 0;

  const dayBiasScoreWeighted =
    config.useCatalyst
      ? dayBiasScore * 6 * config.dayBiasWeight
      : 0;

  const hunterScoreWeighted =
    config.useHunter
      ? item.hunterScore * config.hunterWeight
      : 0;

  const establishedScoreWeighted =
    config.useEstablished
      ? item.establishedScore * config.establishedWeight
      : 0;

  return {
    pctScore: round(pctScore, 2),
    speedScore: round(speedScore, 2),
    accelScore: round(accelScore, 2),
    volumeScore: round(volumeScore, 2),
    volumeSpeedScore: round(volumeSpeedScore, 2),
    vwapScore: round(vwapScore, 2),
    spreadScore: round(spreadScore, 2),
    catalystScore: round(catalystScore, 2),
    dayBiasScoreWeighted: round(dayBiasScoreWeighted, 2),
    hunterScoreWeighted: round(hunterScoreWeighted, 2),
    establishedScoreWeighted: round(establishedScoreWeighted, 2),
  };
}

function sumComponentScores(scores: ComponentScores): number {
  return round(
    scores.pctScore +
      scores.speedScore +
      scores.accelScore +
      scores.volumeScore +
      scores.volumeSpeedScore +
      scores.vwapScore +
      scores.spreadScore +
      scores.catalystScore +
      scores.dayBiasScoreWeighted +
      scores.hunterScoreWeighted +
      scores.establishedScoreWeighted,
    2
  );
}

function deriveFinalLight(superScore: number, config: ScannerConfig): FinalLight {
  if (superScore >= config.greenThreshold) return "SUPER_GREEN";
  if (superScore >= config.yellowThreshold) return "SUPER_YELLOW";
  return "SUPER_RED";
}

function deriveRunnerLight(item: RankedRow): RunnerLight {
  if (item.hunterStatus === "CLIMBING" && item.hunterScore >= 60) return "LIGHT_GREEN";
  if (item.hunterScore >= 40 || item.establishedScore >= 45) return "LIGHT_YELLOW";
  return "LIGHT_GREY";
}

function buildEmptyPayload(message: string, startedAt: string, config: ScannerConfig) {
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
    filteredCount: 0,
    showing: 0,
    topTicker: null,
    config,
    candidates,
    tickers: candidates,
    results: candidates,
    data: {
      candidates,
      tickers: candidates,
      results: candidates,
    },
  };
}

export async function GET(req: Request) {
  const startedAt = new Date().toISOString();
  const apiKey = getApiKey();
  const { searchParams } = new URL(req.url);
  const config = buildConfig(searchParams);
  const reset = boolParam(searchParams.get("resetMemory"), false);

  if (reset) {
    resetMemory();
  }

  if (!apiKey) {
    return NextResponse.json(
      buildEmptyPayload("Missing POLYGON_API_KEY or MASSIVE_API_KEY.", startedAt, config),
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  try {
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
        buildEmptyPayload(`Polygon request failed with status ${res.status}.`, startedAt, config),
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

    const baseRows = rowsRaw
      .filter(isObj)
      .map((row) => buildBaseRow(row, config))
      .filter((item) => passesFilters(item, config));

    const rankedRows: RankedRow[] = baseRows.map((item) => {
      const previous = memory.lastScan[item.ticker];

      const priorGainPct = previous ? previous.gainPct : null;
      const speedPct = priorGainPct === null ? 0 : item.gainPct - priorGainPct;
      const priorSpeedPct = previous ? previous.speedPct : 0;
      const momentumPct = speedPct - priorSpeedPct;

      const volumeSpeedPct =
        previous && previous.volume > 0
          ? ((item.volume - previous.volume) / previous.volume) * 100
          : 0;

      const shell = {
        ...item,
        priorGainPct,
        speedPct: round(speedPct, 4),
        priorSpeedPct: round(priorSpeedPct, 4),
        momentumPct: round(momentumPct, 4),
        volumeSpeedPct: round(volumeSpeedPct, 4),
        hunterStatus: "FADING" as HunterStatus,
        hunterPhase: "BELOW_RADAR" as HunterPhase,
        hunterScore: 0,
        hunterReason: "",
        establishedLight: "NOT_ESTABLISHED" as EstablishedLight,
        establishedScore: 0,
        establishedReason: "",
      };

      const hunter = buildHunterEngine(shell);
      const established = buildEstablishedEngine(shell);

      return {
        ...shell,
        ...hunter,
        ...established,
      };
    });

    rankedRows.sort((a, b) => {
      const aSeed =
        a.gainPct +
        a.speedPct * 4 +
        a.momentumPct * 2.5 +
        a.volumeSpeedPct +
        a.hunterScore * 0.4 +
        a.establishedScore * 0.25 +
        a.vwapDistancePct;

      const bSeed =
        b.gainPct +
        b.speedPct * 4 +
        b.momentumPct * 2.5 +
        b.volumeSpeedPct +
        b.hunterScore * 0.4 +
        b.establishedScore * 0.25 +
        b.vwapDistancePct;

      if (bSeed !== aSeed) return bSeed - aSeed;
      return a.ticker.localeCompare(b.ticker);
    });

    const preCandidates = rankedRows.slice(0, config.preCandidateCount);

    const withNews = await Promise.all(
      preCandidates.map(async (item) => {
        const news = config.useCatalyst
          ? await fetchTickerNewsCached(item.ticker, apiKey, memory)
          : {
              latest: buildLatestNewsData([]),
              items5d: [],
            };

        const latest = news.latest;
        const bias = config.useCatalyst
          ? classifyDayBias(news.items5d)
          : {
              dayBias: "NO_DAY_SIGNAL" as DayBias,
              dayBiasScore: 0,
            };

        const componentScores = buildComponentScores({
          item,
          latest,
          dayBiasScore: bias.dayBiasScore,
          config,
        });

        const superScore = sumComponentScores(componentScores);

        const climbPercent = round(
          item.gainPct +
            item.speedPct * 4 +
            item.momentumPct * 2.5 +
            item.volumeSpeedPct +
            item.vwapDistancePct,
          2
        );

        return {
          ticker: item.ticker,
          symbol: item.symbol,

          finalLight: deriveFinalLight(superScore, config),
          runnerLight: deriveRunnerLight(item),
          dayBias: bias.dayBias,

          latestHeadline: latest.newsHeadline,
          newsUrl: latest.newsUrl,
          newsPublisher: latest.newsPublisher,
          newsCategory: latest.newsCategory,
          newsFreshness: latest.newsFreshness,
          newsAgeMinutes: latest.newsAgeMinutes,

          price: item.price,
          previousClose: item.previousClose,
          gainPct: round(item.gainPct, 2),
          speedPct: round(item.speedPct, 4),
          momentumPct: round(item.momentumPct, 4),
          volume: item.volume,
          volumeSpeedPct: round(item.volumeSpeedPct, 4),
          dollarVolume: item.dollarVolume,
          vwap: item.vwap,
          vwapDistancePct: round(item.vwapDistancePct, 4),
          bid: item.bid,
          ask: item.ask,
          spreadPct: item.spreadPct,
          quoteAgeMinutes: item.quoteAgeMinutes,

          hunterStatus: item.hunterStatus,
          hunterPhase: item.hunterPhase,
          hunterScore: item.hunterScore,
          hunterReason: item.hunterReason,

          establishedLight: item.establishedLight,
          establishedScore: item.establishedScore,
          establishedReason: item.establishedReason,

          superScore,
          climbPercent,
          dayBiasScore: bias.dayBiasScore,
          headlineScore: latest.headlineScore,
          liveCatalystScore: latest.liveCatalystScore,
          componentScores,
        } satisfies SuperCandidate;
      })
    );

    withNews.sort((a, b) => {
      if (b.superScore !== a.superScore) return b.superScore - a.superScore;
      if (b.hunterScore !== a.hunterScore) return b.hunterScore - a.hunterScore;
      if (b.establishedScore !== a.establishedScore) return b.establishedScore - a.establishedScore;
      if (b.climbPercent !== a.climbPercent) return b.climbPercent - a.climbPercent;
      return a.ticker.localeCompare(b.ticker);
    });

    const finalCandidates = withNews.slice(0, config.finalLimit);

    const nextLastScan: Record<string, PreviousScanEntry> = {};

    for (const item of rankedRows) {
      nextLastScan[item.ticker] = {
        gainPct: round(item.gainPct, 4),
        speedPct: round(item.speedPct, 4),
        volume: round(item.volume, 0),
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
        filteredCount: baseRows.length,
        showing: finalCandidates.length,
        topTicker: finalCandidates[0]?.ticker ?? null,
        config,
        candidates: finalCandidates,
        tickers: finalCandidates,
        results: finalCandidates,
        data: {
          candidates: finalCandidates,
          tickers: finalCandidates,
          results: finalCandidates,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown route error.";

    return NextResponse.json(buildEmptyPayload(message, startedAt, config), {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
