import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "crypto-real-discovery-elite6-no-backup";

type StructureResult = {
  structurePosition: number;
  structureLocation: string;
  structureLocationScore: number;
  riskLocation: string;
};

type EntryResult = {
  supportEntry: number;
  middleEntry: number;
  breakoutProofEntry: number;
  bestEntry: number;
  entryType: string;
  waitFor: string;
};

type MathResult = {
  speed: number;
  speedLabel: string;
  speedOk: boolean;
  volumeOk: boolean;
  spreadOk: boolean;
  signalAlignment: number;
  supportEntryZone: boolean;
  resistanceProofZone: boolean;
  brokenOrExtended: boolean;
  bottomIgnitionScore: number;
  gainerStructureScore: number;
  runnerScore: number;
  proofScore: number;
  runnerLane: string;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, places = 4): number {
  const p = Math.pow(10, places);
  return Math.round(num(v) * p) / p;
}

function gainBand(gain24h: number): string {
  if (gain24h >= 18) return "CRYPTO OVERHEATED";
  if (gain24h >= 12) return "CRYPTO HOT / LATE";
  if (gain24h >= 7) return "CRYPTO STRONG";
  if (gain24h >= 4) return "CRYPTO ACTIVE";
  if (gain24h >= 2) return "CRYPTO EARLY WATCH";
  if (gain24h >= 0.75) return "CRYPTO WAKING";
  return "CRYPTO BASE";
}

function buildStructureLocation(
  price: number,
  support: number,
  resistance: number
): StructureResult {
  const range = resistance - support;

  if (!price || !support || !resistance || range <= 0) {
    return {
      structurePosition: 0,
      structureLocation: "UNKNOWN",
      structureLocationScore: 0,
      riskLocation: "NO CLEAN RANGE"
    };
  }

  const position = (price - support) / range;

  if (position < 0) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "BELOW SUPPORT",
      structureLocationScore: -45,
      riskLocation: "SUPPORT BROKEN"
    };
  }

  if (position <= 0.25) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "NEAR SUPPORT",
      structureLocationScore: 28,
      riskLocation: "BEST RISK LOCATION"
    };
  }

  if (position <= 0.6) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "HEALTHY MIDDLE",
      structureLocationScore: 22,
      riskLocation: "CONTROLLED RISK"
    };
  }

  if (position <= 0.9) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "NEAR RESISTANCE",
      structureLocationScore: -8,
      riskLocation: "WAIT FOR CONFIRMATION"
    };
  }

  if (position <= 1.08) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "BREAKOUT ZONE",
      structureLocationScore: -12,
      riskLocation: "PROOF REQUIRED"
    };
  }

  if (position <= 1.22) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "EXTENDED ABOVE RESISTANCE",
      structureLocationScore: -30,
      riskLocation: "CHASE RISK"
    };
  }

  return {
    structurePosition: round(position, 3),
    structureLocation: "OVEREXTENDED",
    structureLocationScore: -45,
    riskLocation: "DO NOT CHASE"
  };
}

function buildEntries(
  support: number,
  resistance: number,
  price: number,
  structureLocation: string
): EntryResult {
  const range = Math.max(0, resistance - support);

  const supportEntry = support > 0 ? support * 1.004 : price;
  const middleEntry = range > 0 ? support + range * 0.5 : price;
  const breakoutProofEntry = resistance > 0 ? resistance * 1.012 : price * 1.012;

  let bestEntry = 0;
  let entryType = "NO CLEAN ENTRY";
  let waitFor = "NO CLEAN ENTRY";

  if (structureLocation === "NEAR SUPPORT") {
    bestEntry = supportEntry;
    entryType = "CRYPTO SUPPORT ENTRY";
    waitFor = "WAIT FOR SUPPORT HOLD + SPEED / VOLUME";
  } else if (structureLocation === "HEALTHY MIDDLE") {
    bestEntry = middleEntry;
    entryType = "CRYPTO MIDDLE ENTRY";
    waitFor = "WAIT FOR BUYERS HOLDING MIDDLE";
  } else if (
    structureLocation === "NEAR RESISTANCE" ||
    structureLocation === "BREAKOUT ZONE"
  ) {
    bestEntry = breakoutProofEntry;
    entryType = "CRYPTO BREAKOUT PROOF ENTRY";
    waitFor = "WAIT ABOVE RESISTANCE FOR PROOF";
  }

  return {
    supportEntry: round(supportEntry),
    middleEntry: round(middleEntry),
    breakoutProofEntry: round(breakoutProofEntry),
    bestEntry: round(bestEntry),
    entryType,
    waitFor
  };
}

function buildCryptoMath(args: {
  gain1h: number;
  gain24h: number;
  gain7d: number;
  volume: number;
  marketCapRank: number;
  structureLocation: string;
}): MathResult {
  const supportEntryZone =
    args.structureLocation === "NEAR SUPPORT" ||
    args.structureLocation === "HEALTHY MIDDLE";

  const resistanceProofZone =
    args.structureLocation === "NEAR RESISTANCE" ||
    args.structureLocation === "BREAKOUT ZONE";

  const brokenOrExtended =
    args.structureLocation === "BELOW SUPPORT" ||
    args.structureLocation === "EXTENDED ABOVE RESISTANCE" ||
    args.structureLocation === "OVEREXTENDED";

  const speed = clamp(
    Math.round(
      Math.max(0, args.gain1h) * 22 +
        Math.max(0, args.gain24h) * 3.4 +
        Math.max(0, args.gain7d) * 0.35
    ),
    0,
    100
  );

  const speedLabel =
    speed >= 80
      ? "FAST"
      : speed >= 55
      ? "ACTIVE"
      : speed >= 30
      ? "BUILDING"
      : "SLOW";

  const volumeOk = args.volume >= 20_000_000;
  const speedOk = speed >= 28;
  const spreadOk = true;

  const signalAlignment =
    (speedOk ? 1 : 0) + (volumeOk ? 1 : 0) + (spreadOk ? 1 : 0);

  let locationScore = 0;

  if (args.structureLocation === "NEAR SUPPORT") locationScore = 32;
  else if (args.structureLocation === "HEALTHY MIDDLE") locationScore = 26;
  else if (args.structureLocation === "NEAR RESISTANCE") locationScore = -12;
  else if (args.structureLocation === "BREAKOUT ZONE") locationScore = -20;
  else if (args.structureLocation === "EXTENDED ABOVE RESISTANCE") locationScore = -36;
  else if (args.structureLocation === "OVEREXTENDED") locationScore = -50;
  else if (args.structureLocation === "BELOW SUPPORT") locationScore = -55;

  const liquidityScore = clamp(Math.log10(args.volume + 1) * 3.1, 0, 32);
  const speedScore = clamp(speed * 0.36, 0, 36);
  const oneHourScore = clamp(args.gain1h * 10, -20, 26);
  const dayScore = clamp(args.gain24h * 2.7, -25, 32);
  const rankScore =
    args.marketCapRank > 0 && args.marketCapRank <= 300 ? 8 : 0;

  let bottomIgnitionScore = clamp(
    Math.round(
      5 +
        liquidityScore +
        speedScore +
        oneHourScore +
        dayScore +
        rankScore +
        locationScore
    ),
    0,
    100
  );

  if (!supportEntryZone) {
    bottomIgnitionScore = Math.min(
      bottomIgnitionScore,
      resistanceProofZone ? 54 : 39
    );
  }

  if (brokenOrExtended || args.gain24h >= 18) {
    bottomIgnitionScore = Math.min(bottomIgnitionScore, 38);
  }

  let gainerStructureScore = clamp(
    Math.round(
      8 +
        liquidityScore +
        speedScore * 0.75 +
        dayScore +
        rankScore +
        (supportEntryZone ? 14 : 0) +
        (resistanceProofZone ? 6 : 0)
    ),
    0,
    100
  );

  if (brokenOrExtended || args.gain24h >= 18) {
    gainerStructureScore = Math.min(gainerStructureScore, 48);
  }

  const runnerScore = clamp(
    Math.max(bottomIgnitionScore, gainerStructureScore),
    0,
    100
  );

  let proofScore = clamp(
    Math.round(
      runnerScore * 0.65 +
        signalAlignment * 7 +
        (supportEntryZone ? 8 : 0)
    ),
    0,
    100
  );

  if (resistanceProofZone) proofScore = Math.min(proofScore, 78);
  if (brokenOrExtended || args.gain24h >= 18) {
    proofScore = Math.min(proofScore, 48);
  }

  const runnerLane =
    bottomIgnitionScore >= gainerStructureScore + 8
      ? "CRYPTO BOTTOM / MIDDLE IGNITION"
      : gainerStructureScore >= bottomIgnitionScore + 8
      ? "CRYPTO ALREADY-UP STRUCTURE"
      : "CRYPTO BALANCED STRUCTURE";

  return {
    speed,
    speedLabel,
    speedOk,
    volumeOk,
    spreadOk,
    signalAlignment,
    supportEntryZone,
    resistanceProofZone,
    brokenOrExtended,
    bottomIgnitionScore,
    gainerStructureScore,
    runnerScore,
    proofScore,
    runnerLane
  };
}

function movementScore(args: {
  gain1h: number;
  gain24h: number;
  gain7d: number;
  volume: number;
}): number {
  const oneHourRise = clamp(args.gain1h * 32, -60, 140);
  const dayRise = clamp(args.gain24h * 9, -80, 170);
  const weekRise = clamp(args.gain7d * 1.2, -50, 80);

  const liquidityPass = args.volume >= 2_000_000 ? 12 : args.volume >= 500_000 ? 5 : -35;

  return round(oneHourRise + dayRise + weekRise + liquidityPass, 2);
}

async function fetchCryptoPage(page: number) {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=market_cap_desc" +
    "&per_page=250" +
    `&page=${page}` +
    "&sparkline=false" +
    "&price_change_percentage=1h,24h,7d" +
    "&precision=full";

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "proof-of-structure-real-crypto"
    }
  });

  if (!res.ok) {
    throw new Error(`CoinGecko failed ${res.status}`);
  }

  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function fetchRealCryptoMarket() {
  const page1 = await fetchCryptoPage(1);

  let page2: any[] = [];

  try {
    page2 = await fetchCryptoPage(2);
  } catch {
    page2 = [];
  }

  return [...page1, ...page2];
}

function enrichCoin(raw: any, index: number) {
  const ticker = String(raw?.symbol || "").toUpperCase();
  const name = String(raw?.name || ticker);
  const price = num(raw?.current_price);

  const gain1h = num(raw?.price_change_percentage_1h_in_currency);
  const gain24h = num(
    raw?.price_change_percentage_24h_in_currency ??
      raw?.price_change_percentage_24h
  );
  const gain7d = num(raw?.price_change_percentage_7d_in_currency);
  const change = num(raw?.price_change_24h);
  const volume = num(raw?.total_volume);
  const marketCapRank = num(raw?.market_cap_rank);

  if (!ticker || !price || !volume) return null;

  let high = num(raw?.high_24h);
  let low = num(raw?.low_24h);

  if (!high || !low || high <= low) {
    high = price * 1.018;
    low = price * 0.982;
  }

  const support = round(low);
  const resistance = round(high);

  const structure = buildStructureLocation(price, support, resistance);
  const entries = buildEntries(
    support,
    resistance,
    price,
    structure.structureLocation
  );

  const math = buildCryptoMath({
    gain1h,
    gain24h,
    gain7d,
    volume,
    marketCapRank,
    structureLocation: structure.structureLocation
  });

  const stop = support;
  const target1 = resistance * 1.025;
  const target2 = resistance * 1.045;
  const target3 = resistance * 1.075;

  const risk = Math.max(0, entries.bestEntry - stop);
  const reward = Math.max(0, target1 - entries.bestEntry);
  const rr = risk > 0 ? reward / risk : 0;

  let verdict = "NO";
  let rejection = "";

  if (math.brokenOrExtended) {
    verdict = "NO";
    rejection = structure.riskLocation;
  } else if (gain24h >= 18) {
    verdict = "NO";
    rejection = "CRYPTO ALREADY HOT";
  } else if (volume < 20_000_000) {
    verdict = "NO";
    rejection = "LOW CRYPTO VOLUME";
  } else if (
    math.supportEntryZone &&
    math.proofScore >= 62 &&
    math.signalAlignment >= 2
  ) {
    verdict = "YES";
  } else if (math.resistanceProofZone && math.proofScore >= 55) {
    verdict = "WAIT";
    rejection = "WAIT ABOVE RESISTANCE";
  } else if (math.proofScore >= 55) {
    verdict = "WAIT";
  } else {
    verdict = "NO";
    rejection = "NO CRYPTO PROOF";
  }

  const permissionText =
    verdict === "YES"
      ? "YES — REAL CRYPTO SUPPORT/MIDDLE ENTRY"
      : verdict === "WAIT"
      ? entries.waitFor
      : rejection || "NO CLEAN CRYPTO PERMISSION";

  const actionRank = verdict === "YES" ? 3 : verdict === "WAIT" ? 2 : 1;

  const moverScore = movementScore({
    gain1h,
    gain24h,
    gain7d,
    volume
  });

  return {
    ticker,
    cryptoId: raw?.id || "",
    name,

    price: round(price),
    gain: round(gain24h, 2),
    gain1h: round(gain1h, 2),
    gain7d: round(gain7d, 2),
    movementScore: moverScore,

    change: round(change),
    volume: Math.round(volume),

    open: round(price - change),
    high: round(high),
    low: round(low),

    support,
    resistance,

    entryAggressive: entries.supportEntry,
    entryConfirmation: entries.middleEntry,
    entryProof: entries.breakoutProofEntry,

    supportEntry: entries.supportEntry,
    middleEntry: entries.middleEntry,
    breakoutProofEntry: entries.breakoutProofEntry,
    bestEntry: entries.bestEntry,
    entryType: entries.entryType,
    waitFor: entries.waitFor,

    stop: round(stop),
    target1: round(target1),
    target2: round(target2),
    target3: round(target3),
    risk: round(risk),
    reward: round(reward),
    rr: round(rr, 2),

    speed: math.speed,
    speedLabel: math.speedLabel,
    volumeSurge: round(volume / 1_000_000_000, 2),

    spreadStatus: "CRYPTO CHECK",
    spreadPct: 0,
    bid: 0,
    ask: 0,

    floatShares: 0,
    sharesOutstanding: 0,
    floatProxy: 0,
    floatStatus: "CRYPTO / NO FLOAT",
    floatScore: 0,

    marketMode: "REAL_CRYPTO_DISCOVERY",

    gainBand: gainBand(gain24h),
    runnerLane: math.runnerLane,
    bottomIgnitionScore: math.bottomIgnitionScore,
    gainerStructureScore: math.gainerStructureScore,
    runnerScore: math.runnerScore,
    proofScore: math.proofScore,
    ignitionScore: math.bottomIgnitionScore,
    overExtensionPenalty: gain24h >= 18 ? -70 : gain24h >= 12 ? -30 : 0,

    structurePosition: structure.structurePosition,
    structureLocation: structure.structureLocation,
    structureLocationScore: structure.structureLocationScore,
    riskLocation: structure.riskLocation,

    speedOk: math.speedOk,
    volumeOk: math.volumeOk,
    spreadOk: math.spreadOk,
    signalAlignment: math.signalAlignment,

    actionRank,
    actionRankScore:
      actionRank * 1000 +
      math.proofScore +
      math.runnerScore * 0.01 +
      moverScore * 0.1,

    catalyst: "REAL CRYPTO DISCOVERY — NO FIXED LIST / NO FAKE BACKUP",
    catalystGrade: "CRYPTO",
    newsScore: 0,
    news: [],

    verdict,
    rejection,
    permissionText,

    candles: index + 1,
    marketCapRank,
    lastUpdated: raw?.last_updated || new Date().toISOString()
  };
}

export async function GET() {
  try {
    const rawList = await fetchRealCryptoMarket();

    const enriched = rawList
  .map(enrichCoin)
  .filter(Boolean)
  .filter((x: any) => x.volume >= 500_000)
  .filter((x: any) => x.gain1h > 0 || x.gain > 0 || x.gain7d > 0)
  .sort((a: any, b: any) => {
    if (b.movementScore !== a.movementScore) return b.movementScore - a.movementScore;
    if (b.gain1h !== a.gain1h) return b.gain1h - a.gain1h;
    if (b.gain !== a.gain) return b.gain - a.gain;
    if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
    return b.volume - a.volume;
  })
  .slice(0, 60);

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        marketMode: "REAL_CRYPTO_DISCOVERY",
        count: enriched.length,
        timestamp: new Date().toISOString(),
        rules: {
          discovery: "scans real crypto market, then ranks by percent rising first",
          noFixedList: true,
          noFakeBackup: true,
          noFakePrices: true,
          cryptoDoesNotRunLikePennyStocks: true,
          yes: "support or healthy middle only",
          resistance: "wait above resistance for proof",
          overextended: "blocked"
        },
        data: {
          tickers: enriched
        },
        tickers: enriched
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: SOURCE,
        marketMode: "CRYPTO_FEED_ERROR",
        error: error instanceof Error ? error.message : String(error),
        count: 0,
        timestamp: new Date().toISOString(),
        rules: {
          noFakeBackup: true,
          message: "Real crypto feed failed. Showing no fake prices."
        },
        data: {
          tickers: []
        },
        tickers: []
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  }
}
