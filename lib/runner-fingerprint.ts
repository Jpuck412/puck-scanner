export type HistoricalBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Fingerprint = {
  time: string;
  price: number;
  return1: number;
  return5: number;
  volumeRatio: number;
  volumeAcceleration: number;
  rangePct: number;
  compression: number;
  higherLow: boolean;
  higherHigh: boolean;
  vwapDistancePct: number;
  breakoutProximityPct: number;
};

export type PatternEvent = {
  timestamp: string;
  eventPrice: number;
  maxMove5m: number;
  maxMove15m: number;
  maxMove30m: number;
  fingerprint: Fingerprint;
  outcome: "EXPANSION" | "FAILURE";
};

const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

export function normalizeAlphaVantage(payload: any): HistoricalBar[] {
  const series = payload?.["Time Series (5min)"] ?? {};
  return Object.entries(series)
    .map(([timestamp, value]: [string, any]) => ({
      timestamp,
      open: n(value?.["1. open"]),
      high: n(value?.["2. high"]),
      low: n(value?.["3. low"]),
      close: n(value?.["4. close"]),
      volume: n(value?.["5. volume"])
    }))
    .filter(b => b.close > 0)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function avg(values: number[]) {
  return values.length ? values.reduce((a,b)=>a+b,0) / values.length : 0;
}

function vwap(bars: HistoricalBar[]) {
  let pv = 0, volume = 0;
  for (const b of bars) {
    const typical = (b.high + b.low + b.close) / 3;
    pv += typical * b.volume;
    volume += b.volume;
  }
  return volume ? pv / volume : 0;
}

export function fingerprintAt(bars: HistoricalBar[], i: number): Fingerprint | null {
  if (i < 6 || i >= bars.length) return null;
  const b = bars[i];
  const b1 = bars[i-1];
  const last5 = bars.slice(i-4, i+1);
  const prev5 = bars.slice(i-9, i-4);
  const recentRange = Math.max(...last5.map(x=>x.high)) - Math.min(...last5.map(x=>x.low));
  const prevRange = Math.max(...prev5.map(x=>x.high)) - Math.min(...prev5.map(x=>x.low));
  const recentVol = avg(last5.map(x=>x.volume));
  const prevVol = avg(prev5.map(x=>x.volume));
  const ret1 = b1.close ? (b.close / b1.close - 1) * 100 : 0;
  const ret5 = bars[i-5].close ? (b.close / bars[i-5].close - 1) * 100 : 0;
  const volRatio = prevVol ? recentVol / prevVol : 0;
  const volumeAcceleration = prevVol ? (recentVol - prevVol) / prevVol * 100 : 0;
  const rangePct = b.close ? recentRange / b.close * 100 : 0;
  const compression = prevRange ? Math.max(0, Math.min(100, (1 - recentRange / prevRange) * 100)) : 0;
  const priorLow = Math.min(...bars.slice(i-5,i).map(x=>x.low));
  const priorHigh = Math.max(...bars.slice(i-5,i).map(x=>x.high));
  const dayVwap = vwap(bars.slice(0, i+1));
  return {
    time: b.timestamp,
    price: b.close,
    return1: ret1,
    return5: ret5,
    volumeRatio: volRatio,
    volumeAcceleration,
    rangePct,
    compression,
    higherLow: b.low > priorLow,
    higherHigh: b.high > priorHigh,
    vwapDistancePct: dayVwap ? (b.close / dayVwap - 1) * 100 : 0,
    breakoutProximityPct: priorHigh ? (priorHigh / b.close - 1) * 100 : 0
  };
}

export function findExpansionEvents(bars: HistoricalBar[], minMovePct = 8): PatternEvent[] {
  const events: PatternEvent[] = [];
  for (let i=12; i<bars.length-6; i++) {
    const fp = fingerprintAt(bars, i);
    if (!fp) continue;
    const base = bars[i].close;
    const future = bars.slice(i+1, Math.min(bars.length, i+7));
    const move5 = future.length ? (Math.max(...future.map(x=>x.high)) / base - 1) * 100 : 0;
    const future15 = bars.slice(i+1, Math.min(bars.length, i+16));
    const move15 = future15.length ? (Math.max(...future15.map(x=>x.high)) / base - 1) * 100 : 0;
    const future30 = bars.slice(i+1, Math.min(bars.length, i+31));
    const move30 = future30.length ? (Math.max(...future30.map(x=>x.high)) / base - 1) * 100 : 0;
    const fail5 = future.length ? (Math.min(...future.map(x=>x.low)) / base - 1) * 100 : 0;
    if (move15 >= minMovePct || fail5 <= -5) {
      events.push({
        timestamp: bars[i].timestamp,
        eventPrice: base,
        maxMove5m: move5,
        maxMove15m: move15,
        maxMove30m: move30,
        fingerprint: fp,
        outcome: move15 >= minMovePct ? "EXPANSION" : "FAILURE"
      });
    }
  }
  return events;
}

export function similarity(a: Fingerprint, b: Fingerprint): number {
  const features: Array<[number, number, number]> = [
    [a.return1,b.return1,1],
    [a.return5,b.return5,2],
    [a.volumeRatio,b.volumeRatio,2],
    [a.volumeAcceleration,b.volumeAcceleration,1],
    [a.rangePct,b.rangePct,1],
    [a.compression,b.compression,1.5],
    [a.vwapDistancePct,b.vwapDistancePct,1],
    [a.breakoutProximityPct,b.breakoutProximityPct,2]
  ];
  let score=0, weight=0;
  for (const [x,y,w] of features) {
    const scale = Math.max(1, Math.abs(y), Math.abs(x));
    score += Math.max(0, 1 - Math.abs(x-y)/scale) * w;
    weight += w;
  }
  score += a.higherLow === b.higherLow ? 1.5 : 0;
  score += a.higherHigh === b.higherHigh ? 1.5 : 0;
  weight += 3;
  return Math.round(score / weight * 100);
}

export function summarize(events: PatternEvent[], current: Fingerprint) {
  const ranked = events
    .map(e => ({...e, similarity: similarity(current, e.fingerprint)}))
    .sort((a,b)=>b.similarity-a.similarity);
  const sample = ranked.slice(0, Math.min(25, ranked.length));
  const expansions = sample.filter(x=>x.outcome==="EXPANSION");
  const failures = sample.filter(x=>x.outcome==="FAILURE");
  const mean = (xs: PatternEvent[]) => xs.length ? avg(xs.map(x=>x.maxMove15m)) : 0;
  return {
    sampleSize: sample.length,
    expansionCount: expansions.length,
    failureCount: failures.length,
    expansionRate: sample.length ? Math.round(expansions.length/sample.length*100) : 0,
    avgMove15m: Number(mean(expansions).toFixed(2)),
    avgFailure5m: failures.length ? Number(avg(failures.map(x=>Math.min(x.maxMove5m, 0))).toFixed(2)) : 0,
    matches: sample.slice(0,5).map(x=>({
      timestamp:x.timestamp,
      similarity:x.similarity,
      outcome:x.outcome,
      maxMove15m:Number(x.maxMove15m.toFixed(2))
    }))
  };
}
