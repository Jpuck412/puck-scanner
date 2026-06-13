export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({
      ok: false,
      error: "Missing POLYGON_API_KEY",
      count: 0,
      tickers: []
    });
  }

  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 5);
  const from = fromDate.toISOString().slice(0, 10);

  try {
    const gainersRes = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`,
      { cache: "no-store" }
    );

    const gainersJson = await gainersRes.json();
    const raw = gainersJson?.tickers || [];

    const topRaw = raw.slice(0, 20);

    const scanned = await Promise.all(
      topRaw.map(async (s: any) => {
        const ticker = s?.ticker || "";

        const basePrice =
          s?.day?.c ??
          s?.min?.c ??
          ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0));

        let candles: any[] = [];

        try {
          const candleRes = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${from}/${to}?adjusted=true&sort=desc&limit=120&apiKey=${apiKey}`,
            { cache: "no-store" }
          );

          const candleJson = await candleRes.json();
          candles = candleJson?.results || [];
        } catch {
          candles = [];
        }

        const highs = candles.map((c) => Number(c.h || 0)).filter(Boolean);
        const lows = candles.map((c) => Number(c.l || 0)).filter(Boolean);
        const vols = candles.map((c) => Number(c.v || 0)).filter(Boolean);

        const price = Number(basePrice || 0);
        const support = lows.length ? Math.min(...lows.slice(0, 60)) : Number(s?.day?.l ?? price);
        const resistance = highs.length ? Math.max(...highs.slice(0, 60)) : Number(s?.day?.h ?? price);

        const oneMinVol = vols[0] || Number(s?.min?.v || 0);
        const fiveMinVol = vols.slice(0, 5).reduce((a, b) => a + b, 0);
        const avgOneMinVol =
          vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;

        const volumeSurge =
          avgOneMinVol > 0 ? oneMinVol / avgOneMinVol : 0;

        const gain = Number(s?.todaysChangePerc || 0);
        const volume = Number(s?.day?.v ?? s?.min?.v ?? 0);
        const change = Number(s?.todaysChange || 0);
        const open = Number(s?.day?.o ?? s?.min?.o ?? price);
        const high = Number(s?.day?.h ?? resistance ?? price);
        const low = Number(s?.day?.l ?? support ?? price);

        const risk = Math.max(0, price - support);
        const reward = Math.max(0, resistance - price);
        const rr = risk > 0 ? reward / risk : 0;

        const spreadEstimate =
          volume >= 5000000 ? "LIKELY TIGHT" :
          volume >= 1000000 ? "CHECK" :
          "RISK";

        const speed =
          volumeSurge >= 5 ? "VIOLENT" :
          volumeSurge >= 2.5 ? "FAST" :
          volumeSurge >= 1.2 ? "ACTIVE" :
          "SLOW";

        let proofScore = 0;
        proofScore += Math.min(30, gain * 0.7);
        proofScore += Math.min(25, volume / 500000);
        proofScore += Math.min(20, volumeSurge * 5);
        proofScore += price > 0 && price <= 5 ? 15 : price <= 10 ? 10 : 5;
        proofScore += rr >= 2 ? 10 : rr >= 1 ? 5 : 0;

        const junk =
          ticker.endsWith("W") ||
          ticker.endsWith("WS") ||
          ticker.endsWith("U") ||
          ticker.endsWith("R");

        if (junk) proofScore -= 35;

        proofScore = Math.max(0, Math.min(100, Math.round(proofScore)));

        const verdict =
          proofScore >= 80 ? "PROOF" :
          proofScore >= 60 ? "WAIT" :
          "NO";

        return {
          ticker,
          price,
          gain,
          change,
          volume,
          open,
          high,
          low,
          support,
          resistance,
          entry: price,
          stop: support,
          target: resistance,
          risk,
          reward,
          rr,
          oneMinVol,
          fiveMinVol,
          volumeSurge,
          speed,
          spreadEstimate,
          floatStatus: "LOCKED",
          proofScore,
          verdict,
          candles: candles.length
        };
      })
    );

    scanned.sort((a, b) => b.proofScore - a.proofScore);

    return Response.json({
      ok: true,
      source: "polygon-scan",
      count: scanned.length,
      tickers: scanned
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: String(error),
      count: 0,
      tickers: []
    });
  }
}
