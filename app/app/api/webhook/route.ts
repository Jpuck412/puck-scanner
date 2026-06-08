export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("TradingView Webhook Received:", body);

    return Response.json({
      ok: true,
      message: "Webhook received",
      received: body
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: "Webhook failed",
        error: String(error)
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "PUCK webhook endpoint is live"
  });
}
