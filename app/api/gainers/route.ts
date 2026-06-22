// ============================================================
// FILE: app/api/gainers/route.ts
// PURPOSE: Self-contained Raw Hunter Gatherer route.
// FIX: No import from ./fourAmGainerFormula.
// ============================================================

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, unknown>;
type NumericInput = number | string | null | undefined;

type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";
type SpreadStatus = "TIGHT" | "OK" | "WIDE" | "UNKNOWN";

type HunterInput = {
  ticker?: string;
  symbol?: string;
  price?: NumericInput;
  currentPremarketPrice?: NumericInput;
  previousClose?: NumericInput;
  priorGainPct?: NumericInput;
  premarketVolume?: NumericInput;
  volume?: NumericInput;
  averagePremarketVolume?: NumericInput;
  averageVolume?: NumericInput;
  bid?: NumericInput;
  ask?: NumericInput;
};

const SOURCE = "polygon-massive-raw-hunter-self-contained";

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

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObj(current)) return undefined;
    current = current[part];
  }

  return current;
}

function pickNumber(obj: unknown, paths: string[]): number {
  for (const path of paths) {
    const value = getPath(obj, path);
    const n = num(value);
    if (n !== 0) return n;
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isJunkTicker(ticker: string): boolean {
  const t = cleanTicker(ticker);

  if (!t) return true;
  if (t.includes(".")) return true;
  if (t.includes("-")) return true;
  if (t.length > 5) return true;

  return (
    t.endsWith("W") ||
    t.endsWith("WS") ||
    t.endsWith("WT") ||
    t.endsWith("U") ||
    t.endsWith("R") ||
    t.endsWith("RT")
  );
}

function toBool(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;

  const v = value.toLowerCase();

  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;

  return fallback;
}

function getGainPct(input: HunterInput, price: number, previousClose: number): number {
  const suppliedGain = num(input.priorGainPct);

  if (suppliedGain !== 0) return suppliedGain;

  if (price > 0 && previousClose > 0) {
    return ((price - previousClose) / previousClose) * 100;
  }

  return 0;
}

function getGainScore(gainPct: number): number {
  if (gainPct < 5) return 0;
  if (gainPct < 15) return 5;
  if (gainPct < 20) return 10;
  if (gainPct <= 35) return 24;
  if (gainPct <= 65) return 30;
  if (gainPct <= 85) return 24;
  if (gainPct <= 120) return 8;
  return -20;
}

function getVolumeScore(volume: number): number {
  if (volume >= 5_000_000) return 20;
  if (volume >= 2_000_000) return 18;
  if (volume >= 1_000_000) return 15;
  if (volume >= 500_000) return 12;
  if (volume >= 250_000) return 9;
  if (volume >= 100_000) return 6;
  if (volume >= 50_000) return 3;
  return 0;
}

function getRelativeVolumeScore(rvol: number): number {
  if (rvol >= 10) return 15;
  if (rvol >= 5) return 12;
  if (rvol >= 3) return 9;
  if (rvol >= 2) return 6;
  if (rvol >= 1) return 3;
  return 0;
}

function getSpreadStatus(spreadPct: number): SpreadStatus {
  if (!Number.isFinite(spreadPct) || spreadPct <= 0) return "UNKNOWN";
  if (spreadPct <= 1) return "TIGHT";
  if (spreadPct <= 2.5) return "OK";
  return "WIDE";
}

function getSpreadScore(spreadPct: number): number {
  if (!Number.isFinite(spreadPct) || spreadPct <= 0) return 0;
  if (spreadPct <= 0.5) return 15;
  if (spreadPct <= 1) return 12;
  if (spreadPct <= 1.5) return 9;
  if (spreadPct <= 2.5) return 5;
  return -15;
}

function getPriceScore(price: number): number {
  if (price >= 0.1 && price <= 1) return 10;
  if (price > 1 && price <= 2) return 8;
  if (price > 2 && price <= 5) return 5;
  if (price > 5 && price <= 10) return 2;
  return -5;
}

function getHunterPhase(gainPct: number): HunterPhase {
  if (gainPct < 15) return "BELOW_RADAR";
  if (gainPct <= 35) return "CLIMBER";
  if (gainPct <= 85) return "ESTABLISHED";
  return "EXTENDED_HOT";
}

function getHunterStatus(gainPct: number, rvol: number, spreadPct: number): HunterStatus {
  if (gainPct >= 15 && gainPct <= 85 && rvol >= 2 && spreadPct > 0 && spreadPct <= 2.5) {
    return "CLIMBING";
  }

  if (gainPct > 120 || spreadPct > 2.5) {
    return "FADING";
  }

  return "FLAT";
}

function buildHunterScore(input: HunterInput) {
  const ticker = cleanTicker(input.ticker || input.symbol);

  const price =
    num(input.currentPremarketPrice) ||
    num(input.price);

  const previousClose = num(input.previousClose);
  const gainPct = getGainPct(input, price, previousClose);

  const premarketVolume =
    num(input.premarketVolume) ||
    num(input.volume);

  const averagePremarketVolume =
    num(input.averagePremarketVolume) ||
    num(input.averageVolume);

  const relativePremarketVolume =
    averagePremarketVolume > 0 ? premarketVolume / averagePremarketVolume : 0;

  const bid = num(input.bid);
  const ask = num(input.ask);

  const spread = bid > 0 && ask > 0 ? ask - bid : 0;
  const spreadPct = price > 0 && spread > 0 ? (spread / price) * 100 : 0;
  const spreadStatus = getSpreadStatus(spreadPct);

  const rawHunterScore =
    getGainScore(gainPct) +
    getVolumeScore(premarketVolume) +
    getRelativeVolumeScore(relativePremarketVolume) +
    getSpreadScore(spreadPct) +
    getPriceScore(price);

  const hunterScore = clamp(rawHunterScore, 0, 100);
  const hunterPhase = getHunterPhase(gainPct);
  const hunterStatus = getHunterStatus(gainPct, relativePremarketVolume, spreadPct);

  const isInPreferredGainZone = gainPct >= 15 && gainPct <= 85;
  const isExtended = gainPct > 120;
  const isTradeableSpread = spreadPct > 0 && spreadPct <= 2.5;

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (gainPct >= 20 && gainPct <= 65) reasons.push("Prime hunter gain zone: 20% to 65%");
  else if (isInPreferredGainZone) reasons.push("Preferred hunter gain zone: 15% to 85%");

  if (premarketVolume >= 100_000) reasons.push("Premarket volume present");
  if (relativePremarketVolume >= 2) reasons.push("Relative premarket volume elevated");
  if (spreadStatus === "TIGHT") reasons.push("Spread tight by percentage");
  if (spreadStatus === "OK") reasons.push("Spread acceptable by percentage");
  if (price >= 0.1 && price <= 5) reasons.push("Small-cap hunter price range");

  if (!ticker) warnings.push("Missing ticker");
  if (price <= 0) warnings.push("Missing or invalid price");
  if (premarketVolume <= 0) warnings.push("Missing premarket volume");
  if (spreadStatus === "UNKNOWN") warnings.push("Spread unknown");
  if (spreadStatus === "WIDE") warnings.push("Spread wide");
  if (isExtended) warnings.push("Extended above 120%; possible late runner");
  if (gainPct < 15) warnings.push("Below preferred hunter gain zone");

  return {
    ticker,

    price: round(price, 4),
    previousClose: round(previousClose, 4),
    gainPct: round(gainPct, 2),

    premarketVolume: round(premarketVolume, 0),
    averagePremarketVolume: round(averagePremarketVolume, 0),
    relativePremarketVolume: round(relativePremarketVolume, 2),

    bid: round(bid, 4),
    ask: round(ask, 4),
    spread: round(spread, 4),
    spreadPct: round(spreadPct, 2),
    spreadStatus,

    hunterScore: round(hunterScore, 2),
    rawHunterScore: round(rawHunterScore, 2),

    hunterStatus,
    hunterPhase,

    isInPreferredGainZone,
    isExtended,
    isTradeableSpread,

    reasons,
    warnings,
  };
}

function buildSnapshotInput(row: AnyObj): HunterInput {
  const ticker = cleanTicker(row.ticker || row.symbol || row.T);

  const price = pickNumber(row, [
    "lastTrade.p",
    "min.c",
    "day.c",
    "value",
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

  const priorGainPct = pickNumber(row, [
    "todaysChangePerc",
    "changePercent",
    "percentChange",
    "gainPct",
  ]);

  const premarketVolume = pickNumber(row, [
    "day.v",
    "volume",
    "v",
    "min.av",
    "min.v",
  ]);

  const averagePremarketVolume = pickNumber(row, [
    "averagePremarketVolume",
    "averageVolume",
    "avgVolume",
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

  return {
    ticker,
    symbol: ticker,
    price,
    currentPremarketPrice: price,
    previousClose,
    priorGainPct,
    premarketVolume,
    averagePremarketVolume,
    bid,
    ask,
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
  const limit = num(searchParams.get("limit")) || 10;
  const removeJunk = toBool(searchParams.get("removeJunk"), true);

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
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
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

    const scored = rowsRaw
      .filter(isObj)
      .map((row) => buildSnapshotInput(row))
      .filter((input) => Boolean(input.ticker))
      .filter((input) => {
        if (!removeJunk) return true;
        return !isJunkTicker(String(input.ticker));
      })
      .map((input) => buildHunterScore(input))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.gainPct >= minGain)
      .filter((item) => item.gainPct <= maxGain)
      .filter((item) => item.premarketVolume >= minVolume)
      .sort((a, b) => {
        if (b.hunterScore !== a.hunterScore) return b.hunterScore - a.hunterScore;
        if (b.gainPct !== a.gainPct) return b.gainPct - a.gainPct;
        return b.premarketVolume - a.premarketVolume;
      })
      .slice(0, Math.max(1, Math.min(limit, 100)))
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

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
