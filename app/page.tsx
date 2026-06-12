"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  ticker: string;
  todaysChangePerc?: number;
  todaysChange?: number;
  day?: { c?: number; v?: number; o?: number; h?: number; l?: number };
};

function money(n?: number) {
  if (typeof n !== "number") return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(n?: number) {
  if (typeof n !== "number") return "0.0%";
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(n?: number) {
  if (typeof n !== "number") return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function isJunk(ticker: string) {
  const t = ticker.toUpperCase();
  return t.endsWith("W") || t.endsWith("WS") || t.endsWith("U") || t.endsWith("R");
}

function score(s: Stock) {
  const price = s.day?.c || 0;
  const volume = s.day?.v || 0;
  const gain = s.todaysChangePerc || 0;

  let x = 0;
  x += Math.min(40, gain * 1.1);
  x += Math.min(35, volume / 250000);
  x += price > 0 && price <= 5 ? 15 : price <= 20 ? 7 : 0;
  x += isJunk(s.ticker) ? -30 : 10;

  return Math.max(0, Math.min(100, Math.round(x)));
}

function verdict(n: number) {
  if (n >= 80) return "YES";
  if (n >= 60) return "WAIT";
  return "NO";
}

export default function Home() {
  const [time, setTime] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [maxPrice, setMaxPrice] = useState(20);
  const [minGain, setMinGain] = useState(0);
  const [minVolume, setMinVolume] = useState(0);
  const [removeJunk, setRemoveJunk] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(15);
  async function load() {
    setStatus("LOADING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();

      const list =
        json?.data?.tickers ||
        json?.tickers ||
        json?.results ||
        [];

      setStocks(list);
      setStatus("CONNECTED");
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
  load();
}, []);

useEffect(() => {
  if (!autoScan) return;

  const id = setInterval(() => {
    load();
  }, refreshSec * 1000);

  return () => clearInterval(id);
}, [autoScan, refreshSec]);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return stocks
      .filter((s) => {
        const price = s.day?.c || 0;
        const gain = s.todaysChangePerc || 0;
        const volume = s.day?.v || 0;

        if (removeJunk && isJunk(s.ticker)) return false;
        if (price > maxPrice) return false;
        if (gain < minGain) return false;
        if (volume < minVolume) return false;

        return true;
      })
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10);
  }, [stocks, maxPrice, minGain, minVolume, removeJunk]);

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
          <small>Regular Market: LIVE</small>
        </div>
      </section>

      <section className="notice">
        <b>REGULAR MARKET LIVE</b>
        <span>Premarket feed later. This build restores live tickers first.</span>
      </section>

      <section className="dash">
        <aside className="panel permission">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>{verdict(topScore)}</h2>

          <div className="row"><span>Feed</span><b>{status}</b></div>
          <div className="row"><span>Raw Count</span><b>{stocks.length}</b></div>
          <div className="row"><span>Showing</span><b>{filtered.length}</b></div>
          <div className="row"><span>Top Score</span><b>{topScore}</b></div>
          <div className="row"><span>Top Ticker</span><b>{top?.ticker || "NONE"}</b></div>

          <button onClick={load}>NEW SCAN</button>

          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="panel">
          <p className="tag">FILTER CONTROL</p>
<div className="filters">

<button onClick={() => load()}>
SCAN NOW
</button>

<button onClick={() => setAutoScan(!autoScan)}>
AUTO SCAN: {autoScan ? "ON" : "OFF"}
</button>

<select
  value={refreshSec}
  onChange={(e) => setRefreshSec(Number(e.target.value))}
>
  <option value={5}>5 SEC</option>
  <option value={15}>15 SEC</option>
  <option value={30}>30 SEC</option>
  <option value={60}>60 SEC</option>
</select>

</div>
          <div className="filters">
            <label>
              Max Price
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
            </label>

            <label>
              Min Gain %
              <input type="number" value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} />
            </label>

            <label>
              Min Volume
              <input type="number" value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} />
            </label>

            <button onClick={() => setRemoveJunk(!removeJunk)}>
              Remove Junk: {removeJunk ? "ON" : "OFF"}
            </button>
          </div>

          <div className="radar">
            <div className="circle">
              <strong>{topScore || "--"}</strong>
              <span>{top?.ticker || "WAIT"}</span>
            </div>

            <div className="stats">
              <div>Gain <b>{pct(top?.todaysChangePerc)}</b></div>
              <div>Price <b>{money(top?.day?.c)}</b></div>
              <div>Volume <b>{vol(top?.day?.v)}</b></div>
              <div>Support <b>{money(top?.day?.l)}</b></div>
              <div>Resistance <b>{money(top?.day?.h)}</b></div>
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
          <div className="row"><span>Mode</span><b>REGULAR</b></div>
          <div className="row"><span>Premarket</span><b>LATER</b></div>
          <div className="row"><span>After Hours</span><b>REMOVED</b></div>
        </aside>
      </section>

      <section className="panel">
        <p className="tag">LIVE TOP 10</p>

        <div className="cards">
          {filtered.map((s) => {
            const sc = score(s);
            const v = verdict(sc);

            return (
              <article className="card" key={s.ticker}>
                <div className="cardTop">
                  <h3>{s.ticker}</h3>
                  <strong>{pct(s.todaysChangePerc)}</strong>
                </div>

                <div className="data">
                  <span>Current Price</span><b>{money(s.day?.c)}</b>
                  <span>Score</span><b>{sc}</b>
                  <span>Day Change</span><b>{money(s.todaysChange)}</b>
                  <span>Volume</span><b>{vol(s.day?.v)}</b>
                  <span>Open</span><b>{money(s.day?.o)}</b>
                  <span>High / Resistance</span><b>{money(s.day?.h)}</b>
                  <span>Low / Support</span><b>{money(s.day?.l)}</b>
                  <span>Spread</span><b>LOCKED</b>
                  <span>Float</span><b>LOCKED</b>
                </div>

                <div className={`pill ${v.toLowerCase()}`}>{v}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <p className="tag">TOP 10 POSITION CALCULATOR</p>

        <div className="positionCards">
          {filtered.map((s) => {
            const entry = s.day?.c || 0;
            const stop = s.day?.l || entry * 0.93;
            const target = s.day?.h || entry * 1.15;
            const risk = Math.max(0, entry - stop);
            const reward = Math.max(0, target - entry);
            const rr = risk > 0 ? (reward / risk).toFixed(2) : "N/A";

            return (
              <article className="card" key={s.ticker + "-calc"}>
                <h3>{s.ticker}</h3>

                <div className="data">
                  <span>Current Price</span><b>{money(entry)}</b>
                  <span>Entry Price</span><b>{money(entry)}</b>
                  <span>Support Zone</span><b>{money(stop)}</b>
                  <span>Stop Loss</span><b>{money(stop)}</b>
                  <span>Risk Per Share</span><b>{money(risk)}</b>
                  <span>Resistance Zone</span><b>{money(target)}</b>
                  <span>Target Exit</span><b>{money(target)}</b>
                  <span>Risk / Reward</span><b>{rr}</b>
                  <span>Order Type</span><b>LIMIT ONLY</b>
                  <span>Broker Status</span><b>IBKR LOCKED</b>
                </div>

                <button>LIMIT ORDER PREVIEW</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">NEXT UPGRADES</p>
          <div className="row"><b>Premarket</b><span>Next real feed</span><em>PLANNED</em></div>
          <div className="row"><b>Spread</b><span>Needs bid/ask</span><em>LOCKED</em></div>
          <div className="row"><b>Float</b><span>Needs reference data</span><em>LOCKED</em></div>
          <div className="row"><b>IBKR</b><span>Manual confirm only</span><em>LATER</em></div>
        </div>

        <div className="panel disclaimer">
          <p className="tag">DISCLAIMER</p>
          <span>
            Educational and informational software only. Not financial advice.
            No recommendation to buy or sell securities. User is responsible for all trading decisions.
          </span>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #020202; }

        .page {
          min-height: 100vh;
          padding: 22px;
          color: #f5f5f5;
          font-family: Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(255,182,18,.25), transparent 30%),
            radial-gradient(circle at bottom right, rgba(255,215,0,.14), transparent 35%),
            linear-gradient(135deg, #020202, #0b0b0b);
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 18px;
          padding: 28px;
          border-radius: 30px;
          border: 1px solid rgba(255,182,18,.35);
          background: linear-gradient(145deg, #111, #030303);
          box-shadow: 0 0 50px rgba(255,182,18,.18);
        }

        .tag {
          color: #ffb612;
          letter-spacing: 4px;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          margin: 8px 0;
          color: #ffb612;
          font-size: clamp(44px, 7vw, 82px);
          text-shadow: 0 0 28px rgba(255,182,18,.8);
        }

        .clock, .panel, .notice {
          border-radius: 24px;
          border: 1px solid rgba(255,182,18,.25);
          background: linear-gradient(145deg, #121212, #050505);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .clock { padding: 22px; }
        .clock small, .data span, .row span, .notice span, .disclaimer span { color: #999; }
        .clock strong { display: block; color: #ffd700; font-size: 34px; margin: 10px 0; }

        .notice {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          margin: 18px 0;
        }

        .notice b { color: #ffd700; }

        .dash {
          display: grid;
          grid-template-columns: 320px 1fr 300px;
          gap: 18px;
        }

        .panel { padding: 20px; margin-bottom: 18px; }

        .permission {
          border-color: rgba(255,182,18,.55);
          background: linear-gradient(150deg, rgba(255,182,18,.18), #050505);
        }

        .permission h2 {
          margin: 0;
          color: #ffd700;
          font-size: 86px;
          text-shadow: 0 0 28px rgba(255,215,0,.7);
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        .row b, .row em {
          color: #ffb612;
          font-style: normal;
          font-weight: 900;
        }

        button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border-radius: 14px;
          border: 1px solid rgba(255,182,18,.45);
          background: rgba(255,182,18,.12);
          color: #ffd700;
          font-weight: 900;
        }

        .final {
          margin-top: 18px;
          padding: 14px;
          border-radius: 14px;
          text-align: center;
          background: rgba(255,182,18,.14);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.35);
          font-weight: 900;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        label { color: #aaa; font-size: 13px; }

        input {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,182,18,.3);
          background: #050505;
          color: #ffd700;
          font-weight: 900;
        }

        .radar {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 20px;
          align-items: center;
        }

        .circle {
          width: 230px;
          height: 230px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 2px solid rgba(255,182,18,.65);
          background: radial-gradient(circle, rgba(255,182,18,.26), transparent 60%), #050505;
          box-shadow: 0 0 45px rgba(255,182,18,.3);
        }

        .circle strong { display: block; color: #ffd700; font-size: 68px; text-align: center; }
        .circle span { color: #ffb612; font-weight: 900; }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .stats div {
          padding: 15px;
          border-radius: 14px;
          background: #070707;
          border: 1px solid rgba(255,182,18,.18);
        }

        .stats b { float: right; color: #ffd700; }

        .cards, .positionCards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }

        .card {
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(255,182,18,.24);
          background: #070707;
        }

        .cardTop { display: flex; justify-content: space-between; align-items: center; }
        .card h3 { margin: 0; color: #ffb612; font-size: 28px; }
        .cardTop strong { color: #00ff88; }

        .data {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 12px;
          margin-top: 14px;
        }

        .data b { color: #f5f5f5; }

        .pill {
          margin-top: 14px;
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          font-weight: 900;
        }

        .yes { background: #ffb612; color: #050505; }
        .wait { background: rgba(255,182,18,.18); color: #ffd700; border: 1px solid rgba(255,182,18,.38); }
        .no { background: rgba(255,77,77,.16); color: #ff4d4d; border: 1px solid rgba(255,77,77,.35); }

        .bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        @media (max-width: 1100px) {
          .hero, .dash, .radar, .cards, .positionCards, .bottom, .filters {
            grid-template-columns: 1fr;
          }

          .notice { display: grid; }
        }
      `}</style>
    </main>
  );
}
