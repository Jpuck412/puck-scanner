"use client";

import { useEffect, useMemo, useState } from "react";

type RawStock = any;

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
};

type Mode = "GAINERS" | "VOLUME" | "PRESSURE" | "REVERSAL" | "SHORT" | "CUSTOM";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalize(s: RawStock): Stock {
  const prevClose = n(s?.prevClose ?? s?.prevDay?.c);
  const change = n(s?.change ?? s?.todaysChange);
  const price = n(s?.price ?? s?.day?.c ?? s?.min?.c ?? (prevClose + change));
  const open = n(s?.open ?? s?.day?.o ?? s?.min?.o ?? price);
  const high = n(s?.high ?? s?.day?.h ?? s?.min?.h ?? price);
  const low = n(s?.low ?? s?.day?.l ?? s?.min?.l ?? price);

  return {
    ticker: String(s?.ticker || ""),
    price,
    gain: n(s?.gain ?? s?.todaysChangePerc),
    change,
    volume: n(s?.volume ?? s?.day?.v ?? s?.min?.v),
    open,
    high,
    low,
    prevClose
  };
}

function money(v: number) {
  if (!v) return "N/A";
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

function junk(t: string) {
  const x = t.toUpperCase();
  return x.endsWith("W") || x.endsWith("WS") || x.endsWith("U") || x.endsWith("R");
}

function speed(s: Stock) {
  if (s.gain >= 100 && s.volume >= 10000000) return "VIOLENT";
  if (s.gain >= 50 && s.volume >= 3000000) return "FAST";
  if (s.gain >= 20 && s.volume >= 500000) return "ACTIVE";
  return "SLOW";
}

function spread(s: Stock) {
  if (s.price < 1 && s.volume < 1000000) return "RISK";
  if (s.volume > 5000000) return "LIKELY TIGHT";
  return "UNKNOWN";
}

function trap(s: Stock) {
  let r = 0;
  if (junk(s.ticker)) r += 35;
  if (s.gain > 150) r += 30;
  if (s.volume < 250000) r += 20;
  if (s.high && s.price < s.high * 0.75) r += 15;
  return Math.min(100, r);
}

function score(s: Stock) {
  let x = 0;
  x += Math.min(35, Math.max(0, s.gain * 0.9));
  x += Math.min(30, s.volume / 350000);
  x += s.price > 0 && s.price <= 5 ? 15 : s.price <= 10 ? 10 : 4;
  x += s.price > s.low ? 8 : 0;
  x += s.high > s.price ? 7 : 0;
  x += junk(s.ticker) ? -35 : 10;
  x -= trap(s) * 0.2;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function verdict(s: Stock) {
  const sc = score(s);
  if (sc >= 80) return "PROOF";
  if (sc >= 60) return "WAIT";
  return "NO";
}

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");

  const [mode, setMode] = useState<Mode>("GAINERS");
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(15);
  const [showRejected, setShowRejected] = useState(false);

  const [minPrice, setMinPrice] = useState(0.1);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minGain, setMinGain] = useState(0);
  const [minVolume, setMinVolume] = useState(100000);
  const [limit, setLimit] = useState(25);
  const [removeJunk, setRemoveJunk] = useState(true);

  async function load() {
    setStatus("SCANNING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      const list = json?.data?.tickers || json?.tickers || json?.results || [];
      setStocks(list.map(normalize));
      setStatus("CONNECTED");
      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();
    const clock = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!autoScan) return;
    const id = setInterval(load, refreshSec * 1000);
    return () => clearInterval(id);
  }, [autoScan, refreshSec]);

  const rejected = useMemo(() => {
    return stocks
      .map((s) => {
        let reason = "";
        if (removeJunk && junk(s.ticker)) reason = "JUNK SYMBOL";
        else if (s.price < minPrice) reason = "PRICE LOW";
        else if (s.price > maxPrice) reason = "PRICE HIGH";
        else if (s.gain < minGain) reason = "GAIN LOW";
        else if (s.volume < minVolume) reason = "VOLUME LOW";
        return { s, reason };
      })
      .filter((x) => x.reason);
  }, [stocks, minPrice, maxPrice, minGain, minVolume, removeJunk]);

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => !rejected.find((r) => r.s.ticker === s.ticker));

    if (mode === "GAINERS") list.sort((a, b) => b.gain - a.gain);
    if (mode === "VOLUME") list.sort((a, b) => b.volume - a.volume);
    if (mode === "PRESSURE") list.sort((a, b) => score(b) - score(a));
    if (mode === "REVERSAL") list.sort((a, b) => b.price - b.low - (a.price - a.low));
    if (mode === "SHORT") list.sort((a, b) => trap(b) - trap(a));
    if (mode === "CUSTOM") list.sort((a, b) => score(b) - score(a));

    return list.slice(0, limit);
  }, [stocks, rejected, mode, limit]);

  const top = filtered[0];

  function safePreset() {
    setMinPrice(0.1);
    setMaxPrice(5);
    setMinGain(20);
    setMinVolume(500000);
    setRemoveJunk(true);
    setLimit(10);
  }

  function openPreset() {
    setMinPrice(0);
    setMaxPrice(50);
    setMinGain(0);
    setMinVolume(0);
    setRemoveJunk(false);
    setLimit(50);
  }

  function fourAmPreset() {
    setMinPrice(0.1);
    setMaxPrice(10);
    setMinGain(5);
    setMinVolume(100000);
    setRemoveJunk(true);
    setLimit(30);
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PROOF OF STRUCTURE™ ELITE</p>
          <h1>MISSION CONTROL</h1>
          <span>Speed. Volume. Spread. Support. Proof.</span>
        </div>
        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Last scan: {lastScan}</small>
        </div>
      </section>

      <section className="modes">
        {["GAINERS", "VOLUME", "PRESSURE", "REVERSAL", "SHORT", "CUSTOM"].map((m) => (
          <button key={m} onClick={() => setMode(m as Mode)} className={mode === m ? "active" : ""}>{m}</button>
        ))}
      </section>

      <section className="grid">
        <aside className="panel permission">
          <p className="tag">COMMAND CENTER</p>
          <h2>{top ? verdict(top) : "WAIT"}</h2>
          <div><span>Status</span><b>{status}</b></div>
          <div><span>Raw</span><b>{stocks.length}</b></div>
          <div><span>Showing</span><b>{filtered.length}</b></div>
          <div><span>Rejected</span><b>{rejected.length}</b></div>
          <div><span>Top</span><b>{top?.ticker || "NONE"}</b></div>
          <div><span>Score</span><b>{top ? score(top) : 0}</b></div>
          <button onClick={load}>RUN SCAN</button>
          <button onClick={() => setAutoScan(!autoScan)}>AUTO SCAN: {autoScan ? "ON" : "OFF"}</button>
          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="panel">
          <p className="tag">PRECISION FILTERS</p>
          <div className="filters">
            <label>Min Price<input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} /></label>
            <label>Max Price<input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label>
            <label>Min Gain %<input type="number" value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} /></label>
            <label>Min Volume<input type="number" value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} /></label>
            <label>Limit<input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></label>
            <label>Refresh Sec<input type="number" value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} /></label>
          </div>
          <div className="actions">
            <button onClick={() => setRemoveJunk(!removeJunk)}>JUNK FILTER: {removeJunk ? "ON" : "OFF"}</button>
            <button onClick={safePreset}>SAFE PRESET</button>
            <button onClick={openPreset}>OPEN FILTERS</button>
            <button onClick={fourAmPreset}>4AM PRESET</button>
            <button onClick={() => setShowRejected(!showRejected)}>{showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}</button>
          </div>

          <div className="radar">
            <div className="circle">
              <strong>{top ? score(top) : "--"}</strong>
              <span>{top?.ticker || "WAIT"}</span>
            </div>
            <div className="statgrid">
              <div>Price <b>{top ? money(top.price) : "N/A"}</b></div>
              <div>Gain <b>{top ? pct(top.gain) : "N/A"}</b></div>
              <div>Volume <b>{top ? vol(top.volume) : "N/A"}</b></div>
              <div>Speed <b>{top ? speed(top) : "N/A"}</b></div>
              <div>Spread <b>{top ? spread(top) : "N/A"}</b></div>
              <div>Trap Risk <b>{top ? trap(top) : "N/A"}</b></div>
            </div>
          </div>
        </section>

        <aside className="panel">
          <p className="tag">DATA QUALITY</p>
          <div><span>Feed</span><b>{status}</b></div>
          <div><span>Mode</span><b>{mode}</b></div>
          <div><span>Auto</span><b>{autoScan ? `${refreshSec}s` : "OFF"}</b></div>
          <div><span>Spread</span><b>ESTIMATED</b></div>
          <div><span>Float</span><b>LOCKED</b></div>
          <div><span>Broker</span><b>PREVIEW ONLY</b></div>
        </aside>
      </section>

      {showRejected && (
        <section className="panel">
          <p className="tag">REJECTION ENGINE</p>
          <div className="cards">
            {rejected.slice(0, 30).map(({ s, reason }) => (
              <article className="card reject" key={s.ticker}>
                <h3>{s.ticker}</h3>
                <div><span>Reason</span><b>{reason}</b></div>
                <div><span>Price</span><b>{money(s.price)}</b></div>
                <div><span>Gain</span><b>{pct(s.gain)}</b></div>
                <div><span>Volume</span><b>{vol(s.volume)}</b></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <p className="tag">LIVE RESULTS GRID</p>
        <div className="table">
          <div className="head">Ticker</div><div className="head">Price</div><div className="head">Gain</div><div className="head">Vol</div><div className="head">Speed</div><div className="head">Spread</div><div className="head">Support</div><div className="head">Resist</div><div className="head">Score</div><div className="head">Proof</div>
          {filtered.map((s) => (
            <>
              <div>{s.ticker}</div><div>{money(s.price)}</div><div className="green">{pct(s.gain)}</div><div>{vol(s.volume)}</div><div>{speed(s)}</div><div>{spread(s)}</div><div>{money(s.low)}</div><div>{money(s.high)}</div><div>{score(s)}</div><div>{verdict(s)}</div>
            </>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="tag">POSITION + BROKER PREVIEW</p>
        <div className="cards">
          {filtered.slice(0, 10).map((s) => {
            const entry = s.price;
            const stop = s.low;
            const target = s.high;
            const risk = Math.max(0, entry - stop);
            const reward = Math.max(0, target - entry);
            const rr = risk ? (reward / risk).toFixed(2) : "N/A";
            return (
              <article className="card" key={s.ticker + "calc"}>
                <h3>{s.ticker}</h3>
                <div><span>Current</span><b>{money(entry)}</b></div>
                <div><span>Entry</span><b>{money(entry)}</b></div>
                <div><span>Stop</span><b>{money(stop)}</b></div>
                <div><span>Risk/Share</span><b>{money(risk)}</b></div>
                <div><span>Target</span><b>{money(target)}</b></div>
                <div><span>R:R</span><b>{rr}</b></div>
                <div><span>Order</span><b>LIMIT ONLY</b></div>
                <button>PREVIEW ONLY</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">LOCKED PRO FEATURES</p>
          <div><span>Real Bid/Ask Spread</span><b>NEXT</b></div>
          <div><span>Real Float Feed</span><b>NEXT</b></div>
          <div><span>IBKR Connect</span><b>LOCKED</b></div>
          <div><span>Webhooks</span><b>LOCKED</b></div>
        </div>
        <div className="panel disclaimer">
          <p className="tag">DISCLAIMER</p>
          <span>Educational and informational software only. Not financial advice. No recommendation to buy or sell securities.</span>
        </div>
      </section>

      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#020202}
        .page{min-height:100vh;padding:22px;color:#f5f5f5;font-family:Arial,sans-serif;background:radial-gradient(circle at top left,rgba(255,182,18,.24),transparent 30%),linear-gradient(135deg,#020202,#090909)}
        .hero,.panel,.card,.clock,.modes button{border-radius:24px;border:1px solid rgba(255,182,18,.25);background:linear-gradient(145deg,#121212,#050505);box-shadow:0 18px 45px rgba(0,0,0,.7)}
        .hero{display:grid;grid-template-columns:1fr 300px;gap:18px;padding:28px}
        .tag{color:#ffb612;letter-spacing:4px;font-size:12px;font-weight:900}
        h1{font-size:clamp(44px,7vw,82px);margin:8px 0;color:#ffb612;text-shadow:0 0 28px rgba(255,182,18,.8)}
        .clock,.panel,.card{padding:18px}.clock strong,b{color:#ffd700}.clock small,span{color:#999}
        .modes{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:18px 0}.active,button:hover{background:#ffb612!important;color:#050505!important}
        button{width:100%;padding:13px;margin-top:10px;border-radius:14px;border:1px solid rgba(255,182,18,.45);background:rgba(255,182,18,.12);color:#ffd700;font-weight:900}
        .grid{display:grid;grid-template-columns:320px 1fr 300px;gap:18px}.permission h2{font-size:70px;color:#ffd700;margin:0}
        .panel div,.card div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,182,18,.12)}
        .filters,.actions,.statgrid{display:grid!important;grid-template-columns:repeat(3,1fr);gap:12px;border:0!important}.actions{grid-template-columns:repeat(5,1fr)}
        label{color:#aaa;font-size:13px} input{width:100%;padding:12px;margin-top:8px;border-radius:12px;border:1px solid rgba(255,182,18,.3);background:#050505;color:#ffd700;font-weight:900}
        .radar{display:grid!important;grid-template-columns:220px 1fr;gap:20px;align-items:center;border:0!important}.circle{height:220px;border-radius:50%;display:grid!important;place-items:center;border:2px solid rgba(255,182,18,.65);background:radial-gradient(circle,rgba(255,182,18,.26),transparent 60%),#050505}
        .circle strong{font-size:64px}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.card h3{color:#ffb612;font-size:28px;margin:0 0 12px}
        .table{display:grid;grid-template-columns:repeat(10,1fr);gap:0;border:1px solid rgba(255,182,18,.2);border-radius:16px;overflow:hidden}.table div{padding:10px;border-bottom:1px solid rgba(255,182,18,.12)}.head{background:rgba(255,182,18,.15);color:#ffd700;font-weight:900}.green{color:#00ff88}
        .final{margin-top:18px;padding:14px;border-radius:14px;text-align:center;background:rgba(255,182,18,.14);color:#ffd700;font-weight:900}
        .bottom{display:grid;grid-template-columns:1fr 1fr;gap:18px}.reject{border-color:rgba(255,77,77,.35)}
        @media(max-width:1100px){.hero,.grid,.modes,.filters,.actions,.radar,.cards,.bottom,.table,.statgrid{grid-template-columns:1fr!important}}
      `}</style>
    </main>
  );
}
