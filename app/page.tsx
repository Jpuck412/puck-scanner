"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  support: number;
  resistance: number;
  rangePosition: number;
  entryFormation: number;
  entryAggressive: number;
  entryConfirmation: number;
  entryProof: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rr: number;
  speed: number;
  volumeSurge: number;
  spreadStatus: string;
  catalyst: string;
  proofScore: number;
  ignitionScore: number;
  formationScore: number;
  journeyScore: number;
  runnerStage: string;
  verdict: string;
  rejection: string;
};

type Page =
  | "dashboard"
  | "scanner"
  | "formation"
  | "structure"
  | "news"
  | "help"
  | "glossary"
  | "settings";

type Mode = "FORMATION" | "BOTTOM" | "RANK" | "VOLUME" | "VWAP" | "TOP" | "CUSTOM";

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: number) {
  if (!v || !Number.isFinite(v)) return "N/A";
  return "$" + v.toFixed(v < 1 ? 4 : 2);
}

function pct(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

function vol(v: number) {
  if (!v) return "N/A";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return String(Math.round(v));
}

function isJunk(t: string) {
  const x = t.toUpperCase();
  return x.endsWith("W") || x.endsWith("WS") || x.endsWith("U") || x.endsWith("R");
}

function normalize(s: any): Stock {
  const ticker = String(s?.ticker || "");
  const price = num(s?.price ?? s?.day?.c ?? s?.min?.c ?? ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0)));
  const gain = num(s?.gain ?? s?.todaysChangePerc);
  const change = num(s?.change ?? s?.todaysChange);
  const volume = num(s?.volume ?? s?.day?.v ?? s?.min?.v);
  const open = num(s?.open ?? s?.day?.o ?? s?.min?.o ?? price);

  const low = num(s?.support ?? s?.day?.l ?? s?.low ?? price * 0.94);
  const high = num(s?.resistance ?? s?.day?.h ?? s?.high ?? price * 1.12);

  const support = low;
  const resistance = high;
  const range = Math.max(0.0001, resistance - support);
  const rangePosition = Math.max(0, Math.min(100, ((price - support) / range) * 100));

  const entryFormation = support + range * 0.28;
  const entryAggressive = price <= resistance ? Math.max(price, support + range * 0.38) : resistance * 0.985;
  const entryConfirmation = price < resistance ? resistance * 1.01 : price * 1.01;
  const entryProof = price < resistance ? resistance * 1.035 : price * 1.025;

  const stop = support;
  const target1 = price < resistance ? resistance : price * 1.08;
  const target2 = target1 * 1.12;
  const target3 = target1 * 1.25;

  const risk = Math.max(0, entryProof - stop);
  const reward = Math.max(0, target1 - entryProof);
  const rr = risk > 0 ? reward / risk : 0;

  const volumeSurge = num(s?.volumeSurge ?? s?.structure?.volumeSurge ?? volume / 1000000);
  const speed = Math.min(100, Math.round(gain * 0.25 + volumeSurge * 20));

  const spreadStatus = volume >= 5000000 ? "PASS" : volume >= 1000000 ? "CAUTION" : "CHECK";
  const catalyst = "CHECK NEWS";

  let formationScore = 0;
  if (gain >= 5 && gain <= 35) formationScore += 30;
  else if (gain > 35 && gain <= 75) formationScore += 18;
  else if (gain > 75) formationScore -= 25;

  formationScore += Math.min(25, volumeSurge * 8);
  formationScore += Math.min(20, volume / 500000);
  formationScore += rangePosition >= 20 && rangePosition <= 70 ? 15 : 0;
  formationScore += rr >= 1 ? 10 : 0;
  if (isJunk(ticker)) formationScore -= 30;
  formationScore = Math.max(0, Math.min(100, Math.round(formationScore)));

  let ignitionScore = 0;
  ignitionScore += Math.min(18, Math.max(0, gain * 0.35));
  ignitionScore += Math.min(25, volume / 500000);
  ignitionScore += Math.min(25, volumeSurge * 8);
  ignitionScore += price > 0 && price <= 5 ? 15 : price <= 10 ? 10 : 5;
  ignitionScore += formationScore >= 65 ? 12 : 0;
  if (isJunk(ticker)) ignitionScore -= 30;
  ignitionScore = Math.max(0, Math.min(100, Math.round(ignitionScore)));

  let proofScore = ignitionScore;
  if (rangePosition >= 30 && rangePosition <= 75) proofScore += 8;
  if (volumeSurge >= 5) proofScore += 8;
  if (rr >= 1.2) proofScore += 8;
  if (spreadStatus === "CHECK") proofScore -= 5;
  if (gain >= 75) proofScore -= 20;
  proofScore = Math.max(0, Math.min(100, Math.round(proofScore)));

  const journeyScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(formationScore * 0.45 + ignitionScore * 0.35 + proofScore * 0.2)
    )
  );

  const runnerStage =
    gain >= 75 ? "EXTENDED" :
    formationScore >= 75 && gain <= 35 ? "FORMING" :
    journeyScore >= 80 ? "IGNITING" :
    journeyScore >= 60 ? "WARMING" :
    "WATCH";

  const verdict =
    runnerStage === "EXTENDED" ? "WAIT" :
    proofScore >= 80 && journeyScore >= 70 ? "YES" :
    proofScore >= 55 || formationScore >= 60 ? "WAIT" :
    "NO";

  let rejection = "";
  if (isJunk(ticker)) rejection = "JUNK SYMBOL";
  else if (price < support) rejection = "SUPPORT FAILED";
  else if (gain >= 75) rejection = "EXTENDED / CHASE RISK";
  else if (volume < 100000 && formationScore < 45) rejection = "LOW VOLUME";
  else if (proofScore < 30 && formationScore < 45) rejection = "NO FORMATION";
  else if (spreadStatus === "CHECK" && volumeSurge < 2) rejection = "WEAK TAPE";

  return {
    ticker, price, gain, change, volume, open, high, low,
    support, resistance, rangePosition,
    entryFormation, entryAggressive, entryConfirmation, entryProof,
    stop, target1, target2, target3, risk, reward, rr, speed,
    volumeSurge, spreadStatus, catalyst, proofScore, ignitionScore,
    formationScore, journeyScore, runnerStage, verdict, rejection
  };
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>("FORMATION");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(15);
  const [showRejected, setShowRejected] = useState(false);

  const [minPrice, setMinPrice] = useState(0.1);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minGain, setMinGain] = useState(0);
  const [maxGain, setMaxGain] = useState(75);
  const [minVolume, setMinVolume] = useState(100000);
  const [removeJunk, setRemoveJunk] = useState(true);

  const [manualTicker, setManualTicker] = useState("");
  const [manualSupport, setManualSupport] = useState(28);
  const [manualResistance, setManualResistance] = useState(34);
  const [manualPrice, setManualPrice] = useState(30);

  async function load() {
    setStatus("SCANNING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      const list = json?.data?.tickers || json?.tickers || json?.results || [];
      setStocks(list.map(normalize));
      setStatus(list.length ? "CONNECTED" : "NO LIVE DATA");
      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoScan) return;
    const id = setInterval(load, Math.max(5, refreshSec) * 1000);
    return () => clearInterval(id);
  }, [autoScan, refreshSec]);

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => {
      if (removeJunk && isJunk(s.ticker)) return false;
      if (s.price < minPrice || s.price > maxPrice) return false;
      if (s.gain < minGain || s.gain > maxGain) return false;
      if (s.volume < minVolume) return false;
      return true;
    });

    if (mode === "FORMATION") list = list.sort((a, b) => b.formationScore - a.formationScore);
    if (mode === "BOTTOM") list = list.sort((a, b) => b.ignitionScore - a.ignitionScore);
    if (mode === "RANK") list = list.sort((a, b) => b.journeyScore - a.journeyScore);
    if (mode === "VOLUME") list = list.sort((a, b) => b.volumeSurge - a.volumeSurge);
    if (mode === "VWAP") list = list.sort((a, b) => b.proofScore - a.proofScore);
    if (mode === "TOP") list = list.sort((a, b) => b.gain - a.gain);
    if (mode === "CUSTOM") list = list.sort((a, b) => b.proofScore - a.proofScore);

    return list.slice(0, 30);
  }, [stocks, minPrice, maxPrice, minGain, maxGain, minVolume, removeJunk, mode]);

  const rejected = stocks.filter((s) => s.rejection);
  const top = filtered[0];

  const manualRange = Math.max(0.0001, manualResistance - manualSupport);
  const manualRangePosition = ((manualPrice - manualSupport) / manualRange) * 100;
  const manualFormation = manualSupport + manualRange * 0.28;
  const manualAggressive = Math.max(manualPrice, manualSupport + manualRange * 0.38);
  const manualConfirmation = manualResistance * 1.01;
  const manualProof = manualResistance * 1.035;
  const manualStop = manualSupport;
  const manualTarget1 = manualResistance;
  const manualRisk = manualProof - manualStop;
  const manualReward = manualTarget1 - manualProof;
  const manualRR = manualRisk > 0 ? manualReward / manualRisk : 0;

  return (
    <main className="app">
      <aside className="sidebar">
        <h2>BIG<br />DADDY</h2>
        {["dashboard", "scanner", "formation", "structure", "news", "help", "glossary", "settings"].map((p) => (
          <button key={p} onClick={() => setPage(p as Page)} className={page === p ? "active" : ""}>
            {p.toUpperCase()}
          </button>
        ))}
      </aside>

      <section className="main">
        <header className="hero">
          <div>
            <p>PROOF OF STRUCTURE™ BIG DADDY</p>
            <h1>4AM FORMATION ENGINE</h1>
            <span>Find the 8% → 35% runner before it becomes the 80% chase.</span>
          </div>
          <div className="clock">
            <small>ET CLOCK</small>
            <strong>{time || "LOADING"}</strong>
            <small>Last Scan: {lastScan}</small>
          </div>
        </header>

        {page === "dashboard" && (
          <>
            <section className="modebar">
              {[
                ["FORMATION", "4AM FORMATION"],
                ["BOTTOM", "BOTTOM IGNITION"],
                ["RANK", "JOURNEY SCORE"],
                ["VOLUME", "VOLUME AWAKENING"],
                ["VWAP", "PROOF SCORE"],
                ["TOP", "TOP GAINERS"],
                ["CUSTOM", "CUSTOM"]
              ].map(([k, v]) => (
                <button key={k} onClick={() => setMode(k as Mode)} className={mode === k ? "active" : ""}>{v}</button>
              ))}
            </section>

            <section className="grid3">
              <Panel title="COMMAND CENTER">
                <h3 className={top?.verdict === "YES" ? "big green" : top?.verdict === "NO" ? "big red" : "big yellow"}>
                  {top?.verdict || "WAIT"}
                </h3>
                <Row a="Status" b={status} />
                <Row a="Mode" b={mode} />
                <Row a="Raw" b={stocks.length} />
                <Row a="Showing" b={filtered.length} />
                <Row a="Rejected" b={rejected.length} />
                <Row a="Top" b={top?.ticker || "NONE"} />
                <Row a="Stage" b={top?.runnerStage || "NONE"} />
                <Row a="Formation" b={top?.formationScore || 0} />
                <Row a="Journey" b={top?.journeyScore || 0} />
                <button onClick={load}>RUN SCAN</button>
                <button onClick={() => setAutoScan(!autoScan)}>AUTO: {autoScan ? "ON" : "OFF"}</button>
              </Panel>

              <Panel title="FORMATION FILTERS">
                <div className="filters">
                  <label>Min Price<input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} type="number" /></label>
                  <label>Max Price<input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} type="number" /></label>
                  <label>Min Gain<input value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} type="number" /></label>
                  <label>Max Gain<input value={maxGain} onChange={(e) => setMaxGain(Number(e.target.value))} type="number" /></label>
                  <label>Min Volume<input value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} type="number" /></label>
                  <label>Refresh<input value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} type="number" /></label>
                  <button onClick={() => setRemoveJunk(!removeJunk)}>JUNK: {removeJunk ? "ON" : "OFF"}</button>
                </div>
              </Panel>

              <Panel title="TOP STRUCTURE">
                <Row a="Ticker" b={top?.ticker || "NONE"} />
                <Row a="Support" b={top ? money(top.support) : "N/A"} />
                <Row a="Resistance" b={top ? money(top.resistance) : "N/A"} />
                <Row a="Range Position" b={top ? top.rangePosition.toFixed(0) + "%" : "N/A"} />
                <Row a="Formation Entry" b={top ? money(top.entryFormation) : "N/A"} />
                <Row a="Aggressive" b={top ? money(top.entryAggressive) : "N/A"} />
                <Row a="Confirmation" b={top ? money(top.entryConfirmation) : "N/A"} />
                <Row a="Proof Entry" b={top ? money(top.entryProof) : "N/A"} />
                <Row a="Stop" b={top ? money(top.stop) : "N/A"} />
              </Panel>
            </section>
          </>
        )}

        {page === "scanner" && (
          <Panel title="LIVE RESULTS GRID">
            <div className="table">
              {["Ticker","Price","Gain","Vol","Stage","Form","Journey","Speed","Spread","Support","Resist","Formation","Agg","Conf","Proof","Score","Verdict"].map(h => <b key={h}>{h}</b>)}
              {filtered.map((s) => (
                <div className="rowGrid" key={s.ticker}>
                  <span>{s.ticker}</span>
                  <span>{money(s.price)}</span>
                  <span className={s.gain >= 75 ? "red" : "green"}>{pct(s.gain)}</span>
                  <span>{vol(s.volume)}</span>
                  <span className={s.runnerStage === "EXTENDED" ? "red" : s.runnerStage === "FORMING" || s.runnerStage === "IGNITING" ? "green" : "yellow"}>{s.runnerStage}</span>
                  <span>{s.formationScore}</span>
                  <span>{s.journeyScore}</span>
                  <span>{s.speed}</span>
                  <span className={s.spreadStatus === "PASS" ? "green" : s.spreadStatus === "FAIL" ? "red" : "yellow"}>{s.spreadStatus}</span>
                  <span>{money(s.support)}</span>
                  <span>{money(s.resistance)}</span>
                  <span>{money(s.entryFormation)}</span>
                  <span>{money(s.entryAggressive)}</span>
                  <span>{money(s.entryConfirmation)}</span>
                  <span>{money(s.entryProof)}</span>
                  <span>{s.proofScore}</span>
                  <span className={s.verdict === "YES" ? "green" : s.verdict === "NO" ? "red" : "yellow"}>{s.verdict}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowRejected(!showRejected)}>{showRejected ? "HIDE REJECTED" : "SHOW PERMISSION REMOVED"}</button>
            {showRejected && rejected.map((s) => <Row key={s.ticker} a={s.ticker} b={s.rejection} />)}
          </Panel>
        )}

        {page === "formation" && (
          <Panel title="4AM FORMATION MODE">
            <p className="explain">This mode is separate from normal top gainers. It hunts the runner forming between 5% and 35%, warns at 75%+, and rewards support holding, volume awakening, and range position.</p>
            {filtered.slice(0, 10).map((s) => (
              <div className="card" key={s.ticker}>
                <Row a="Ticker" b={s.ticker} />
                <Row a="Stage" b={s.runnerStage} />
                <Row a="Gain" b={pct(s.gain)} />
                <Row a="Formation Score" b={s.formationScore} />
                <Row a="Journey Score" b={s.journeyScore} />
                <Row a="Entry Formation" b={money(s.entryFormation)} />
                <Row a="Stop" b={money(s.stop)} />
                <Row a="Proof Question" b="What proves I am right?" />
              </div>
            ))}
          </Panel>
        )}

        {page === "structure" && (
          <Panel title="MANUAL STRUCTURE ENGINE">
            <div className="filters">
              <label>Ticker<input value={manualTicker} onChange={(e) => setManualTicker(e.target.value.toUpperCase())} /></label>
              <label>Current Price<input value={manualPrice} onChange={(e) => setManualPrice(Number(e.target.value))} type="number" /></label>
              <label>Support<input value={manualSupport} onChange={(e) => setManualSupport(Number(e.target.value))} type="number" /></label>
              <label>Resistance<input value={manualResistance} onChange={(e) => setManualResistance(Number(e.target.value))} type="number" /></label>
            </div>
            <Row a="Range Position" b={manualRangePosition.toFixed(0) + "%"} />
            <Row a="Formation Entry" b={money(manualFormation)} />
            <Row a="Aggressive Entry" b={money(manualAggressive)} />
            <Row a="Confirmation Entry" b={money(manualConfirmation)} />
            <Row a="Proof Entry" b={money(manualProof)} />
            <Row a="Stop" b={money(manualStop)} />
            <Row a="Target 1" b={money(manualTarget1)} />
            <Row a="Risk/Reward" b={manualRR.toFixed(2)} />
          </Panel>
        )}

        {page === "news" && <Info title="NEWS ENGINE" items={["FDA","Earnings","8-K","Press Release","Offering","Reverse Split","Merger","Government Contract","Analyst Upgrade"]} />}
        {page === "help" && <Info title="HELP CENTER" items={["4AM Formation Mode","Journey Score","Formation Score","Extended Warning","Formation Entry","Aggressive Entry","Confirmation Entry","Proof Entry","Support Hold","Permission Removed"]} />}
        {page === "glossary" && <Info title="GLOSSARY" items={["VWAP","EMA","RVOL","Float","Spread","Support","Resistance","Catalyst","Limit Order","Risk/Reward","Tape","Absorption"]} />}
        {page === "settings" && <Info title="SETTINGS" items={["Big Daddy Clean Rebuild","4AM Formation Separate","Normal Scanner Separate","No Auto Buy Default","Broker Preview Only"]} />}

        <footer>
          Educational only. Not financial advice. Evidence over prediction. No proof = no trade.
        </footer>
      </section>

      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#1d2229;color:#e8f3ff;font-family:Arial,sans-serif}
        .app{display:grid;grid-template-columns:230px minmax(0,1fr);min-height:100vh}
        .sidebar{background:#151a20;border-right:1px solid #31475e;padding:20px;position:sticky;top:0;height:100vh;overflow:auto}
        .sidebar h2{color:#4db7ff;letter-spacing:3px}.sidebar button,.modebar button,button{width:100%;padding:12px;margin:7px 0;border-radius:12px;border:1px solid #39536b;background:#232b34;color:#93d8ff;font-weight:900}
        .active,button:hover{background:#0b77ff!important;color:white!important}
        .main{padding:22px;min-width:0;overflow:auto}.hero,.panel{background:#252c35;border:1px solid #3b536b;border-radius:22px;padding:20px;margin-bottom:16px;box-shadow:0 12px 35px rgba(0,0,0,.35)}
        .hero{display:grid;grid-template-columns:1fr 280px;gap:20px}h1{font-size:58px;margin:5px 0;color:#67c7ff}.hero p,.tag{color:#48aaff;letter-spacing:4px;font-weight:900;font-size:12px}
        .clock strong{font-size:28px;color:#64c7ff}.grid3{display:grid;grid-template-columns:320px 1fr 320px;gap:16px}.modebar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
        .row{display:flex;justify-content:space-between;border-bottom:1px solid #35495f;padding:8px 0;gap:12px}.row span:first-child{color:#9baab8}.row b{color:#dcefff;text-align:right}
        .big{font-size:64px;margin:0}.green{color:#00ff91!important}.red{color:#ff4d5e!important}.yellow{color:#ffd166!important}
        .filters{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.filters label{color:#a9bbcb}.filters input{width:100%;margin-top:6px;padding:11px;border-radius:10px;border:1px solid #45627d;background:#111820;color:#6cc8ff}
        .table{display:grid;grid-template-columns:repeat(17,minmax(110px,1fr));min-width:1900px;overflow:auto;border:1px solid #39536b;border-radius:14px}.table>*{padding:10px;border-bottom:1px solid #34495d}.table b{background:#172230;color:#69c9ff}
        .rowGrid{display:contents}.card{background:#1b222b;border:1px solid #31475e;border-radius:14px;padding:14px;margin:12px 0}.explain{color:#c8d7e6;font-size:16px;line-height:1.5}
        footer{color:#94a7b7;padding:20px}.panel h2{color:#63c4ff}.panel ul{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.panel li{background:#1b222b;border:1px solid #31475e;padding:12px;border-radius:12px;list-style:none}
        @media(max-width:1000px){.app,.hero,.grid3,.modebar,.filters{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.table{grid-template-columns:repeat(17,140px)}}
      `}</style>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><p className="tag">{title}</p>{children}</section>;
}

function Row({ a, b }: { a: string; b: any }) {
  return <div className="row"><span>{a}</span><b>{b}</b></div>;
}

function Info({ title, items }: { title: string; items: string[] }) {
  return <Panel title={title}><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></Panel>;
}
