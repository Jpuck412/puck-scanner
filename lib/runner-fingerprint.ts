export type HistoricalBar = {
  timestamp: string; open: number; high: number; low: number; close: number; volume: number;
};

export type Fingerprint = {
  time:string; price:number; return1:number; return5:number; volumeRatio:number;
  volumeAcceleration:number; rangePct:number; compression:number; higherLow:boolean;
  higherHigh:boolean; vwapDistancePct:number; breakoutProximityPct:number;
  candleBodyPct:number; upperWickPct:number; lowerWickPct:number; pressure:number;
  timeBucket:string;
};

export type PatternEvent = {
  timestamp:string; eventPrice:number; maxMove5m:number; maxMove15m:number; maxMove30m:number;
  drawdown5m:number; fingerprint:Fingerprint; outcome:"EXPANSION"|"FAILURE";
};

const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const avg=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const pct=(a:number,b:number)=>b?(a/b-1)*100:0;

export function normalizeAlphaVantage(payload:any):HistoricalBar[]{
  const series=payload?.["Time Series (5min)"]??{};
  return Object.entries(series).map(([timestamp,value]:[string,any])=>({
    timestamp,open:n(value?.["1. open"]),high:n(value?.["2. high"]),low:n(value?.["3. low"]),
    close:n(value?.["4. close"]),volume:n(value?.["5. volume"])
  })).filter(b=>b.close>0).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
}

function sessionVWAP(bars:HistoricalBar[],i:number){
  const date=bars[i]?.timestamp.slice(0,10); const session=bars.slice(0,i+1).filter(b=>b.timestamp.slice(0,10)===date);
  let pv=0,v=0; for(const b of session){pv+=((b.high+b.low+b.close)/3)*b.volume;v+=b.volume;}
  return v?pv/v:0;
}

function timeBucket(ts:string){
  const m=ts.match(/(\d\d):(\d\d)/); if(!m)return"UNKNOWN";
  const min=Number(m[1])*60+Number(m[2]);
  if(min<390)return"OVERNIGHT";
  if(min<420)return"4:00-6:59";
  if(min<450)return"7:00-7:29";
  if(min<510)return"7:30-8:29";
  if(min<570)return"8:30-9:29";
  return"REGULAR";
}

export function fingerprintAt(bars:HistoricalBar[],i:number):Fingerprint|null{
  if(i<12||i>=bars.length)return null;
  const b=bars[i],prev=bars[i-1],last5=bars.slice(i-4,i+1),prev5=bars.slice(i-9,i-4);
  const recentRange=Math.max(...last5.map(x=>x.high))-Math.min(...last5.map(x=>x.low));
  const prevRange=Math.max(...prev5.map(x=>x.high))-Math.min(...prev5.map(x=>x.low));
  const rv=avg(last5.map(x=>x.volume)),pv=avg(prev5.map(x=>x.volume));
  const priorLow=Math.min(...bars.slice(i-5,i).map(x=>x.low)),priorHigh=Math.max(...bars.slice(i-5,i).map(x=>x.high));
  const dayVwap=sessionVWAP(bars,i), body=Math.abs(b.close-b.open);
  const upper=b.high-Math.max(b.open,b.close),lower=Math.min(b.open,b.close)-b.low;
  const pressure=((b.close-b.open)/Math.max(0.000001,b.high-b.low))*100;
  return {
    time:b.timestamp,price:b.close,return1:pct(b.close,prev.close),return5:pct(b.close,bars[i-5].close),
    volumeRatio:pv?rv/pv:0,volumeAcceleration:pv?(rv-pv)/pv*100:0,
    rangePct:b.close?recentRange/b.close*100:0,
    compression:prevRange?Math.max(0,Math.min(100,(1-recentRange/prevRange)*100)):0,
    higherLow:b.low>priorLow,higherHigh:b.high>priorHigh,
    vwapDistancePct:dayVwap?pct(b.close,dayVwap):0,
    breakoutProximityPct:priorHigh?pct(b.close,priorHigh):0,
    candleBodyPct:b.close?body/b.close*100:0,
    upperWickPct:b.close?upper/b.close*100:0,
    lowerWickPct:b.close?lower/b.close*100:0,
    pressure:Number(pressure.toFixed(2)),timeBucket:timeBucket(b.timestamp)
  };
}

export function findExpansionEvents(bars:HistoricalBar[],minMovePct=8):PatternEvent[]{
  const out:PatternEvent[]=[];
  for(let i=12;i<bars.length-31;i++){
    const fp=fingerprintAt(bars,i); if(!fp)continue; const base=bars[i].close;
    const f5=bars.slice(i+1,i+7),f15=bars.slice(i+1,i+16),f30=bars.slice(i+1,i+31);
    const move5=pct(Math.max(...f5.map(x=>x.high)),base),move15=pct(Math.max(...f15.map(x=>x.high)),base);
    const move30=pct(Math.max(...f30.map(x=>x.high)),base);
    const dd5=pct(Math.min(...f5.map(x=>x.low)),base);
    if(move15>=minMovePct||dd5<=-5) out.push({
      timestamp:bars[i].timestamp,eventPrice:base,maxMove5m:move5,maxMove15m:move15,maxMove30m:move30,
      drawdown5m:dd5,fingerprint:fp,outcome:move15>=minMovePct?"EXPANSION":"FAILURE"
    });
  }
  return out;
}

const featureKeys:(keyof Fingerprint)[]=["return1","return5","volumeRatio","volumeAcceleration","rangePct","compression","vwapDistancePct","breakoutProximityPct","candleBodyPct","upperWickPct","lowerWickPct","pressure"];

export function similarity(a:Fingerprint,b:Fingerprint){
  let score=0,weight=0;
  for(const k of featureKeys){
    const x=Number(a[k]),y=Number(b[k]); if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const scale=Math.max(1,Math.abs(x),Math.abs(y));
    const w=k==="volumeRatio"||k==="breakoutProximityPct"||k==="pressure"?2:1;
    score+=Math.max(0,1-Math.abs(x-y)/scale)*w; weight+=w;
  }
  for(const [x,y] of [[a.higherLow,b.higherLow],[a.higherHigh,b.higherHigh],[a.timeBucket===b.timeBucket,true] as [boolean,boolean]]){
    score+=(x===y?1.5:0);weight+=1.5;
  }
  return weight?Math.round(score/weight*100):0;
}

export function summarize(events:PatternEvent[],current:Fingerprint){
  const ranked=events.map(e=>({...e,similarity:similarity(current,e.fingerprint)})).sort((a,b)=>b.similarity-a.similarity);
  const sample=ranked.slice(0,50),exp=sample.filter(x=>x.outcome==="EXPANSION"),fail=sample.filter(x=>x.outcome==="FAILURE");
  const buckets=Object.entries(sample.reduce((m,e)=>{const k=e.fingerprint.timeBucket;m[k]??={count:0,exp:0};m[k].count++;if(e.outcome==="EXPANSION")m[k].exp++;return m;},{} as Record<string,{count:number;exp:number}>)).map(([bucket,v])=>({bucket,count:v.count,expansionRate:Math.round(v.exp/v.count*100)}));
  return {
    sampleSize:sample.length,expansionCount:exp.length,failureCount:fail.length,
    expansionRate:sample.length?Math.round(exp.length/sample.length*100):0,
    avgMove15m:exp.length?Number(avg(exp.map(x=>x.maxMove15m)).toFixed(2)):0,
    avgFailure5m:fail.length?Number(avg(fail.map(x=>x.drawdown5m)).toFixed(2)):0,
    timingBuckets:buckets,
    matches:sample.slice(0,8).map(x=>({timestamp:x.timestamp,similarity:x.similarity,outcome:x.outcome,maxMove15m:Number(x.maxMove15m.toFixed(2)),drawdown5m:Number(x.drawdown5m.toFixed(2))}))
  };
}

export function buildUniverseRank(rows:Array<{symbol:string;events:PatternEvent[];current:Fingerprint|null}>){
  return rows.filter(r=>r.current).map(r=>{
    const summary=summarize(r.events,r.current!);
    return {symbol:r.symbol,similarity:summary.matches[0]?.similarity??0,expansionRate:summary.expansionRate,samples:summary.sampleSize,avgMove15m:summary.avgMove15m,timingBuckets:summary.timingBuckets};
  }).sort((a,b)=>b.similarity-a.similarity);
}
