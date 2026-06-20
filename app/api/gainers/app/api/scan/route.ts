export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObj = Record<string, any>;

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx] || 0;
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
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({
      ok: false,
      source: "polygon-scan",
      error: "Missing POLYGON_API_KEY",
      count: 0,
      tickers: [],
      data: { tickers: [] }
    });
  }

  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 7);
  const from = fromDate.toISOString().slice(0, 10);

  try {
    const gainersUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`;
    const gainersJson = await safeJson(gainersUrl);

    const raw = Array.isArray(gainersJson?.tickers) ? gainersJson.tickers : [];
    const topRaw = raw.slice(0, 30);

    const scanned = await Promise.all(
      topRaw.map(async (s: AnyObj) => {
        const ticker = String(s?.ticker || "").toUpperCase();

        const price = num(
          s?.day?.c ??
            s?.min?.c ??
            s?.lastTrade?.p ??
            ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0))
        );

        const gain = num(s?.todaysChangePerc ?? s?.gain);
        const change = num(s?.todaysChange ?? s?.change);
        const volume = num(s?.day?.v ?? s?.min?.v ?? s?.volume);
        const open = num(s?.day?.o ?? s?.min?.o ?? price);
        const dayHigh = num(s?.day?.h ?? s?.high ?? price);
        const dayLow = num(s?.day?.l ?? s?.low ?? price);

        let candles: AnyObj[] = [];
        let news: AnyObj[] = [];

        const candleUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
          ticker
        )}/range/1/minute/${from}/${to}?adjusted=true&sort=desc&limit=160&apiKey=${apiKey}`;

        const newsUrl = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(
          ticker
        )}&limit=3&order=desc&sort=published_utc&apiKey=${apiKey}`;

        const [candleJson, newsJson] = await Promise.all([
          safeJson(candleUrl),
          safeJson(newsUrl)
        ]);

        candles = Array.isArray(candleJson?.results) ? candleJson.results : [];
        news = Array.isArray(newsJson?.results) ? newsJson.results : [];

        const recent = candles.slice(0, 80);

        const highs = recent.map((c) => num(c.h)).filter((x) => x > 0);
        const lows = recent.map((c) => num(c.l)).filter((x) => x > 0);
        const vols = recent.map((c) => num(c.v)).filter((x) => x > 0);
        const closes = recent.map((c) => num(c.c)).filter((x) => x > 0);

        let support = lows.length ? percentile(lows, 0.18) : dayLow || price * 0.94;
        let resistance = highs.length ? percentile(highs, 0.82) : dayHigh || price * 1.08;

        if (price > 0 && support >= price) {
          support = lows.length ? Math.min(...lows) : price * 0.94;
        }

        if (price > 0 && resistance <= price) {
          resistance = highs.length ? Math.max(...highs) : price * 1.08;
        }

        if (!support || support <= 0) support = price * 0.94;
        if (!resistance || resistance <= 0) resistance = price * 1.08;

        const oneMinVol = vols[0] || num(s?.min?.v);
        const fiveMinVol = vols.slice(0, 5).reduce((a, b) => a + b, 0);

        const avgOneMinVol = vols.length
          ? vols.reduce((a, b) => a + b, 0) / vols.length
          : 0;

        const volumeSurge = avgOneMinVol > 0 ? oneMinVol / avgOneMinVol : 0;

        const bid = num(s?.lastQuote?.p ?? s?.lastQuote?.bidprice ?? s?.lastQuote?.bp);
        const ask = num(s?.lastQuote?.P ?? s?.lastQuote?.askprice ?? s?.lastQuote?.ap);

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

        const lastClose = closes[0] || price;
        const priorClose = closes[5] || closes[closes.length - 1] || open || price;
        const microTrend = priorClose > 0 ? ((lastClose - priorClose) / priorClose) * 100 : 0;

        const range = Math.max(0, resistance - support);

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

        const junk = isJunkTicker(ticker);

        const headline = news[0]?.title || "";
        const description = news[0]?.description || "";
        const newsClass = classifyNews(headline, description);

        const catalyst =
          headline ||
          (news.length ? "NEWS FOUND" : "NO FRESH NEWS");

        const catalystGrade = newsClass.grade;
        const newsScore = newsClass.score;

        const speedScore = clamp(
          Math.round(gain * 0.45 + volumeSurge * 16 + Math.max(0, microTrend) * 2),
          0,
          100
        );

        let ignitionScore = 0;
        ignitionScore += Math.min(28, Math.max(0, gain) * 0.75);
        ignitionScore += Math.min(22, volume / 500000);
        ignitionScore += Math.min(20, volumeSurge * 5);
        ignitionScore += Math.min(12, speedScore / 8);
        ignitionScore += price > 0 && price <= 1 ? 15 : price <= 5 ? 12 : price <= 10 ? 8 : 3;
        ignitionScore += newsScore;

        if (spreadStatus === "PASS") ignitionScore += 6;
        if (spreadStatus === "FAIL") ignitionScore -= 16;
        if (junk) ignitionScore -= 35;

        ignitionScore = clamp(Math.round(ignitionScore), 0, 100);

        let proofScore = ignitionScore;

        if (price > resistance) proofScore += 8;
        if (price > support && range > 0) proofScore += 5;
        if (rr >= 2) proofScore += 10;
        else if (rr >= 1.25) proofScore += 6;
        else if (rr < 0.75) proofScore -= 8;

        if (volume < 100000) proofScore -= 20;
        if (volumeSurge < 0.8) proofScore -= 6;
        if (microTrend < -1.5) proofScore -= 10;
        if (spreadStatus === "FAIL") proofScore -= 15;
        if (junk) proofScore -= 30;

        proofScore = clamp(Math.round(proofScore), 0, 100);

        const verdict =
          proofScore >= 80 ? "YES" :
          proofScore >= 60 ? "WAIT" :
          "NO";

        let rejection = "";

        if (junk) rejection = "JUNK SYMBOL";
        else if (volume < 100000) rejection = "LOW VOLUME";
        else if (spreadStatus === "FAIL") rejection = "SPREAD RISK";
        else if (volumeSurge < 0.8) rejection = "NO CURRENT SPEED";
        else if (proofScore < 60) rejection = "NO PROOF";

        const speedLabel =
          speedScore >= 85 ? "VIOLENT" :
          speedScore >= 65 ? "FAST" :
          speedScore >= 40 ? "ACTIVE" :
          "SLOW";

        const permissionText =
          verdict === "YES"
            ? "PERMISSION POSSIBLE — STRUCTURE MUST HOLD"
            : verdict === "WAIT"
            ? "WAIT — NEED MORE PROOF"
            : "DENIED — NO CLEAN PERMISSION";

        return {
          ticker,
          price,
          gain,
          change,
          volume,
          open,
          high: dayHigh || resistance,
          low: dayLow || support,
          support,
          resistance,

          entryAggressive,
          entryConfirmation,
          entryProof,
          entry: price,
          stop,
          target: target1,
          target1,
          target2,
          target3,

          risk,
          reward,
          rr,

          oneMinVol,
          fiveMinVol,
          avgOneMinVol,
          volumeSurge,

          bid,
          ask,
          spread,
          spreadPct,
          spreadStatus,

          speed: speedScore,
          speedLabel,
          microTrend,

          catalyst,
          catalystGrade,
          newsScore,
          news: news.map((n) => ({
            title: n?.title || "",
            publisher: n?.publisher?.name || "",
            published_utc: n?.published_utc || "",
            article_url: n?.article_url || "",
            description: n?.description || ""
          })),

          floatStatus: "LOCKED",
          proofScore,
          ignitionScore,
          verdict,
          rejection,
          permissionText,
          candles: candles.length,
          source: "polygon"
        };
      })
    );

    scanned.sort((a, b) => {
      if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
      if (b.ignitionScore !== a.ignitionScore) return b.ignitionScore - a.ignitionScore;
      return b.volume - a.volume;
    });

    return Response.json({
      ok: true,
      source: "polygon-scan",
      count: scanned.length,
      tickers: scanned,
      data: {
        tickers: scanned
      },
      updated: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      ok: false,
      source: "polygon-scan",
      error: error instanceof Error ? error.message : String(error),
      count: 0,
      tickers: [],
      data: {
        tickers: []
      }
    });
  }
}
