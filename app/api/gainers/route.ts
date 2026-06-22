// ============================================================
// FILE: app/api/gainers/route.ts
// ============================================================

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "polygon-raw-hunter-elite5";

type AnyObj = Record<string, unknown>;
type NumericInput = number | string | null | undefined;

type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";
type SpreadStatus = "TIGHT" | "OK" | "WIDE" | "UNKNOWN";

type RawHunterInput = {
  ticker?: string;
  symbol?: string;
  price?: NumericInput;
  currentPremarketPrice?: NumericInput;
  previousClose?: NumericInput;
  priorGainPct?: NumericInput;
  premarketVolume?: NumericInput;
  averagePremarketVolume?: NumericInput;
  bid?: NumericInput;
  ask?: NumericInput;
};

type SpreadResult = {
  spread: number;
  spreadPct: number;
  spreadStatus: SpreadStatus;
  spreadScore: number;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function obj(value: unknown): AnyObj {
  return value && typeof value === "object" ? (value as AnyObj) : {};
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, places = 4): number {
  const p = Math.pow(10, places);
  return Math.round(num(value) * p) / p;
}

function cleanTicker(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function rawTickerSymbol(raw: AnyObj): string {
  return cleanTicker(raw.ticker || raw.T || raw.symbol);
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

function buildSpread(bid: number, ask: number, price: number): SpreadResult {
  if (bid > 0 && ask > 0 && ask >= bid) {
    const mid = (bid + ask) / 2 || price;
    const spread = ask - bid;
    const spreadPct = mid > 0 ? (spread / mid) * 100 : 0;

    if (spreadPct <= 0.75) {
      return {
        spread,
        spreadPct,
        spreadStatus: "TIGHT",
        spreadScore: 12
      };
    }

    if (spreadPct <= 2.5) {
      return {
        spread,
        spreadPct,
        spreadStatus: "OK",
        spreadScore: 5
      };
    }

    return {
      spread,
      spreadPct,
      spreadStatus: "WIDE",
      spreadScore: -18
    };
  }

  return {
    spread: 0,
    spreadPct: 0,
    spreadStatus: "UNKNOWN",
    spreadScore: 0
  };
}

function buildHunterPhase(gainPct: number): HunterPhase {
  if (gainPct < 5) return "BELOW_RADAR";
  if (gainPct < 20) return "CLIMBER";
  if (gainPct <= 65) return "ESTABLISHED";
  return "EXTENDED_HOT";
}

function buildHunterStatus(gainPct: number, volume: number): HunterStatus {
  if (gainPct <= 0) return "FADING";
  if (gainPct >= 3 && volume >= 1000) return "CLIMBING";
  return "FLAT";
}

function mapSpreadForPage(rawSpread: SpreadStatus): string {
  if (rawSpread === "TIGHT") return "PASS";
  if (rawSpread === "OK") return "CAUTION";
  if (rawSpread === "WIDE") return "FAIL";
  return "CHECK";
}

function gainBandFromPhase(phase: HunterPhase, gainPct: number): string {
  if (gainPct >= 1000) return "EXTREME TRAP RISK";
  if (phase === "EXTENDED_HOT") return "EXTENDED HOT";
  if (phase === "ESTABLISHED") return "RAW HUNTER BAND";
  if (phase === "CLIMBER") return "EARLY CLIMBER";
  return "BELOW RADAR";
}

function speedLabelFromScore(score: number): string {
  if (score >= 85) return "VIOLENT";
  if (score >= 65) return "FAST";
  if (score >= 40) return "ACTIVE";
  return "SLOW";
}

function buildRawHunterFormula(input: RawHunterInput) {
  const ticker = cleanTicker(input.ticker || input.symbol);
  const price = num(input.currentPremarketPrice || input.price);
  const previousClose = num(input.previousClose);
  const suppliedGainPct = num(input.priorGainPct);

  const gainPct =
    suppliedGainPct ||
    (price > 0 && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0);

  const premarketVolume = num(input.premarketVolume);
  const averagePremarketVolume = num(input.averagePremarketVolume);
  const relativePremarketVolume =
    averagePremarketVolume > 0 ? premarketVolume / averagePremarketVolume : 0;

  const bid = num(input.bid);
  const ask = num(input.ask);
  const spread = buildSpread(bid, ask, price);
  const hunterStatus = buildHunterStatus(gainPct, premarketVolume);
  const hunterPhase = buildHunterPhase(gainPct);
  const junk = isJunkTicker(ticker);

  const percentMoveScore = clamp(gainPct * 1.15, 0, 55);
  const volumeScore = clamp(Math.log10(premarketVolume + 1) * 5.5, 0, 34);
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
    hunterPhase === "CLIMBER"
      ? 10
      : hunterPhase === "ESTABLISHED"
        ? 16
        : hunterPhase === "EXTENDED_HOT"
          ? -25
          : 0;

  const extensionPenalty =
    gainPct >= 1000 ? -100 : gainPct > 150 ? -60 : gainPct > 65 ? -28 : 0;

  const junkPenalty = junk ? -75 : 0;

  const rawHunterScore = clamp(
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

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (gainPct >= 5) reasons.push("GAINER");
  if (gainPct >= 20 && gainPct <= 65) reasons.push("CORE_20_TO_65_GAIN_BAND");
  if (premarketVolume >= 100000) reasons.push("PREMARKET_VOLUME_ACTIVE");
  if (relativePremarketVolume >= 2) {
    reasons.push("RELATIVE_PREMARKET_VOLUME_EXPANSION");
  }
  if (spread.spreadStatus === "TIGHT" || spread.spreadStatus === "OK") {
    reasons.push("SPREAD_TRACKABLE");
  }
  if (price >= 0.1 && price <= 10) reasons.push("PRICE_IN_RAW_HUNTER_RANGE");

  if (!ticker) warnings.push("MISSING_TICKER");
  if (!price) warnings.push("MISSING_PRICE");
  if (!previousClose) warnings.push("MISSING_PREVIOUS_CLOSE");
  if (junk) warnings.push("JUNK_SUFFIX_OR_NON_COMMON_SYMBOL");
  if (gainPct > 65) warnings.push("EXTENDED_ABOVE_RAW_HUNTER_BAND");
  if (gainPct >= 1000) warnings.push("EXTREME_PERCENT_MOVE_TRAP_RISK");
  if (spread.spreadStatus === "WIDE") warnings.push("WIDE_SPREAD");
  if (premarketVolume < 1000) warnings.push("LOW_PREMARKET_VOLUME");
  if (price < 0.1 || price > 10) warnings.push("OUTSIDE_PRICE_RANGE");

  const isCandidate =
    Boolean(ticker) &&
    !junk &&
    price >= 0.1 &&
    price <= 10 &&
    previousClose > 0 &&
    gainPct >= 5 &&
    gainPct <= 65 &&
    premarketVolume >= 1000 &&
    rawHunterScore > 0;

  return {
    ticker,
    price: round(price),
    previousClose: round(previousClose),
    gainPct: round(gainPct, 2),
    premarketVolume: Math.round(premarketVolume),
    averagePremarketVolume: Math.round(averagePremarketVolume),
    relativePremarketVolume: round(relativePremarketVolume, 2),
    bid: round(bid),
    ask: round(ask),
    spread: round(spread.spread),
    spreadPct: round(spread.spreadPct, 3),
    spreadStatus: spread.spreadStatus,
    hunterStatus,
    hunterPhase,
    rawHunterScore,
    percentMoveScore: round(percentMoveScore, 2),
    volumeScore: round(volumeScore, 2),
    relativeVolumeScore: round(relativeVolumeScore, 2),
    spreadScore: round(spread.spreadScore, 2),
    priceScore,
    phaseBonus,
    extensionPenalty,
    junkPenalty,
    isCandidate,
    rankKey: round(
      rawHunterScore * 1000000 + gainPct * 1000 + premarketVolume / 100000,
      2
    ),
    percentRankKey: round(
      gainPct * 1000000 + rawHunterScore * 1000 + premarketVolume / 100000,
      2
    ),
    reasons,
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

function normalizeSnapshot(raw: AnyObj) {
  const prevDay = obj(raw.prevDay);
  const lastTrade = obj(raw.lastTrade);
  const day = obj(raw.day);
  const min = obj(raw.min);
  const lastQuote = obj(raw.lastQuote);

  const ticker = rawTickerSymbol(raw);

  const previousClose = num(
    prevDay.c || raw.previousClose || raw.prevClose || raw.pc
  );

  const price = num(
    lastTrade.p ||
      day.c ||
      min.c ||
      raw.price ||
      raw.currentPremarketPrice ||
      (previousClose ? previousClose + num(raw.todaysChange) : 0)
  );

  const gain = num(
    raw.todaysChangePerc || raw.gain || raw.gainPct || raw.priorGainPct
  );

  const change =
    num(raw.todaysChange || raw.change) ||
    (previousClose > 0 && price > 0 ? price - previousClose : 0);

  const volume = num(day.v || min.av || min.v || raw.volume || raw.premarketVolume);

  const averagePremarketVolume = num(
    raw.averagePremarketVolume || raw.avgPremarketVolume || prevDay.v
  );

  const open = num(day.o || min.o || raw.open || price);
  const high = num(day.h || min.h || raw.high || price);
  const low = num(day.l || min.l || raw.low || price);

  const bid = num(lastQuote.p || raw.bid);
  const ask = num(lastQuote.P || raw.ask);

  return {
    ticker,
    price,
    previousClose,
    gain,
    change,
    volume,
    averagePremarketVolume,
    open,
    high,
    low,
    bid,
    ask
  };
}

function buildRawHunterTicker(raw: AnyObj, marketMode: string, index: number) {
  const base = normalizeSnapshot(raw);

  if (!base.ticker || !base.price) return null;

  const formula = buildRawHunterFormula({
    ticker: base.ticker,
    price: base.price,
    currentPremarketPrice: base.price,
    previousClose: base.previousClose,
    priorGainPct: base.gain,
    premarketVolume: base.volume,
    averagePremarketVolume: base.averagePremarketVolume,
    bid: base.bid,
    ask: base.ask
  });

  const gain = formula.gainPct;
  const volume = formula.premarketVolume;
  const rawScore = formula.rawHunterScore;
  const spreadStatus = mapSpreadForPage(formula.spreadStatus);

  const support = round(base.low || base.price);
  const resistance = round(base.high || base.price);
  const neutralEntry = round(base.price);
  const neutralTarget = round(base.price);

  const volumeSurge =
    formula.relativePremarketVolume > 0
      ? formula.relativePremarketVolume
      : clamp(volume / 500000, 0, 20);

  const speed = clamp(rawScore, 0, 100);
  const speedLabel = speedLabelFromScore(speed);

  const speedOk = formula.hunterStatus === "CLIMBING";
  const volumeOk = volume >= 1000;
  const spreadOk = spreadStatus === "PASS" || spreadStatus === "CAUTION";

  const signalAlignment =
    (speedOk ? 1 : 0) + (volumeOk ? 1 : 0) + (spreadOk ? 1 : 0);

  const verdict = formula.isCandidate ? "WAIT" : "NO";
  const rejection = formula.isCandidate
    ? ""
    : formula.warnings[0] || "NOT_RAW_HUNTER_CANDIDATE";

  const actionRank = formula.isCandidate ? 2 : 1;

  return {
    ticker: formula.ticker,
    price: formula.price,
    gain,
    gainPct: gain,
    change: round(base.change),
    volume,
    premarketVolume: volume,
    averagePremarketVolume: formula.averagePremarketVolume,
    relativePremarketVolume: formula.relativePremarketVolume,

    open: round(base.open || base.price),
    high: round(base.high || base.price),
    low: round(base.low || base.price),

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
    target1: neutralTarget,
    target2: neutralTarget,
    target3: neutralTarget,
    risk: 0,
    reward: 0,
    rr: 0,

    speed,
    speedLabel,
    volumeSurge: round(volumeSurge, 2),
    spreadStatus,
    rawHunterSpreadStatus: formula.spreadStatus,
    spreadPct: formula.spreadPct,
    bid: formula.bid,
    ask: formula.ask,

    floatShares: 0,
    sharesOutstanding: 0,
    floatProxy: 0,
    floatStatus: "UNKNOWN",
    floatScore: 0,

    marketMode,
    gainBand: gainBandFromPhase(formula.hunterPhase, gain),
    hunterStatus: formula.hunterStatus,
    hunterPhase: formula.hunterPhase,
    runnerLane: "RAW HUNTER GATHERER",

    bottomIgnitionScore: rawScore,
    gainerStructureScore: rawScore,
    runnerScore: rawScore,
    proofScore: rawScore,
    ignitionScore: rawScore,
    rawHunterScore: rawScore,

    percentMoveScore: formula.percentMoveScore,
    volumeScore: formula.volumeScore,
    relativeVolumeScore: formula.relativeVolumeScore,
    spreadScore: formula.spreadScore,
    priceScore: formula.priceScore,
    phaseBonus: formula.phaseBonus,
    extensionPenalty: formula.extensionPenalty,
    junkPenalty: formula.junkPenalty,
    overExtensionPenalty: formula.extensionPenalty,

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

    isCandidate: formula.isCandidate,
    rankKey: formula.rankKey,
    percentRankKey: formula.percentRankKey,
    reasons: formula.reasons,
    warnings: formula.warnings
  };
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

  let marketMode = "LIVE_GAINERS_RAW_HUNTER";
  let liveGainersCount = 0;
  let rawList: AnyObj[] = [];

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
        rules: {
          scannerType: "RAW HUNTER GATHERER",
          permission: "NOT ENTRY PERMISSION",
          backup: "NO FAKE BACKUP STOCKS"
        },
        data: {
          tickers: []
        },
        tickers: []
      },
      500
    );
  }

  try {
    const gainers = await polygonFetch(
      "/v2/snapshot/locale/us/markets/stocks/gainers",
      apiKey
    );

    rawList = Array.isArray(gainers?.tickers)
      ? (gainers.tickers as AnyObj[])
      : Array.isArray(gainers?.results)
        ? (gainers.results as AnyObj[])
        : [];

    liveGainersCount = rawList.length;
  } catch {
    rawList = [];
  }

  if (!rawList.length) {
    marketMode = "EMPTY_LIVE_GAINERS";

    return jsonResponse({
      ok: true,
      source: SOURCE,
      marketMode,
      liveGainersCount,
      count: 0,
      timestamp: new Date().toISOString(),
      rules: {
        scannerType: "RAW HUNTER GATHERER",
        purpose: "Locate live raw premarket gainers and climbers",
        permission: "NOT BUY/SELL. NOT ENTRY PERMISSION.",
        ranking: "percent move first, raw hunter score second, volume third",
        backup: "NO FAKE BACKUP STOCKS. EMPTY MEANS EMPTY."
      },
      data: {
        tickers: []
      },
      tickers: []
    });
  }

  const cleaned = rawList.filter((x) => rawTickerSymbol(x)).slice(0, 100);

  const enriched = cleaned
    .map((raw, index) => buildRawHunterTicker(raw, marketMode, index))
    .filter((item): item is AnyObj => Boolean(item));

  enriched.sort((a, b) => {
    const aPercentRankKey = num(a.percentRankKey);
    const bPercentRankKey = num(b.percentRankKey);
    const aRawHunterScore = num(a.rawHunterScore);
    const bRawHunterScore = num(b.rawHunterScore);
    const aPremarketVolume = num(a.premarketVolume);
    const bPremarketVolume = num(b.premarketVolume);

    if (bPercentRankKey !== aPercentRankKey) {
      return bPercentRankKey - aPercentRankKey;
    }

    if (bRawHunterScore !== aRawHunterScore) {
      return bRawHunterScore - aRawHunterScore;
    }

    return bPremarketVolume - aPremarketVolume;
  });

  return jsonResponse({
    ok: true,
    source: SOURCE,
    marketMode,
    liveGainersCount,
    count: enriched.length,
    timestamp: new Date().toISOString(),
    rules: {
      scannerType: "RAW HUNTER GATHERER",
      purpose: "Locate live raw premarket gainers and climbers",
      permission: "NOT BUY/SELL. NOT ENTRY PERMISSION.",
      priceRange: "$0.10 to $10.00 preferred",
      rawGainBand: "5% to 65%",
      coreHunterBand: "20% to 65%",
      ranking: "percent move first, raw hunter score second, volume third",
      backup: "NO FAKE BACKUP STOCKS"
    },
    data: {
      tickers: enriched
    },
    tickers: enriched
  });
}


// ============================================================
// FILE: app/page.tsx
// ============================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type NewsItem = {
  title: string;
  publisher?: string;
  published_utc?: string;
  article_url?: string;
  description?: string;
};

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  support: number;
  resistance: number;

  entryAggressive: number;
  entryConfirmation: number;
  entryProof: number;
  supportEntry: number;
  middleEntry: number;
  breakoutProofEntry: number;
  bestEntry: number;
  entryType: string;
  waitFor: string;

  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rr: number;

  speed: number;
  speedLabel: string;
  volumeSurge: number;
  spreadStatus: string;
  spreadPct: number;
  bid: number;
  ask: number;

  floatShares: number;
  sharesOutstanding: number;
  floatProxy: number;
  floatStatus: string;
  floatScore: number;

  marketMode: string;
  gainBand: string;
  runnerLane: string;
  bottomIgnitionScore: number;
  gainerStructureScore: number;
  runnerScore: number;
  proofScore: number;
  ignitionScore: number;
  overExtensionPenalty: number;

  structurePosition: number;
  structureLocation: string;
  structureLocationScore: number;
  riskLocation: string;

  speedOk: boolean;
  volumeOk: boolean;
  spreadOk: boolean;
  signalAlignment: number;
  actionRank: number;
  actionRankScore: number;

  catalyst: string;
  catalystGrade: string;
  newsScore: number;
  news: NewsItem[];

  verdict: string;
  rejection: string;
  permissionText: string;
  candles: number;
};

type Page =
  | "dashboard"
  | "scanner"
  | "structure"
  | "news"
  | "help"
  | "glossary"
  | "settings";

type Mode =
  | "BOTTOM"
  | "SPEED"
  | "VOLUME"
  | "PROOF"
  | "GAINERS"
  | "RAW"
  | "REJECTED";

type EntryPlan = {
  supportEntry: number;
  middleEntry: number;
  breakoutProofEntry: number;
  bestEntry: number;
  entryType: string;
  waitFor: string;
  alignedSignals: string[];
  missingSignals: string[];
  alignmentCount: number;
  alignmentText: string;
  entryStatus: string;
};

const pages: Page[] = [
  "dashboard",
  "scanner",
  "structure",
  "news",
  "help",
  "glossary",
  "settings"
];

const modes: { key: Mode; label: string; desc: string }[] = [
  { key: "BOTTOM", label: "BOTTOM IGNITION", desc: "Support/middle wake-ups" },
  { key: "SPEED", label: "SPEED CLIMBERS", desc: "Fastest pressure building" },
  { key: "VOLUME", label: "VOLUME AWAKENING", desc: "Volume pressure priority" },
  { key: "PROOF", label: "PROOF SCORE", desc: "Best permission structure" },
  { key: "GAINERS", label: "TOP GAINERS", desc: "Danger-check movers" },
  { key: "RAW", label: "RAW LEADERS", desc: "Pure score, even rejected" },
  { key: "REJECTED", label: "REJECTED", desc: "Why tickers failed" }
];

const functionList = [
  ["Live gainers scan", "Pulls the real moving stocks when market data is active."],
  ["Weekend demo mode", "Shows practice names when the real gainers list is empty."],
  ["Runner score", "Main strength number for whether a ticker deserves attention."],
  ["Bottom ignition score", "Finds names waking up before they look obvious."],
  ["Gainer structure score", "Checks names already up to see if they still have clean structure."],
  ["Runner lane", "Tells whether it is an early wake-up or already-up setup."],
  ["Gain band", "Shows if the move is fresh, structured, late, or overextended."],
  ["Support", "The price area buyers must defend."],
  ["Resistance", "The price area the stock must beat."],
  ["Structure location", "Tells where price is sitting between support and resistance."],
  ["Structure position", "Number version of where price is inside the range."],
  ["Structure score", "Rewards better location and punishes bad location."],
  ["Risk location", "Tells whether the spot is safer, needs proof, or is chase risk."],
  ["Spread check", "Tells if the buying/selling price gap is clean or dangerous."],
  ["Volume check", "Shows whether enough shares are trading."],
  ["Speed check", "Measures how fast pressure is building."],
  ["Raw Hunter verdict", "WAIT means raw candidate. NO means rejected. This is not entry permission."],
  ["Rejection reason", "Tells why a ticker failed."],
  ["Entry zones", "Shows support, middle, and breakout proof entry numbers."],
  ["Trader journal", "Forces the trader to answer the important questions before acting."]
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function money(v: number): string {
  const n = num(v);
  if (!n) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(v: number): string {
  const n = num(v);
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(v: number): string {
  const n = num(v);
  if (!n) return "N/A";
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + "B";
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function isJunk(t: string): boolean {
  const x = String(t || "").toUpperCase();

  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes(".")
  );
}

function scoreClass(v: number): string {
  if (v >= 80) return "good";
  if (v >= 60) return "warn";
  return "bad";
}

function verdictClass(v: string): string {
  if (v === "YES") return "good";
  if (v === "WAIT") return "warn";
  return "bad";
}

function spreadClass(v: string): string {
  if (v === "PASS" || v === "LIKELY TIGHT") return "good";
  if (v === "CAUTION" || v === "CHECK") return "warn";
  return "bad";
}

function catalystClass(v: string): string {
  if (v === "A" || v === "B") return "good";
  if (v === "C" || v === "RISK") return "warn";
  if (v === "DANGER") return "bad";
  return "";
}

function shortTitle(v: string, max = 92): string {
  const x = String(v || "").trim();
  if (!x) return "NO FRESH NEWS FOUND";
  return x.length > max ? x.slice(0, max - 3) + "..." : x;
}

function dateShort(v?: string): string {
  if (!v) return "N/A";

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function normalize(s: any): Stock {
  const ticker = String(s?.ticker || "").toUpperCase();

  const price = num(
    s?.price ??
      s?.day?.c ??
      s?.min?.c ??
      ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0))
  );

  const gain = num(s?.gain ?? s?.gainPct ?? s?.todaysChangePerc);
  const change = num(s?.change ?? s?.todaysChange);
  const volume = num(s?.volume ?? s?.premarketVolume ?? s?.day?.v ?? s?.min?.v);
  const open = num(s?.open ?? s?.day?.o ?? s?.min?.o ?? price);
  const high = num(s?.high ?? s?.day?.h ?? price * 1.08);
  const low = num(s?.low ?? s?.day?.l ?? price * 0.94);

  const support = num(s?.support ?? low ?? price * 0.94);
  const resistance = num(s?.resistance ?? high ?? price * 1.08);

  const structureLocation = String(s?.structureLocation || "UNKNOWN");
  const structurePosition = num(s?.structurePosition);
  const structureLocationScore = num(s?.structureLocationScore);
  const riskLocation = String(s?.riskLocation || "N/A");

  const supportEntry = num(s?.supportEntry ?? s?.entryAggressive ?? support * 1.01);
  const middleEntry = num(
    s?.middleEntry ?? s?.entryConfirmation ?? (support + resistance) / 2
  );
  const breakoutProofEntry = num(
    s?.breakoutProofEntry ?? s?.entryProof ?? resistance * 1.025
  );

  let bestEntry = num(s?.bestEntry);
  let entryType = String(s?.entryType || "");
  let waitFor = String(s?.waitFor || "");

  if (!bestEntry) {
    if (structureLocation === "NEAR SUPPORT") {
      bestEntry = supportEntry;
      entryType = "SUPPORT ENTRY";
      waitFor = "WAIT FOR SUPPORT HOLD + SPEED / VOLUME / SPREAD";
    } else if (structureLocation === "HEALTHY MIDDLE") {
      bestEntry = middleEntry;
      entryType = "HEALTHY MIDDLE ENTRY";
      waitFor = "WAIT FOR BUYERS HOLDING MIDDLE";
    } else if (
      structureLocation === "NEAR RESISTANCE" ||
      structureLocation === "BREAKOUT ZONE"
    ) {
      bestEntry = breakoutProofEntry;
      entryType = "BREAKOUT PROOF ENTRY";
      waitFor = "WAIT ABOVE RESISTANCE FOR PROOF";
    } else {
      bestEntry = 0;
      entryType = "NO TOUCH";
      waitFor = "NO CLEAN ENTRY";
    }
  }

  const stop = num(s?.stop ?? support);
  const target1 = num(s?.target1 ?? s?.target ?? resistance * 1.08);
  const target2 = num(s?.target2 ?? resistance * 1.18);
  const target3 = num(s?.target3 ?? resistance * 1.35);

  const risk = num(s?.risk ?? Math.max(0, breakoutProofEntry - stop));
  const reward = num(s?.reward ?? Math.max(0, target1 - breakoutProofEntry));
  const rr = num(s?.rr ?? (risk > 0 ? reward / risk : 0));

  const volumeSurge = num(s?.volumeSurge ?? s?.structure?.volumeSurge);
  const speedRaw = num(s?.speed);
  const speed = clamp(speedRaw || Math.round(gain * 0.45 + volumeSurge * 16), 0, 100);

  const speedLabel =
    s?.speedLabel ||
    (speed >= 85 ? "VIOLENT" : speed >= 65 ? "FAST" : speed >= 40 ? "ACTIVE" : "SLOW");

  const spreadStatus = String(s?.spreadStatus ?? s?.spreadEstimate ?? "CHECK").toUpperCase();
  const spreadPct = num(s?.spreadPct);
  const bid = num(s?.bid);
  const ask = num(s?.ask);

  const speedOk = Boolean(s?.speedOk ?? speed >= 50);
  const volumeOk = Boolean(
    s?.volumeOk ?? (volume >= 100000 && (volumeSurge >= 1 || volume >= 1000000))
  );
  const spreadOk = Boolean(
    s?.spreadOk ?? (spreadStatus === "PASS" || spreadStatus === "LIKELY TIGHT")
  );

  const signalAlignment = num(
    s?.signalAlignment ??
      (speedOk ? 1 : 0) +
        (volumeOk ? 1 : 0) +
        (spreadOk || spreadStatus === "CAUTION" || spreadStatus === "CHECK" ? 1 : 0)
  );

  const floatShares = num(s?.floatShares);
  const sharesOutstanding = num(s?.sharesOutstanding);
  const floatProxy = num(s?.floatProxy);
  const floatStatus = String(s?.floatStatus || "UNKNOWN");
  const floatScore = num(s?.floatScore);
  const marketMode = String(s?.marketMode || "");

  const gainBand = String(s?.gainBand || "UNKNOWN");
  const runnerLane = String(s?.runnerLane || "UNCLASSIFIED");
  const bottomIgnitionScore = num(s?.bottomIgnitionScore);
  const gainerStructureScore = num(s?.gainerStructureScore);
  const runnerScore = num(s?.runnerScore || Math.max(bottomIgnitionScore, gainerStructureScore));
  const proofScore = num(s?.proofScore || runnerScore);
  const ignitionScore = num(s?.ignitionScore || bottomIgnitionScore);
  const overExtensionPenalty = num(s?.overExtensionPenalty);

  const catalyst = String(s?.catalyst || "NO FRESH NEWS FOUND");
  const catalystGrade = String(s?.catalystGrade || "NONE");
  const newsScore = num(s?.newsScore);
  const news = Array.isArray(s?.news) ? s.news : [];

  const verdict = String(
    s?.verdict || (proofScore >= 80 ? "YES" : proofScore >= 60 ? "WAIT" : "NO")
  ).replace("PROOF", "YES");

  let rejection = String(s?.rejection || "");

  if (!rejection) {
    if (isJunk(ticker)) rejection = "JUNK SYMBOL";
    else if (volume < 100000) rejection = "LOW VOLUME";
    else if (spreadStatus === "FAIL") rejection = "SPREAD RISK";
    else if (proofScore < 60) rejection = "NO PROOF";
  }

  const permissionText =
    s?.permissionText ||
    (verdict === "YES"
      ? "YES — SUPPORT/MIDDLE ENTRY WITH CONFIRMATION"
      : verdict === "WAIT"
        ? waitFor
        : rejection || "NO CLEAN PERMISSION");

  const actionRank = num(s?.actionRank ?? (verdict === "YES" ? 3 : verdict === "WAIT" ? 2 : 1));

  const actionRankScore = num(
    s?.actionRankScore ?? actionRank * 1000 + proofScore + runnerScore * 0.01
  );

  return {
    ticker,
    price,
    gain,
    change,
    volume,
    open,
    high,
    low,
    support,
    resistance,

    entryAggressive: supportEntry,
    entryConfirmation: middleEntry,
    entryProof: breakoutProofEntry,
    supportEntry,
    middleEntry,
    breakoutProofEntry,
    bestEntry,
    entryType,
    waitFor,

    stop,
    target1,
    target2,
    target3,
    risk,
    reward,
    rr,

    speed,
    speedLabel,
    volumeSurge,
    spreadStatus,
    spreadPct,
    bid,
    ask,

    floatShares,
    sharesOutstanding,
    floatProxy,
    floatStatus,
    floatScore,

    marketMode,
    gainBand,
    runnerLane,
    bottomIgnitionScore,
    gainerStructureScore,
    runnerScore,
    proofScore,
    ignitionScore,
    overExtensionPenalty,

    structurePosition,
    structureLocation,
    structureLocationScore,
    riskLocation,

    speedOk,
    volumeOk,
    spreadOk,
    signalAlignment,
    actionRank,
    actionRankScore,

    catalyst,
    catalystGrade,
    newsScore,
    news,

    verdict,
    rejection,
    permissionText,
    candles: num(s?.candles)
  };
}

function buildEntryPlan(s?: Stock): EntryPlan {
  if (!s) {
    return {
      supportEntry: 0,
      middleEntry: 0,
      breakoutProofEntry: 0,
      bestEntry: 0,
      entryType: "NO TICKER",
      waitFor: "NO TICKER SELECTED",
      alignedSignals: [],
      missingSignals: [],
      alignmentCount: 0,
      alignmentText: "0 / 3",
      entryStatus: "NO CLEAN ENTRY"
    };
  }

  const speedOk = s.speedOk || s.speed >= 50;
  const volumeOk = s.volumeOk || (s.volume >= 100000 && (s.volumeSurge >= 1 || s.volume >= 1000000));
  const spreadOk = s.spreadOk || s.spreadStatus === "PASS" || s.spreadStatus === "LIKELY TIGHT";
  const spreadMaybe = spreadOk || s.spreadStatus === "CAUTION" || s.spreadStatus === "CHECK";

  const alignedSignals = [
    speedOk ? "Speed" : "",
    volumeOk ? "Volume" : "",
    spreadMaybe ? "Spread" : ""
  ].filter(Boolean);

  const missingSignals = [
    speedOk ? "" : "Speed",
    volumeOk ? "" : "Volume",
    spreadMaybe ? "" : "Spread"
  ].filter(Boolean);

  const alignmentCount = alignedSignals.length;

  const entryStatus =
    s.verdict === "NO"
      ? "NO CLEAN ENTRY"
      : alignmentCount >= 2 && spreadOk
        ? "ENTRY CAN BE WATCHED"
        : alignmentCount >= 2
          ? "WAIT FOR SPREAD"
          : "WAIT FOR ALIGNMENT";

  return {
    supportEntry: s.supportEntry,
    middleEntry: s.middleEntry,
    breakoutProofEntry: s.breakoutProofEntry,
    bestEntry: s.bestEntry,
    entryType: s.entryType,
    waitFor: s.waitFor,
    alignedSignals,
    missingSignals,
    alignmentCount,
    alignmentText: `${alignmentCount} / 3`,
    entryStatus
  };
}

function journalTemplate(s?: Stock): string {
  const plan = buildEntryPlan(s);

  return [
    `Ticker: ${s?.ticker || ""}`,
    `Why am I watching this ticker?`,
    ``,
    `Best entry number: ${s ? money(plan.bestEntry) : ""}`,
    `Entry type: ${s?.entryType || ""}`,
    `What must align before entry? Speed / Volume / Spread`,
    ``,
    `Support: ${s ? money(s.support) : ""}`,
    `Resistance: ${s ? money(s.resistance) : ""}`,
    `What proves me wrong?`,
    ``,
    `Am I chasing?`,
    ``,
    `Exit plan:`,
    ``,
    `Did I follow the scanner?`,
    ``,
    `What did I learn?`
  ].join("\n");
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>("BOTTOM");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [errorText, setErrorText] = useState("");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(5);
  const [showRejected, setShowRejected] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [journal, setJournal] = useState("");

  const [minPrice, setMinPrice] = useState(0.1);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minGain, setMinGain] = useState(0);
  const [minVolume, setMinVolume] = useState(100000);
  const [removeJunk, setRemoveJunk] = useState(true);

  const [selectedTicker, setSelectedTicker] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const [manualTicker, setManualTicker] = useState("");
  const [manualSupport, setManualSupport] = useState(0.8);
  const [manualResistance, setManualResistance] = useState(0.82);

  const load = useCallback(async () => {
    setStatus("SCANNING");
    setErrorText("");

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();

      if (!json?.ok && json?.error) {
        setStatus("ERROR");
        setErrorText(String(json.error));
      } else {
        setStatus("CONNECTED");
      }

      const list = json?.data?.tickers || json?.tickers || json?.results || [];
      setStocks(Array.isArray(list) ? list.map(normalize) : []);

      setLastScan(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York"
        })
      );
    } catch (error) {
      setStatus("ERROR");
      setErrorText(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    load();

    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York"
        })
      );
    }, 1000);

    try {
      const saved = window.localStorage.getItem("proof-watchlist");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }

      const savedTips = window.localStorage.getItem("proof-show-tips");
      if (savedTips === "false") setShowTips(false);

      const savedJournal = window.localStorage.getItem("proof-trader-journal");
      if (savedJournal) setJournal(savedJournal);
    } catch {}

    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!autoScan) return;

    const seconds = clamp(refreshSec, 5, 300);
    const id = setInterval(load, seconds * 1000);

    return () => clearInterval(id);
  }, [autoScan, refreshSec, load]);

  useEffect(() => {
    try {
      window.localStorage.setItem("proof-watchlist", JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  useEffect(() => {
    try {
      window.localStorage.setItem("proof-show-tips", String(showTips));
    } catch {}
  }, [showTips]);

  useEffect(() => {
    try {
      window.localStorage.setItem("proof-trader-journal", journal);
    } catch {}
  }, [journal]);

  const filtered = useMemo(() => {
    return stocks.filter((s) => {
      if (removeJunk && isJunk(s.ticker)) return false;
      if (s.price < minPrice || s.price > maxPrice) return false;
      if (s.gain < minGain) return false;
      if (s.volume < minVolume) return false;
      return true;
    });
  }, [stocks, minPrice, maxPrice, minGain, minVolume, removeJunk]);

  const actionable = useMemo(() => {
    return filtered.filter((s) => s.verdict !== "NO");
  }, [filtered]);

  const bottomIgnition = useMemo(
    () =>
      [...actionable].sort(
        (a, b) => b.bottomIgnitionScore - a.bottomIgnitionScore || b.actionRankScore - a.actionRankScore
      ),
    [actionable]
  );

  const speedClimbers = useMemo(
    () => [...actionable].sort((a, b) => b.speed - a.speed || b.actionRankScore - a.actionRankScore),
    [actionable]
  );

  const volumeAwakening = useMemo(
    () => [...actionable].sort((a, b) => b.volume - a.volume || b.volumeSurge - a.volumeSurge),
    [actionable]
  );

  const proofScore = useMemo(
    () => [...actionable].sort((a, b) => b.proofScore - a.proofScore || b.runnerScore - a.runnerScore),
    [actionable]
  );

  const topGainers = useMemo(
    () => [...filtered].sort((a, b) => b.gain - a.gain || b.volume - a.volume),
    [filtered]
  );

  const rawLeaders = useMemo(
    () => [...filtered].sort((a, b) => b.runnerScore - a.runnerScore || b.proofScore - a.proofScore),
    [filtered]
  );

  const rejected = useMemo(
    () => filtered.filter((s) => s.verdict === "NO" || s.rejection),
    [filtered]
  );

  const ranked = useMemo(() => {
    if (mode === "BOTTOM") return bottomIgnition;
    if (mode === "SPEED") return speedClimbers;
    if (mode === "VOLUME") return volumeAwakening;
    if (mode === "PROOF") return proofScore;
    if (mode === "GAINERS") return topGainers;
    if (mode === "RAW") return rawLeaders;
    return rejected;
  }, [mode, bottomIgnition, speedClimbers, volumeAwakening, proofScore, topGainers, rawLeaders, rejected]);

  const top = proofScore[0] || actionable[0] || filtered[0] || stocks[0];
  const earlyTop = bottomIgnition[0];
  const rawTop = rawLeaders[0];

  const selected =
    filtered.find((s) => s.ticker === selectedTicker) ||
    stocks.find((s) => s.ticker === selectedTicker) ||
    top;

  const selectedPlan = buildEntryPlan(selected);

  const yesCount = filtered.filter((s) => s.verdict === "YES").length;
  const waitCount = filtered.filter((s) => s.verdict === "WAIT").length;
  const noCount = filtered.filter((s) => s.verdict === "NO").length;

  const liveNews = useMemo(() => {
    return stocks
      .flatMap((s) =>
        s.news.map((n) => ({
          ticker: s.ticker,
          grade: s.catalystGrade,
          score: s.newsScore,
          ...n
        }))
      )
      .filter((n) => n.title)
      .slice(0, 20);
  }, [stocks]);

  const manualRange = Math.max(0, manualResistance - manualSupport);
  const manualSupportEntry = manualSupport * 1.01;
  const manualMiddleEntry = manualSupport + manualRange * 0.5;
  const manualBreakoutProof = manualResistance * 1.025;
  const manualStop = manualSupport;
  const manualTarget1 = manualResistance * 1.08;
  const manualTarget2 = manualResistance * 1.18;
  const manualTarget3 = manualResistance * 1.35;
  const manualRisk = Math.max(0, manualBreakoutProof - manualStop);
  const manualReward = Math.max(0, manualTarget1 - manualBreakoutProof);
  const manualRR = manualRisk > 0 ? manualReward / manualRisk : 0;

  function toggleWatchlist(ticker: string) {
    if (!ticker) return;

    setWatchlist((prev) =>
      prev.includes(ticker)
        ? prev.filter((x) => x !== ticker)
        : [...prev, ticker]
    );
  }

  function discordProof(s?: Stock): string {
    if (!s) return "No ticker selected.";

    const plan = buildEntryPlan(s);

    return [
      `TICKER TRIAL — ${s.ticker}`,
      `Verdict: ${s.verdict}`,
      `Permission Text: ${s.permissionText}`,
      `Runner Lane: ${s.runnerLane}`,
      `Gain Band: ${s.gainBand}`,
      `Runner Score: ${s.runnerScore}`,
      `BI / GS: ${s.bottomIgnitionScore} / ${s.gainerStructureScore}`,
      `Structure Location: ${s.structureLocation}`,
      `Risk Location: ${s.riskLocation}`,
      `Entry Type: ${plan.entryType}`,
      `Best Entry: ${money(plan.bestEntry)}`,
      `Wait For: ${plan.waitFor}`,
      `Aligned Signals: ${plan.alignmentText} (${plan.alignedSignals.join(", ") || "none"})`,
      `Price: ${money(s.price)}`,
      `Gain: ${pct(s.gain)}`,
      `Volume: ${vol(s.volume)}`,
      `Speed: ${s.speedLabel} / ${s.speed}`,
      `Spread: ${s.spreadStatus}${s.spreadPct ? ` / ${s.spreadPct.toFixed(2)}%` : ""}`,
      `Support: ${money(s.support)}`,
      `Resistance: ${money(s.resistance)}`,
      `Support Entry: ${money(plan.supportEntry)}`,
      `Middle Entry: ${money(plan.middleEntry)}`,
      `Breakout Proof Entry: ${money(plan.breakoutProofEntry)}`,
      `Stop: ${money(s.stop)}`,
      `Target 1: ${money(s.target1)}`,
      `Risk/Reward: ${s.rr.toFixed(2)}`,
      `Float: ${s.floatStatus} / ${vol(s.floatProxy)}`,
      `Catalyst Grade: ${s.catalystGrade}`,
      `Catalyst: ${shortTitle(s.catalyst, 140)}`,
      `Educational review only. Not financial advice.`
    ].join("\n");
  }

  async function copyProof(s?: Stock) {
    try {
      await navigator.clipboard.writeText(discordProof(s));
      alert("Discord proof copied.");
    } catch {
      alert("Copy failed. Highlight the proof text manually.");
    }
  }

  async function copyJournal() {
    try {
      await navigator.clipboard.writeText(journal);
      alert("Journal copied.");
    } catch {
      alert("Copy failed. Highlight journal manually.");
    }
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">PS</div>
          <h2>
            PROOF
            <br />
            STRUCTURE
          </h2>
          <p>ELITE DEV 5</p>
        </div>

        <nav>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={page === p ? "active" : ""}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </nav>

        <div className="sideCard">
          <small>STATUS</small>
          <strong className={status === "ERROR" ? "bad" : status === "CONNECTED" ? "good" : "warn"}>
            {status}
          </strong>
          <span>{errorText || "Scanner route active"}</span>
        </div>
      </aside>

      <section className="main">
        <header className="hero">
          <div>
            <p>PROOF OF STRUCTURE™ ELITE DEV 5</p>
            <h1>MISSION CONTROL</h1>
            <span>The market must earn permission. No Proof = No Trade.</span>
          </div>

          <div className="clock">
            <small>ET CLOCK</small>
            <strong>{time || "LOADING"}</strong>
            <small>Last Scan: {lastScan}</small>
            <button onClick={load}>NEW SCAN</button>
            <button onClick={() => setAutoScan(!autoScan)}>
              AUTO: {autoScan ? `${refreshSec}s` : "OFF"}
            </button>
          </div>
        </header>

        {page === "dashboard" && (
          <>
            <section className="demoNotice">
              <strong>RAW HUNTER MODE — EMPTY LIST MEANS NOTHING QUALIFIED. NO FAKE BACKUP STOCKS.</strong>
            </section>

            <section className="modebar">
              {modes.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={mode === m.key ? "active" : ""}
                >
                  <strong>{m.label}</strong>
                  <small>{m.desc}</small>
                </button>
              ))}
            </section>

            <section className="viewBanner">
              <strong>VIEWING: {modes.find((m) => m.key === mode)?.label}</strong>
              <span>SORTING BY: {modes.find((m) => m.key === mode)?.desc}</span>
            </section>

            <section className="stats">
              <Stat title="Raw Count" value={stocks.length} />
              <Stat title="Showing" value={filtered.length} />
              <Stat title="Actionable" value={actionable.length} tone="good" />
              <Stat title="YES" value={yesCount} tone="good" />
              <Stat title="WAIT" value={waitCount} tone="warn" />
              <Stat title="NO" value={noCount} tone="bad" />
            </section>

            <section className="grid3">
              <Panel title="ACTION #1">
                <TruthHeader stock={top} />
                <TruthRows stock={top} plan={buildEntryPlan(top)} showTips={showTips} />
              </Panel>

              <Panel title="EARLY WAKE-UP #1">
                {earlyTop ? (
                  <>
                    <TruthHeader stock={earlyTop} />
                    <Row a="BI Score" b={earlyTop.bottomIgnitionScore} />
                    <Row a="Structure" b={earlyTop.structureLocation} />
                    <Row a="Risk" b={earlyTop.riskLocation} />
                    <Row a="Entry" b={money(buildEntryPlan(earlyTop).bestEntry)} />
                  </>
                ) : (
                  <NoAction text="No actionable early wake-up yet." />
                )}
              </Panel>

              <Panel title="RAW LEADER">
                <TruthHeader stock={rawTop} />
                <Row a="Raw Runner Score" b={rawTop?.runnerScore ?? 0} />
                <Row a="Verdict" b={rawTop?.verdict || "N/A"} />
                <Row a="Rejection" b={rawTop?.rejection || "None"} />
                <Row a="Location" b={rawTop?.structureLocation || "N/A"} />
              </Panel>
            </section>

            <section className="leaderGrid">
              <Leaderboard
                title="ACTIONABLE BOTTOM IGNITION TOP 5"
                tip="Only YES/WAIT names. NO names are blocked from this action board."
                stocks={bottomIgnition.slice(0, 5)}
                kind="BI"
                showTips={showTips}
                onPick={(t) => {
                  setSelectedTicker(t);
                  setPage("scanner");
                }}
              />

              <Leaderboard
                title="ACTIONABLE SPEED CLIMBERS TOP 5"
                tip="Fast names only if they are not rejected."
                stocks={speedClimbers.slice(0, 5)}
                kind="SPEED"
                showTips={showTips}
                onPick={(t) => {
                  setSelectedTicker(t);
                  setPage("scanner");
                }}
              />

              <Leaderboard
                title="ACTIONABLE VOLUME AWAKENING TOP 5"
                tip="Volume pressure only if the setup is not rejected."
                stocks={volumeAwakening.slice(0, 5)}
                kind="VOL"
                showTips={showTips}
                onPick={(t) => {
                  setSelectedTicker(t);
                  setPage("scanner");
                }}
              />

              <Leaderboard
                title="PROOF SCORE TOP 5"
                tip="Cleanest permission candidates."
                stocks={proofScore.slice(0, 5)}
                kind="PROOF"
                showTips={showTips}
                onPick={(t) => {
                  setSelectedTicker(t);
                  setPage("scanner");
                }}
              />

              <Leaderboard
                title="TOP GAINERS DANGER CHECK"
                tip="Raw percent movers. This is not automatic permission."
                stocks={topGainers.slice(0, 5)}
                kind="GAIN"
                showTips={showTips}
                onPick={(t) => {
                  setSelectedTicker(t);
                  setPage("scanner");
                }}
              />

              <JournalPanel
                selected={selected}
                journal={journal}
                setJournal={setJournal}
                copyJournal={copyJournal}
              />
            </section>
          </>
        )}

        {page === "scanner" && (
          <section className="gridScan">
            <Panel title="LIVE RESULTS GRID">
              <div className="viewBanner inner">
                <strong>VIEWING: {modes.find((m) => m.key === mode)?.label}</strong>
                <span>Rejected names cannot lead action boards.</span>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Gain</th>
                      <th>Vol</th>
                      <th>BI</th>
                      <th>GS</th>
                      <th>Proof</th>
                      <th>Location</th>
                      <th>Entry</th>
                      <th>Signals</th>
                      <th>Spread</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.slice(0, 40).map((s) => {
                      const plan = buildEntryPlan(s);

                      return (
                        <tr
                          key={s.ticker}
                          onClick={() => setSelectedTicker(s.ticker)}
                          className={selected?.ticker === s.ticker ? "rowSelected" : ""}
                        >
                          <td><b>{s.ticker}</b></td>
                          <td>{money(s.price)}</td>
                          <td className={s.gain > 70 ? "bad" : "good"}>{pct(s.gain)}</td>
                          <td>{vol(s.volume)}</td>
                          <td className={scoreClass(s.bottomIgnitionScore)}>{s.bottomIgnitionScore}</td>
                          <td className={scoreClass(s.gainerStructureScore)}>{s.gainerStructureScore}</td>
                          <td className={scoreClass(s.proofScore)}>{s.proofScore}</td>
                          <td>{s.structureLocation}</td>
                          <td>{money(plan.bestEntry)}</td>
                          <td>{plan.alignmentText}</td>
                          <td className={spreadClass(s.spreadStatus)}>{s.spreadStatus}</td>
                          <td className={verdictClass(s.verdict)}>{s.verdict}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setShowRejected(!showRejected)}>
                {showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}
              </button>

              {showRejected && (
                <div className="rejectBox">
                  {rejected.map((s) => (
                    <Row key={s.ticker} a={s.ticker} b={s.rejection || "NO CLEAN PERMISSION"} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="TICKER TRIAL TRUTH BOX">
              {selected ? (
                <>
                  <h3 className="tickerTitle">{selected.ticker}</h3>
                  <div className={`verdictPill ${verdictClass(selected.verdict)}`}>
                    {selected.verdict} · {selected.permissionText}
                  </div>

                  <TruthRows stock={selected} plan={selectedPlan} showTips={showTips} />

                  <Row a="Support" b={money(selected.support)} />
                  <Row a="Resistance" b={money(selected.resistance)} />
                  <Row a="Stop" b={money(selected.stop)} />
                  <Row a="Target 1" b={money(selected.target1)} />
                  <Row a="Target 2" b={money(selected.target2)} />
                  <Row a="Target 3" b={money(selected.target3)} />
                  <Row a="Risk/Reward" b={selected.rr.toFixed(2)} />
                  <Row a="Float" b={`${selected.floatStatus} / ${vol(selected.floatProxy)}`} />
                  <Row a="Catalyst" b={shortTitle(selected.catalyst, 60)} />

                  <div className="actionRow">
                    <button onClick={() => toggleWatchlist(selected.ticker)}>
                      {watchlist.includes(selected.ticker) ? "REMOVE WATCH" : "ADD WATCH"}
                    </button>
                    <button onClick={() => copyProof(selected)}>COPY DISCORD PROOF</button>
                    <button onClick={() => setJournal(journalTemplate(selected))}>LOAD JOURNAL QUESTIONS</button>
                  </div>
                </>
              ) : (
                <p>No ticker selected.</p>
              )}
            </Panel>
          </section>
        )}

        {page === "structure" && (
          <section className="grid2">
            <Panel title="MANUAL STRUCTURE ENGINE">
              <div className="filters">
                <label>
                  Ticker
                  <input value={manualTicker} onChange={(e) => setManualTicker(e.target.value.toUpperCase())} />
                </label>
                <label>
                  Support
                  <input value={manualSupport} onChange={(e) => setManualSupport(Number(e.target.value))} type="number" step="0.0001" />
                </label>
                <label>
                  Resistance
                  <input value={manualResistance} onChange={(e) => setManualResistance(Number(e.target.value))} type="number" step="0.0001" />
                </label>
              </div>

              <Row a="Support Entry" b={money(manualSupportEntry)} />
              <Row a="Middle Entry" b={money(manualMiddleEntry)} />
              <Row a="Breakout Proof Entry" b={money(manualBreakoutProof)} />
              <Row a="Stop / Invalidation" b={money(manualStop)} />
              <Row a="Target 1" b={money(manualTarget1)} />
              <Row a="Target 2" b={money(manualTarget2)} />
              <Row a="Target 3" b={money(manualTarget3)} />
              <Row a="Risk/Reward" b={manualRR.toFixed(2)} />
            </Panel>

            <Panel title="STRUCTURE VERDICT">
              <h3 className={`big ${manualRR >= 2 ? "good" : manualRR >= 1 ? "warn" : "bad"}`}>
                {manualRR >= 2 ? "GOOD R/R" : manualRR >= 1 ? "CAUTION" : "BAD R/R"}
              </h3>
              <p>Resistance does not control entry by itself. Breakout proof waits above resistance.</p>
              <p>{manualTicker || "Ticker"}: wait for {money(manualBreakoutProof)} if using breakout proof.</p>
            </Panel>
          </section>
        )}

        {page === "news" && (
          <section className="grid2">
            <Panel title="LIVE CATALYST RADAR">
              {liveNews.map((n, i) =>
                n.article_url ? (
                  <a
                    className="newsLine newsLink"
                    key={`${n.ticker}-${i}`}
                    href={n.article_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <b>{n.ticker}</b>
                    <span className={catalystClass(n.grade)}>{n.grade}</span>
                    <p>{shortTitle(n.title)}</p>
                    <small>{n.publisher || "NEWS"} · {dateShort(n.published_utc)} · OPEN ARTICLE ↗</small>
                  </a>
                ) : (
                  <div className="newsLine" key={`${n.ticker}-${i}`}>
                    <b>{n.ticker}</b>
                    <span className={catalystClass(n.grade)}>{n.grade}</span>
                    <p>{shortTitle(n.title)}</p>
                    <small>{n.publisher || "NEWS"} · {dateShort(n.published_utc)}</small>
                  </div>
                )
              )}
            </Panel>

            <Panel title="CATALYST RULE">
              <p>News is evidence, not permission. The move still needs speed, volume, spread, and structure.</p>
            </Panel>
          </section>
        )}

        {page === "help" && (
          <>
            <div className="demoNotice">
              <strong>RAW HUNTER MODE — EMPTY LIST MEANS NOTHING QUALIFIED. NO FAKE BACKUP STOCKS.</strong>
            </div>

            <Info
              title="HELP CENTER"
              items={[
                "Action boards only show YES or WAIT names.",
                "Rejected names go to Raw Leaders or Rejected Reasons.",
                "Bottom Ignition now favors support/middle location.",
                "Near resistance means wait above resistance for proof.",
                "Top Gainers is danger-check, not permission.",
                "Best Entry always shows the cleanest number when structure is usable.",
                "Speed, volume, and spread should align before touching anything.",
                "Support breaks = permission revoked.",
                "This is not financial advice."
              ]}
            />

            <Panel title="FUNCTION LIST">
              <div className="functionGrid">
                {functionList.map(([name, desc]) => (
                  <Row key={name} a={name} b={desc} />
                ))}
              </div>
            </Panel>
          </>
        )}

        {page === "glossary" && (
          <Info title="GLOSSARY" items={functionList.map(([name, desc]) => `${name}: ${desc}`)} />
        )}

        {page === "settings" && (
          <Panel title="SETTINGS">
            <div className="filters">
              <label>
                Min Price
                <input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} type="number" step="0.01" />
              </label>
              <label>
                Max Price
                <input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} type="number" step="0.01" />
              </label>
              <label>
                Min Gain %
                <input value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} type="number" />
              </label>
              <label>
                Min Volume
                <input value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} type="number" />
              </label>
              <label>
                Refresh Seconds
                <input value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} type="number" />
              </label>

              <button onClick={() => setRemoveJunk(!removeJunk)}>
                REMOVE JUNK: {removeJunk ? "ON" : "OFF"}
              </button>
              <button onClick={() => setShowTips(!showTips)}>
                {showTips ? "HIDE TIPS" : "SHOW TIPS"}
              </button>
            </div>
          </Panel>
        )}
      </section>

      <style jsx global>{`
        *{box-sizing:border-box}
        body{margin:0;background:#d7d4cc;color:#2e2c27;font-family:Inter,Arial,sans-serif}
        button,input,textarea{font:inherit}
        button{cursor:pointer;border:1px solid #8b826f;background:#efede6;color:#2d2a23;border-radius:14px;padding:10px 12px;font-weight:900;box-shadow:0 2px 0 #9b927f}
        button:hover{transform:translateY(-1px);background:#f8f6ef}
        .app{display:grid;grid-template-columns:250px 1fr;min-height:100vh}
        .sidebar{background:#302c25;color:#f2eadc;padding:22px;border-right:4px solid #9f8b61;position:sticky;top:0;height:100vh;overflow:auto}
        .brand{display:grid;gap:8px;margin-bottom:24px}
        .logo{width:54px;height:54px;border-radius:17px;background:#c7ad72;color:#29251e;display:grid;place-items:center;font-weight:1000;font-size:22px}
        .brand h2{line-height:.9;margin:0}
        .brand p{margin:0;color:#c7ad72;font-weight:900;letter-spacing:2px}
        nav{display:grid;gap:8px}
        nav button{background:#403a31;color:#f5efe1;border-color:#706650;box-shadow:none;text-align:left}
        nav button.active{background:#c7ad72;color:#26221b}
        .sideCard{margin-top:18px;border:1px solid #706650;border-radius:18px;padding:14px;background:#3b352c;display:grid;gap:6px}
        .sideCard small{color:#c7ad72;font-weight:900}
        .sideCard span{font-size:12px;color:#d9d0bd}
        .main{padding:24px;display:grid;gap:18px}
        .hero{display:flex;justify-content:space-between;gap:16px;align-items:center;background:linear-gradient(135deg,#f6f3ea,#c8c0af);border:1px solid #aea38d;border-radius:26px;padding:22px;box-shadow:0 18px 45px rgba(58,51,38,.18)}
        .hero p{margin:0;color:#8c7445;font-weight:1000;letter-spacing:2px}
        .hero h1{margin:3px 0;font-size:40px}
        .hero span{font-weight:800;color:#575146}
        .clock{display:grid;gap:8px;min-width:220px}
        .clock strong{font-size:26px}
        .clock small{font-weight:900;color:#6b6254}
        .modebar,.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
        .modebar button{display:grid;gap:3px;text-align:left}
        .modebar button.active{background:#2f2b25;color:#f1ead9}
        .modebar small{font-size:11px;opacity:.75}
        .stats{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}
        .stat,.panel{background:#eeeae0;border:1px solid #aaa08c;border-radius:22px;padding:16px;box-shadow:0 12px 30px rgba(64,58,45,.12)}
        .stat small,.panel h2{color:#7b6741;font-weight:1000;letter-spacing:1px}
        .stat strong{display:block;font-size:30px;margin-top:4px}
        .panel h2{margin:0 0 12px;font-size:17px}
        .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .gridScan{display:grid;grid-template-columns:1.45fr .8fr;gap:16px}
        .leaderGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .demoNotice{border:1px solid #a8863f;background:#fff4cf;color:#6d5218;border-radius:16px;padding:14px 16px;font-size:14px;letter-spacing:1px}
        .viewBanner{display:flex;justify-content:space-between;gap:14px;align-items:center;border:1px solid #b9aa88;background:#fff8e5;border-radius:16px;padding:12px 14px;font-weight:1000;color:#6d5218}
        .viewBanner.inner{margin-bottom:12px}
        .big{font-size:48px;margin:4px 0}
        .tickerTitle{font-size:36px;margin:0}
        .verdictPill{border-radius:16px;padding:12px;margin:12px 0;font-weight:1000;background:#ded7c8}
        .row{display:grid;grid-template-columns:155px 1fr;gap:10px;border-bottom:1px dashed #b9af99;padding:8px 0;align-items:start}
        .row small{font-weight:1000;color:#6c604d}
        .row span{font-weight:900;overflow-wrap:anywhere}
        .good{color:#137a3e!important}
        .warn{color:#9a6a00!important}
        .bad{color:#b42318!important}
        .tip{border:1px dashed #9f8b61;background:#faf6ea;border-radius:14px;padding:10px;margin:8px 0;color:#5f543f;font-size:13px;font-weight:800}
        .truthHeader{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
        .truthHeader strong{font-size:30px}
        .truthHeader em{font-style:normal;border-radius:999px;background:#ded7c8;padding:8px 10px;font-weight:1000}
        .miniList{display:grid;gap:10px}
        .miniCard{display:grid;grid-template-columns:34px 82px 1fr;gap:8px;align-items:center;text-align:left;background:#faf7ef;border:1px solid #b6aa94;box-shadow:none}
        .miniCard strong{font-size:19px}
        .miniCard .meta{display:flex;flex-wrap:wrap;gap:6px}
        .chip{border-radius:999px;padding:4px 7px;background:#ded7c8;font-size:11px;font-weight:1000}
        .noAction{border:1px dashed #b42318;background:#fff1ef;color:#8d1c13;border-radius:16px;padding:14px;font-weight:1000}
        .tableWrap{overflow:auto;border-radius:16px;border:1px solid #b7ac95}
        table{width:100%;border-collapse:collapse;background:#f7f4ec}
        th,td{padding:10px;border-bottom:1px solid #d0c7b5;text-align:left;font-size:13px;white-space:nowrap}
        th{background:#383229;color:#f3ead8;position:sticky;top:0}
        tr:hover{background:#fff8e8}
        .rowSelected{background:#fff1c2!important}
        .filters{display:grid;gap:10px}
        .filters label{display:grid;gap:5px;font-weight:1000;color:#5c513f}
        .filters input{border:1px solid #9e927c;border-radius:12px;padding:10px;background:#fbf8ef;color:#2e2c27;font-weight:900}
        .actionRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
        .rejectBox{margin-top:14px}
        .newsLine{display:grid;gap:6px;border:1px solid #b7aa92;background:#f7f2e7;border-radius:18px;padding:14px;margin-bottom:10px;color:#2e2c27;text-decoration:none}
        .newsLine b{font-size:20px}
        .newsLine p{margin:0;font-weight:900}
        .newsLine small{font-weight:900;color:#7b6741}
        .newsLink:hover{background:#fff8e7;transform:translateY(-1px)}
        .functionGrid{display:grid;gap:2px}
        .journalBox{display:grid;gap:10px}
        .journalBox textarea{min-height:280px;resize:vertical;border:1px solid #9e927c;border-radius:16px;padding:12px;background:#fbf8ef;color:#2e2c27;font-weight:800;line-height:1.35}
        .journalActions{display:flex;gap:10px;flex-wrap:wrap}

        @media (max-width:1000px){
          .app{grid-template-columns:1fr}
          .sidebar{position:relative;height:auto}
          .grid3,.grid2,.gridScan{grid-template-columns:1fr}
          .hero{display:grid}
          .row{grid-template-columns:1fr}
          .miniCard{grid-template-columns:28px 70px 1fr}
          .viewBanner{display:grid}
        }
      `}</style>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Row({ a, b }: { a: ReactNode; b: ReactNode }) {
  return (
    <div className="row">
      <small>{a}</small>
      <span>{b}</span>
    </div>
  );
}

function Stat({ title, value, tone = "" }: { title: string; value: ReactNode; tone?: string }) {
  return (
    <div className="stat">
      <small>{title}</small>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function Tip({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return <div className="tip">? {text}</div>;
}

function NoAction({ text }: { text: string }) {
  return <div className="noAction">{text}</div>;
}

function TruthHeader({ stock }: { stock?: Stock }) {
  if (!stock) return <p>No ticker loaded.</p>;

  return (
    <div className="truthHeader">
      <strong>{stock.ticker}</strong>
      <em className={verdictClass(stock.verdict)}>{stock.verdict}</em>
    </div>
  );
}

function TruthRows({ stock, plan, showTips }: { stock?: Stock; plan: EntryPlan; showTips: boolean }) {
  if (!stock) return <p>No ticker loaded.</p>;

  return (
    <>
      <Tip show={showTips} text="Best Entry is the cleanest number based on support, middle, or breakout proof." />
      <Row a="Price" b={money(stock.price)} />
      <Row a="Runner Lane" b={stock.runnerLane} />
      <Row a="Gain Band" b={stock.gainBand} />
      <Row a="Runner Score" b={stock.runnerScore} />
      <Row a="Proof Score" b={stock.proofScore} />
      <Row a="BI / GS" b={`${stock.bottomIgnitionScore} / ${stock.gainerStructureScore}`} />
      <Row a="Structure" b={stock.structureLocation} />
      <Row a="Risk Location" b={stock.riskLocation} />
      <Row a="Entry Type" b={plan.entryType} />
      <Row a="Best Entry" b={money(plan.bestEntry)} />
      <Row a="Support Entry" b={money(plan.supportEntry)} />
      <Row a="Middle Entry" b={money(plan.middleEntry)} />
      <Row a="Breakout Proof" b={money(plan.breakoutProofEntry)} />
      <Row a="Wait For" b={plan.waitFor} />
      <Row a="Signals" b={`${plan.alignmentText} aligned`} />
      <Row a="Aligned" b={plan.alignedSignals.join(", ") || "None"} />
      <Row a="Missing" b={plan.missingSignals.join(", ") || "None"} />
      <Row a="Entry Status" b={plan.entryStatus} />
      <Row a="Spread" b={`${stock.spreadStatus}${stock.spreadPct ? ` / ${stock.spreadPct.toFixed(2)}%` : ""}`} />
      <Row a="Volume" b={vol(stock.volume)} />
      <Row a="Speed" b={`${stock.speedLabel} / ${stock.speed}`} />
    </>
  );
}

function Leaderboard({
  title,
  tip,
  stocks,
  kind,
  showTips,
  onPick
}: {
  title: string;
  tip: string;
  stocks: Stock[];
  kind: "BI" | "SPEED" | "VOL" | "PROOF" | "GAIN";
  showTips: boolean;
  onPick: (ticker: string) => void;
}) {
  return (
    <Panel title={title}>
      <Tip show={showTips} text={tip} />
      <MiniList stocks={stocks} kind={kind} onPick={onPick} />
    </Panel>
  );
}

function MiniList({
  stocks,
  kind,
  onPick
}: {
  stocks: Stock[];
  kind: "BI" | "SPEED" | "VOL" | "PROOF" | "GAIN";
  onPick: (ticker: string) => void;
}) {
  if (!stocks.length) return <NoAction text="No actionable names yet." />;

  return (
    <div className="miniList">
      {stocks.map((s, i) => {
        const plan = buildEntryPlan(s);

        const main =
          kind === "BI"
            ? `BI ${s.bottomIgnitionScore}`
            : kind === "SPEED"
              ? `SPD ${s.speed}`
              : kind === "VOL"
                ? vol(s.volume)
                : kind === "PROOF"
                  ? `PRF ${s.proofScore}`
                  : pct(s.gain);

        return (
          <button key={`${kind}-${s.ticker}`} className="miniCard" onClick={() => onPick(s.ticker)}>
            <span>#{i + 1}</span>
            <strong>{s.ticker}</strong>
            <div>
              <div className="meta">
                <span className="chip">{main}</span>
                <span className="chip">{s.verdict}</span>
                <span className="chip">{s.structureLocation}</span>
                <span className="chip">{plan.alignmentText}</span>
              </div>
              <small>{plan.entryType} · {money(plan.bestEntry)}</small>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function JournalPanel({
  selected,
  journal,
  setJournal,
  copyJournal
}: {
  selected?: Stock;
  journal: string;
  setJournal: (v: string) => void;
  copyJournal: () => void;
}) {
  return (
    <Panel title="TRADER JOURNAL">
      <div className="journalBox">
        <p>Answer the questions before acting. This saves in this browser.</p>

        <textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="Ticker:
Why am I watching this?
Best entry number:
What must align before entry?
Support:
Resistance:
What proves me wrong?
Am I chasing?
Exit plan:
Did I follow the scanner?
What did I learn?"
        />

        <div className="journalActions">
          <button onClick={() => setJournal(journalTemplate(selected))}>LOAD QUESTIONS</button>
          <button onClick={copyJournal}>COPY JOURNAL</button>
          <button onClick={() => setJournal("")}>CLEAR</button>
        </div>
      </div>
    </Panel>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel title={title}>
      <div className="functionGrid">
        {items.map((item) => (
          <Row key={item} a="•" b={item} />
        ))}
      </div>
    </Panel>
  );
}
