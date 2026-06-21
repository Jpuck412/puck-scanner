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

function sat(x: number, cap: number): number {
  const safeX = Math.max(0, x);
  return Math.min(1, Math.max(0, Math.log(1 + safeX) / Math.log(1 + cap)));
}

function buildMoverLabel(score: number): MoverLabel {
  if (score < 20) return "DEAD";
  if (score < 40) return "WAKING";
  if (score < 60) return "MOVING";
  if (score < 80) return "FAST MOVER";
  return "EXPLOSIVE MOVER";
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

  const pctChange =
    previousClose && currentPrice > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : 0;

  const openMove =
    openPrice && currentPrice > 0
      ? ((currentPrice - openPrice) / openPrice) * 100
      : 0;

  const hasVelocityData = Boolean(price1mAgo && price3mAgo && price5mAgo);

  const velocity1m = hasVelocityData
    ? ((currentPrice - (price1mAgo as number)) / (price1mAgo as number)) * 100
    : null;

  const velocity3m = hasVelocityData
    ? ((((currentPrice - (price3mAgo as number)) / (price3mAgo as number)) * 100) / 3)
    : null;

  const velocity5m = hasVelocityData
    ? ((((currentPrice - (price5mAgo as number)) / (price5mAgo as number)) * 100) / 5)
    : null;

  const acceleration = hasVelocityData
    ? (velocity1m as number) -
      0.65 * (velocity3m as number) -
      0.35 * (velocity5m as number)
    : null;

  const relativeVolume = averageVolume ? volume / averageVolume : null;
  const dollarVolume = currentPrice * volume;

  const hasSpreadData = Boolean(
    bid && ask && currentPrice > 0 && (ask as number) >= (bid as number)
  );

  const spreadPct = hasSpreadData
    ? (((ask as number) - (bid as number)) / currentPrice) * 100
    : null;

  const gainScore =
    100 * (0.7 * sat(pctChange, 40) + 0.3 * sat(openMove, 20));

  const velocityScore = hasVelocityData
    ? 100 *
      (0.55 * sat(velocity1m as number, 4) +
        0.3 * sat(velocity3m as number, 2.5) +
        0.15 * sat(velocity5m as number, 1.5))
    : 35;

  const accelerationScore = hasVelocityData
    ? 100 * sat(acceleration as number, 3)
    : 35;

  const relVolScore = averageVolume
    ? 100 * sat(relativeVolume as number, 8)
    : 50;

  const dollarVolScore =
    100 *
    clamp(
      (Math.log10(Math.max(dollarVolume, 1)) - Math.log10(25000)) /
        (Math.log10(1000000) - Math.log10(25000)),
      0,
      1
    );

  let spreadScore = 50;

  if (spreadPct !== null) {
    const spreadGood = currentPrice < 1 ? 3 : 1.5;
    const spreadBad = currentPrice < 1 ? 15 : 8;

    spreadScore =
      100 *
      clamp(
        1 - (spreadPct - spreadGood) / (spreadBad - spreadGood),
        0,
        1
      );
  }

  let moverDiscoveryScore =
    0.4 * gainScore +
    0.24 * velocityScore +
    0.23 * accelerationScore +
    0.06 * relVolScore +
    0.04 * dollarVolScore +
    0.03 * spreadScore;

  moverDiscoveryScore = clamp(moverDiscoveryScore, 0, 100);

  const safetyCapped =
    currentPrice < 0.1 ||
    volume < 5000 ||
    dollarVolume < 2500 ||
    (spreadPct !== null && spreadPct > 25);

  if (safetyCapped) {
    moverDiscoveryScore = Math.min(moverDiscoveryScore, 19.99);
  }

  moverDiscoveryScore = clamp(moverDiscoveryScore, 0, 100);

  return {
    pctChange: round(pctChange),
    openMove: round(openMove),
    velocity1m: velocity1m === null ? null : round(velocity1m),
    velocity3m: velocity3m === null ? null : round(velocity3m),
    velocity5m: velocity5m === null ? null : round(velocity5m),
    acceleration: acceleration === null ? null : round(acceleration),
    relativeVolume: relativeVolume === null ? null : round(relativeVolume),
    dollarVolume: round(dollarVolume, 2),
    spreadPct: spreadPct === null ? null : round(spreadPct),
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
