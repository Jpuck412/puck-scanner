import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "crypto-structure-elite6";

const COINS = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "dogecoin",
  "avalanche-2",
  "chainlink",
  "cardano",
  "polkadot",
  "polygon-ecosystem-token",
  "near",
  "litecoin",
  "bitcoin-cash",
  "stellar",
  "render-token"
];

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  ripple: "XRP",
  dogecoin: "DOGE",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  cardano: "ADA",
  polkadot: "DOT",
  "polygon-ecosystem-token": "POL",
  near: "NEAR",
  litecoin: "LTC",
  "bitcoin-cash": "BCH",
  stellar: "XLM",
  "render-token": "RENDER"
};

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
  if (gain >= 18) return "CRYPTO HEATED";
  if (gain >= 10) return "CRYPTO LATE CAUTION";
  if (gain >= 5) return "CRYPTO STRUCTURED GAINER";
  if (gain >= 2) return "CRYPTO EARLY WATCH";
  if (gain >= 0.5) return "CRYPTO FRESH IGNITION";
  return "CRYPTO FLAT / BASE";
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

  let structureLocation = "UNKNOWN";
  let structureLocationScore = 0;
  let riskLocation = "WAIT";

  if (position < 0) {
    structureLocation = "BELOW SUPPORT";
    structureLocationScore = -40;
    riskLocation = "SUPPORT BROKEN";
  } else if (position <= 0.25) {
    structureLocation = "NEAR SUPPORT";
    structureLocationScore = 24;
    riskLocation = "BEST RISK LOCATION";
  } else if (position <= 0.6) {
    structureLocation = "HEALTHY MIDDLE";
    structureLocationScore = 17;
    riskLocation = "CONTROLLED RISK";
  } else if (position <= 0.9) {
    structureLocation = "NEAR RESISTANCE";
    structureLocationScore = -6;
    riskLocation = "WAIT FOR CONFIRMATION";
  } else if (position <= 1.1) {
    structureLocation = "BREAKOUT ZONE";
    structureLocationScore = -12;
    riskLocation = "PROOF REQUIRED";
  } else if (position <= 1.3) {
    structureLocation = "EXTENDED ABOVE RESISTANCE";
    structureLocationScore = -28;
    riskLocation = "CHASE RISK";
  } else {
    structureLocation = "OVEREXTENDED";
    structureLocationScore = -42;
    riskLocation = "DO NOT CHASE";
  }

  return {
    structurePosition: round(position, 3),
    structureLocation,
    structureLocationScore,
    riskLocation
  };
}

function buildEntries(support: number, resistance: number, price: number, structureLocation: string) {
  const range = Math.max(0, resistance - support);

  const supportEntry = support > 0 ? support * 1.01 : price;
  const middleEntry = range > 0 ? support + range * 0.5 : price;
  const breakoutProofEntry = resistance > 0 ? resistance * 1.015 : price * 1.015;

  let bestEntry = price;
  let entryType = "WAIT";
  let waitFor = "WAIT FOR CLEAN STRUCTURE";

  if (structureLocation === "NEAR SUPPORT") {
    bestEntry = supportEntry;
    entryType = "SUPPORT ENTRY";
    waitFor = "WAIT FOR SUPPORT HOLD + SPEED / VOLUME / SPREAD";
  } else if (structureLocation === "HEALTHY MIDDLE") {
    bestEntry = middleEntry;
    entryType = "HEALTHY MIDDLE ENTRY";
    waitFor = "WAIT FOR BUYERS HOLDING MIDDLE";
  } else if (structureLocation === "NEAR RESISTANCE" || structureLocation === "BREAKOUT ZONE") {
    bestEntry = breakoutProofEntry;
    entryType = "BREAKOUT PROOF ENTRY";
    waitFor = "WAIT ABOVE RESISTANCE FOR PROOF";
  } else if (
    structureLocation === "BELOW SUPPORT" ||
    structureLocation === "EXTENDED ABOVE RESISTANCE" ||
    structureLocation === "OVEREXTENDED"
  ) {
    bestEntry = breakoutProofEntry;
    entryType = "NO TOUCH";
    waitFor = "NO CLEAN ENTRY";
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

function buildMath(args: {
  price: number;
  gain24h: number;
  gain1h: number;
  volume: number;
  volumeRank: number;
  structureLocation: string;
}) {
  const speed = clamp(
    Math.round(Math.abs(args.gain1h) * 14 + Math.abs(args.gain24h) * 3.2 + args.volumeRank * 8),
    0,
    100
  );

  const speedLabel =
    speed >= 85 ? "VIOLENT" :
    speed >= 65 ? "FAST" :
    speed >= 40 ? "ACTIVE" :
    "SLOW";

  const volumeOk = args.volume >= 100000000;
  const speedOk = speed >= 40;
  const spreadOk = true;
  const signalAlignment = (speedOk ? 1 : 0) + (volumeOk ? 1 : 0) + 1;

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

  let locationScore = 0;

  if (args.structureLocation === "NEAR SUPPORT") locationScore = 30;
  else if (args.structureLocation === "HEALTHY MIDDLE") locationScore = 22;
  else if (args.structureLocation === "NEAR RESISTANCE") locationScore = -16;
  else if (args.structureLocation === "BREAKOUT ZONE") locationScore = -24;
  else if (args.structureLocation === "EXTENDED ABOVE RESISTANCE") locationScore = -38;
  else if (args.structureLocation === "OVEREXTENDED") locationScore = -52;
  else if (args.structureLocation === "BELOW SUPPORT") locationScore = -55;

  const speedScore = clamp(speed * 0.32, 0, 32);
  const volumeScore = clamp(Math.log10(args.volume + 1) * 2.8, 0, 28);
  const gainScore = clamp(args.gain24h * 2.2, -20, 28);
  const oneHourScore = clamp(args.gain1h * 6, -18, 24);

  let bottomIgnitionScore = clamp(
    Math.round(8 + speedScore + volumeScore + oneHourScore + gainScore + locationScore),
    0,
    100
  );

  if (!supportEntryZone) {
    bottomIgnitionScore = Math.min(bottomIgnitionScore, resistanceProofZone ? 58 : 42);
  }

  if (brokenOrExtended || args.gain24h >= 18) {
    bottomIgnitionScore = Math.min(bottomIgnitionScore, 39);
  }

  let gainerStructureScore = clamp(
    Math.round(
      8 +
        speedScore * 0.85 +
        volumeScore +
        gainScore * 1.15 +
        oneHourScore * 0.75 +
        (resistanceProofZone ? 8 : 0) +
        (supportEntryZone ? 10 : 0)
    ),
    0,
    100
  );

  if (brokenOrExtended || args.gain24h >= 18) {
    gainerStructureScore = Math.min(gainerStructureScore, 49);
  }

  const runnerScore = clamp(Math.max(bottomIgnitionScore, gainerStructureScore), 0, 100);

  let proofScore = clamp(
    Math.round(runnerScore * 0.62 + signalAlignment * 6 + (supportEntryZone ? 8 : 0)),
    0,
    100
  );

  if (resistanceProofZone) proofScore = Math.min(proofScore, 79);
  if (brokenOrExtended || args.gain24h >= 18) proofScore = Math.min(proofScore, 49);

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

function backupCoins() {
  const base = [
    ["bitcoin", "BTC", 65000, 1.2, 0.2, 31000000000],
    ["ethereum", "ETH", 3400, 1.8, 0.4, 18000000000],
    ["solana", "SOL", 145, 3.2, 0.7, 4200000000],
    ["ripple", "XRP", 0.58, 2.1, 0.3, 2100000000],
    ["dogecoin", "DOGE", 0.125, 2.8, 0.5, 1900000000],
    ["avalanche-2", "AVAX", 28, 2.4, 0.4, 900000000],
    ["chainlink", "LINK", 15.5, 1.9, 0.2, 800000000],
    ["cardano", "ADA", 0.44, 1.5, 0.1, 700000000],
    ["polkadot", "DOT", 6.2, 1.1, 0.1, 450000000],
    ["near", "NEAR", 5.1, 2.2, 0.3, 500000000]
  ];

  return base.map(([id, symbol, price, gain24h, gain1h, volume]) => {
    const p = Number(price);
    return {
      id,
      symbol,
      name: String(id),
      current_price: p,
      price_change_percentage_24h: Number(gain24h),
      price_change_percentage_1h_in_currency: Number(gain1h),
      total_volume: Number(volume),
      high_24h: p * 1.035,
      low_24h: p * 0.965,
      last_updated: new Date().toISOString()
    };
  });
}

async function fetchCryptoMarkets() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    `?vs_currency=usd` +
    `&ids=${COINS.join(",")}` +
    `&order=volume_desc` +
    `&per_page=20` +
    `&page=1` +
    `&sparkline=false` +
    `&price_change_percentage=1h,24h,7d` +
    `&precision=full`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "proof-of-structure-elite6"
    }
  });

  if (!res.ok) throw new Error(`CoinGecko failed ${res.status}`);

  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

function enrichCoin(raw: any, index: number) {
  const id = String(raw?.id || "");
  const symbol = String(raw?.symbol || "").toUpperCase();
  const ticker = SYMBOL_MAP[id] || symbol || id.toUpperCase();

  const price = num(raw?.current_price);
  const gain24h = num(raw?.price_change_percentage_24h_in_currency ?? raw?.price_change_percentage_24h);
  const gain1h = num(raw?.price_change_percentage_1h_in_currency);
  const change = num(raw?.price_change_24h);
  const volume = num(raw?.total_volume);

  let high = num(raw?.high_24h);
  let low = num(raw?.low_24h);

  if (!high || !low || high <= low) {
    high = price * 1.025;
    low = price * 0.975;
  }

  const support = round(low);
  const resistance = round(high);
  const structure = buildStructureLocation(price, support, resistance);
  const entries = buildEntries(support, resistance, price, structure.structureLocation);

  const volumeRank = clamp((20 - index) / 20, 0, 1);

  const math = buildMath({
    price,
    gain24h,
    gain1h,
    volume,
    volumeRank,
    structureLocation: structure.structureLocation
  });

  const stop = support;
  const target1 = resistance * 1.05;
  const target2 = resistance * 1.1;
  const target3 = resistance * 1.18;

  const risk = Math.max(0, entries.breakoutProofEntry - stop);
  const reward = Math.max(0, target1 - entries.breakoutProofEntry);
  const rr = risk > 0 ? reward / risk : 0;

  let verdict = "NO";
  let rejection = "";

  if (math.brokenOrExtended) {
    verdict = "NO";
    rejection = structure.riskLocation;
  } else if (gain24h >= 18) {
    verdict = "NO";
    rejection = "CRYPTO OVERHEATED";
  } else if (volume < 50000000) {
    verdict = "NO";
    rejection = "LOW CRYPTO VOLUME";
  } else if (math.supportEntryZone && math.proofScore >= 75 && math.signalAlignment >= 2) {
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
      ? "YES — CRYPTO SUPPORT/MIDDLE ENTRY WITH CONFIRMATION"
      : verdict === "WAIT"
      ? entries.waitFor
      : rejection || "NO CLEAN CRYPTO PERMISSION";

  const actionRank =
    verdict === "YES" ? 3 :
    verdict === "WAIT" ? 2 :
    1;

  return {
    ticker,
    cryptoId: id,
    name: raw?.name || ticker,

    price: round(price),
    gain: round(gain24h, 2),
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

    spreadStatus: "CRYPTO TIGHT",
    spreadPct: 0,
    bid: 0,
    ask: 0,

    floatShares: 0,
    sharesOutstanding: 0,
    floatProxy: 0,
    floatStatus: "CRYPTO / NO FLOAT",
    floatScore: 0,

    marketMode: "CRYPTO_TEST_24_7",

    gainBand: gainBand(gain24h),
    runnerLane: math.runnerLane,
    bottomIgnitionScore: math.bottomIgnitionScore,
    gainerStructureScore: math.gainerStructureScore,
    runnerScore: math.runnerScore,
    proofScore: math.proofScore,
    ignitionScore: math.bottomIgnitionScore,
    overExtensionPenalty: gain24h >= 18 ? -70 : gain24h >= 10 ? -24 : 0,

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

    catalyst: "CRYPTO TEST MODE — NO EDGAR / NO FLOAT",
    catalystGrade: "CRYPTO",
    newsScore: 0,
    news: [],

    verdict,
    rejection,
    permissionText,
    candles: index + 1,
    lastUpdated: raw?.last_updated || new Date().toISOString()
  };
}

export async function GET() {
  let marketMode = "CRYPTO_TEST_24_7";
  let rawList: any[] = [];

  try {
    rawList = await fetchCryptoMarkets();
  } catch {
    marketMode = "CRYPTO_BACKUP";
    rawList = backupCoins();
  }

  const enriched = rawList
    .filter((x) => num(x?.current_price) > 0)
    .map(enrichCoin)
    .sort((a, b) => {
      if (b.actionRank !== a.actionRank) return b.actionRank - a.actionRank;
      if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
      return b.runnerScore - a.runnerScore;
    });

  return NextResponse.json(
    {
      ok: true,
      source: SOURCE,
      marketMode,
      count: enriched.length,
      timestamp: new Date().toISOString(),
      rules: {
        crypto: "24/7 test mode",
        noFloat: "crypto has no stock float",
        noEdgar: "crypto has no SEC EDGAR catalyst",
        yes: "support or healthy middle only with proof and alignment",
        resistance: "WAIT for proof above resistance"
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
}
