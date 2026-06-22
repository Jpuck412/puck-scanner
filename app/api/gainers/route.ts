// ============================================================
// FILE: app/api/gainers/route.ts
// PURPOSE: Raw Hunter Gatherer API route.
// Uses Polygon/Massive live snapshot data.
// No fake backup list.
// No resistance-based scoring.
// No buy/sell signal.
// ============================================================

import { NextResponse } from "next/server";
import { buildFourAmGainerScore } from "./fourAmGainerFormula";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, unknown>;

const SOURCE = "polygon-massive-raw-hunter";

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

function buildSnapshotInput(row: AnyObj) {
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
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
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
      headers: {
        Accept: "application/json",
      },
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
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
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
      .filter((input) => input.ticker)
      .filter((input) => {
        if (!removeJunk) return true;
        return !isJunkTicker(input.ticker);
      })
      .map((input) => buildFourAmGainerScore(input))
      .filter((item) => item.price >= minPrice)
      .filter((item) => item.price <= maxPrice)
      .filter((item) => item.gainPct >= minGain)
      .filter((item) => item.gainPct <= maxGain)
      .filter((item) => item.premarketVolume >= minVolume)
      .sort((a, b) => {
        if (b.hunterScore !== a.hunterScore) {
          return b.hunterScore - a.hunterScore;
        }

        if (b.gainPct !== a.gainPct) {
          return b.gainPct - a.gainPct;
        }

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
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown route error.";

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
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
