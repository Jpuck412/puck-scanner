type NumericInput = number | string | null | undefined;

export type FourAmGainerFormulaInput = {
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
  hunterStatus: HunterStatus;
  hunterPhase: HunterPhase;
  rawHunterScore: number;
  percentMoveScore: number;
  volumeScore: number;
  relativeVolumeScore: number;
  spreadScore: number;
  priceScore: number;
  phaseBonus: number;
  extensionPenalty: number;
  junkPenalty: number;
  isCandidate: boolean;
  rankKey: number;
  percentRankKey: number;
  reasons: string[];
  warnings: string[];
};

function asNumber(value: NumericInput): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, places = 4): number {
  const p = Math.pow(10, places);
  return Math.round(asNumber(value) * p) / p;
}

function cleanTicker(value: string | undefined): string {
  return String(value || "").trim().toUpperCase();
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
        spreadStatus: "TIGHT" as SpreadStatus,
        spreadScore: 12
      };
    }

    if (spreadPct <= 2.5) {
      return {
        spread,
        spreadPct,
        spreadStatus: "OK" as SpreadStatus,
        spreadScore: 5
      };
    }

    return {
      spread,
      spreadPct,
      spreadStatus: "WIDE" as SpreadStatus,
      spreadScore: -18
    };
  }

  return {
    spread: 0,
    spreadPct: 0,
    spreadStatus: "UNKNOWN" as SpreadStatus,
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

export function buildFourAmGainerFormula(
  input: FourAmGainerFormulaInput
): FourAmGainerFormulaResult {
  const ticker = cleanTicker(input.ticker || input.symbol);
  const price = asNumber(input.currentPremarketPrice || input.price);
  const previousClose = asNumber(input.previousClose);
  const suppliedGainPct = asNumber(input.priorGainPct);

  const gainPct =
    suppliedGainPct ||
    (price > 0 && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0);

  const premarketVolume = asNumber(input.premarketVolume);
  const averagePremarketVolume = asNumber(input.averagePremarketVolume);
  const relativePremarketVolume =
    averagePremarketVolume > 0 ? premarketVolume / averagePremarketVolume : 0;

  const bid = asNumber(input.bid);
  const ask = asNumber(input.ask);
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
    gainPct >= 1000
      ? -100
      : gainPct > 150
      ? -60
      : gainPct > 65
      ? -28
      : 0;

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
  if (relativePremarketVolume >= 2) reasons.push("RELATIVE_PREMARKET_VOLUME_EXPANSION");
  if (spread.spreadStatus === "TIGHT" || spread.spreadStatus === "OK") reasons.push("SPREAD_TRACKABLE");
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
    rankKey: round(rawHunterScore * 1000000 + gainPct * 1000 + premarketVolume / 100000, 2),
    percentRankKey: round(gainPct * 1000000 + rawHunterScore * 1000 + premarketVolume / 100000, 2),
    reasons,
    warnings
  };
}
