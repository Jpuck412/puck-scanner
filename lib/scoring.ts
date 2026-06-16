import { Symbol, MarketData, Structure, Lifecycle, Verdict, Evidence } from "./types";

// ============================================================
// SPREAD SCORE: Tightness of bid-ask spread
// ============================================================

export function calculateSpreadScore(quote: { bid: number; ask: number; price: number }): number {
  if (quote.price === 0) return 0;
  const spread = quote.ask - quote.bid;
  const spreadPercent = (spread / quote.price) * 100;

  if (spreadPercent < 0.01) return 100; // Excellent
  if (spreadPercent < 0.05) return 90;
  if (spreadPercent < 0.1) return 80;
  if (spreadPercent < 0.2) return 70;
  if (spreadPercent < 0.5) return 50;
  if (spreadPercent < 1.0) return 30;
  return 10; // Poor
}

// ============================================================
// SPEED SCORE: Rate of price change
// ============================================================

export function calculateSpeedScore(data: MarketData, change: number): number {
  const dayGain = ((data.day.close - data.day.open) / data.day.open) * 100;
  const premarketGain = data.premarket ? ((data.premarket.close - data.previousDay.close) / data.previousDay.close) * 100 : 0;

  let score = 0;
  score += Math.min(50, Math.max(0, dayGain * 5));
  score += Math.min(30, Math.max(0, premarketGain * 3));
  score += Math.min(20, Math.abs(change) * 2);

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// VOLUME ACCELERATION SCORE: Relative volume increase
// ============================================================

export function calculateVolumeAccelerationScore(current: number, average: number): number {
  if (average === 0) return 0;
  const ratio = current / average;

  if (ratio >= 10) return 100;
  if (ratio >= 8) return 95;
  if (ratio >= 6) return 90;
  if (ratio >= 4) return 80;
  if (ratio >= 3) return 70;
  if (ratio >= 2) return 60;
  if (ratio >= 1.5) return 45;
  if (ratio >= 1.2) return 30;
  if (ratio >= 1.0) return 15;
  return 0;
}

// ============================================================
// FLOAT SCORE: Float availability and size
// ============================================================

export function calculateFloatScore(volume: number, volumeAvg: number): number {
  const ratio = volume / Math.max(volumeAvg, 1);

  // Assess float quality based on daily volume
  if (volume >= 50_000_000) return 100; // Excellent liquidity
  if (volume >= 20_000_000) return 90;
  if (volume >= 10_000_000) return 80;
  if (volume >= 5_000_000) return 70;
  if (volume >= 2_000_000) return 60;
  if (volume >= 1_000_000) return 50;
  if (volume >= 500_000) return 40;
  if (volume >= 250_000) return 25;
  if (volume >= 100_000) return 10;
  return 0;
}

// ============================================================
// SUPPORT SCORE: Quality of support level
// ============================================================

export function calculateSupportScore(structure: Structure, data: MarketData): number {
  const distanceFromSupport = data.quote.price - structure.support;
  const rangeHeight = structure.resistance - structure.support;

  if (rangeHeight === 0) return 0;

  const supportProximity = (distanceFromSupport / rangeHeight) * 100;

  if (supportProximity < 5) return 100; // Price at support
  if (supportProximity < 15) return 85;
  if (supportProximity < 25) return 70;
  if (supportProximity < 40) return 50;
  if (supportProximity < 60) return 30;
  return 10; // Price away from support
}

// ============================================================
// CATALYST SCORE: News and event strength
// ============================================================

export function calculateCatalystScore(catalysts: { type: string; sentiment: "positive" | "negative" }[]): number {
  if (catalysts.length === 0) return 25; // Neutral

  let score = 0;
  const positiveCount = catalysts.filter((c) => c.sentiment === "positive").length;
  const negativeCount = catalysts.filter((c) => c.sentiment === "negative").length;

  score += Math.min(60, positiveCount * 20);
  score -= Math.min(40, negativeCount * 15);

  return Math.min(100, Math.max(0, score + 25));
}

// ============================================================
// FORMATION SCORE: Quality of price formation
// ============================================================

export function calculateFormationScore(
  structure: Structure,
  data: MarketData,
  spreadScore: number,
  supportScore: number
): number {
  let score = 0;

  // Support strength carries more weight than resistance
  score += supportScore * 0.5;

  // Price action at resistance
  const priceAboveResistance = data.quote.price > structure.resistance;
  score += priceAboveResistance ? 25 : 10;

  // Spread quality
  score += spreadScore * 0.25;

  // Range formation quality
  const rangeHeight = structure.resistance - structure.support;
  if (rangeHeight > 0 && rangeHeight < data.quote.price * 0.1) score += 10; // Tight range

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// JOURNEY SCORE: Rank history and progression
// ============================================================

export function calculateJourneyScore(rankHistory: number[], scoreHistory: number[]): number {
  if (rankHistory.length < 2) return 50;

  let score = 50;

  // Track improvement over last 5 scans
  const recentRanks = rankHistory.slice(-5);
  const improving = recentRanks[recentRanks.length - 1] < recentRanks[0];
  const acceleration = recentRanks.every((r, i) => i === 0 || r <= recentRanks[i - 1]);

  if (improving) score += 20;
  if (acceleration) score += 20;

  // Check for consistent presence
  if (rankHistory.length >= 10) score += 10;

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// PROOF SCORE: Evidence of runner formation
// ============================================================

export function calculateProofScore(
  spreadScore: number,
  speedScore: number,
  volumeAccel: number,
  supportScore: number,
  structure: Structure,
  data: MarketData
): number {
  let score = 0;

  // Primary factors
  score += spreadScore * 0.15;
  score += speedScore * 0.15;
  score += volumeAccel * 0.15;
  score += supportScore * 0.15;

  // Structure proof
  const priceAboveResistance = data.quote.price > structure.resistance;
  score += priceAboveResistance ? 20 : 5;

  // Risk/reward ratio
  if (structure.riskReward >= 2) score += 15;
  else if (structure.riskReward >= 1.5) score += 10;
  else if (structure.riskReward >= 1) score += 5;

  // Rejection check: price not overextended
  const maxPrice = Math.max(...[data.day.high, data.premarket?.high || 0]);
  const gainFromEntry = ((maxPrice - structure.proofEntry) / structure.proofEntry) * 100;
  if (gainFromEntry > 75) score -= 20; // Too late

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// ELITE SCORE: Final ranking formula
// ============================================================

export function calculateEliteScore(
  spreadScore: number,
  speedScore: number,
  volumeAccel: number,
  floatScore: number,
  supportScore: number,
  catalystScore: number,
  environmentScore: number,
  journeyScore: number
): number {
  const score =
    spreadScore * 0.2 +
    speedScore * 0.2 +
    volumeAccel * 0.2 +
    floatScore * 0.1 +
    supportScore * 0.1 +
    catalystScore * 0.1 +
    environmentScore * 0.1 +
    journeyScore * 0.1;

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// VERDICT: YES / WAIT / NO
// ============================================================

export function calculateVerdict(eliteScore: number, environmentScore: number): Verdict {
  const adjustedScore = eliteScore * 0.8 + environmentScore * 0.2;

  if (adjustedScore >= 75) return "YES";
  if (adjustedScore >= 55) return "WAIT";
  return "NO";
}

// ============================================================
// LIFECYCLE CLASSIFICATION
// ============================================================

export function classifyLifecycle(
  rankHistory: number[],
  scoreHistory: number[],
  lifecycleHistory: Lifecycle[],
  proofScore: number,
  speedScore: number,
  volumeAccel: number
): Lifecycle {
  if (rankHistory.length === 0) return "SLEEPING";

  const currentProof = proofScore;
  const currentSpeed = speedScore;
  const currentVolume = volumeAccel;
  const recentLifecycle = lifecycleHistory[lifecycleHistory.length - 1];

  // Assess stage progression
  if (currentProof < 30) return "SLEEPING";
  if (currentProof < 45) return "ACCUMULATING";
  if (currentProof < 55 && currentSpeed < 40) return "WAKING";
  if (currentProof >= 55 && currentProof < 70) return "FORMING";
  if (currentProof >= 70 && currentSpeed >= 50 && currentVolume >= 50) return "IGNITING";
  if (currentSpeed >= 60 && currentVolume >= 60 && currentProof >= 75) return "RUNNING";
  if (currentSpeed > 75 && currentProof > 80) return "EXTENDED";
  if (currentProof < 40 && recentLifecycle && ["RUNNING", "EXTENDED", "IGNITING"].includes(recentLifecycle)) return "FAILING";

  return recentLifecycle || "WAKING";
}

// ============================================================
// EVIDENCE GENERATION
// ============================================================

export function generateEvidence(
  symbol: Partial<Symbol>,
  spreadScore: number,
  speedScore: number,
  volumeAccel: number,
  supportScore: number,
  environmentScore: number
): Evidence {
  const positive: string[] = [];
  const negative: string[] = [];

  // Positive Evidence
  if (spreadScore >= 80) positive.push("Spread tightening");
  if (speedScore >= 70) positive.push("Speed accelerating");
  if (volumeAccel >= 70) positive.push("Volume accelerating");
  if (supportScore >= 75) positive.push("Support holding strong");
  if (environmentScore >= 70) positive.push("Market environment favorable");
  if (symbol.structure?.riskReward && symbol.structure.riskReward >= 2) positive.push("Risk/reward above 2:1");

  // Negative Evidence
  if (spreadScore < 40) negative.push("Spread widening (warning sign)");
  if (speedScore < 30) negative.push("Speed stalling");
  if (volumeAccel < 30) negative.push("Volume declining");
  if (supportScore < 40) negative.push("Support breaking down");
  if (environmentScore < 40) negative.push("Market environment challenging");

  return {
    positive,
    negative,
    supportQuality: supportScore >= 75 ? "Strong" : supportScore >= 50 ? "Moderate" : "Weak",
    resistanceQuality: symbol.structure?.resistance ? "Defined" : "Unclear",
    spreadBehavior: spreadScore >= 80 ? "Tightening" : spreadScore >= 50 ? "Normal" : "Widening",
    speedBehavior: speedScore >= 70 ? "Accelerating" : speedScore >= 40 ? "Steady" : "Slowing",
    volumeBehavior: volumeAccel >= 70 ? "Accelerating" : volumeAccel >= 40 ? "Steady" : "Declining",
    catalystAnalysis: "Monitor for catalysts",
    environmentAnalysis: environmentScore >= 70 ? "Favorable" : environmentScore >= 40 ? "Neutral" : "Challenging",
  };
}
