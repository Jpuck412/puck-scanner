export async function GET() {
  try {
    const response = await fetch("https://puck-scanner.vercel.app/api/gainers", {
      cache: "no-store",
    });

    const data = await response.json();

    return Response.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        source: "elite-scanner-proxy",
        count: 0,
        tickers: [],
        data: {
          tickers: [],
        },
        error: "Live scanner API unavailable",
      },
      { status: 200 }
    );
  }
}
