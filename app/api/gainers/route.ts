import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, unknown>;

const SOURCE = "polygon-massive-raw-hunter-news";

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
  return String(value || "").trim();
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
    const n = num(getPath(obj, path));
    if (n !== 0) return n;
  }

  return 0;
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

function isJunkTicker(symbol: string): boolean {
  const t = cleanTicker(symbol);

  if (!t) return true;
  if (t.includes(".") || t.includes("-") || t.length > 5) return true;

  return (
    t.endsWith("W") ||
    t.endsWith("WS") ||
    t.endsWith("WT") ||
    t.endsWith("U") ||
    t.endsWith("R") ||
    t.endsWith("RT")
  );
}

function getSpreadStatus(spreadPct: number): "TIGHT" | "OK" | "WIDE" | "UNKNOWN" {
  if (!Number.isFinite(spreadPct) || spreadPct <= 0) return "UNKNOWN";
  if (spreadPct <= 1) return "TIGHT";
  if (spreadPct <= 2.5) return "OK";
  return "WIDE";
}

function buildHunterRow(row: AnyObj) {
  const ticker = cleanTicker(row.ticker || row.symbol || row.T);

  const price = pickNumber(row, [
    "lastTrade.p",
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

  const suppliedGain = pickNumber(row, [
    "todaysChangePerc",
    "changePercent",
    "percentChange",
    "gainPct",
  ]);

  const gainPct =
    suppliedGain !== 0
      ? suppliedGain
      : price > 0 && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : 0;

  const premarketVolume = pickNumber(row, [
    "day.v",
    "volume",
    "v",
    "min.av",
    "min.v",
  ]);

  const bid = pickNumber(row, [
    "lastQuote.p",
    "lastQuote.bid",
    "lastQuote.bidPrice",
    "bid",
    "bidPrice",
  ]);

  const ask = pickNumber(row, [
    "lastQuote.P",
    "lastQuote.ask",
    "lastQuote.askPrice",
    "ask",
    "askPrice",
  ]);

  const spread = bid > 0 && ask > 0 ? ask - bid : 0;
  const spreadPct = price > 0 && spread > 0 ? (spread / price) * 100 : 0;
  const spreadStatus = getSpreadStatus(spreadPct);

  let gainScore = 0;
  if (gainPct >= 10 && gainPct < 20) gainScore = 10;
  else if (gainPct >= 20 && gainPct <= 35) gainScore = 24;
  else if (gainPct > 35 && gainPct <= 65) gainScore = 30;
  else if (gainPct > 65 && gainPct <= 120) gainScore = 8;
  else if (gainPct > 120) gainScore = -20;

  let volumeScore = 0;
  if (premarketVolume >= 5_000_000) volumeScore = 20;
  else if (premarketVolume >= 2_000_000) volumeScore = 18;
  else if (premarketVolume >= 1_000_000) volumeScore = 15;
  else if (premarketVolume >= 500_000) volumeScore = 12;
  else if (premarketVolume >= 250_000) volumeScore = 9;
  else if (premarketVolume >= 100_000) volumeScore = 6;

  let spreadScore = 0;
  if (spreadPct > 0 && spreadPct <= 0.5) spreadScore = 15;
  else if (spreadPct <= 1) spreadScore = 12;
  else if (spreadPct <= 1.5) spreadScore = 9;
  else if (spreadPct <= 2.5) spreadScore = 5;
  else if (spreadPct > 2.5) spreadScore = -15;

  let priceScore = -5;
  if (price >= 0.1 && price <= 1) priceScore = 10;
  else if (price <= 2) priceScore = 8;
  else if (price <= 5) priceScore = 5;
  else if (price <= 10) priceScore = 2;

  const rawHunterScore = gainScore + volumeScore + spreadScore + priceScore;
  const hunterScore = Math.max(0, Math.min(100, rawHunterScore));

  const hunterPhase =
    gainPct < 15
      ? "BELOW_RADAR"
      : gainPct <= 35
        ? "CLIMBER"
        : gainPct <= 85
          ? "ESTABLISHED"
          : "EXTENDED_HOT";

  const hunterStatus =
    gainPct >= 15 && gainPct <= 85 && spreadPct > 0 && spreadPct <= 2.5
      ? "CLIMBING"
      : gainPct > 120 || spreadPct > 2.5
        ? "FADING"
        : "FLAT";

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (gainPct >= 20 && gainPct <= 65) reasons.push("Prime hunter gain zone: 20% to 65%");
  if (premarketVolume >= 100_000) reasons.push("Volume present");
  if (spreadStatus === "TIGHT") reasons.push("Spread tight by percentage");
  if (spreadStatus === "OK") reasons.push("Spread acceptable by percentage");

  if (spreadStatus === "WIDE") warnings.push("Spread wide");
  if (spreadStatus === "UNKNOWN") warnings.push("Spread unknown");
  if (gainPct > 120) warnings.push("Extended above 120%; possible late runner");

  return {
    ticker,
    symbol: ticker,
    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 2),
    premarketVolume: round(premarketVolume, 0),
    averagePremarketVolume: 0,
    relativePremarketVolume: 0,
    bid: round(bid, 4),
    ask: round(ask, 4),
    spread: round(spread, 4),
    spreadPct: round(spreadPct, 2),
    spreadStatus,
    hunterScore: round(hunterScore, 2),
    rawHunterScore: round(rawHunterScore, 2),
    hunterStatus,
    hunterPhase,
    isInPreferredGainZone: gainPct >= 10 && gainPct <= 65,
    isExtended: gainPct > 120,
    isTradeableSpread: spreadPct > 0 && spreadPct <= 2.5,
    reasons,
    warnings,
  };
}

async function fetchTickerNews(ticker: string, apiKey: string) {
  const fallback = {
    hasNews: false,
    newsTitle: "",
    newsPublisher: "",
    newsUrl: "",
    newsTime: "",
    newsAgeMinutes: 0,
    newsTag: "NO NEWS",
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

    const json = (await res.json()) as AnyObj;
    const results = Array.isArray(json.results) ? json.results : [];
    const first = results.find(isObj);

    if (!first) return fallback;

    const newsTitle = str(first.title);
    const newsUrl = str(first.article_url || first.url);
    const newsTime = str(first.published_utc);

    const publisherObj = isObj(first.publisher) ? first.publisher : {};
    const newsPublisher = str(publisherObj.name || first.publisher || first.source);

    const published = new Date(newsTime).getTime();
    const newsAgeMinutes = Number.isFinite(published)
      ? Math.max(0, Math.round((Date.now() - published) / 60000))
      : 0;

    const text = `${newsTitle} ${newsPublisher} ${newsUrl}`.toLowerCase();

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
    ].some((x) => text.includes(x));

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
    ].some((x) => text.includes(x));

    return {
      hasNews: Boolean(newsTitle || newsUrl),
      newsTitle,
      newsPublisher,
      newsUrl,
      newsTime,
      newsAgeMinutes,
      newsTag: filingLike ? "FILING-LIKE NEWS" : pressLike ? "PRESS RELEASE" : "NEWS",
    };
  } catch {
    return fallback;
  }
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
  const limit = num(searchParams.get("limit")) || 10;
  const removeJunk = boolParam(searchParams.get("removeJunk"), true);

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        source: SOURCE,
        message: "Missing POLYGON_API_KEY or MASSIVE_API_KEY.",
        startedAt,
        rawCount: 0,
        showing: 0,
        results: [],
        gainers: [],
        tickers: [],
        data: [],
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
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
        {
          ok: false,
          source: SOURCE,
          message: `Polygon/Massive request failed with status ${res.status}.`,
          startedAt,
          rawCount: 0,
          showing: 0,
          results: [],
          gainers: [],
          tickers: [],
          data: [],
        },
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

    const scoredBase = rowsRaw
      .filter(isObj)
      .map((row) => buildHunterRow(row))
      .filter((item) => Boolean(item.ticker))
      .filter((item) => !removeJunk || !isJunkTicker(item.ticker))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.gainPct >= minGain)
      .filter((item) => item.gainPct <= maxGain)
      .filter((item) => item.premarketVolume >= minVolume)
      .sort((a, b) => {
        if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
        if (b.hunterScore !== a.hunterScore) return b.hunterScore - a.hunterScore;
        return b.premarketVolume - a.premarketVolume;
      })
      .slice(0, Math.max(1, Math.min(limit, 100)))
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    const scored = await Promise.all(
      scoredBase.map(async (item) => ({
        ...item,
        ...(await fetchTickerNews(item.ticker, apiKey)),
      }))
    );

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        mode: "RAW_HUNTER_GATHERER",
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
        showing: scored.length,
        topTicker: scored[0]?.ticker || null,
        topScore: scored[0]?.hunterScore || 0,
        results: scored,
        gainers: scored,
        tickers: scored,
        data: scored,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown route error.";

    return NextResponse.json(
      {
        ok: false,
        source: SOURCE,
        message,
        startedAt,
        rawCount: 0,
        showing: 0,
        results: [],
        gainers: [],
        tickers: [],
        data: [],
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
