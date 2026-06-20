export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, any>;

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

function isJunkTicker(ticker: string) {
  const x = String(ticker || "").toUpperCase();

  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes(".")
  );
}

function classifyNews(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  const hotWords = [
    "fda",
    "phase",
    "trial",
    "approval",
    "approved",
    "contract",
    "award",
    "acquisition",
    "merger",
    "partnership",
    "agreement",
    "patent",
    "guidance",
    "earnings",
    "revenue",
    "ai",
    "artificial intelligence",
    "defense",
    "dod",
    "government",
    "nasa",
    "launch",
    "breakthrough",
    "clinical"
  ];

  const dangerWords = [
    "offering",
    "registered direct",
    "atm",
    "dilution",
    "reverse split",
    "bankruptcy",
    "delisting",
    "nasdaq notice",
    "compliance",
    "warrant"
  ];

  let hot = 0;
  let danger = 0;

  hotWords.forEach((w) => {
    if (text.includes(w)) hot += 1;
  });

  dangerWords.forEach((w) => {
    if (text.includes(w)) danger += 1;
  });

  if (danger >= 2) return { grade: "DANGER", score: -20 };
  if (danger === 1 && hot === 0) return { grade: "RISK", score: -10 };
  if (hot >= 3) return { grade: "A", score: 18 };
  if (hot === 2) return { grade: "B", score: 12 };
  if (hot === 1) return { grade: "C", score: 6 };

  return { grade: "NONE", score: 0 };
}

async function safeJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        __error: true,
        status: res.status,
        message: json?.error || json?.message || `HTTP ${res.status}`
      };
    }

    return json;
  } catch (error) {
    return {
      __error: true,
      status: 0,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function getSnapshotTicker(snapshotJson: AnyObj, fallbackTicker: string) {
  const direct = snapshotJson?.ticker;

  if (direct?.ticker) return direct;

  if (direct && !direct?.ticker) {
    return {
      ...direct,
      ticker: fallbackTicker
    };
  }

  return { ticker: fallbackTicker };
}

function buildCoreFromSnapshot(s: AnyObj) {
  const ticker = String(s?.ticker || "").toUpperCase();

  const price = num(
    s?.price ??
      s?.day?.c ??
      s?.min?.c ??
      s?.lastTrade?.p ??
      ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0))
  );

  const volume = num(s?.volume ?? s?.day?.v ?? s?.min?.v ?? s?.prevDay?.v ?? 0);
  const gain = num(s?.gain ?? s?.todaysChangePerc ?? 0);
  const change = num(s?.change ?? s?.todaysChange ?? 0);

  const open = num(s?.open ?? s?.day?.o ?? s?.min?.o ?? price);
  const high = num(s?.high ?? s?.day?.h ?? s?.min?.h ?? price);
  const low = num(s?.low ?? s?.day?.l ?? s?.min?.l ?? price);

  const bid = num(s?.lastQuote?.p ?? s?.lastQuote?.bp ?? s?.bid ?? 0);
  const ask = num(s?.lastQuote?.P ?? s?.lastQuote?.ap ?? s?.ask ?? 0);

  return {
    ticker,
    price,
    volume,
    gain,
    change,
    open,
    high,
    low,
    bid,
    ask
  };
}

function buildCoreWithPrevFallback(
  core: ReturnType<typeof buildCoreFromSnapshot>,
  prevJson: AnyObj
) {
  const prev = Array.isArray(prevJson?.results) ? prevJson.results[0] : null;

  if (!prev) return core;

  const prevClose = num(prev?.c);
  const prevOpen = num(prev?.o);
  const prevHigh = num(prev?.h);
  const prevLow = num(prev?.l);
  const prevVolume = num(prev?.v);

  const price = core.price || prevClose;
  const open = core.open || prevOpen || price;
  const high = core.high || prevHigh || price;
  const low = core.low || prevLow || price;
  const volume = core.volume || prevVolume;

  return {
    ...core,
    price,
    open,
    high,
    low,
    volume,
    change: core.change,
    gain: core.gain
  };
}

function estimateVolumeSurge(volume: number) {
  if (volume >= 10000000) return 5;
  if (volume >= 5000000) return 3;
  if (volume >= 1000000) return 1.5;
  if (volume >= 100000) return 1;
  return 0;
}

function buildSpreadStatus(price: number, volume: number, bid: number, ask: number) {
  const spread = bid > 0 && ask > bid ? ask - bid : 0;
  const spreadPct = spread > 0 && price > 0 ? (spread / price) * 100 : 0;

  let spreadStatus = "CHECK";

  if (spread > 0) {
    if (spreadPct <= 0.35) spreadStatus = "PASS";
    else if (spreadPct <= 1.25) spreadStatus = "CAUTION";
    else spreadStatus = "FAIL";
  } else {
    if (volume >= 5000000) spreadStatus = "PASS";
    else if (volume >= 1000000) spreadStatus = "CAUTION";
    else spreadStatus = "FAIL";
  }

  return { spread, spreadPct, spreadStatus };
}

function buildFloat(details: AnyObj) {
  const sharesOutstanding = num(
    details?.weighted_shares_outstanding ??
      details?.share_class_shares_outstanding ??
      0
  );

  const floatShares = num(
    details?.float_shares ??
      details?.shares_float ??
      details?.float ??
      0
  );

  const floatProxy = floatShares || sharesOutstanding;

  const floatStatus =
    !floatProxy
      ? "UNKNOWN"
      : floatProxy <= 10000000
      ? "MICRO FLOAT"
      : floatProxy <= 50000000
      ? "LOW FLOAT"
      : floatProxy <= 150000000
      ? "MID FLOAT"
      : "HEAVY FLOAT";

  const floatScore =
    !floatProxy
      ? 0
      : floatProxy <= 10000000
      ? 12
      : floatProxy <= 50000000
      ? 8
      : floatProxy <= 150000000
      ? 2
      : -8;

  return {
    floatShares,
    sharesOutstanding,
    floatProxy,
    floatStatus,
    floatScore
  };
}

function buildGainProfile(gain: number) {
  if (gain > 70) {
    return {
      gainBand: "EXTENDED / TRAP RISK",
      gainBandScore: -35,
      overExtensionPenalty: -35,
      hardCap: 49
    };
  }

  if (gain > 55) {
    return {
      gainBand: "LATE / CAUTION",
      gainBandScore: -10,
      overExtensionPenalty: -15,
      hardCap: 69
    };
  }

  if (gain > 35) {
    return {
      gainBand: "STRUCTURED GAINER",
      gainBandScore: 12,
      overExtensionPenalty: -5,
      hardCap: 100
    };
  }

  if (gain >= 5) {
    return {
      gainBand: "FRESH IGNITION",
      gainBandScore: 25,
      overExtensionPenalty: 0,
      hardCap: 100
    };
  }

  if (gain > 0) {
    return {
      gainBand: "EARLY WATCH",
      gainBandScore: 10,
      overExtensionPenalty: 0,
      hardCap: 100
    };
  }

  return {
    gainBand: "NO LIVE GAIN / BACKUP",
    gainBandScore: 0,
    overExtensionPenalty: 0,
    hardCap: 100
  };
}

function buildStructureLocation(
  price: number,
  support: number,
  resistance: number,
  volumeSurge: number,
  speed: number
) {
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
    structureLocationScore = -30;
    riskLocation = "SUPPORT BROKEN";
  } else if (position <= 0.25) {
    structureLocation = "NEAR SUPPORT";
    structureLocationScore = 18;
    riskLocation = "BEST RISK LOCATION";
  } else if (position <= 0.6) {
    structureLocation = "HEALTHY MIDDLE";
    structureLocationScore = 12;
    riskLocation = "CONTROLLED RISK";
  } else if (position <= 0.9) {
    structureLocation = "NEAR RESISTANCE";
    structureLocationScore = 4;
    riskLocation = "WAIT FOR CONFIRMATION";
  } else if (position <= 1.1) {
    structureLocation = "BREAKOUT ZONE";
    structureLocationScore = volumeSurge >= 1.5 || speed >= 65 ? 16 : 6;
    riskLocation = "PROOF REQUIRED";
  } else if (position <= 1.3) {
    structureLocation = "EXTENDED ABOVE RESISTANCE";
    structureLocationScore = -12;
    riskLocation = "CHASE RISK";
  } else {
    structureLocation = "OVEREXTENDED";
    structureLocationScore = -25;
    riskLocation = "DO NOT CHASE";
  }

  return {
    structurePosition: Number(position.toFixed(3)),
    structureLocation,
    structureLocationScore,
    riskLocation
  };
}

function buildRunnerScores(args: {
  gain: number;
  price: number;
  volume: number;
  volumeSurge: number;
  speed: number;
  spreadStatus: string;
  rr: number;
  floatScore: number;
  newsScore: number;
  structureLocationScore: number;
}) {
  const profile = buildGainProfile(args.gain);

  const priceScore =
    args.price > 0 && args.price <= 1 ? 15 :
    args.price <= 5 ? 12 :
    args.price <= 10 ? 8 :
    args.price <= 20 ? 3 :
    -8;

  const volumeScore =
    args.volume >= 5000000 ? 18 :
    args.volume >= 1000000 ? 12 :
    args.volume >= 100000 ? 5 :
    -12;

  const speedScore = Math.min(18, Math.max(0, args.speed) / 5);
  const surgeScore = Math.min(20, args.volumeSurge * 6);

  const spreadScore =
    args.spreadStatus === "PASS" ? 10 :
    args.spreadStatus === "CAUTION" ? 2 :
    -22;

  const rrScore =
    args.rr >= 2 ? 10 :
    args.rr >= 1.25 ? 6 :
    args.rr >= 0.75 ? 0 :
    -8;

  const catalystScore = clamp(args.newsScore, -20, 12);
  const locationScore = clamp(args.structureLocationScore, -30, 18);

  let bottomIgnitionScore = 0;
  bottomIgnitionScore += profile.gainBand === "FRESH IGNITION" ? 25 : 0;
  bottomIgnitionScore += profile.gainBand === "EARLY WATCH" ? 12 : 0;
  bottomIgnitionScore += profile.gainBand === "STRUCTURED GAINER" ? 6 : 0;
  bottomIgnitionScore += volumeScore;
  bottomIgnitionScore += surgeScore;
  bottomIgnitionScore += speedScore;
  bottomIgnitionScore += spreadScore;
  bottomIgnitionScore += priceScore;
  bottomIgnitionScore += args.floatScore;
  bottomIgnitionScore += catalystScore;
  bottomIgnitionScore += rrScore;
  bottomIgnitionScore += locationScore;
  bottomIgnitionScore += profile.overExtensionPenalty;

  let gainerStructureScore = 0;
  gainerStructureScore += profile.gainBand === "STRUCTURED GAINER" ? 24 : 0;
  gainerStructureScore += profile.gainBand === "FRESH IGNITION" ? 18 : 0;
  gainerStructureScore += profile.gainBand === "LATE / CAUTION" ? 4 : 0;
  gainerStructureScore += volumeScore;
  gainerStructureScore += Math.min(16, Math.max(0, args.speed) / 6);
  gainerStructureScore += spreadScore;
  gainerStructureScore += rrScore;
  gainerStructureScore += catalystScore;
  gainerStructureScore += args.floatScore;
  gainerStructureScore += locationScore;
  gainerStructureScore += profile.overExtensionPenalty;

  bottomIgnitionScore = clamp(Math.round(bottomIgnitionScore), 0, profile.hardCap);
  gainerStructureScore = clamp(Math.round(gainerStructureScore), 0, profile.hardCap);

  const runnerScore = Math.max(bottomIgnitionScore, gainerStructureScore);

  const runnerLane =
    args.gain > 70
      ? "EXTENDED / TRAP RISK"
      : bottomIgnitionScore >= gainerStructureScore
      ? "BOTTOM / MIDDLE IGNITION"
      : "GAINER STRUCTURE";

  return {
    ...profile,
    bottomIgnitionScore,
    gainerStructureScore,
    runnerScore,
    runnerLane
  };
}

async function enrichTicker(s: AnyObj, apiKey: string, marketMode: string) {
  let core = buildCoreFromSnapshot(s);
  const ticker = core.ticker;

  const newsUrl = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(
    ticker
  )}&limit=3&order=desc&sort=published_utc&apiKey=${apiKey}`;

  const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(
    ticker
  )}?apiKey=${apiKey}`;

  const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    ticker
  )}/prev?adjusted=true&apiKey=${apiKey}`;

  const needsPrevFallback =
    !core.price || !core.high || !core.low || !core.volume || marketMode === "BACKUP_CLOSED_MARKET";

  const [newsJson, detailsJson, prevJson] = await Promise.all([
    safeJson(newsUrl),
    safeJson(detailsUrl),
    needsPrevFallback ? safeJson(prevUrl) : Promise.resolve(null)
  ]);

  if (needsPrevFallback && prevJson && !prevJson.__error) {
    core = buildCoreWithPrevFallback(core, prevJson);
  }

  const newsRaw = Array.isArray(newsJson?.results) ? newsJson.results : [];
  const details = detailsJson?.results || {};

  const headline = String(newsRaw?.[0]?.title || "");
  const description = String(newsRaw?.[0]?.description || "");
  const newsClass = classifyNews(headline, description);

  const catalyst = headline || "NO FRESH NEWS FOUND";
  const catalystGrade = newsClass.grade;
  const newsScore = newsClass.score;

  const floatData = buildFloat(details);

  const { spread, spreadPct, spreadStatus } = buildSpreadStatus(
    core.price,
    core.volume,
    core.bid,
    core.ask
  );

  const support = core.low > 0 ? core.low : core.price > 0 ? core.price * 0.94 : 0;
  const resistance = core.high > 0 ? core.high : core.price > 0 ? core.price * 1.08 : 0;

  const entryAggressive = resistance * 0.985;
  const entryConfirmation = resistance * 1.01;
  const entryProof = resistance * 1.045;

  const stop = support;
  const target1 = resistance * 1.08;
  const target2 = resistance * 1.18;
  const target3 = resistance * 1.35;

  const risk = Math.max(0, entryProof - stop);
  const reward = Math.max(0, target1 - entryProof);
  const rr = risk > 0 ? reward / risk : 0;

  const volumeSurge = estimateVolumeSurge(core.volume);
  const speed = clamp(Math.round(core.gain * 0.45 + volumeSurge * 16), 0, 100);

  const speedLabel =
    speed >= 85 ? "VIOLENT" :
    speed >= 65 ? "FAST" :
    speed >= 40 ? "ACTIVE" :
    "SLOW";

  const location = buildStructureLocation(
    core.price,
    support,
    resistance,
    volumeSurge,
    speed
  );

  const junk = isJunkTicker(ticker);

  const runner = buildRunnerScores({
    gain: core.gain,
    price: core.price,
    volume: core.volume,
    volumeSurge,
    speed,
    spreadStatus,
    rr,
    floatScore: floatData.floatScore,
    newsScore,
    structureLocationScore: location.structureLocationScore
  });

  let ignitionScore = runner.bottomIgnitionScore;
  let proofScore = runner.runnerScore;

  if (spreadStatus === "FAIL") proofScore -= 10;
  if (core.volume < 100000) proofScore -= 15;

  if (junk) {
    ignitionScore -= 35;
    proofScore -= 35;
  }

  if (core.gain > 70) proofScore = Math.min(proofScore, 49);
  if (core.gain > 55 && core.gain <= 70) proofScore = Math.min(proofScore, 69);

  ignitionScore = clamp(Math.round(ignitionScore), 0, 100);
  proofScore = clamp(Math.round(proofScore), 0, 100);

  const supportEntryZone =
  location.structureLocation === "NEAR SUPPORT" ||
  location.structureLocation === "HEALTHY MIDDLE";

const resistanceProofZone =
  location.structureLocation === "NEAR RESISTANCE" ||
  location.structureLocation === "BREAKOUT ZONE";

const verdict =
  marketMode === "BACKUP_CLOSED_MARKET" ? "NO" :
  core.gain > 70 ? "NO" :
  proofScore >= 80 && supportEntryZone ? "YES" :
  proofScore >= 60 ? "WAIT" :
  resistanceProofZone && proofScore >= 80 ? "WAIT" :
  "NO";

  let rejection = "";

  if (junk) rejection = "JUNK SYMBOL";
  else if (core.gain > 70) rejection = "EXTENDED 70%+";
  else if (core.gain > 55) rejection = "LATE GAINER RISK";
  else if (core.volume < 100000) rejection = "LOW VOLUME";
  else if (spreadStatus === "FAIL") rejection = "SPREAD RISK";
  else if (!supportEntryZone && proofScore >= 80) rejection = "NOT SUPPORT ENTRY";
  else if (proofScore < 60) rejection = "NO PROOF";

  const permissionText =
    marketMode === "BACKUP_CLOSED_MARKET"
      ? `BACKUP MODE — ${runner.runnerLane}`
      : core.gain > 70
      ? "DENIED — EXTENDED 70%+ / CHASE RISK"
      : verdict === "YES"
      ? `${runner.runnerLane} — PERMISSION POSSIBLE IF STRUCTURE HOLDS`
      : verdict === "WAIT"
      ? `${runner.runnerLane} — WAIT FOR PROOF`
      : "DENIED — NO CLEAN PERMISSION";

  return {
    ...s,

    ticker,
    price: core.price,
    gain: core.gain,
    change: core.change,
    volume: core.volume,
    open: core.open,
    high: core.high,
    low: core.low,

    day: {
      c: core.price,
      v: core.volume,
      o: core.open,
      h: core.high,
      l: core.low
    },

    prevDay: {
      c: num(s?.prevDay?.c ?? 0),
      v: num(s?.prevDay?.v ?? 0)
    },

    bid: core.bid,
    ask: core.ask,
    spread,
    spreadPct,
    spreadStatus,

    support,
    resistance,
    entryAggressive,
    entryConfirmation,
    entryProof,
    entry: core.price,
    stop,
    target: target1,
    target1,
    target2,
    target3,
    risk,
    reward,
    rr,

    speed,
    speedLabel,
    volumeSurge,

    ...floatData,

    catalyst,
    catalystGrade,
    newsScore,
    news: newsRaw.map((n: any) => ({
      title: n?.title || "",
      publisher: n?.publisher?.name || "",
      published_utc: n?.published_utc || "",
      article_url: n?.article_url || "",
      description: n?.description || ""
    })),

    gainBand: runner.gainBand,
    runnerLane: runner.runnerLane,
    bottomIgnitionScore: runner.bottomIgnitionScore,
    gainerStructureScore: runner.gainerStructureScore,
    runnerScore: runner.runnerScore,
    overExtensionPenalty: runner.overExtensionPenalty,

    structurePosition: location.structurePosition,
    structureLocation: location.structureLocation,
    structureLocationScore: location.structureLocationScore,
    riskLocation: location.riskLocation,

    ignitionScore,
    proofScore,
    verdict,
    rejection,
    permissionText,
    marketMode
  };
}

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({
      ok: false,
      source: "polygon-runner-structure-v2",
      error: "Missing POLYGON_API_KEY",
      count: 0,
      marketMode: "NO_API_KEY",
      data: { tickers: [] },
      tickers: []
    });
  }

  try {
    const gainersUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`;
    const gainersRes = await safeJson(gainersUrl);

    const rawGainers = Array.isArray(gainersRes?.tickers) ? gainersRes.tickers : [];

    let marketMode = "LIVE_GAINERS";
    let raw: AnyObj[] = rawGainers.slice(0, 40);

    if (!raw.length) {
      marketMode = "BACKUP_CLOSED_MARKET";

      const backupSnapshots = await Promise.all(
        BACKUP_UNIVERSE.map(async (ticker) => {
          const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
            ticker
          )}?apiKey=${apiKey}`;

          const snap = await safeJson(url);

          if (snap?.__error) {
            return { ticker };
          }

          return getSnapshotTicker(snap, ticker);
        })
      );

      raw = backupSnapshots;
    }

    const tickers = await Promise.all(
      raw.map((s: AnyObj) => enrichTicker(s, apiKey, marketMode))
    );

    tickers.sort((a, b) => {
      if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
      if (b.bottomIgnitionScore !== a.bottomIgnitionScore) {
        return b.bottomIgnitionScore - a.bottomIgnitionScore;
      }
      if (b.gainerStructureScore !== a.gainerStructureScore) {
        return b.gainerStructureScore - a.gainerStructureScore;
      }
      return b.volume - a.volume;
    });

    return Response.json({
      ok: true,
      source: "polygon-runner-structure-v2",
      marketMode,
      liveGainersCount: rawGainers.length,
      count: tickers.length,
      updated: new Date().toISOString(),
      data: { tickers },
      tickers
    });
  } catch (error) {
    return Response.json({
      ok: false,
      source: "polygon-runner-structure-v2",
      error: error instanceof Error ? error.message : String(error),
      count: 0,
      marketMode: "ERROR",
      data: { tickers: [] },
      tickers: []
    });
  }
}
