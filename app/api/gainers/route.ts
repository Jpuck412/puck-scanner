// app/api/gainers/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, any>;

const SOURCE = "polygon-raw-hunter-clean";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, places = 4): number {
  const p = Math.pow(10, places);
  return Math.round(num(value) * p) / p;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cleanTicker(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function tickerFromRaw(raw: AnyObj): string {
  return cleanTicker(raw?.ticker || raw?.T || raw?.symbol);
}

function isJunkTicker(ticker: string): boolean {
  const x = cleanTicker(ticker);

  return (
    !x ||
    x.includes(".") ||
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.endsWith("RT")
  );
}

function buildSpread(bid: number, ask: number, price: number) {
  if (bid > 0 && ask > 0 && ask >= bid) {
    const mid = (bid + ask) / 2 || price;
    const spread = ask - bid;
    const spreadPct = mid > 0 ? (spread / mid) * 100 : 0;

    if (spreadPct <= 0.75) {
      return {
        spread,
        spreadPct,
        spreadStatus: "PASS",
        spreadScore: 12
      };
    }

    if (spreadPct <= 2.5) {
      return {
        spread,
        spreadPct,
        spreadStatus: "CAUTION",
        spreadScore: 5
      };
    }

    return {
      spread,
      spreadPct,
      spreadStatus: "FAIL",
      spreadScore: -18
    };
  }

  return {
    spread: 0,
    spreadPct: 0,
    spreadStatus: "CHECK",
    spreadScore: 0
  };
}

function gainBandFromGain(gain: number): string {
  if (gain >= 1000) return "EXTREME TRAP RISK";
  if (gain > 65) return "EXTENDED HOT";
  if (gain >= 20) return "RAW HUNTER BAND";
  if (gain >= 5) return "EARLY CLIMBER";
  return "BELOW RADAR";
}

function speedLabelFromScore(score: number): string {
  if (score >= 85) return "VIOLENT";
  if (score >= 65) return "FAST";
  if (score >= 40) return "ACTIVE";
  return "SLOW";
}

function normalizePolygonTicker(raw: AnyObj, marketMode: string, index: number) {
  const ticker = tickerFromRaw(raw);
  if (!ticker) return null;

  const prevDay = raw?.prevDay || {};
  const lastTrade = raw?.lastTrade || {};
  const lastQuote = raw?.lastQuote || {};
  const day = raw?.day || {};
  const min = raw?.min || {};

  const previousClose = num(
    prevDay?.c ?? raw?.previousClose ?? raw?.prevClose ?? raw?.pc
  );

  const price = num(
    lastTrade?.p ??
      day?.c ??
      min?.c ??
      raw?.price ??
      raw?.currentPremarketPrice ??
      (previousClose > 0 ? previousClose + num(raw?.todaysChange) : 0)
  );

  if (!price) return null;

  const gain = num(
    raw?.gain ??
      raw?.gainPct ??
      raw?.todaysChangePerc ??
      (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0)
  );

  const change =
    num(raw?.change ?? raw?.todaysChange) ||
    (previousClose > 0 ? price - previousClose : 0);

  const volume = num(
    raw?.volume ?? raw?.premarketVolume ?? day?.v ?? min?.av ?? min?.v
  );

  const averagePremarketVolume = num(
    raw?.averagePremarketVolume ?? raw?.avgPremarketVolume ?? prevDay?.v
  );

  const relativePremarketVolume =
    averagePremarketVolume > 0 ? volume / averagePremarketVolume : 0;

  const open = num(day?.o ?? min?.o ?? raw?.open ?? price);
  const high = num(day?.h ?? min?.h ?? raw?.high ?? price);
  const low = num(day?.l ?? min?.l ?? raw?.low ?? price);

  const bid = num(lastQuote?.p ?? raw?.bid);
  const ask = num(lastQuote?.P ?? raw?.ask);

  const spread = buildSpread(bid, ask, price);
  const junk = isJunkTicker(ticker);

  const percentMoveScore = clamp(gain * 1.15, 0, 55);
  const volumeScore = clamp(Math.log10(volume + 1) * 5.5, 0, 34);
  const relativeVolumeScore = clamp(relativePremarketVolume * 8, 0, 24);

  const priceScore =
    price >= 0.1 && price <= 2
      ? 16
      : price > 2 && price <= 5
        ? 10
        : price > 5 && price <= 10
          ? 4
          : -28;

  const phaseBonus =
    gain >= 20 && gain <= 65
      ? 16
      : gain >= 5 && gain < 20
        ? 10
        : gain > 65
          ? -25
          : 0;

  const extensionPenalty =
    gain >= 1000 ? -100 : gain > 150 ? -60 : gain > 65 ? -28 : 0;

  const junkPenalty = junk ? -75 : 0;

  const rawScore = clamp(
    Math.round(
      percentMoveScore +
        volumeScore +
        relativeVolumeScore +
        spread.spreadScore +
        priceScore +
        phaseBonus +
        extensionPenalty +
        junkPenalty
    ),
    0,
    100
  );

  const warnings: string[] = [];

  if (junk) warnings.push("JUNK_SYMBOL");
  if (!previousClose) warnings.push("MISSING_PREVIOUS_CLOSE");
  if (volume < 1000) warnings.push("LOW_VOLUME");
  if (price < 0.1 || price > 10) warnings.push("OUTSIDE_PRICE_RANGE");
  if (gain > 65) warnings.push("EXTENDED_ABOVE_RAW_BAND");
  if (spread.spreadStatus === "FAIL") warnings.push("SPREAD_RISK");

  const isCandidate =
    !junk &&
    previousClose > 0 &&
    price >= 0.1 &&
    price <= 10 &&
    gain >= 5 &&
    gain <= 65 &&
    volume >= 1000 &&
    rawScore > 0;

  const verdict = isCandidate ? "WAIT" : "NO";
  const rejection = isCandidate ? "" : warnings[0] || "NOT_RAW_HUNTER_CANDIDATE";

  const support = round(low || price);
  const resistance = round(high || price);
  const neutralEntry = round(price);
  const volumeSurge =
    relativePremarketVolume > 0
      ? relativePremarketVolume
      : clamp(volume / 500000, 0, 20);

  const speed = rawScore;
  const speedLabel = speedLabelFromScore(speed);

  const speedOk = gain >= 3 && volume >= 1000;
  const volumeOk = volume >= 1000;
  const spreadOk =
    spread.spreadStatus === "PASS" || spread.spreadStatus === "CAUTION";

  const signalAlignment =
    (speedOk ? 1 : 0) + (volumeOk ? 1 : 0) + (spreadOk ? 1 : 0);

  const actionRank = isCandidate ? 2 : 1;

  return {
    ticker,
    price: round(price),
    gain: round(gain, 2),
    gainPct: round(gain, 2),
    change: round(change),
    volume: Math.round(volume),
    premarketVolume: Math.round(volume),
    averagePremarketVolume: Math.round(averagePremarketVolume),
    relativePremarketVolume: round(relativePremarketVolume, 2),

    open: round(open || price),
    high: round(high || price),
    low: round(low || price),

    support,
    resistance,

    entryAggressive: neutralEntry,
    entryConfirmation: neutralEntry,
    entryProof: neutralEntry,
    supportEntry: neutralEntry,
    middleEntry: neutralEntry,
    breakoutProofEntry: neutralEntry,
    bestEntry: neutralEntry,
    entryType: "RAW HUNTER DISCOVERY",
    waitFor: "ENTRY PROOF COMES AFTER RAW HUNTER DISCOVERY",

    stop: neutralEntry,
    target1: neutralEntry,
    target2: neutralEntry,
    target3: neutralEntry,
    risk: 0,
    reward: 0,
    rr: 0,

    speed,
    speedLabel,
    volumeSurge: round(volumeSurge, 2),
    spreadStatus: spread.spreadStatus,
    spreadPct: round(spread.spreadPct, 3),
    bid: round(bid),
    ask: round(ask),

    floatShares: 0,
    sharesOutstanding: 0,
    floatProxy: 0,
    floatStatus: "UNKNOWN",
    floatScore: 0,

    marketMode,
    gainBand: gainBandFromGain(gain),
    runnerLane: "RAW HUNTER GATHERER",

    bottomIgnitionScore: rawScore,
    gainerStructureScore: rawScore,
    runnerScore: rawScore,
    proofScore: rawScore,
    ignitionScore: rawScore,
    rawHunterScore: rawScore,
    overExtensionPenalty: extensionPenalty,

    structurePosition: 0,
    structureLocation: "RAW HUNTER ONLY",
    structureLocationScore: 0,
    riskLocation: "NO ENTRY PERMISSION",

    speedOk,
    volumeOk,
    spreadOk,
    signalAlignment,
    actionRank,
    actionRankScore: actionRank * 1000 + rawScore,

    catalyst: "RAW HUNTER DOES NOT REQUIRE NEWS",
    catalystGrade: "NONE",
    newsScore: 0,
    news: [],

    verdict,
    rejection,
    permissionText: "RAW HUNTER ONLY — NOT ENTRY PERMISSION",
    candles: index + 1,

    isCandidate,
    rankKey: round(rawScore * 1000000 + gain * 1000 + volume / 100000, 2),
    percentRankKey: round(gain * 1000000 + rawScore * 1000 + volume / 100000, 2),
    reasons: [],
    warnings
  };
}

async function polygonFetch(path: string, apiKey: string): Promise<AnyObj | null> {
  if (!apiKey) return null;

  const joiner = path.includes("?") ? "&" : "?";
  const url = `https://api.polygon.io${path}${joiner}apiKey=${apiKey}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });

  if (!res.ok) return null;

  return (await res.json()) as AnyObj;
}

function jsonResponse(body: AnyObj, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

export async function GET(): Promise<NextResponse> {
  const apiKey =
    process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY || "";

  if (!apiKey) {
    return jsonResponse(
      {
        ok: false,
        source: SOURCE,
        marketMode: "NO_API_KEY",
        liveGainersCount: 0,
        count: 0,
        timestamp: new Date().toISOString(),
        error: "Missing POLYGON_API_KEY or NEXT_PUBLIC_POLYGON_API_KEY",
        data: {
          tickers: []
        },
        tickers: []
      },
      500
    );
  }

  let rawList: AnyObj[] = [];
  const marketMode = "LIVE_GAINERS_RAW_HUNTER";

  try {
    const gainers = await polygonFetch(
      "/v2/snapshot/locale/us/markets/stocks/gainers",
      apiKey
    );

    rawList = Array.isArray(gainers?.tickers)
      ? gainers.tickers
      : Array.isArray(gainers?.results)
        ? gainers.results
        : [];
  } catch {
    rawList = [];
  }

  const tickers = rawList
    .filter((raw) => tickerFromRaw(raw))
    .slice(0, 100)
    .map((raw, index) => normalizePolygonTicker(raw, marketMode, index))
    .filter(Boolean) as AnyObj[];

  tickers.sort((a, b) => {
    if (num(b.percentRankKey) !== num(a.percentRankKey)) {
      return num(b.percentRankKey) - num(a.percentRankKey);
    }

    if (num(b.rawHunterScore) !== num(a.rawHunterScore)) {
      return num(b.rawHunterScore) - num(a.rawHunterScore);
    }

    return num(b.premarketVolume) - num(a.premarketVolume);
  });

  return jsonResponse({
    ok: true,
    source: SOURCE,
    marketMode: rawList.length ? marketMode : "EMPTY_LIVE_GAINERS",
    liveGainersCount: rawList.length,
    count: tickers.length,
    timestamp: new Date().toISOString(),
    rules: {
      scannerType: "RAW HUNTER GATHERER",
      purpose: "Locate live raw gainers and climbers",
      permission: "NOT BUY/SELL. NOT ENTRY PERMISSION.",
      backup: "NO FAKE BACKUP STOCKS. EMPTY MEANS EMPTY."
    },
    data: {
      tickers
    },
    tickers
  });
}
