// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type DayLight = "POSITIVE_DAY" | "NEGATIVE_DAY";

type NewsHunterItem = {
  ticker?: string;
  symbol?: string;
  light?: DayLight;
  newsUrl?: string;
  latestHeadline?: string;
};

type ApiResponse = {
  ok?: boolean;
  source?: string;
  mode?: string;
  marketMode?: string;
  message?: string;
  rawCount?: number;
  showing?: number;
  topTicker?: string | null;
  positiveDay?: NewsHunterItem[];
  negativeDay?: NewsHunterItem[];
  data?: {
    positiveDay?: NewsHunterItem[];
    negativeDay?: NewsHunterItem[];
  };
};

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizePositive(json: ApiResponse): NewsHunterItem[] {
  if (Array.isArray(json.positiveDay)) return json.positiveDay;
  if (Array.isArray(json.data?.positiveDay)) return json.data.positiveDay ?? [];
  return [];
}

function normalizeNegative(json: ApiResponse): NewsHunterItem[] {
  if (Array.isArray(json.negativeDay)) return json.negativeDay;
  if (Array.isArray(json.data?.negativeDay)) return json.data.negativeDay ?? [];
  return [];
}

function lightClass(light?: string): string {
  const value = str(light).toUpperCase();
  if (value === "POSITIVE_DAY") return "blue";
  return "red";
}

function lightLabel(light?: string): string {
  const value = str(light).toUpperCase();
  if (value === "POSITIVE_DAY") return "POSITIVE";
  return "NEGATIVE";
}

function TickerLink({ item }: { item: NewsHunterItem }) {
  const ticker = cleanTicker(item.ticker || item.symbol);

  if (item.newsUrl) {
    return (
      <a
        className="ticker"
        href={item.newsUrl}
        target="_blank"
        rel="noreferrer"
        title={item.latestHeadline || ticker}
      >
        {ticker || "—"}
      </a>
    );
  }

  return <div className="ticker">{ticker || "—"}</div>;
}

export default function HomePage() {
  const [positiveDay, setPositiveDay] = useState<NewsHunterItem[]>([]);
  const [negativeDay, setNegativeDay] = useState<NewsHunterItem[]>([]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("SUPER_NEWS_HUNTER");
  const [marketMode, setMarketMode] = useState("waiting");
  const [lastScan, setLastScan] = useState("Never");
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(true);

  const fetchScan = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/gainers", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse;
      const nextPositive = normalizePositive(json);
      const nextNegative = normalizeNegative(json);

      setPositiveDay(nextPositive);
      setNegativeDay(nextNegative);
      setSource(str(json.source || "unknown"));
      setMode(str(json.mode || "SUPER_NEWS_HUNTER"));
      setMarketMode(str(json.marketMode || "unknown"));
      setMessage(str(json.message || ""));
      setTopTicker(
        str(
          json.topTicker ||
            cleanTicker(nextPositive[0]?.ticker || nextNegative[0]?.ticker)
        ) || null
      );
      setRawCount(num(json.rawCount));
      setShowing(num(json.showing) || nextPositive.length + nextNegative.length);
      setLastScan(new Date().toLocaleTimeString());
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown page error.";
      setMessage(text);
      setPositiveDay([]);
      setNegativeDay([]);
      setTopTicker(null);
      setRawCount(0);
      setShowing(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScan();
  }, [fetchScan]);

  useEffect(() => {
    if (!autoScan) return;

    const id = window.setInterval(() => {
      void fetchScan();
    }, 3000);

    return () => window.clearInterval(id);
  }, [autoScan, fetchScan]);

  return (
    <main className="shell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(69, 139, 255, 0.18), transparent 32%),
            linear-gradient(135deg, #2f3338, #3a4148, #2b3137);
          color: #b7d8ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          padding: 24px;
        }

        .hero, .panel {
          border: 1px solid rgba(115, 175, 255, 0.22);
          background: rgba(43, 49, 55, 0.82);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.3);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #8ec5ff;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 60px);
          line-height: .95;
          letter-spacing: -.06em;
          text-transform: uppercase;
          color: #dceeff;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -.03em;
          color: #dceeff;
        }

        .sub {
          color: #9cc8ff;
          max-width: 860px;
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

        .blue-button {
          background: linear-gradient(135deg, #86bfff, #4d8fff);
          color: #10233b;
        }

        .dark-button {
          background: rgba(255,255,255,.08);
          color: #d9ecff;
          border: 1px solid rgba(255,255,255,.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.04);
        }

        .label {
          color: #8bb6ea;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 950;
        }

        .value {
          font-size: 28px;
          font-weight: 950;
          margin-top: 5px;
          color: #dceeff;
        }

        .meta {
          color: #95bee9;
          font-size: 12px;
          line-height: 1.45;
          margin-top: 14px;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          border-radius: 18px;
          padding: 14px 16px;
        }

        .left {
          display: grid;
          gap: 6px;
        }

        .ticker {
          font-size: 24px;
          font-weight: 950;
          letter-spacing: .04em;
          color: #dceeff;
          text-decoration: none;
        }

        .headline {
          color: #9cc8ff;
          font-size: 12px;
          line-height: 1.35;
          max-width: 420px;
        }

        .light {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 110px;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,.12);
        }

        .light.blue {
          color: #dceeff;
          background: rgba(77, 143, 255, 0.25);
          border-color: rgba(77, 143, 255, 0.42);
        }

        .light.red {
          color: #ffdcdc;
          background: rgba(255, 90, 90, 0.18);
          border-color: rgba(255, 90, 90, 0.34);
        }

        .empty, .error {
          border-radius: 18px;
          padding: 18px;
          color: #95bee9;
          border: 1px dashed rgba(255,255,255,.18);
          text-align: center;
          line-height: 1.45;
        }

        .error {
          margin-top: 12px;
          border-style: solid;
          color: #ffdcdc;
          background: rgba(255,90,90,.08);
          border-color: rgba(255,90,90,.25);
          font-weight: 850;
        }

        @media (max-width: 1100px) {
          .stats, .layout {
            grid-template-columns: 1fr;
          }

          button {
            width: 100%;
          }

          .row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Super News Hunter</div>
            <h1>Daily News Bias</h1>
            <div className="sub">
              Live gainers list plus 5-day news read-through. The algo tags each ticker as
              positive or negative for the day.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="blue-button" onClick={() => void fetchScan()} disabled={loading}>
              {loading ? "Scanning..." : "Scan Now"}
            </button>

            <button className="dark-button" onClick={() => setAutoScan((value) => !value)}>
              {autoScan ? "Auto: On" : "Auto: Off"}
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="label">Top Ticker</div>
            <div className="value">{topTicker || "—"}</div>
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

          <div className="stat">
            <div className="label">Scan Mode</div>
            <div className="value">{autoScan ? "AUTO" : "MANUAL"}</div>
          </div>
        </div>

        <div className="meta">
          Last scan: <b>{lastScan}</b>
          {" | "}
          Mode: <b>{mode}</b>
          {" | "}
          Source: <b>{source}</b>
        </div>

        {message ? <div className="error">{message}</div> : null}
      </section>

      <section className="layout">
        <div className="panel">
          <h2>Positive Day</h2>

          {positiveDay.length === 0 ? (
            <div className="empty">No positive day signals right now.</div>
          ) : (
            <div className="list">
              {positiveDay.map((item, index) => (
                <div className="row" key={`${cleanTicker(item.ticker || item.symbol)}-pos-${index}`}>
                  <div className="left">
                    <TickerLink item={item} />
                    {item.latestHeadline ? <div className="headline">{item.latestHeadline}</div> : null}
                  </div>

                  <span className={`light ${lightClass(item.light)}`}>
                    {lightLabel(item.light)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Negative Day</h2>

          {negativeDay.length === 0 ? (
            <div className="empty">No negative day signals right now.</div>
          ) : (
            <div className="list">
              {negativeDay.map((item, index) => (
                <div className="row" key={`${cleanTicker(item.ticker || item.symbol)}-neg-${index}`}>
                  <div className="left">
                    <TickerLink item={item} />
                    {item.latestHeadline ? <div className="headline">{item.latestHeadline}</div> : null}
                  </div>

                  <span className={`light ${lightClass(item.light)}`}>
                    {lightLabel(item.light)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}


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
