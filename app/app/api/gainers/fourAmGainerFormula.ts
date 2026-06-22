// ============================================================
// FILE: app/api/gainers/fourAmGainerFormula.ts
// PURPOSE: Raw 4AM Hunter Gatherer scoring formula.
// DISCOVERY ONLY. NOT A BUY SIGNAL. NOT PERMISSION.
// ============================================================

type NumericInput = number | string | null | undefined;

export type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
export type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";
export type SpreadStatus = "TIGHT" | "OK" | "WIDE" | "UNKNOWN";

export type FourAmGainerFormulaInput = {
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

export type FourAmGainerFormulaResult = {
  ticker: string;

  price: number;
  previousClose: number;
  gainPct: number;

  premarketVolume: number;
  averagePremarketVolume: number;
  relativePremarketVolume: number;

  bid: number;
  ask: number;
  spread: number;
  spreadPct: number;
  spreadStatus: SpreadStatus;

  hunterScore: number;
  rawHunterScore: number;

  hunterStatus: HunterStatus;
  hunterPhase: HunterPhase;

  isInPreferredGainZone: boolean;
  isExtended: boolean;
  isTradeableSpread: boolean;

  reasons: string[];
  warnings: string[];
};

function num(value: NumericInput): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function cleanTicker(value?: string): string {
  return String(value || "").trim().toUpperCase();
}

function getGainPct(input: FourAmGainerFormulaInput, price: number, previousClose: number): number {
  const supplied = num(input.priorGainPct);

  if (supplied !== 0) return supplied;

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

export function buildFourAmGainerScore(
  input: FourAmGainerFormulaInput
): FourAmGainerFormulaResult {
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

  const gainScore = getGainScore(gainPct);
  const volumeScore = getVolumeScore(premarketVolume);
  const relativeVolumeScore = getRelativeVolumeScore(relativePremarketVolume);
  const spreadScore = getSpreadScore(spreadPct);
  const priceScore = getPriceScore(price);

  const rawHunterScore =
    gainScore +
    volumeScore +
    relativeVolumeScore +
    spreadScore +
    priceScore;

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

export const buildRawHunterScore = buildFourAmGainerScore;
export const scoreFourAmGainer = buildFourAmGainerScore;
export const buildHunterScore = buildFourAmGainerScore;
export const calculateFourAmGainerScore = buildFourAmGainerScore;

export default buildFourAmGainerScore;
