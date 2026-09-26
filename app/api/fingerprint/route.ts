import { fingerprintAt, findExpansionEvents, normalizeAlphaVantage, summarize } from "@/lib/runner-fingerprint";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "IBM").toUpperCase();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return Response.json({ ok:false, error:"Missing ALPHA_VANTAGE_API_KEY", source:"alpha-vantage" }, {status:503});
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function","TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol",symbol);
  url.searchParams.set("interval","5min");
  url.searchParams.set("extended_hours","true");
  url.searchParams.set("outputsize","full");
  url.searchParams.set("apikey",apiKey);

  try {
    const res = await fetch(url, {cache:"no-store"});
    const payload = await res.json();
    if (payload?.Note || payload?.Information || payload?.["Error Message"]) {
      return Response.json({ok:false, error:payload.Note || payload.Information || payload["Error Message"], source:"alpha-vantage"}, {status:429});
    }
    const bars = normalizeAlphaVantage(payload);
    if (!bars.length) return Response.json({ok:false,error:"No historical intraday bars returned.",source:"alpha-vantage"});
    const events = findExpansionEvents(bars, 8);
    const current = fingerprintAt(bars, bars.length - 1);
    return Response.json({
      ok:true, source:"alpha-vantage", symbol,
      barsAnalyzed:bars.length, eventsFound:events.length,
      current,
      summary: current ? summarize(events,current) : null,
      historical: events.slice(-20)
    });
  } catch (error) {
    return Response.json({ok:false,error:String(error),source:"alpha-vantage"},{status:500});
  }
}
