import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "polygon-runner-structure-elite4";

const BACKUP_UNIVERSE = [
  "NVDA",
  "TSLA",
  "AMD",
  "PLTR",
  "SOFI",
  "MARA",
  "RIOT",
  "SOUN",
  "RGTI",
  "IONQ",
  "QBTS",
  "BBAI",
  "AI",
  "ACHR",
  "JOBY",
  "RKLB",
  "LUNR",
  "ASTS",
  "SMR",
  "KULR"
];

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

function isJunkSymbol(ticker: string) {
  const x = String(ticker || "").toUpperCase();

  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes(".")
  );
}

function gainBand(gain: number) {
  if (gain >= 70) return "TRAP 70%+";
  if (gain >= 55) return "LATE CAUTION";
  if (gain >= 25) return "STRUCTURED GAINER";
  if (gain >= 8) return "EARLY WATCH";
  if (gain >= 1) return "FRESH IGNITION";
  return "FLAT / BASE";
}

function classifyFloat(floatProxy: number) {
  if (!floatProxy) {
    return {
      floatStatus: "UNKNOWN",
      floatScore: 0
    };
  }

  if (floatProxy <= 10000000) {
    return {
      floatStatus: "MICRO FLOAT",
      floatScore: 18
    };
  }

  if (floatProxy <= 30000000) {
    return {
      floatStatus: "LOW FLOAT",
      floatScore: 12
    };
  }

  if (floatProxy <= 100000000) {
    return {
      floatStatus: "MID FLOAT",
      floatScore: 5
    };
  }

  return {
    floatStatus: "HEAVY FLOAT",
    floatScore: -5
  };
}

function buildSpreadStatus(price: number, bid: number, ask: number, volume: number) {
  if (bid > 0 && ask > 0 && ask >= bid) {
    const mid = (bid + ask) / 2;
    const spreadPct = mid > 0 ? ((ask - bid) / mid) * 100 : 0;

    if (spreadPct <= 0.35) {
      return {
        spreadStatus: "PASS",
        spreadPct
      };
    }

    if (spreadPct <= 1.25) {
      return {
        spreadStatus: "CAUTION",
        spreadPct
      };
    }

    return {
      spreadStatus: "FAIL",
      spreadPct
    };
  }

  if (volume >= 1000000 && price >= 0.2) {
    return {
      spreadStatus: "LIKELY TIGHT",
      spreadPct: 0
    };
  }

  if (volume >= 100000) {
    return {
      spreadStatus: "CHECK",
      spreadPct: 0
    };
  }

  return {
    spreadStatus: "FAIL",
    spreadPct: 0
  };
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
  const breakoutProofEntry = resistance > 0 ? resistance * 1.025 : price * 1.025;

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
  } else if (
    structureLocation === "NEAR RESISTANCE" ||
    structureLocation === "BREAKOUT ZONE"
  ) {
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

function buildRunnerMath(args: {
  ticker: string;
  price: number;
  gain: number;
  volume: number;
  volumeSurge: number;
  speed: number;
  spreadStatus: string;
  structureLocation: string;
  structureLocationScore: number;
  rr: number;
  newsScore: number;
  floatScore: number;
}) {
  const junk = isJunkSymbol(args.ticker);

  const speedOk = args.speed >= 50;
  const volumeOk = args.volume >= 100000 && (args.volumeSurge >= 1 || args.volume >= 1000000);
  const spreadOk = args.spreadStatus === "PASS" || args.spreadStatus === "LIKELY TIGHT";
  const spreadCaution = args.spreadStatus === "CAUTION" || args.spreadStatus === "CHECK";

  const signalAlignment =
    (speedOk ? 1 : 0) +
    (volumeOk ? 1 : 0) +
    (spreadOk || spreadCaution ? 1 : 0);

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

  const speedScore = clamp(args.speed * 0.23, 0, 23);
  const volumeScore = clamp(Math.log10(args.volume + 1) * 3.1, 0, 23);
  const surgeScore = clamp(args.volumeSurge * 7, 0, 18);
  const gainScore = clamp(args.gain * 0.46, 0, 24);
  const rrScore = args.rr >= 2 ? 10 : args.rr >= 1.3 ? 5 : 0;

  const spreadScore =
    spreadOk ? 12 :
    spreadCaution ? 3 :
    -24;

  let bottomLocationScore = 0;

  if (args.structureLocation === "NEAR SUPPORT") bottomLocationScore = 28;
  else if (args.structureLocation === "HEALTHY MIDDLE") bottomLocationScore = 20;
  else if (args.structureLocation === "NEAR RESISTANCE") bottomLocationScore = -22;
  else if (args.structureLocation === "BREAKOUT ZONE") bottomLocationScore = -32;
  else if (args.structureLocation === "EXTENDED ABOVE RESISTANCE") bottomLocationScore = -45;
  else if (args.structureLocation === "OVEREXTENDED") bottomLocationScore = -55;
  else if (args.structureLocation === "BELOW SUPPORT") bottomLocationScore = -60;

  let gainerLocationScore = 0;

  if (args.structureLocation === "NEAR SUPPORT") gainerLocationScore = 12;
  else if (args.structureLocation === "HEALTHY MIDDLE") gainerLocationScore = 15;
  else if (args.structureLocation === "NEAR RESISTANCE") gainerLocationScore = 4;
  else if (args.structureLocation === "BREAKOUT ZONE") gainerLocationScore = 7;
  else if (args.structureLocation === "EXTENDED ABOVE RESISTANCE") gainerLocationScore = -24;
  else if (args.structureLocation === "OVEREXTENDED") gainerLocationScore = -40;
  else if (args.structureLocation === "BELOW SUPPORT") gainerLocationScore = -45;

  const latePenalty =
    args.gain >= 70 ? -70 :
    args.gain >= 55 ? -32 :
    args.gain >= 35 ? -14 :
    0;

  const junkPenalty = junk ? -45 : 0;
  const lowVolumePenalty = args.volume < 100000 ? -28 : 0;
  const noSpreadPenalty = args.spreadStatus === "FAIL" ? -35 : 0;

  let bottomIgnitionScore = clamp(
    Math.round(
      8 +
        speedScore +
        volumeScore +
        surgeScore +
        gainScore +
        spreadScore +
        bottomLocationScore +
        args.floatScore * 0.4 +
        latePenalty +
        junkPenalty +
        lowVolumePenalty +
        noSpreadPenalty
    ),
    0,
    100
  );

  if (!supportEntryZone) {
    bottomIgnitionScore = Math.min(bottomIgnitionScore, resistanceProofZone ? 58 : 42);
  }

  if (brokenOrExtended || args.gain >= 70 || junk || args.spreadStatus === "FAIL") {
    bottomIgnitionScore = Math.min(bottomIgnitionScore, 39);
  }

  let gainerStructureScore = clamp(
    Math.round(
      10 +
        speedScore * 0.75 +
        volumeScore +
        surgeScore * 0.85 +
        gainScore * 1.15 +
        spreadScore +
        gainerLocationScore +
        rrScore +
        args.newsScore * 0.35 +
        args.floatScore * 0.25 +
        junkPenalty +
        lowVolumePenalty +
        noSpreadPenalty
    ),
    0,
    100
  );

  if (args.gain >= 70 || brokenOrExtended || junk || args.spreadStatus === "FAIL") {
    gainerStructureScore = Math.min(gainerStructureScore, 49);
  }

  const runnerScore = clamp(
    Math.round(Math.max(bottomIgnitionScore, gainerStructureScore)),
    0,
    100
  );

  let proofScore = clamp(
    Math.round(
      runnerScore * 0.58 +
        gainerStructureScore * 0.18 +
        bottomIgnitionScore * 0.14 +
        signalAlignment * 5 +
        rrScore +
        args.newsScore * 0.2
    ),
    0,
    100
  );

  if (supportEntryZone && signalAlignment >= 2 && spreadOk) {
    proofScore += 8;
  }

  if (resistanceProofZone) {
    proofScore = Math.min(proofScore, 79);
  }

  if (brokenOrExtended || args.gain >= 70 || junk || args.spreadStatus === "FAIL") {
    proofScore = Math.min(proofScore, 49);
  }

  proofScore = clamp(Math.round(proofScore), 0, 100);

  const runnerLane =
    bottomIgnitionScore >= gainerStructureScore + 8
      ? "BOTTOM / MIDDLE IGNITION"
      : gainerStructureScore >= bottomIgnitionScore + 8
      ? "ALREADY-UP STRUCTURE"
      : "BALANCED STRUCTURE";

  return {
    bottomIgnitionScore,
    gainerStructureScore,
    runnerScore,
    proofScore,
    runnerLane,
    speedOk,
    volumeOk,
    spreadOk,
    signalAlignment,
    supportEntryZone,
    resistanceProofZone,
    brokenOrExtended
  };
}

function buildCatalystGrade(news: any[]) {
  const title = String(news?.[0]?.title || "").toLowerCase();

  if (!title) {
    return {
      catalyst: "NO FRESH NEWS FOUND",
      catalystGrade: "NONE",
      newsScore: 0
    };
  }

  const strongWords = [
    "fda",
    "approval",
    "contract",
    "earnings",
    "guidance",
    "merger",
    "acquisition",
    "partnership",
    "phase",
    "patent",
    "order",
    "launch",
    "revenue",
    "upgrade"
  ];

  const riskWords = [
    "offering",
    "atm",
    "reverse split",
    "delist",
    "bankruptcy",
    "investigation",
    "nasdaq notice"
  ];

  const strong = strongWords.some((w) => title.includes(w));
  const risk = riskWords.some((w) => title.includes(w));

  if (risk) {
    return {
      catalyst: news[0].title,
      catalystGrade: "RISK",
      newsScore: -8
    };
  }

  if (strong) {
    return {
      catalyst: news[0].title,
      catalystGrade: "A",
      newsScore: 14
    };
  }

  return {
    catalyst: news[0].title,
    catalystGrade: "C",
    newsScore: 5
  };
}

async function polygonFetch(path: string, apiKey: string) {
  if (!apiKey) return null;

  const joiner = path.includes("?") ? "&" : "?";
  const url = `https://api.polygon.io${path}${joiner}apiKey=${apiKey}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });

  if (!res.ok) return null;

  return res.json();
}

async function fetchNews(ticker: string, apiKey: string) {
  try {
    const json = await polygonFetch(
      `/v2/reference/news?ticker=${encodeURIComponent(ticker)}&limit=3&order=desc&sort=published_utc`,
      apiKey
    );

    return Array.isArray(json?.results) ? json.results : [];
  } catch {
    return [];
  }
}

async function fetchDetails(ticker: string, apiKey: string) {
  try {
    const json = await polygonFetch(
      `/v3/reference/tickers/${encodeURIComponent(ticker)}`,
      apiKey
    );

    return json?.results || null;
  } catch {
    return null;
  }
}

function rawTickerSymbol(raw: any) {
  return String(raw?.ticker || raw?.T || raw?.symbol || "").toUpperCase();
}

function normalizeSnapshot(raw: any) {
  const ticker = rawTickerSymbol(raw);

  const prevClose = num(raw?.prevDay?.c);
  const lastTrade = num(raw?.lastTrade?.p);
  const dayClose = num(raw?.day?.c);
  const minClose = num(raw?.min?.c);

  const price =
    lastTrade ||
    dayClose ||
    minClose ||
    (prevClose ? prevClose + num(raw?.todaysChange) : 0);

  let open = num(raw?.day?.o || raw?.min?.o || price);
  let high = num(raw?.day?.h || raw?.min?.h || price * 1.04);
  let low = num(raw?.day?.l || raw?.min?.l || price * 0.96);

  if (price && (!high || !low || high <= low)) {
    high = price * 1.04;
    low = price * 0.96;
  }

  const gain =
    num(raw?.todaysChangePerc) ||
    (prevClose > 0 && price > 0 ? ((price - prevClose) / prevClose) * 100 : 0);

  const change =
    num(raw?.todaysChange) ||
    (prevClose > 0 && price > 0 ? price - prevClose : 0);

  const volume = num(raw?.day?.v || raw?.min?.av || raw?.min?.v || raw?.volume);

  const bid = num(raw?.lastQuote?.p || raw?.bid);
  const ask = num(raw?.lastQuote?.P || raw?.ask);

  return {
    ticker,
    price,
    gain,
    change,
    volume,
    open,
    high,
    low,
    bid,
    ask
  };
}

function makeBackupSnapshot(ticker: string, index: number) {
  const base = [10, 3.92, 7.12, 16.5, 2.18, 0.84, 1.22, 4.4, 8.75, 0.63][index % 10];
  const price = base;
  const support = price * (0.94 + (index % 3) * 0.015);
  const resistance = price * (1.02 + (index % 4) * 0.012);

  return {
    ticker,
    price,
    gain: index < 3 ? 0 : 0.5 + index * 0.4,
    change: 0,
    volume: 45000000 - index * 1800000,
    open: price * 0.98,
    high: resistance,
    low: support,
    bid: price * 0.999,
    ask: price * 1.001,
    backup: true
  };
}

async function enrichTicker(raw: any, apiKey: string, marketMode: string, index: number) {
  const base = normalizeSnapshot(raw);

  if (!base.ticker || !base.price) return null;

  const support = round(base.low || base.price * 0.96);
  const resistance = round(base.high || base.price * 1.04);

  const spread = buildSpreadStatus(base.price, base.bid, base.ask, base.volume);
  const structure = buildStructureLocation(base.price, support, resistance);
  const entries = buildEntries(support, resistance, base.price, structure.structureLocation);

  const volumeSurge = clamp(base.volume / 500000, 0, 20);

  const speed = clamp(
    Math.round(
      base.gain * 0.65 +
        volumeSurge * 9 +
        (spread.spreadStatus === "PASS" || spread.spreadStatus === "LIKELY TIGHT" ? 12 : 0) +
        (structure.structureLocation === "NEAR SUPPORT" || structure.structureLocation === "HEALTHY MIDDLE" ? 8 : 0)
    ),
    0,
    100
  );

  const speedLabel =
    speed >= 85 ? "VIOLENT" :
    speed >= 65 ? "FAST" :
    speed >= 40 ? "ACTIVE" :
    "SLOW";

  const details = apiKey ? await fetchDetails(base.ticker, apiKey) : null;

  const floatProxy = num(
    details?.share_class_shares_outstanding ||
      details?.weighted_shares_outstanding ||
      details?.market_cap / base.price
  );

  const floatData = classifyFloat(floatProxy);

  const news = apiKey ? await fetchNews(base.ticker, apiKey) : [];
  const catalyst = buildCatalystGrade(news);

  const stop = support;
  const target1 = resistance * 1.08;
  const target2 = resistance * 1.18;
  const target3 = resistance * 1.35;

  const risk = Math.max(0, entries.breakoutProofEntry - stop);
  const reward = Math.max(0, target1 - entries.breakoutProofEntry);
  const rr = risk > 0 ? reward / risk : 0;

  const math = buildRunnerMath({
    ticker: base.ticker,
    price: base.price,
    gain: base.gain,
    volume: base.volume,
    volumeSurge,
    speed,
    spreadStatus: spread.spreadStatus,
    structureLocation: structure.structureLocation,
    structureLocationScore: structure.structureLocationScore,
    rr,
    newsScore: catalyst.newsScore,
    floatScore: floatData.floatScore
  });

  const junk = isJunkSymbol(base.ticker);

  let verdict = "NO";
  let rejection = "";

  if (junk) {
    verdict = "NO";
    rejection = "JUNK SYMBOL";
  } else if (base.gain >= 70) {
    verdict = "NO";
    rejection = "EXTENDED 70%+";
  } else if (math.brokenOrExtended) {
    verdict = "NO";
    rejection = structure.riskLocation;
  } else if (base.volume < 100000) {
    verdict = "NO";
    rejection = "LOW VOLUME";
  } else if (spread.spreadStatus === "FAIL") {
    verdict = "NO";
    rejection = "SPREAD RISK";
  } else if (
    math.supportEntryZone &&
    math.proofScore >= 80 &&
    math.signalAlignment >= 2 &&
    math.spreadOk
  ) {
    verdict = "YES";
  } else if (math.resistanceProofZone && math.proofScore >= 60) {
    verdict = "WAIT";
    rejection = "NOT SUPPORT ENTRY";
  } else if (math.proofScore >= 60) {
    verdict = "WAIT";
  } else {
    verdict = "NO";
    rejection = "NO PROOF";
  }

  const permissionText =
    verdict === "YES"
      ? "YES — SUPPORT/MIDDLE ENTRY WITH CONFIRMATION"
      : verdict === "WAIT"
      ? entries.waitFor
      : rejection || "NO CLEAN PERMISSION";

  const actionRank =
    verdict === "YES" ? 3 :
    verdict === "WAIT" ? 2 :
    1;

  return {
    ticker: base.ticker,
    price: round(base.price),
    gain: round(base.gain, 2),
    change: round(base.change),
    volume: Math.round(base.volume),
    open: round(base.open),
    high: round(base.high),
    low: round(base.low),

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

    speed,
    speedLabel,
    volumeSurge: round(volumeSurge, 2),

    spreadStatus: spread.spreadStatus,
    spreadPct: round(spread.spreadPct, 3),
    bid: round(base.bid),
    ask: round(base.ask),

    floatShares: num(details?.share_class_shares_outstanding),
    sharesOutstanding: num(details?.weighted_shares_outstanding),
    floatProxy: Math.round(floatProxy),
    floatStatus: floatData.floatStatus,
    floatScore: floatData.floatScore,

    marketMode,

    gainBand: gainBand(base.gain),
    runnerLane: math.runnerLane,
    bottomIgnitionScore: math.bottomIgnitionScore,
    gainerStructureScore: math.gainerStructureScore,
    runnerScore: math.runnerScore,
    proofScore: math.proofScore,
    ignitionScore: math.bottomIgnitionScore,
    overExtensionPenalty: base.gain >= 70 ? -70 : base.gain >= 55 ? -32 : 0,

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

    catalyst: catalyst.catalyst,
    catalystGrade: catalyst.catalystGrade,
    newsScore: catalyst.newsScore,
    news,

    verdict,
    rejection,
    permissionText,
    candles: index + 1
  };
}

export async function GET() {
  const apiKey =
    process.env.POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_POLYGON_API_KEY ||
    "";

  let marketMode = "LIVE_GAINERS";
  let liveGainersCount = 0;
  let rawList: any[] = [];

  try {
    const gainers = await polygonFetch(
      "/v2/snapshot/locale/us/markets/stocks/gainers",
      apiKey
    );

    rawList = Array.isArray(gainers?.tickers)
      ? gainers.tickers
      : Array.isArray(gainers?.results)
      ? gainers.results
      : [];

    liveGainersCount = rawList.length;
  } catch {
    rawList = [];
  }

  if (!rawList.length) {
    marketMode = "BACKUP_CLOSED_MARKET";

    try {
      const backup = await polygonFetch(
        `/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${BACKUP_UNIVERSE.join(",")}`,
        apiKey
      );

      rawList = Array.isArray(backup?.tickers)
        ? backup.tickers
        : BACKUP_UNIVERSE.map(makeBackupSnapshot);
    } catch {
      rawList = BACKUP_UNIVERSE.map(makeBackupSnapshot);
    }
  }

  const cleaned = rawList
    .filter((x) => rawTickerSymbol(x))
    .slice(0, 20);

  const enrichedRaw = await Promise.all(
    cleaned.map((raw, index) => enrichTicker(raw, apiKey, marketMode, index))
  );

  const enriched = enrichedRaw
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (b.actionRank !== a.actionRank) return b.actionRank - a.actionRank;
      if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
      return b.runnerScore - a.runnerScore;
    });

  return NextResponse.json(
    {
      ok: true,
      source: SOURCE,
      marketMode,
      liveGainersCount,
      count: enriched.length,
      timestamp: new Date().toISOString(),
      rules: {
        bottomIgnition: "support/middle + speed + volume + spread",
        resistance: "WAIT for breakout proof above resistance",
        yes: "support or healthy middle only with proof and alignment",
        topGainers: "danger check, not permission"
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
