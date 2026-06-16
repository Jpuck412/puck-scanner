// ============================================================
// CORE MARKET DATA TYPES
// ============================================================

export type Lifecycle =
  | "SLEEPING"
  | "ACCUMULATING"
  | "WAKING"
  | "FORMING"
  | "IGNITING"
  | "RUNNING"
  | "EXTENDED"
  | "FAILING";

export type Verdict = "YES" | "WAIT" | "NO";
export type SpreadStatus = "PASS" | "CAUTION" | "FAIL";
export type EnvironmentSignal = "GREEN" | "YELLOW" | "RED";

// ============================================================
// LIVE MARKET DATA
// ============================================================

export interface Quote {
  ticker: string;
  price: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  volume: number;
  volumeAvg: number;
  timestamp: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface MarketData {
  quote: Quote;
  day: Candle;
  premarket?: Candle;
  previousDay: Candle;
  historicalVWAP: number[];
}

// ============================================================
// STRUCTURE ANALYSIS
// ============================================================

export interface Structure {
  support: number;
  resistance: number;
  rangePosition: number; // 0-1: where price sits in range
  aggressiveEntry: number;
  confirmationEntry: number;
  proofEntry: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  riskReward: number;
}

// ============================================================
// SCORING ENGINE
// ============================================================

export interface Scores {
  spreadScore: number;
  speedScore: number;
  volumeAccelerationScore: number;
  floatScore: number;
  supportScore: number;
  catalystScore: number;
  environmentScore: number;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  eliteScore: number;
}

export interface Evidence {
  positive: string[];
  negative: string[];
  supportQuality: string;
  resistanceQuality: string;
  spreadBehavior: string;
  speedBehavior: string;
  volumeBehavior: string;
  catalystAnalysis: string;
  environmentAnalysis: string;
}

// ============================================================
// SYMBOL ANALYSIS
// ============================================================

export interface Symbol {
  ticker: string;
  marketData: MarketData;
  structure: Structure;
  scores: Scores;
  lifecycle: Lifecycle;
  verdict: Verdict;
  rejection?: string;
  evidence: Evidence;
  firstSeen: number;
  lastUpdated: number;
  rankHistory: number[];
  scoreHistory: number[];
  lifecycleHistory: Lifecycle[];
}

// ============================================================
// MARKET ENVIRONMENT
// ============================================================

export interface IndexData {
  symbol: string;
  price: number;
  gain: number;
  volume: number;
  premarket?: number;
}

export interface SectorStrength {
  sector: string;
  gain: number;
  count: number;
  advancing: number;
  declining: number;
}

export interface MarketEnvironment {
  spy: IndexData;
  qqq: IndexData;
  iwm: IndexData;
  vix: IndexData;
  breadth: {
    advancingVolume: number;
    decliningVolume: number;
    upDownRatio: number;
  };
  sectorStrength: SectorStrength[];
  premarketParticipation: number;
  newsRisk: string[];
  spreadEnvironment: "TIGHT" | "NORMAL" | "WIDE";
  marketRegime: "BULLISH" | "NEUTRAL" | "BEARISH";
  environmentScore: number;
  signal: EnvironmentSignal;
}

// ============================================================
// WATCHLIST
// ============================================================

export interface WatchlistItem {
  ticker: string;
  notes: string;
  addedAt: number;
  alerts: {
    priceAbove?: number;
    priceBelow?: number;
    volumeAbove?: number;
    lifecycleChange?: Lifecycle[];
  };
}

// ============================================================
// JOURNAL
// ============================================================

export interface JournalEntry {
  id: string;
  date: string;
  time: string;
  ticker: string;
  entry: number;
  exit?: number;
  reason: string;
  evidence: string;
  mistake: string;
  lesson: string;
  outcome: "WIN" | "LOSS" | "BREAKEVEN" | "OPEN";
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// UI STATE
// ============================================================

export type Page =
  | "dashboard"
  | "scanner"
  | "formation"
  | "lifecycle"
  | "intelligence"
  | "structure"
  | "watchlist"
  | "journal"
  | "settings";

export interface ScannerFilters {
  minPrice: number;
  maxPrice: number;
  minGain: number;
  maxGain: number;
  minVolume: number;
  minSpread: number;
  minFloat: number;
  lifecycle?: Lifecycle;
  verdict?: Verdict;
  environmentFilter?: EnvironmentSignal;
}

export interface ScannerSettings {
  autoScan: boolean;
  refreshSec: number;
  sortBy: "elite" | "formation" | "journey" | "proof" | "catalyst" | "environment";
  filters: ScannerFilters;
}

export interface AppSettings {
  theme: "dark" | "light";
  refreshRate: number;
  marketHours: "premarket" | "regular" | "afterhours";
  autoScroll: boolean;
  saveLayout: boolean;
  showRejected: boolean;
}
