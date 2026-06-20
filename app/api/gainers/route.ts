export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      error: "Missing POLYGON_API_KEY",
      count: 0,
      data: { tickers: [] },
      tickers: []
    });
  }

  try {
    const gainersRes = await safeJson(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`
    );

    const raw = Array.isArray(gainersRes?.tickers) ? gainersRes.tickers : [];
    const topRaw = raw.slice(0, 20);

    const tickers = await Promise.all(
      topRaw.map(async (s: any) => {
        const ticker = String(s?.ticker || "").toUpperCase();

        const price = num(
          s?.day?.c ??
            s?.min?.c ??
            s?.lastTrade?.p ??
            ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0))
        );

        const volume = num(s?.day?.v ?? s?.min?.v ?? s?.prevDay?.v ?? 0);
        const gain = num(s?.todaysChangePerc ?? 0);
        const change = num(s?.todaysChange ?? 0);

        const open = num(s?.day?.o ?? s?.min?.o ?? price);
        const high = num(s?.day?.h ?? s?.min?.h ?? price);
        const low = num(s?.day?.l ?? s?.min?.l ?? price);

        const bid = num(s?.lastQuote?.p ?? s?.lastQuote?.bp ?? 0);
        const ask = num(s?.lastQuote?.P ?? s?.lastQuote?.ap ?? 0);

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

        const newsUrl = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(
          ticker
        )}&limit=3&order=desc&sort=published_utc&apiKey=${apiKey}`;

        const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(
          ticker
        )}?apiKey=${apiKey}`;

        const [newsJson, detailsJson] = await Promise.all([
          safeJson(newsUrl),
          safeJson(detailsUrl)
        ]);

        const newsRaw = Array.isArray(newsJson?.results) ? newsJson.results : [];
        const details = detailsJson?.results || {};

        const headline = String(newsRaw?.[0]?.title || "");
        const description = String(newsRaw?.[0]?.description || "");
        const newsClass = classifyNews(headline, description);

        const catalyst = headline || "NO FRESH NEWS FOUND";
        const catalystGrade = newsClass.grade;
        const newsScore = newsClass.score;

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

        const support = low > 0 ? low : price * 0.94;
        const resistance = high > 0 ? high : price * 1.08;

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

        const volumeSurge =
          volume >= 10000000 ? 5 :
          volume >= 5000000 ? 3 :
          volume >= 1000000 ? 1.5 :
          volume >= 100000 ? 1 :
          0;

        const speed = clamp(
          Math.round(gain * 0.45 + volumeSurge * 16),
          0,
          100
        );

        const speedLabel =
          speed >= 85 ? "VIOLENT" :
          speed >= 65 ? "FAST" :
          speed >= 40 ? "ACTIVE" :
          "SLOW";

        const junk = isJunkTicker(ticker);

        let ignitionScore = 0;
        ignitionScore += Math.min(28, Math.max(0, gain) * 0.75);
        ignitionScore += Math.min(22, volume / 500000);
        ignitionScore += Math.min(20, volumeSurge * 5);
        ignitionScore += Math.min(12, speed / 8);
        ignitionScore += price > 0 && price <= 1 ? 15 : price <= 5 ? 12 : price <= 10 ? 8 : 3;
        ignitionScore += newsScore;
        ignitionScore += floatScore;

        if (spreadStatus === "PASS") ignitionScore += 6;
        if (spreadStatus === "FAIL") ignitionScore -= 16;
        if (junk) ignitionScore -= 35;

        ignitionScore = clamp(Math.round(ignitionScore), 0, 100);

        let proofScore = ignitionScore;

        if (rr >= 2) proofScore += 10;
        else if (rr >= 1.25) proofScore += 6;
        else if (rr < 0.75) proofScore -= 8;

        if (volume < 100000) proofScore -= 20;
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
        else if (proofScore < 60) rejection = "NO PROOF";

        const permissionText =
          verdict === "YES"
            ? "PERMISSION POSSIBLE — STRUCTURE MUST HOLD"
            : verdict === "WAIT"
            ? "WAIT — NEED MORE PROOF"
            : "DENIED — NO CLEAN PERMISSION";

        return {
          ...s,

          ticker,
          price,
          gain,
          change,
          volume,
          open,
          high,
          low,

          day: {
            c: price,
            v: volume,
            o: open,
            h: high,
            l: low
          },

          prevDay: {
            c: num(s?.prevDay?.c ?? 0),
            v: num(s?.prevDay?.v ?? 0)
          },

          bid,
          ask,
          spread,
          spreadPct,
          spreadStatus,

          support,
          resistance,
          entryAggressive,
          entryConfirmation,
          entryProof,
          stop,
          target1,
          target2,
          target3,
          risk,
          reward,
          rr,

          speed,
          speedLabel,
          volumeSurge,

          floatShares,
          sharesOutstanding,
          floatProxy,
          floatStatus,
          floatScore,

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

          ignitionScore,
          proofScore,
          verdict,
          rejection,
          permissionText
        };
      })
    );

    tickers.sort((a, b) => {
      if (b.proofScore !== a.proofScore) return b.proofScore - a.proofScore;
      if (b.ignitionScore !== a.ignitionScore) return b.ignitionScore - a.ignitionScore;
      return b.volume - a.volume;
    });

    return Response.json({
      ok: true,
      source: "polygon-gainers-news-float",
      count: tickers.length,
      data: { tickers },
      tickers
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      count: 0,
      data: { tickers: [] },
      tickers: []
    });
  }
}
