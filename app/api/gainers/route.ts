import { buildMoverDiscovery } from "./moverDiscovery";

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

function num(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isJunkTicker(ticker: string): boolean {
  const x = String(ticker || "").toUpperCase();

  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes(".W") ||
    x.includes("-W")
  );
}

async function safeJson(url: string): Promise<AnyObj | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

function getPolygonKey(): string {
  return (
    process.env.POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_POLYGON_API_KEY ||
    ""
  );
}

function extractPrice(raw: AnyObj): number {
  return num(
    raw?.day?.c ??
      raw?.min?.c ??
      raw?.lastTrade?.p ??
      raw?.last_trade?.price ??
      raw?.fmv ??
      raw?.prevDay?.c ??
      raw?.prev_day?.close
  );
}

function extractPreviousClose(raw: AnyObj, price: number, rawGain: number): number {
  const directPrev = num(
    raw?.prevDay?.c ??
      raw?.prev_day?.close ??
      raw?.previousClose ??
      raw?.previous_close
  );

  if (directPrev > 0) return directPrev;

  if (price > 0 && rawGain !== 0) {
    const impliedPrev = price / (1 + rawGain / 100);
    return Number.isFinite(impliedPrev) && impliedPrev > 0 ? impliedPrev : 0;
  }

  return 0;
}

function extractOpen(raw: AnyObj, previousClose: number): number {
  return num(
    raw?.day?.o ??
      raw?.open ??
      raw?.session?.open ??
      previousClose
  );
}

function extractHigh(raw: AnyObj, price: number): number {
  return num(raw?.day?.h ?? raw?.high ?? raw?.session?.high ?? price);
}

function extractLow(raw: AnyObj, price: number): number {
  return num(raw?.day?.l ?? raw?.low ?? raw?.session?.low ?? price);
}

function extractVolume(raw: AnyObj): number {
  return num(
    raw?.day?.v ??
      raw?.day?.volume ??
      raw?.min?.av ??
      raw?.volume ??
      raw?.session?.volume
  );
}

function extractBid(raw: AnyObj): number {
  return num(
    raw?.lastQuote?.p ??
      raw?.last_quote?.bid ??
      raw?.bid ??
      raw?.quote?.bid
  );
}

function extractAsk(raw: AnyObj): number {
  return num(
    raw?.lastQuote?.P ??
      raw?.last_quote?.ask ??
      raw?.ask ??
      raw?.quote?.ask
  );
}

function buildCore(raw: AnyObj) {
  const ticker = String(raw?.ticker ?? raw?.symbol ?? "").toUpperCase();
  const rawGain = num(
    raw?.todaysChangePerc ??
      raw?.todays_change_perc ??
      raw?.gain ??
      raw?.changePercent
  );

  const price = extractPrice(raw);
  const previousClose = extractPreviousClose(raw, price, rawGain);
  const open = extractOpen(raw, previousClose);
  const high = extractHigh(raw, price);
  const low = extractLow(raw, price);
  const volume = extractVolume(raw);
  const bid = extractBid(raw);
  const ask = extractAsk(raw);

  const computedGain =
    previousClose > 0 && price > 0
      ? ((price - previousClose) / previousClose) * 100
      : rawGain;

  return {
    ticker,
    price,
    previousClose,
    open,
    high,
    low,
    volume,
    averageVolume: num(raw?.averageVolume ?? raw?.avgVolume),
    bid,
    ask,
    gain: computedGain
  };
}

function buildSpreadStatus(spreadPct: number | null, price: number): string {
  if (spreadPct === null) return "UNKNOWN";

  const tight = price < 1 ? 3 : 1.5;
  const bad = price < 1 ? 15 : 8;

  if (spreadPct <= tight) return "PASS";
  if (spreadPct <= bad) return "WATCH";
  return "FAIL";
}

function buildVerdict(params: {
  marketMode: string;
  score: number;
  pctChange: number;
  volume: number;
  safetyCapped: boolean;
  spreadStatus: string;
}): "YES" | "WAIT" | "NO" {
  const { marketMode, score, pctChange, volume, safetyCapped, spreadStatus } =
    params;

  if (marketMode !== "LIVE_GAINERS") return "NO";
  if (safetyCapped) return "NO";
  if (spreadStatus === "FAIL") return "NO";

  if (score >= 70 && pctChange >= 5 && volume >= 25_000) return "YES";
  if (score >= 40 && pctChange > 0) return "WAIT";

  return "NO";
}

function buildStructureLocation(price: number, support: number, resistance: number) {
  if (price <= 0 || support <= 0 || resistance <= 0 || resistance <= support) {
    return "UNKNOWN";
  }

  const range = resistance - support;
  const position = clamp((price - support) / range, 0, 1);

  if (position <= 0.33) return "SUPPORT";
  if (position <= 0.66) return "MIDDLE";
  return "RESISTANCE";
}

function buildEntryPlan(params: {
  price: number;
  support: number;
  resistance: number;
  verdict: string;
}) {
  const { price, support, resistance, verdict } = params;

  const range = Math.max(0, resistance - support);
  const middle = support > 0 && range > 0 ? support + range * 0.5 : price;
  const breakout = resistance > 0 ? resistance * 1.003 : price;

  const stop =
    support > 0
      ? support * 0.985
      : price > 0
      ? price * 0.93
      : 0;

  const target1 =
    resistance > 0
      ? resistance
      : price > 0
      ? price * 1.08
      : 0;

  const target2 = target1 > 0 ? target1 * 1.08 : 0;
  const target3 = target2 > 0 ? target2 * 1.08 : 0;

  let bestEntry = middle;
  let entryType = "WAIT";

  if (verdict === "YES") {
    bestEntry = support > 0 ? support : price;
    entryType = "SUPPORT / PULLBACK";
  }

  if (verdict === "WAIT") {
    bestEntry = breakout;
    entryType = "BREAKOUT PROOF";
  }

  return {
    supportEntry: round(support, 4),
    middleEntry: round(middle, 4),
    breakoutProofEntry: round(breakout, 4),
    bestEntry: round(bestEntry, 4),
    entryType,
    stop: round(stop, 4),
    target1: round(target1, 4),
    target2: round(target2, 4),
    target3: round(target3, 4)
  };
}

function buildTickerRow(raw: AnyObj, marketMode: string) {
  const core = buildCore(raw);

  const mover = buildMoverDiscovery({
    currentPrice: core.price,
    previousClose: core.previousClose,
    openPrice: core.open,
    volume: core.volume,
    averageVolume: core.averageVolume || undefined,
    bid: core.bid || undefined,
    ask: core.ask || undefined,
    price1mAgo: undefined,
    price3mAgo: undefined,
    price5mAgo: undefined
  });

  const support = core.low > 0 ? core.low : core.price;
  const resistance = core.high > 0 ? core.high : core.price;

  const spreadStatus = buildSpreadStatus(mover.spreadPct, core.price);

  const verdict = buildVerdict({
    marketMode,
    score: mover.moverDiscoveryScore,
    pctChange: mover.pctChange,
    volume: core.volume,
    safetyCapped: mover.safetyCapped,
    spreadStatus
  });

  const entryPlan = buildEntryPlan({
    price: core.price,
    support,
    resistance,
    verdict
  });

  return {
    ticker: core.ticker,
    symbol: core.ticker,

    price: round(core.price, 4),
    gain: round(mover.pctChange, 4),
    volume: core.volume,

    support: round(support, 4),
    resistance: round(resistance, 4),
    structureLocation: buildStructureLocation(core.price, support, resistance),

    spreadPct: mover.spreadPct,
    spreadStatus,

    verdict,
    marketMode,

    moverDiscoveryScore: mover.moverDiscoveryScore,
    moverLabel: mover.moverLabel,

    pctChange: mover.pctChange,
    openMove: mover.openMove,
    velocity1m: mover.velocity1m,
    velocity3m: mover.velocity3m,
    velocity5m: mover.velocity5m,
    acceleration: mover.acceleration,
    relativeVolume: mover.relativeVolume,
    dollarVolume: mover.dollarVolume,

    gainScore: mover.gainScore,
    velocityScore: mover.velocityScore,
    accelerationScore: mover.accelerationScore,
    relVolScore: mover.relVolScore,
    dollarVolScore: mover.dollarVolScore,
    spreadScore: mover.spreadScore,

    safetyCapped: mover.safetyCapped,
    hasVelocityData: mover.hasVelocityData,
    hasSpreadData: mover.hasSpreadData,

    ...entryPlan
  };
}

function buildBackupRows(marketMode: string) {
  return BACKUP_UNIVERSE.map((ticker) =>
    buildTickerRow(
      {
        ticker,
        day: {
          c: 0,
          o: 0,
          h: 0,
          l: 0,
          v: 0
        },
        prevDay: {
          c: 0
        }
      },
      marketMode
    )
  );
}

async function getPolygonGainers() {
  const key = getPolygonKey();

  if (!key) {
    return {
      marketMode: "NO_POLYGON_KEY",
      rawTickers: [] as AnyObj[]
    };
  }

  const url =
    `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers` +
    `?apiKey=${encodeURIComponent(key)}`;

  const json = await safeJson(url);

  const rawTickers = Array.isArray(json?.tickers) ? json.tickers : [];

  if (!rawTickers.length) {
    return {
      marketMode: "BACKUP_CLOSED_MARKET",
      rawTickers: [] as AnyObj[]
    };
  }

  return {
    marketMode: "LIVE_GAINERS",
    rawTickers
  };
}

export async function GET() {
  const startedAt = new Date().toISOString();

  try {
    const { marketMode, rawTickers } = await getPolygonGainers();

    const sourceRows =
      rawTickers.length > 0
        ? rawTickers
        : [];

    let tickers =
      sourceRows.length > 0
        ? sourceRows
            .filter((raw) => {
              const ticker = String(raw?.ticker ?? raw?.symbol ?? "").toUpperCase();
              if (!ticker) return false;
              if (isJunkTicker(ticker)) return false;
              return true;
            })
            .map((raw) => buildTickerRow(raw, marketMode))
        : buildBackupRows(marketMode);

    tickers = tickers.filter((row) => row?.ticker);

    tickers.sort((a, b) => {
      const moverDelta =
        num(b?.moverDiscoveryScore) - num(a?.moverDiscoveryScore);
      if (moverDelta !== 0) return moverDelta;

      const pctDelta = num(b?.pctChange) - num(a?.pctChange);
      if (pctDelta !== 0) return pctDelta;

      const accelerationDelta = num(b?.acceleration) - num(a?.acceleration);
      if (accelerationDelta !== 0) return accelerationDelta;

      const velocityDelta = num(b?.velocity1m) - num(a?.velocity1m);
      if (velocityDelta !== 0) return velocityDelta;

      return num(b?.volume) - num(a?.volume);
    });

    tickers = tickers.slice(0, 25);

    return Response.json({
      ok: true,
      branchPurpose: "ELITE_DEV_4_PERCENT_FORMULA_EXPERIMENT",
      marketMode,
      startedAt,
      returnedAt: new Date().toISOString(),
      liveGainersCount: rawTickers.length,
      showing: tickers.length,
      data: {
        tickers
      },
      tickers
    });
  } catch (error: any) {
    const marketMode = "ROUTE_ERROR";
    const tickers = buildBackupRows(marketMode);

    return Response.json(
      {
        ok: false,
        branchPurpose: "ELITE_DEV_4_PERCENT_FORMULA_EXPERIMENT",
        marketMode,
        startedAt,
        returnedAt: new Date().toISOString(),
        error: String(error?.message ?? error),
        data: {
          tickers
        },
        tickers
      },
      { status: 200 }
    );
  }
}
