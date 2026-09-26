import { buildUniverseRank, findExpansionEvents, fingerprintAt, normalizeAlphaVantage } from "../../../../lib/runner-fingerprint";

async function fetchSymbol(symbol:string,key:string){
  const url=new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function","TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol",symbol);
  url.searchParams.set("interval","5min");
  url.searchParams.set("extended_hours","true");
  url.searchParams.set("outputsize","full");
  url.searchParams.set("apikey",key);
  const res=await fetch(url,{cache:"no-store"}); const payload=await res.json();
  if(payload?.Note||payload?.Information||payload?.["Error Message"]) throw new Error(payload.Note||payload.Information||payload["Error Message"]);
  const bars=normalizeAlphaVantage(payload); const current=fingerprintAt(bars,bars.length-1);
  return {symbol,bars,events:findExpansionEvents(bars,8),current};
}

export async function GET(request:Request){
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  if(!key)return Response.json({ok:false,error:"Missing ALPHA_VANTAGE_API_KEY"},{status:503});
  const {searchParams}=new URL(request.url);
  const raw=(searchParams.get("symbols")||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
  const symbols=[...new Set(raw)].slice(0,10);
  if(!symbols.length)return Response.json({ok:false,error:"Pass symbols=AAA,BBB,CCC"},{status:400});
  const rows=[]; const errors=[];
  for(const symbol of symbols){
    try{
      const x=await fetchSymbol(symbol,key);
      if(x.bars.length)rows.push(x);
    }catch(e){errors.push({symbol,error:String(e)});}
  }
  return Response.json({
    ok:true,source:"alpha-vantage",symbolsRequested:symbols.length,
    symbolsScanned:rows.length,errors,
    ranking:buildUniverseRank(rows),
    rows:rows.map(r=>({symbol:r.symbol,barsAnalyzed:r.bars.length,eventsFound:r.events.length,current:r.current}))
  });
}
