export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "Missing POLYGON_API_KEY" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${apiKey}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    return Response.json({
      ok: true,
      source: "polygon",
      count: data?.tickers?.length || 0,
      data
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
