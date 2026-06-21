export type MoverLabel =
  | "DEAD"
  | "WAKING"
  | "MOVING"
  | "FAST MOVER"
  | "EXPLOSIVE MOVER";

export type MoverDiscoveryInput = {
  currentPrice?: number | null;
  previousClose?: number | null;
  openPrice?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  bid?: number | null;
  ask?: number | null;
  price1mAgo?: number | null;
  price3mAgo?: number | null;
  price5mAgo?: number | null;
};

export type MoverDiscoveryResult = {
  pctChange: number;
  openMove: number;
  velocity1m: number | null;
  velocity3m: number | null;
  velocity5m: number | null;
  acceleration: number | null;
  relativeVolume: number | null;
  dollarVolume: number;
  spreadPct: number | null;

  gainScore: number;
  velocityScore: number;
  accelerationScore: number;
  relVolScore: number;
  dollarVolScore: number;
  spreadScore: number;

  moverDiscoveryScore: number;
  moverLabel: MoverLabel;

  safetyCapped: boolean;
  hasVelocityData: boolean;
  hasSpreadData: boolean;
};

function toFiniteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safePct(current: number, previous: number | null): number {
  if (!previous || previous <= 0 || current <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function sat(value: number, cap: number): number {
  const x = Math.max(0, toFiniteNumber(value));
  const c = Math.max(0.000001, toFiniteNumber(cap));

  return clamp(Math.log(1 + x) / Math.log(1 + c), 0, 1);
}

function buildMoverLabel(score: number): MoverLabel {
  if (score < 20) return "DEAD";
  if (score < 40) return "WAKING";
  if (score < 60) return "MOVING";
  if (score < 80) return "FAST MOVER";
  return "EXPLOSIVE MOVER";
}

function buildDollarVolScore(dollarVolume: number): number {
  const low = Math.log10(25_000);
  const high = Math.log10(1_000_000);
  const current = Math.log10(Math.max(dollarVolume, 1));

  return 100 * clamp((current - low) / (high - low), 0, 1);
}

function buildSpreadScore(currentPrice: number, spreadPct: number | null): number {
  if (spreadPct === null) return 50;

  const spreadGood = currentPrice < 1 ? 3 : 1.5;
  const spreadBad = currentPrice < 1 ? 15 : 8;

  return (
    100 *
    clamp(
      1 - (spreadPct - spreadGood) / (spreadBad - spreadGood),
      0,
      1
    )
  );
}

export function buildMoverDiscovery(
  input: MoverDiscoveryInput
): MoverDiscoveryResult {
  const currentPrice = Math.max(0, toFiniteNumber(input.currentPrice));
  const previousClose = toPositiveNumber(input.previousClose);
  const openPrice = toPositiveNumber(input.openPrice);
  const volume = Math.max(0, toFiniteNumber(input.volume));
  const averageVolume = toPositiveNumber(input.averageVolume);

  const bid = toPositiveNumber(input.bid);
  const ask = toPositiveNumber(input.ask);

  const price1mAgo = toPositiveNumber(input.price1mAgo);
  const price3mAgo = toPositiveNumber(input.price3mAgo);
  const price5mAgo = toPositiveNumber(input.price5mAgo);

  const pctChange = safePct(currentPrice, previousClose);
  const openMove = safePct(currentPrice, openPrice);

  const velocity1m = price1mAgo ? safePct(currentPrice, price1mAgo) : null;
  const velocity3m = price3mAgo ? safePct(currentPrice, price3mAgo) / 3 : null;
  const velocity5m = price5mAgo ? safePct(currentPrice, price5mAgo) / 5 : null;

  const hasVelocityData =
    velocity1m !== null && velocity3m !== null && velocity5m !== null;

  const acceleration = hasVelocityData
    ? velocity1m - 0.65 * velocity3m - 0.35 * velocity5m
    : null;

  const relativeVolume = averageVolume ? volume / averageVolume : null;
  const dollarVolume = currentPrice * volume;

  const hasSpreadData = Boolean(
    currentPrice > 0 && bid && ask && ask >= bid
  );

  const spreadPct = hasSpreadData
    ? (((ask as number) - (bid as number)) / currentPrice) * 100
    : null;

  const gainScore =
    100 * (0.82 * sat(pctChange, 45) + 0.18 * sat(openMove, 25));

  const velocityScore = hasVelocityData
    ? 100 *
      (0.6 * sat(velocity1m as number, 4) +
        0.27 * sat(velocity3m as number, 2.5) +
        0.13 * sat(velocity5m as number, 1.5))
    : pctChange > 0
    ? 45
    : 20;

  const accelerationScore = hasVelocityData
    ? 100 * sat(acceleration as number, 3)
    : pctChange > 0
    ? 42
    : 20;

  const relVolScore = relativeVolume !== null
    ? 100 * sat(relativeVolume, 8)
    : 50;

  const dollarVolScore = buildDollarVolScore(dollarVolume);
  const spreadScore = buildSpreadScore(currentPrice, spreadPct);

  let moverDiscoveryScore =
    0.5 * gainScore +
    0.2 * velocityScore +
    0.18 * accelerationScore +
    0.07 * relVolScore +
    0.03 * dollarVolScore +
    0.02 * spreadScore;

  moverDiscoveryScore = clamp(moverDiscoveryScore, 0, 100);

  const safetyCapped =
    currentPrice < 0.1 ||
    volume < 5_000 ||
    dollarVolume < 2_500 ||
    (spreadPct !== null && spreadPct > 25);

  if (safetyCapped) {
    moverDiscoveryScore = Math.min(moverDiscoveryScore, 19.99);
  }

  moverDiscoveryScore = clamp(moverDiscoveryScore, 0, 100);

  return {
    pctChange: round(pctChange, 4),
    openMove: round(openMove, 4),

    velocity1m: velocity1m === null ? null : round(velocity1m, 4),
    velocity3m: velocity3m === null ? null : round(velocity3m, 4),
    velocity5m: velocity5m === null ? null : round(velocity5m, 4),
    acceleration: acceleration === null ? null : round(acceleration, 4),

    relativeVolume: relativeVolume === null ? null : round(relativeVolume, 4),
    dollarVolume: round(dollarVolume, 2),
    spreadPct: spreadPct === null ? null : round(spreadPct, 4),

    gainScore: round(gainScore, 2),
    velocityScore: round(velocityScore, 2),
    accelerationScore: round(accelerationScore, 2),
    relVolScore: round(relVolScore, 2),
    dollarVolScore: round(dollarVolScore, 2),
    spreadScore: round(spreadScore, 2),

    moverDiscoveryScore: round(moverDiscoveryScore, 2),
    moverLabel: buildMoverLabel(moverDiscoveryScore),

    safetyCapped,
    hasVelocityData,
    hasSpreadData
  };
}
