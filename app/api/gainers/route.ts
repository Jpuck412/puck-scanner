// app/api/gainers/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "polygon-raw-hunter-elite5";

type AnyObj = Record<string, unknown>;
type NumericInput = number | string | null | undefined;

type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";
type SpreadStatus = "TIGHT" | "OK" | "WIDE" | "UNKNOWN";

type FourAmGainerFormulaInput = {
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

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function buildFourAmGainerFormula(input: FourAmGainerFormulaInput) {
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
      rawHunterScore * 1_000_000 + gainPct * 1000 + premarketVolume / 100000,
      2
    ),
    percentRankKey: round(
      gainPct * 1_000_000 + rawHunterScore * 1000 + premarketVolume / 100000,
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

  const formula = buildFourAmGainerFormula({
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
        purpose: "Locate live 4AM/premarket gainers and climbers",
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
      purpose: "Locate live 4AM/premarket gainers and climbers",
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
