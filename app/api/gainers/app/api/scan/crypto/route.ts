import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "crypto-real-discovery-elite6";

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, places = 4) {
  const p = Math.pow(10, places);
  return Math.round(num(v) * p) / p;
}

function gainBand(gain: number) {
  if (gain >= 12) return "CRYPTO HOT / LATE";
  if (gain >= 7) return "CRYPTO STRONG";
  if (gain >= 4) return "CRYPTO ACTIVE";
  if (gain >= 2) return "CRYPTO EARLY";
  if (gain >= 0.75) return "CRYPTO WAKING";
  return "CRYPTO BASE";
}

function buildStructureLocation(price: number, support: number, resistance: number) {
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
      structureLocationScore: -40,
      riskLocation: "SUPPORT BROKEN"
    };
  }

  if (position <= 0.25) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "NEAR SUPPORT",
      structureLocationScore: 24,
      riskLocation: "BEST RISK LOCATION"
    };
  }

  if (position <= 0.6) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "HEALTHY MIDDLE",
      structureLocationScore: 17,
      riskLocation: "CONTROLLED RISK"
    };
  }

  if (position <= 0.9) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "NEAR RESISTANCE",
      structureLocationScore: -6,
      riskLocation: "WAIT FOR CONFIRMATION"
    };
  }

  if (position <= 1.08) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "BREAKOUT ZONE",
      structureLocationScore: -10,
      riskLocation: "PROOF REQUIRED"
    };
  }

  if (position <= 1.22) {
    return {
      structurePosition: round(position, 3),
      structureLocation: "EXTENDED ABOVE RESISTANCE",
      structureLocationScore: -24,
      riskLocation: "CHASE RISK"
    };
  }

  return {
    structurePosition: round(position, 3),
    structureLocation: "OVEREXTENDED",
    structureLocationScore: -38,
    riskLocation: "DO NOT CHASE"
  };
}

function buildEntries(support: number, resistance: number, price: number, structureLocation: string) {
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
  } else if (structureLocation === "NEAR RESISTANCE" || structureLocation === "BREAKOUT ZONE") {
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
  price: number;
  gain1h: number;
  gain24h: number;
  gain7d: number;
  volume: number;
  marketCapRank: number;
  structureLocation: string;
}) {
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
      Math.max(0, args.gain1h) * 20 +
      Math.max(0, args.gain24h) * 3.2 +
      Math.max(0, args.gain7d) * 0.4
    ),
    0,
    100
  );

  const speedLabel =
    speed >= 80 ? "FAST" :
    speed >= 55 ? "ACTIVE" :
    speed >= 30 ? "BUILDING" :
    "SLOW";

  const volumeOk = args.volume >= 50000000;
  const speedOk = speed >= 30;
  const spreadOk = true;

  const signalAlignment =
    (speedOk ? 1 : 0) +
    (volumeOk ? 1 : 0) +
    (spreadOk ? 1 : 0);

  let locationScore = 0;

  if (args.structureLocation === "NEAR SUPPORT") locationScore = 30;
  else if (args.structureLocation === "HEALTHY MIDDLE") locationScore = 22;
  else if (args.structureLocation === "NEAR RESISTANCE") locationScore = -12;
  else if (args.structureLocation === "BREAKOUT ZONE") locationScore = -20;
  else if (args.structureLocation === "EXTENDED ABOVE RESISTANCE") locationScore = -34;
  else if (args.structureLocation === "OVEREXTENDED") locationScore = -46;
  else if (args.structureLocation === "BELOW SUPPORT") locationScore = -50;

  const liquidityScore = clamp(Math.log10(args.volume + 1) * 3, 0, 30);
  const speedScore = clamp(speed * 0.35, 0, 35);
  const oneHourScore = clamp(args.gain1h * 10, -20, 25);
  const dayScore = clamp(args.gain24h * 2.6, -25, 30);
  const rankScore = args.marketCapRank > 0 && args.marketCapRank <= 200 ? 8 : 0;

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
    bottomIgnitionScore = Math.min(bottomIgnitionScore, resistanceProofZone ? 54 : 39);
  }

  if (brokenOrExtended || args.gain24h >= 12) {
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

  if (brokenOrExtended || args.gain24h >= 12) {
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
  if (brokenOrExtended || args.gain24h >= 12) proofScore = Math.min(proofScore, 48);

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

async function fetchRealCryptoMarket() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=volume_desc" +
    "&per_page=250" +
    "&page=1" +
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

function enrichCoin(raw: any, index: number) {
  const ticker = String(raw?.symbol || "").toUpperCase();
  const name = String(raw?.name || ticker);
  const price = num(raw?.current_price);

  const gain1h = num(raw?.price_change_percentage_1h_in_currency);
  const gain24h = num(raw?.price_change_percentage_24h_in_currency ?? raw?.price_change_percentage_24h);
  const gain7d = num(raw?.price_change_percentage_7d_in_currency);
  const change = num(raw?.price_change_24h);
  const volume = num(raw?.total_volume);
  const marketCapRank = num(raw?.market_cap_rank);

  let high = num(raw?.high_24h);
  let low = num(raw?.low_24h);

  if (!price || !volume) return null;

  if (!high || !low || high <= low) {
    high = price * 1.018;
    low = price * 0.982;
  }

  const support = round(low);
  const resistance = round(high);
  const structure = buildStructureLocation(price, support, resistance);
  const entries = buildEntries(support, resistance, price, structure.structureLocation);

  const math = buildCryptoMath({
    price,
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
  } else if (gain24h >= 12) {
    verdict = "NO";
    rejection = "CRYPTO ALREADY HOT";
  } else if (volume < 50000000) {
    verdict = "NO";
    rejection = "LOW CRYPTO VOLUME";
  } else if (math.supportEntryZone && math.proofScore >= 72 && math.signalAlignment >= 2) {
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

  const actionRank =
    verdict === "YES" ? 3 :
    verdict === "WAIT" ? 2 :
    1;

  return {
    ticker,
    cryptoId: raw?.id || "",
    name,

    price: round(price),
    gain: round(gain24h, 2),
    gain1h: round(gain1h, 2),
    gain7d: round(gain7d, 2),
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
    volumeSurge: round(volume / 1000000000, 2),

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
    overExtensionPenalty: gain24h >= 12 ? -70 : gain24h >= 7 ? -24 : 0,

    structurePosition: structure.structurePosition,
    structureLocation: structure.structureLocation,
    structureLocationScore: structure.structureLocationScore,
    riskLocation: structure.riskLocation,

    speedOk: math.speedOk,
    volumeOk: math.volumeOk,
    spreadOk: math.spreadOk,
    signalAlignment: math.signalAlignment,
    actionRank,
    actionRankScore: actionRank * 1000 + math.proofScore + math.runnerScore * 0.01,

    catalyst: "REAL CRYPTO DISCOVERY — NO FIXED TEST LIST",
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
      .sort((a: any, b: any) => {
        if (b.actionRank !== a.actionRank) return b.actionRank - a.actionRank;
        if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
        return b.runnerScore - a.runnerScore;
      })
      .slice(0, 50);

    return NextResponse.json(
      {
        ok: true,
        source: SOURCE,
        marketMode: "REAL_CRYPTO_DISCOVERY",
        count: enriched.length,
        timestamp: new Date().toISOString(),
        rules: {
          discovery: "scans real crypto market by volume",
          noFixedList: true,
          cryptoDoesNotRunLikePennyStocks: true,
          yes: "support or healthy middle only",
          resistance: "wait above resistance for proof"
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
        marketMode: "CRYPTO_ERROR",
        error: error instanceof Error ? error.message : String(error),
        count: 0,
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
