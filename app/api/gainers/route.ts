export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({ ok: false, error: "Missing POLYGON_API_KEY" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const tickers = json?.tickers || [];

    const cleaned = tickers.map((s: any) => {
      const price =
        s?.day?.c ||
        s?.min?.c ||
        (typeof s?.prevDay?.c === "number" && typeof s?.todaysChange === "number"
          ? s.prevDay.c + s.todaysChange
          : 0);

      return {
        ticker: s.ticker,
        gain: s.todaysChangePerc || 0,
        change: s.todaysChange || 0,
        price,
        volume: s?.day?.v || s?.min?.v || 0,
        open: s?.day?.o || s?.min?.o || 0,
        high: s?.day?.h || s?.min?.h || price,
        low: s?.day?.l || s?.min?.l || price,
        prevClose: s?.prevDay?.c || 0
      };
    });

    return Response.json({
      ok: true,
      source: "polygon",
      count: cleaned.length,
      tickers: cleaned
    });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
