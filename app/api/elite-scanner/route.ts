export async function GET() {
  try {
    const upstream = await fetch("https://puck-scanner.vercel.app/api/gainers", {
      cache: "no-store",
    });

    const data = await upstream.json();

    return Response.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        source: "proxy",
        error: "Failed to reach live scanner API",
        tickers: [],
        data: { tickers: [] },
      },
      { status: 200 }
    );
  }
}
