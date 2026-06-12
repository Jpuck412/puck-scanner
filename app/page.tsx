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

type Mode =
  | "GAINERS"
  | "VOLUME"
  | "LOWFLOAT"
  | "REVERSAL"
  | "SHORT"
  | "CUSTOM";

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

function speedMeter(s: Stock) {
  if (s.gain >= 100 && s.volume >= 10000000) return "VIOLENT";
  if (s.gain >= 40 && s.volume >= 1000000) return "FAST";
  if (s.gain >= 15 && s.volume >= 250000) return "ACTIVE";
  return "SLOW";
}

function volumeMeter(s: Stock) {
  if (s.volume >= 25000000) return "EXTREME";
  if (s.volume >= 5000000) return "HOT";
  if (s.volume >= 1000000) return "GOOD";
  return "LIGHT";
}

function spreadMeter(s: Stock) {
  if (s.price <= 0) return "UNKNOWN";
  if (s.price < 1) return "CHECK BID/ASK";
  if (s.volume >= 5000000) return "LIKELY TIGHT";
  return "UNKNOWN";
}

function floatRead(s: Stock) {
  if (s.volume >= 25000000) return "HOT / CHECK FLOAT";
  if (s.volume >= 5000000) return "ACTIVE / CHECK FLOAT";
  return "UNKNOWN";
}

function trapRisk(s: Stock) {
  let risk = 0;
  if (s.price > 10) risk += 20;
  if (s.gain > 120) risk += 35;
  if (s.volume < 500000) risk += 25;
  if (junk(s.ticker)) risk += 40;
  if (s.price > 0 && s.high > 0 && s.price < s.high * 0.75) risk += 20;
  return Math.min(100, risk);
}

function proofScore(s: Stock) {
  let x = 0;
  x += Math.min(35, Math.max(0, s.gain * 0.9));
  x += Math.min(30, s.volume / 350000);
  x += s.price > 0 && s.price <= 5 ? 15 : s.price <= 20 ? 8 : 0;
  x += s.price > s.low ? 8 : 0;
  x += s.high > s.price ? 7 : 0;
  x += junk(s.ticker) ? -40 : 10;
  x -= trapRisk(s) * 0.25;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function verdict(n: number) {
  if (n >= 80) return "PROOF";
  if (n >= 60) return "WAIT";
  return "NO";
}

function rejectReason(
  s: Stock,
  minPrice: number,
  maxPrice: number,
  minVolume: number,
  minGain: number,
  removeJunk: boolean
) {
  if (removeJunk && junk(s.ticker)) return "JUNK SYMBOL";
  if (s.price < minPrice) return "PRICE TOO LOW";
  if (s.price > maxPrice) return "PRICE TOO HIGH";
  if (s.volume < minVolume) return "LOW VOLUME";
  if (s.gain < minGain) return "WEAK GAIN";
  return "";
}

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [mode, setMode] = useState<Mode>("GAINERS");
  const [showRejected, setShowRejected] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [refreshSec, setRefreshSec] = useState(30);
  const [limit, setLimit] = useState(10);

  const [maxPrice, setMaxPrice] = useState(10);
  const [minPrice, setMinPrice] = useState(0.01);
  const [minVolume, setMinVolume] = useState(100000);
  const [minGain, setMinGain] = useState(0);
  const [removeJunk, setRemoveJunk] = useState(true);

  const [showColumns, setShowColumns] = useState({
    price: true,
    gain: true,
    volume: true,
    support: true,
    resistance: true,
    speed: true,
    spread: true,
    float: true,
    trap: true
  });

  async function load() {
    setStatus("SCANNING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      setStocks(json?.tickers || []);
      setStatus(json?.ok ? "CONNECTED" : "ERROR");
      setLastScan(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();
    const clock = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
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
      .map((s) => ({
        stock: s,
        reason: rejectReason(s, minPrice, maxPrice, minVolume, minGain, removeJunk)
      }))
      .filter((x) => x.reason)
      .slice(0, 30);
  }, [stocks, minPrice, maxPrice, minVolume, minGain, removeJunk]);

  const filtered = useMemo(() => {
    let list = stocks.filter(
      (s) => !rejectReason(s, minPrice, maxPrice, minVolume, minGain, removeJunk)
    );

    if (mode === "GAINERS") list = list.sort((a, b) => b.gain - a.gain);
    if (mode === "VOLUME") list = list.sort((a, b) => b.volume - a.volume);
    if (mode === "LOWFLOAT") list = list.sort((a, b) => b.volume / Math.max(b.price, 0.01) - a.volume / Math.max(a.price, 0.01));
    if (mode === "REVERSAL") list = list.sort((a, b) => (b.price - b.low) - (a.price - a.low));
    if (mode === "SHORT") list = list.sort((a, b) => trapRisk(b) - trapRisk(a));
    if (mode === "CUSTOM") list = list.sort((a, b) => proofScore(b) - proofScore(a));

    return list.slice(0, limit);
  }, [stocks, mode, minPrice, maxPrice, minVolume, minGain, removeJunk, limit]);

  const windows = useMemo(() => {
    return {
      gainers: [...filtered].sort((a, b) => b.gain - a.gain).slice(0, 6),
      volume: [...filtered].sort((a, b) => b.volume - a.volume).slice(0, 6),
      proof: [...filtered].sort((a, b) => proofScore(b) - proofScore(a)).slice(0, 6)
    };
  }, [filtered]);

  const top = filtered[0];
  const topScore = top ? proofScore(top) : 0;

  function safePreset() {
    setMaxPrice(5);
    setMinPrice(0.1);
    setMinVolume(500000);
    setMinGain(20);
    setRemoveJunk(true);
    setLimit(10);
  }

  function openPreset() {
    setMaxPrice(50);
    setMinPrice(0);
    setMinVolume(0);
    setMinGain(0);
    setRemoveJunk(false);
    setLimit(25);
  }

  function premarketPreset() {
    setMaxPrice(10);
    setMinPrice(0.1);
    setMinVolume(100000);
    setMinGain(5);
    setRemoveJunk(true);
    setLimit(20);
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PROOF OF STRUCTURE™ ELITE</p>
          <h1>MISSION CONTROL</h1>
          <span>The market must earn permission.</span>
        </div>

        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Last Scan: {lastScan}</small>
        </div>
      </section>

      <section className="modeBar">
        {[
          ["GAINERS", "TOP GAINERS"],
          ["VOLUME", "FASTEST VOLUME"],
          ["LOWFLOAT", "LOW-FLOAT WATCH"],
          ["REVERSAL", "REVERSAL WATCH"],
          ["SHORT", "SHORT PRESSURE"],
          ["CUSTOM", "CUSTOM SCAN"]
        ].map(([key, label]) => (
          <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key as Mode)}>
            {label}
          </button>
        ))}
      </section>

      <section className="dash">
        <aside className="panel permission">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>{verdict(topScore)}</h2>
          <div className="row"><span>Feed</span><b>{status}</b></div>
          <div className="row"><span>Raw Count</span><b>{stocks.length}</b></div>
          <div className="row"><span>Showing</span><b>{filtered.length}</b></div>
          <div className="row"><span>Top Ticker</span><b>{top?.ticker || "NONE"}</b></div>
          <div className="row"><span>Proof Score</span><b>{topScore}</b></div>
          <div className="row"><span>Auto Scan</span><b>{autoScan ? "ON" : "OFF"}</b></div>
          <button onClick={load}>RUN REAL SCAN</button>
          <button onClick={() => setAutoScan(!autoScan)}>{autoScan ? "STOP AUTO SCAN" : "START AUTO SCAN"}</button>
          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="panel">
          <p className="tag">PRECISION FILTERS</p>

          <div className="filters">
            <label>Max Price<input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} type="number" step="0.1" /></label>
            <label>Min Price<input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} type="number" step="0.01" /></label>
            <label>Min Volume<input value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} type="number" step="10000" /></label>
            <label>Min Gain %<input value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} type="number" step="1" /></label>
            <label>Result Limit<input value={limit} onChange={(e) => setLimit(Number(e.target.value))} type="number" step="1" /></label>
            <label>Refresh Sec<input value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} type="number" step="15" /></label>
          </div>

          <div className="buttons">
            <button onClick={() => setRemoveJunk(!removeJunk)}>Junk Filter: {removeJunk ? "ON" : "OFF"}</button>
            <button onClick={safePreset}>SAFE PRESET</button>
            <button onClick={openPreset}>OPEN FILTERS</button>
            <button onClick={premarketPreset}>4AM PRESET</button>
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
              <div>Speed <b>{top ? speedMeter(top) : "N/A"}</b></div>
              <div>Volume Meter <b>{top ? volumeMeter(top) : "N/A"}</b></div>
              <div>Spread <b>{top ? spreadMeter(top) : "N/A"}</b></div>
              <div>Trap Risk <b>{top ? trapRisk(top) : "N/A"}</b></div>
              <div>Broker <b>LOCKED</b></div>
            </div>
          </div>
        </section>

        <aside className="panel">
          <p className="tag">COLUMN CHOOSER</p>
          {Object.keys(showColumns).map((k) => (
            <button
              key={k}
              className={showColumns[k as keyof typeof showColumns] ? "activeSmall" : ""}
              onClick={() =>
                setShowColumns((prev) => ({
                  ...prev,
                  [k]: !prev[k as keyof typeof prev]
                }))
              }
            >
              {k.toUpperCase()}: {showColumns[k as keyof typeof showColumns] ? "ON" : "OFF"}
            </button>
          ))}
        </aside>
      </section>

      {showRejected && (
        <section className="panel">
          <p className="tag">REJECTION ENGINE</p>
          <div className="cards">
            {rejected.map(({ stock, reason }) => (
              <article className="card reject" key={stock.ticker}>
                <h3>{stock.ticker}</h3>
                <div><span>Reason</span><b>{reason}</b></div>
                <div><span>Price</span><b>{money(stock.price)}</b></div>
                <div><span>Gain</span><b>{pct(stock.gain)}</b></div>
                <div><span>Volume</span><b>{vol(stock.volume)}</b></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <p className="tag">THREE-WINDOW SCANNING</p>
        <div className="three">
          <Mini title="TOP GAINERS" list={windows.gainers} />
          <Mini title="VOLUME LEADERS" list={windows.volume} />
          <Mini title="PROOF LEADERS" list={windows.proof} />
        </div>
      </section>

      <section className="panel">
        <p className="tag">LIVE RESULTS GRID</p>
        <div className="cards">
          {filtered.map((s) => {
            const sc = proofScore(s);
            const v = verdict(sc);
            return (
              <article className="card" key={s.ticker}>
                <div className="cardTop"><h3>{s.ticker}</h3><strong>{pct(s.gain)}</strong></div>
                {showColumns.price && <div><span>Current Price</span><b>{money(s.price)}</b></div>}
                <div><span>Proof Score</span><b>{sc}</b></div>
                {showColumns.gain && <div><span>Day Change</span><b>{money(s.change)}</b></div>}
                {showColumns.volume && <div><span>Volume</span><b>{vol(s.volume)}</b></div>}
                {showColumns.support && <div><span>Support</span><b>{money(s.low)}</b></div>}
                {showColumns.resistance && <div><span>Resistance</span><b>{money(s.high)}</b></div>}
                {showColumns.speed && <div><span>Speed Meter</span><b>{speedMeter(s)}</b></div>}
                {showColumns.spread && <div><span>Spread</span><b>{spreadMeter(s)}</b></div>}
                {showColumns.float && <div><span>Float Read</span><b>{floatRead(s)}</b></div>}
                {showColumns.trap && <div><span>Trap Risk</span><b>{trapRisk(s)}</b></div>}
                <div className={`pill ${v.toLowerCase()}`}>{v}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <p className="tag">POSITION + BROKER PREVIEW</p>
        <div className="cards">
          {filtered.slice(0, 10).map((s) => {
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
                <div><span>Stop Loss</span><b>{money(stop)}</b></div>
                <div><span>Risk / Share</span><b>{money(risk)}</b></div>
                <div><span>Target Exit</span><b>{money(target)}</b></div>
                <div><span>Risk / Reward</span><b>{rr}</b></div>
                <div><span>Order Type</span><b>LIMIT ONLY</b></div>
                <div><span>Status</span><b>PREVIEW ONLY</b></div>
                <button>LIMIT ORDER PREVIEW</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">ELITE LOCKED UPGRADES</p>
          <div className="row"><b>Premarket Feed</b><span>Connect next</span><em>PRIORITY</em></div>
          <div className="row"><b>Real Spread</b><span>Needs bid/ask endpoint</span><em>LOCKED</em></div>
          <div className="row"><b>Real Float</b><span>Needs reference endpoint</span><em>LOCKED</em></div>
          <div className="row"><b>IBKR</b><span>Manual confirm only</span><em>LOCKED</em></div>
          <div className="row"><b>Webhooks</b><span>User token system later</span><em>LOCKED</em></div>
        </div>

        <div className="panel disclaimer">
          <p className="tag">DISCLAIMER</p>
          <span>Educational and informational software only. Not financial advice. No recommendation to buy or sell securities. User is responsible for all trading decisions.</span>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #020202; }
        .page { min-height: 100vh; padding: 22px; color: #f5f5f5; font-family: Arial, sans-serif; background: radial-gradient(circle at top left, rgba(255,182,18,.25), transparent 30%), radial-gradient(circle at bottom right, rgba(255,215,0,.14), transparent 35%), linear-gradient(135deg, #020202, #0b0b0b); }
        .hero { display: grid; grid-template-columns: 1fr 300px; gap: 18px; padding: 28px; border-radius: 30px; border: 1px solid rgba(255,182,18,.35); background: linear-gradient(145deg, #111, #030303); box-shadow: 0 0 50px rgba(255,182,18,.18); }
        .tag { color: #ffb612; letter-spacing: 4px; font-size: 12px; font-weight: 900; }
        h1 { margin: 8px 0; color: #ffb612; font-size: clamp(44px, 7vw, 82px); text-shadow: 0 0 28px rgba(255,182,18,.8); }
        .clock, .panel, .card, .modeBar button { border-radius: 24px; border: 1px solid rgba(255,182,18,.25); background: linear-gradient(145deg, #121212, #050505); box-shadow: 0 18px 45px rgba(0,0,0,.7); }
        .clock, .panel, .card { padding: 18px; }
        .clock small, .row span, .card span, .disclaimer span { color: #999; }
        .clock strong, b { color: #ffd700; }
        .modeBar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 18px 0; }
        button { width: 100%; margin-top: 10px; padding: 13px; border-radius: 14px; border: 1px solid rgba(255,182,18,.45); background: rgba(255,182,18,.12); color: #ffd700; font-weight: 900; cursor: pointer; }
        button.active, .activeSmall { background: #ffb612 !important; color: #050505 !important; }
        .dash { display: grid; grid-template-columns: 320px 1fr 300px; gap: 18px; }
        .permission { border-color: rgba(255,182,18,.55); background: linear-gradient(150deg, rgba(255,182,18,.18), #050505); }
        .permission h2 { margin: 0; color: #ffd700; font-size: 76px; text-shadow: 0 0 28px rgba(255,215,0,.7); }
        .row, .card div { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,182,18,.12); }
        .final { margin-top: 18px; padding: 14px; border-radius: 14px; text-align: center; background: rgba(255,182,18,.14); color: #ffd700; border: 1px solid rgba(255,182,18,.35); font-weight: 900; }
        .filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
        .buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
        label { color: #aaa; font-size: 13px; }
        input { width: 100%; margin-top: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,182,18,.3); background: #050505; color: #ffd700; font-weight: 900; }
        .radar { display: grid; grid-template-columns: 230px 1fr; gap: 20px; align-items: center; }
        .circle { width: 220px; height: 220px; border-radius: 50%; display: grid; place-items: center; border: 2px solid rgba(255,182,18,.65); background: radial-gradient(circle, rgba(255,182,18,.26), transparent 60%), #050505; }
        .circle strong { color: #ffd700; font-size: 64px; text-align: center; }
        .circle span { color: #ffb612; font-weight: 900; }
        .stats, .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stats div { padding: 12px; border-radius: 14px; background: #070707; border: 1px solid rgba(255,182,18,.18); }
        .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .card h3 { margin: 0 0 12px; color: #ffb612; font-size: 28px; }
        .cardTop { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 0 !important; }
        .cardTop strong { color: #00ff88; }
        .pill { margin-top: 14px; padding: 12px; border-radius: 12px; text-align: center; font-weight: 900; border-bottom: 0 !important; }
        .proof { background: #ffb612; color: #050505; }
        .wait { background: rgba(255,182,18,.18); color: #ffd700; border: 1px solid rgba(255,182,18,.38) !important; }
        .no { background: rgba(255,77,77,.16); color: #ff4d4d; border: 1px solid rgba(255,77,77,.35) !important; }
        .reject { border-color: rgba(255,77,77,.35); }
        .bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        @media (max-width: 1100px) { .hero, .modeBar, .dash, .radar, .cards, .bottom, .filters, .buttons, .stats, .three { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}

function Mini({ title, list }: { title: string; list: Stock[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {list.map((s) => (
        <div key={s.ticker + title}>
          <span>{s.ticker}</span>
          <b>{pct(s.gain)} / {money(s.price)}</b>
        </div>
      ))}
    </div>
  );
}
