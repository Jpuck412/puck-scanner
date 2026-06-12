export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({
      ok: false,
      error: "Missing POLYGON_API_KEY",
      data: { tickers: [] },
      tickers: []
    });
  }

  try {
    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const raw = json?.tickers || [];

    const tickers = raw.map((s: any) => {
      const price =
        s?.day?.c ??
        s?.min?.c ??
        ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0));

      const volume =
        s?.day?.v ??
        s?.min?.v ??
        s?.prevDay?.v ??
        0;

      return {
        ...s,
        ticker: s?.ticker || "",
        todaysChangePerc: s?.todaysChangePerc ?? 0,
        todaysChange: s?.todaysChange ?? 0,
        day: {
          c: price,
          v: volume,
          o: s?.day?.o ?? s?.min?.o ?? price,
          h: s?.day?.h ?? s?.min?.h ?? price,
          l: s?.day?.l ?? s?.min?.l ?? price
        },
        prevDay: {
          c: s?.prevDay?.c ?? 0,
          v: s?.prevDay?.v ?? 0
        }
      };
    });

    return Response.json({
      ok: true,
      source: "polygon",
      count: tickers.length,
      data: { tickers },
      tickers
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: String(error),
      data: { tickers: [] },
      tickers: []
    });
  }
}
