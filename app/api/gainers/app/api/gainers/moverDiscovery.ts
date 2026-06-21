type AnyObj = Record<string, any>;

export type MoverDiscoveryInput = AnyObj;

export type MoverDiscoveryResult = {
  ticker: string;

  currentPrice: number;
  previousClose: number;
  openPrice: number;
  volume: number;
  averageVolume: number;
  bid: number;
  ask: number;

  pctChange: number;
  openMove: number;

  velocity1m: number;
  velocity3m: number;
  velocity5m: number;

  acceleration: number;
  relativeVolume: number;
  spreadPct: number;

  score: number;
  discoveryScore: number;
  moverScore: number;

  verdict: "SCAN" | "WATCH" | "IGNORE";
  isJunk: boolean;
  isDiscoveryCandidate: boolean;
  tags: string[];
};

function finiteOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    const n = finiteOrNull(value);
    if (n !== null) return n;
  }
  return 0;
}

function round(value: number, places = 4): number {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safePercentMove(current: number, base: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base <= 0) return 0;
  return ((current - base) / base) * 100;
}

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export function isJunkTicker(ticker: string): boolean {
  const x = String(ticker || "").toUpperCase().trim();

  if (!x) return true;

  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes("+") ||
    x.includes("-") ||
    x.includes(".")
  );
}

export function normalizeMoverInput(input: MoverDiscoveryInput) {
  const ticker = String(input?.ticker ?? input?.symbol ?? input?.T ?? "").toUpperCase();

  const currentPrice = pickNumber(
    input?.currentPrice,
    input?.price,
    input?.c,
    input?.lastPrice,
    input?.day?.c,
    input?.min?.c,
    input?.lastTrade?.p,
    input?.value,
    0
  );

  const previousClose = pickNumber(
    input?.previousClose,
    input?.prevClose,
    input?.prevDay?.c,
    input?.previous_close,
    currentPrice - pickNumber(input?.todaysChange, 0),
    0
  );

  const openPrice = pickNumber(
    input?.openPrice,
    input?.open,
    input?.o,
    input?.day?.o,
    input?.min?.o,
    currentPrice,
    0
  );

  const volume = pickNumber(
    input?.volume,
    input?.v,
    input?.day?.v,
    input?.min?.v,
    input?.session?.volume,
    0
  );

  const averageVolume = pickNumber(
    input?.averageVolume,
    input?.avgVolume,
    input?.average_volume,
    input?.avg_volume,
    input?.prevDay?.v,
    0
  );

  const bid = pickNumber(
    input?.bid,
    input?.b,
    input?.lastQuote?.p,
    input?.quote?.bid,
    0
  );

  const ask = pickNumber(
    input?.ask,
    input?.a,
    input?.lastQuote?.P,
    input?.quote?.ask,
    0
  );

  const price1mAgo = pickNumber(
    input?.price1mAgo,
    input?.p1,
    input?.history?.price1mAgo,
    currentPrice,
    0
  );

  const price3mAgo = pickNumber(
    input?.price3mAgo,
    input?.p3,
    input?.history?.price3mAgo,
    price1mAgo,
    currentPrice,
    0
  );

  const price5mAgo = pickNumber(
    input?.price5mAgo,
    input?.p5,
    input?.history?.price5mAgo,
    price3mAgo,
    price1mAgo,
    currentPrice,
    0
  );

  return {
    ticker,
    currentPrice,
    previousClose,
    openPrice,
    volume,
    averageVolume,
    bid,
    ask,
    price1mAgo,
    price3mAgo,
    price5mAgo
  };
}

export function calculateMoverDiscovery(input: MoverDiscoveryInput): MoverDiscoveryResult {
  const x = normalizeMoverInput(input);

  const pctChange = safePercentMove(x.currentPrice, x.previousClose);
  const openMove = safePercentMove(x.currentPrice, x.openPrice);

  const velocity1m = safePercentMove(x.currentPrice, x.price1mAgo);
  const velocity3m = safePercentMove(x.currentPrice, x.price3mAgo) / 3;
  const velocity5m = safePercentMove(x.currentPrice, x.price5mAgo) / 5;

  const acceleration =
    velocity1m - ((0.65 * velocity3m) + (0.35 * velocity5m));

  const relativeVolume =
    x.averageVolume > 0 ? x.volume / x.averageVolume : 0;

  const spreadPct =
    x.bid > 0 && x.ask > x.bid && x.currentPrice > 0
      ? ((x.ask - x.bid) / x.currentPrice) * 100
      : 0;

  const isJunk = isJunkTicker(x.ticker);

  const priceInPreferredRange =
    x.currentPrice >= 0.1 && x.currentPrice <= 10;

  const hasBasicVolume =
    x.volume >= 10000;

  const isMovingUp =
    pctChange > 0 || openMove > 0 || velocity1m > 0;

  const pctScore = normalize(pctChange, 0, 60) * 30;
  const openScore = normalize(openMove, 0, 35) * 14;

  const shortVelocity =
    Math.max(velocity1m, velocity3m, velocity5m);

  const velocityScore = normalize(shortVelocity, 0, 5) * 18;
  const accelerationScore = normalize(acceleration, 0, 3) * 14;

  const rvolScore = normalize(relativeVolume, 0, 5) * 8;
  const volumeSafetyScore = normalize(x.volume, 0, 100000) * 4;

  const spreadScore =
    spreadPct <= 0
      ? 4
      : (1 - normalize(spreadPct, 0.25, 3)) * 4;

  const priceScore =
    x.currentPrice >= 0.1 && x.currentPrice <= 5
      ? 6
      : x.currentPrice > 5 && x.currentPrice <= 10
        ? 3
        : -10;

  const junkPenalty = isJunk ? -35 : 0;
  const weakVolumePenalty = hasBasicVolume ? 0 : -8;
  const notMovingPenalty = isMovingUp ? 0 : -20;

  const rawScore =
    pctScore +
    openScore +
    velocityScore +
    accelerationScore +
    rvolScore +
    volumeSafetyScore +
    spreadScore +
    priceScore +
    junkPenalty +
    weakVolumePenalty +
    notMovingPenalty;

  const score = round(clamp(rawScore, 0, 100), 2);

  const isDiscoveryCandidate =
    score >= 35 &&
    isMovingUp &&
    priceInPreferredRange &&
    hasBasicVolume &&
    !isJunk;

  const verdict: MoverDiscoveryResult["verdict"] =
    score >= 70 && isDiscoveryCandidate
      ? "SCAN"
      : score >= 45 && isMovingUp && !isJunk
        ? "WATCH"
        : "IGNORE";

  const tags = [
    pctChange > 0 ? "green_vs_prev_close" : "",
    openMove > 0 ? "green_vs_open" : "",
    velocity1m > 0 ? "positive_1m_velocity" : "",
    acceleration > 0 ? "accelerating" : "",
    relativeVolume >= 2 ? "rvol_active" : "",
    spreadPct > 0 && spreadPct <= 1 ? "spread_reasonable" : "",
    isJunk ? "junk_ticker" : "",
    !priceInPreferredRange ? "outside_price_range" : "",
    !hasBasicVolume ? "thin_volume" : ""
  ].filter(Boolean);

  return {
    ticker: x.ticker,

    currentPrice: round(x.currentPrice),
    previousClose: round(x.previousClose),
    openPrice: round(x.openPrice),
    volume: round(x.volume, 0),
    averageVolume: round(x.averageVolume, 0),
    bid: round(x.bid),
    ask: round(x.ask),

    pctChange: round(pctChange),
    openMove: round(openMove),

    velocity1m: round(velocity1m),
    velocity3m: round(velocity3m),
    velocity5m: round(velocity5m),

    acceleration: round(acceleration),
    relativeVolume: round(relativeVolume),
    spreadPct: round(spreadPct),

    score,
    discoveryScore: score,
    moverScore: score,

    verdict,
    isJunk,
    isDiscoveryCandidate,
    tags
  };
}

export function getMoverDiscoveryScore(input: MoverDiscoveryInput): number {
  return calculateMoverDiscovery(input).score;
}

export function applyMoverDiscovery<T extends AnyObj>(item: T) {
  const moverDiscovery = calculateMoverDiscovery(item);

  return {
    ...item,
    moverDiscovery,
    discoveryScore: moverDiscovery.discoveryScore,
    moverScore: moverDiscovery.moverScore,
    score: moverDiscovery.score,
    discoveryVerdict: moverDiscovery.verdict,
    isDiscoveryCandidate: moverDiscovery.isDiscoveryCandidate
  };
}

export function rankMoverDiscovery<T extends AnyObj>(
  items: T[],
  limit = 10
) {
  return [...items]
    .map((item) => applyMoverDiscovery(item))
    .sort((a, b) => {
      const scoreDiff = b.discoveryScore - a.discoveryScore;
      if (scoreDiff !== 0) return scoreDiff;

      const pctDiff =
        (b.moverDiscovery?.pctChange ?? 0) -
        (a.moverDiscovery?.pctChange ?? 0);

      if (pctDiff !== 0) return pctDiff;

      return (
        (b.moverDiscovery?.acceleration ?? 0) -
        (a.moverDiscovery?.acceleration ?? 0)
      );
    })
    .slice(0, limit);
}

export const analyzeMoverDiscovery = calculateMoverDiscovery;
export const calculateDiscoveryScore = getMoverDiscoveryScore;
export const getDiscoveryScore = getMoverDiscoveryScore;
export const moverDiscoveryScore = getMoverDiscoveryScore;
export const scoreMoverDiscovery = getMoverDiscoveryScore;

export const discoverMovers = rankMoverDiscovery;
export const rankMovers = rankMoverDiscovery;

export const moverDiscovery = {
  normalizeMoverInput,
  calculateMoverDiscovery,
  analyzeMoverDiscovery,
  getMoverDiscoveryScore,
  applyMoverDiscovery,
  rankMoverDiscovery,
  rankMovers,
  discoverMovers,
  isJunkTicker
};

export default moverDiscovery;
