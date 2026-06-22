// ============================================================
// FILE: app/api/gainers/fourAmGainerFormula.ts
// PURPOSE:
// Raw 4AM Hunter Gatherer formula.
// This is discovery only.
// This is NOT a buy signal.
// This is NOT permission.
// This does NOT fake support/resistance confirmation.
// ============================================================

type NumericInput = number | string | null | undefined;

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

  firstSeenAt?: string | number | Date | null;
  lastUpdatedAt?: string | number | Date | null;
};

export type HunterStatus = "CLIMBING" | "FLAT" | "FADING";

export type HunterPhase =
  | "BELOW_RADAR"
  | "CLIMBER"
  | "ESTABLISHED"
  | "EXTENDED_HOT";

export type SpreadStatus = "TIGHT" | "OK" | "WIDE" | "UNKNOWN";

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

function toNumber(value: NumericInput): number {
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

function cleanTicker(input?: string): string {
  return String(input || "")
    .trim()
    .toUpperCase();
}

function getGainPct(input: FourAmGainerFormulaInput, price: number, previousClose: number): number {
  const suppliedGain = toNumber(input.priorGainPct);

  if (Number.isFinite(suppliedGain) && suppliedGain !== 0) {
    return suppliedGain;
  }

  if (price > 0 && previousClose > 0) {
    return ((price - previousClose) / previousClose) * 100;
  }

  return 0;
}

function getGainZoneScore(gainPct: number): number {
  // Your desired zone:
  // Not 1000% garbage.
  // Find 20%, 35%, 65% type runners before the whole market is piled in.

  if (gainPct < 5) return 0;
  if (gainPct < 15) return 6;
  if (gainPct < 20) return 12;
  if (gainPct <= 35) return 24;
  if (gainPct <= 65) return 30;
  if (gainPct <= 85) return 24;
  if (gainPct <= 120) return 10;

  // Overextended penalty zone.
  return -15;
}

function getVolumeScore(premarketVolume: number): number {
  if (premarketVolume >= 5_000_000) return 20;
  if (premarketVolume >= 2_000_000) return 18;
  if (premarketVolume >= 1_000_000) return 15;
  if (premarketVolume >= 500_000) return 12;
  if (premarketVolume >= 250_000) return 9;
  if (premarketVolume >= 100_000) return 6;
  if (premarketVolume >= 50_000) return 3;
  return 0;
}

function getRelativeVolumeScore(relativeVolume: number): number {
  if (relativeVolume >= 10) return 15;
  if (relativeVolume >= 5) return 12;
  if (relativeVolume >= 3) return 9;
  if (relativeVolume >= 2) return 6;
  if (relativeVolume >= 1) return 3;
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
  // Small-cap / low-price preference.
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

function getHunterStatus(gainPct: number, relativeVolume: number, spreadPct: number): HunterStatus {
  if (gainPct >= 15 && gainPct <= 85 && relativeVolume >= 2 && spreadPct > 0 && spreadPct <= 2.5) {
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
    toNumber(input.currentPremarketPrice) ||
    toNumber(input.price);

  const previousClose = toNumber(input.previousClose);

  const gainPct = getGainPct(input, price, previousClose);

  const premarketVolume =
    toNumber(input.premarketVolume) ||
    toNumber(input.volume);

  const averagePremarketVolume =
    toNumber(input.averagePremarketVolume) ||
    toNumber(input.averageVolume);

  const relativePremarketVolume =
    averagePremarketVolume > 0
      ? premarketVolume / averagePremarketVolume
      : 0;

  const bid = toNumber(input.bid);
  const ask = toNumber(input.ask);

  const spread = ask > 0 && bid > 0 ? ask - bid : 0;

  const spreadPct =
    price > 0 && spread > 0
      ? (spread / price) * 100
      : 0;

  const spreadStatus = getSpreadStatus(spreadPct);

  const gainZoneScore = getGainZoneScore(gainPct);
  const volumeScore = getVolumeScore(premarketVolume);
  const relativeVolumeScore = getRelativeVolumeScore(relativePremarketVolume);
  const spreadScore = getSpreadScore(spreadPct);
  const priceScore = getPriceScore(price);

  const rawScore =
    gainZoneScore +
    volumeScore +
    relativeVolumeScore +
    spreadScore +
    priceScore;

  const hunterScore = clamp(rawScore, 0, 100);

  const hunterPhase = getHunterPhase(gainPct);
  const hunterStatus = getHunterStatus(gainPct, relativePremarketVolume, spreadPct);

  const isInPreferredGainZone = gainPct >= 15 && gainPct <= 85;
  const isExtended = gainPct > 120;
  const isTradeableSpread = spreadPct > 0 && spreadPct <= 2.5;

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (isInPreferredGainZone) {
    reasons.push("Preferred gain zone: 15% to 85%");
  }

  if (gainPct >= 20 && gainPct <= 65) {
    reasons.push("Prime hunter zone: 20% to 65%");
  }

  if (premarketVolume >= 100_000) {
    reasons.push("Premarket volume present");
  }

  if (relativePremarketVolume >= 2) {
    reasons.push("Relative premarket volume elevated");
  }

  if (spreadStatus === "TIGHT") {
    reasons.push("Spread is tight by percentage");
  }

  if (spreadStatus === "OK") {
    reasons.push("Spread is acceptable but needs caution");
  }

  if (price >= 0.1 && price <= 5) {
    reasons.push("Price is inside small-cap hunter range");
  }

  if (!ticker) {
    warnings.push("Missing ticker");
  }

  if (price <= 0) {
    warnings.push("Missing or invalid price");
  }

  if (previousClose <= 0 && gainPct === 0) {
    warnings.push("Missing previous close or gain percent");
  }

  if (premarketVolume <= 0) {
    warnings.push("Missing premarket volume");
  }

  if (spreadStatus === "UNKNOWN") {
    warnings.push("Spread unknown");
  }

  if (spreadStatus === "WIDE") {
    warnings.push("Spread is wide");
  }

  if (isExtended) {
    warnings.push("Gain is extended above 120%; possible late runner or trap");
  }

  if (gainPct < 15) {
    warnings.push("Below preferred hunter gain zone");
  }

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
    rawHunterScore: round(hunterScore, 2),

    hunterStatus,
    hunterPhase,

    isInPreferredGainZone,
    isExtended,
    isTradeableSpread,

    reasons,
    warnings,
  };
}

// Compatibility aliases.
// These help if route.ts imports a slightly different function name.
export const buildRawHunterScore = buildFourAmGainerScore;
export const scoreFourAmGainer = buildFourAmGainerScore;
export const buildHunterScore = buildFourAmGainerScore;

export default buildFourAmGainerScore;
