"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  ticker: string;
  gain: number;
  change: number;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
};

function money(n: number) {
  if (!n || Number.isNaN(n)) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(n: number) {
  if (Number.isNaN(n)) return "N/A";
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(n: number) {
  if (!n || Number.isNaN(n)) return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function junk(ticker: string) {
  const t = ticker.toUpperCase();
  return t.endsWith("W") || t.endsWith("WS") || t.endsWith("U") || t.endsWith("R");
}

function score(s: Stock) {
  let x = 0;
  x += Math.min(40, Math.max(0, s.gain * 1.1));
  x += Math.min(35, s.volume / 250000);
  x += s.price > 0 && s.price <= 5 ? 15 : s.price <= 20 ? 7 : 0;
  x += junk(s.ticker) ? -30 : 10;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function verdict(n: number) {
  if (n >= 80) return "YES";
  if (n >= 60) return "WAIT";
  return "NO";
}

function reject(s: Stock, maxPrice: number, minPrice: number, minVol: number, minGain: number, removeJunk: boolean) {
  if (removeJunk && junk(s.ticker)) return "JUNK SYMBOL";
  if (s.price < minPrice) return "PRICE TOO LOW";
  if (s.price > maxPrice) return "PRICE TOO HIGH";
  if (s.volume < minVol) return "LOW VOLUME";
  if (s.gain < minGain) return "WEAK GAIN";
  return "";
}

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [showRejected, setShowRejected] = useState(false);

  const [maxPrice, setMaxPrice] = useState(5);
  const [minPrice, setMinPrice] = useState(0.1);
  const [minVol, setMinVol] = useState(500000);
  const [minGain, setMinGain] = useState(20);
  const [removeJunk, setRemoveJunk] = useState(true);

  async function load() {
    setStatus("LOADING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      setStocks(json?.tickers || []);
      setStatus(json?.ok ? "CONNECTED" : "ERROR");
      setLastScan(new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }));
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return stocks
      .filter((s) => !reject(s, maxPrice, minPrice, minVol, minGain, removeJunk))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10);
  }, [stocks, maxPrice, minPrice, minVol, minGain, removeJunk]);

  const rejected = useMemo(() => {
    return stocks
      .map((s) => ({ s, reason: reject(s, maxPrice, minPrice, minVol, minGain, removeJunk) }))
      .filter((x) => x.reason)
      .slice(0, 20);
  }, [stocks, maxPrice, minPrice, minVol, minGain, removeJunk]);

  const top = filtered[0];
  const topScore = top ? score(top) : 0;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PROOF OF STRUCTURE™</p>
          <h1>MISSION CONTROL</h1>
          <span>The market must earn permission.</span>
        </div>
        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Last Scan: {lastScan}</small>
        </div>
      </section>

      <section className="notice">
        <b>4AM–8PM WORKFLOW</b>
        <span>Regular Polygon gainers live now. Premarket feed will be connected next without breaking this scanner.</span>
      </section>

      <section className="dash">
        <aside className="panel permission">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>{verdict(topScore)}</h2>
          <div className="row"><span>Feed</span><b>{status}</b></div>
          <div className="row"><span>Raw Count</span><b>{stocks.length}</b></div>
          <div className="row"><span>Filtered</span><b>{filtered.length}</b></div>
          <div className="row"><span>Top Ticker</span><b>{top?.ticker || "NONE"}</b></div>
          <div className="row"><span>Top Score</span><b>{topScore}</b></div>
          <button onClick={load}>NEW SCAN</button>
          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="panel">
          <p className="tag">FILTER CONTROL</p>
          <div className="filters">
            <label>Max Price<input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} type="number" step="0.1" /></label>
            <label>Min Price<input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} type="number" step="0.01" /></label>
            <label>Min Volume<input value={minVol} onChange={(e) => setMinVol(Number(e.target.value))} type="number" step="10000" /></label>
            <label>Min Gain %<input value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} type="number" step="1" /></label>
          </div>
          <div className="toggles">
            <button onClick={() => setRemoveJunk(!removeJunk)}>Remove Junk: {removeJunk ? "ON" : "OFF"}</button>
            <button onClick={() => { setMaxPrice(5); setMinPrice(0.1); setMinVol(500000); setMinGain(20); setRemoveJunk(true); }}>RESET SAFE</button>
            <button onClick={() => { setMaxPrice(50); setMinPrice(0); setMinVol(0); setMinGain(0); setRemoveJunk(false); }}>OPEN FILTERS</button>
            <button onClick={() => setShowRejected(!showRejected)}>{showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}</button>
          </div>

          <div className="radar">
            <div className="circle">
              <strong>{topScore || "--"}</strong>
              <span>{top?.ticker || "WAIT"}</span>
            </div>
            <div className="stats">
              <div>Gain <b>{top ? pct(top.gain) : "N/A"}</b></div>
              <div>Price <b>{top ? money(top.price) : "N/A"}</b></div>
              <div>Volume <b>{top ? vol(top.volume) : "N/A"}</b></div>
              <div>Support <b>{top ? money(top.low) : "N/A"}</b></div>
              <div>Resistance <b>{top ? money(top.high) : "N/A"}</b></div>
              <div>Spread <b>LOCKED</b></div>
              <div>Float <b>LOCKED</b></div>
              <div>Broker <b>IBKR LATER</b></div>
            </div>
          </div>
        </section>

        <aside className="panel">
          <p className="tag">DIAGNOSTICS</p>
          <div className="row"><span>API</span><b>{status}</b></div>
          <div className="row"><span>Raw</span><b>{stocks.length}</b></div>
          <div className="row"><span>Filtered</span><b>{filtered.length}</b></div>
          <div className="row"><span>Rejected</span><b>{rejected.length}</b></div>
          <div className="row"><span>Mode</span><b>LIVE</b></div>
          <div className="row"><span>Premarket</span><b>NEXT</b></div>
        </aside>
      </section>

      {showRejected && (
        <section className="panel">
          <p className="tag">REJECTED STOCKS</p>
          <div className="cards">
            {rejected.map(({ s, reason }) => (
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
        <p className="tag">LIVE TOP 10</p>
        <div className="cards">
          {filtered.map((s) => {
            const sc = score(s);
            const v = verdict(sc);
            return (
              <article className="card" key={s.ticker}>
                <div className="cardTop"><h3>{s.ticker}</h3><strong>{pct(s.gain)}</strong></div>
                <div><span>Current Price</span><b>{money(s.price)}</b></div>
                <div><span>Score</span><b>{sc}</b></div>
                <div><span>Change</span><b>{money(s.change)}</b></div>
                <div><span>Volume</span><b>{vol(s.volume)}</b></div>
                <div><span>Open</span><b>{money(s.open)}</b></div>
                <div><span>High / Resistance</span><b>{money(s.high)}</b></div>
                <div><span>Low / Support</span><b>{money(s.low)}</b></div>
                <div><span>Spread</span><b>LOCKED</b></div>
                <div><span>Float</span><b>LOCKED</b></div>
                <div className={`pill ${v.toLowerCase()}`}>{v}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <p className="tag">TOP 10 POSITION CALCULATOR</p>
        <div className="cards">
          {filtered.map((s) => {
            const entry = s.price;
            const stop = s.low || entry * 0.93;
            const target = s.high || entry * 1.15;
            const risk = Math.max(0, entry - stop);
            const reward = Math.max(0, target - entry);
            const rr = risk > 0 ? (reward / risk).toFixed(2) : "N/A";
            return (
              <article className="card" key={s.ticker + "-calc"}>
                <h3>{s.ticker}</h3>
                <div><span>Current Price</span><b>{money(entry)}</b></div>
                <div><span>Entry Price</span><b>{money(entry)}</b></div>
                <div><span>Support Zone</span><b>{money(stop)}</b></div>
                <div><span>Stop Loss</span><b>{money(stop)}</b></div>
                <div><span>Risk Per Share</span><b>{money(risk)}</b></div>
                <div><span>Resistance Zone</span><b>{money(target)}</b></div>
                <div><span>Target Exit</span><b>{money(target)}</b></div>
                <div><span>Risk / Reward</span><b>{rr}</b></div>
                <div><span>Order Type</span><b>LIMIT ONLY</b></div>
                <div><span>Broker Status</span><b>IBKR LOCKED</b></div>
                <button>LIMIT ORDER PREVIEW</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">NEXT UPGRADES</p>
          <div className="row"><b>Premarket Feed</b><span>Connect next</span><em>PRIORITY</em></div>
          <div className="row"><b>Spread</b><span>Needs bid/ask</span><em>LOCKED</em></div>
          <div className="row"><b>Float</b><span>Needs reference endpoint</span><em>LOCKED</em></div>
          <div className="row"><b>IBKR</b><span>Manual confirm only</span><em>LATER</em></div>
        </div>
        <div className="panel disclaimer">
          <p className="tag">DISCLAIMER</p>
          <span>Educational and informational software only. Not financial advice. No recommendation to buy or sell securities. User is responsible for all trading decisions.</span>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #020202; }
        .page { min-height: 100vh; padding: 22px; color: #f5f5f5; font-family: Arial, sans-serif; background: radial-gradient(circle at top left, rgba(255,182,18,.25), transparent 30%), linear-gradient(135deg, #020202, #0b0b0b); }
        .hero { display: grid; grid-template-columns: 1fr 300px; gap: 18px; padding: 28px; border-radius: 30px; border: 1px solid rgba(255,182,18,.35); background: linear-gradient(145deg, #111, #030303); }
        .tag { color: #ffb612; letter-spacing: 4px; font-size: 12px; font-weight: 900; }
        h1 { margin: 8px 0; color: #ffb612; font-size: clamp(44px, 7vw, 82px); text-shadow: 0 0 28px rgba(255,182,18,.8); }
        .clock, .panel, .notice, .card { border-radius: 24px; border: 1px solid rgba(255,182,18,.25); background: linear-gradient(145deg, #121212, #050505); box-shadow: 0 18px 45px rgba(0,0,0,.7); }
        .clock, .panel, .notice, .card { padding: 18px; }
        .clock small, .row span, .card span, .notice span, .disclaimer span { color: #999; }
        .clock strong, b { color: #ffd700; }
        .notice { display: flex; justify-content: space-between; gap: 12px; margin: 18px 0; }
        .notice b { color: #ffd700; }
        .dash { display: grid; grid-template-columns: 320px 1fr 300px; gap: 18px; }
        .permission { border-color: rgba(255,182,18,.55); background: linear-gradient(150deg, rgba(255,182,18,.18), #050505); }
        .permission h2 { margin: 0; color: #ffd700; font-size: 86px; text-shadow: 0 0 28px rgba(255,215,0,.7); }
        .row, .card div { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,182,18,.12); }
        button { width: 100%; margin-top: 12px; padding: 13px; border-radius: 14px; border: 1px solid rgba(255,182,18,.45); background: #ffb612; color: #050505; font-weight: 900; }
        .final { margin-top: 18px; padding: 14px; border-radius: 14px; text-align: center; background: rgba(255,182,18,.14); color: #ffd700; border: 1px solid rgba(255,182,18,.35); font-weight: 900; }
        .filters, .toggles, .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
        label { color: #aaa; font-size: 13px; }
        input { width: 100%; margin-top: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,182,18,.3); background: #050505; color: #ffd700; font-weight: 900; }
        .radar { display: grid; grid-template-columns: 230px 1fr; gap: 20px; align-items: center; }
        .circle { width: 220px; height: 220px; border-radius: 50%; display: grid; place-items: center; border: 2px solid rgba(255,182,18,.65); background: radial-gradient(circle, rgba(255,182,18,.26), transparent 60%), #050505; }
        .circle strong { display: block; color: #ffd700; font-size: 64px; text-align: center; }
        .circle span { color: #ffb612; font-weight: 900; }
        .stats div { padding: 12px; border-radius: 14px; background: #070707; border: 1px solid rgba(255,182,18,.18); }
        .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .card h3 { margin: 0 0 12px; color: #ffb612; font-size: 28px; }
        .cardTop { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 0 !important; }
        .cardTop strong { color: #00ff88; }
        .pill { margin-top: 14px; padding: 12px; border-radius: 12px; text-align: center; font-weight: 900; border-bottom: 0 !important; }
        .yes { background: #ffb612; color: #050505; }
        .wait { background: rgba(255,182,18,.18); color: #ffd700; border: 1px solid rgba(255,182,18,.38) !important; }
        .no { background: rgba(255,77,77,.16); color: #ff4d4d; border: 1px solid rgba(255,77,77,.35) !important; }
