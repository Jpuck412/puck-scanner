"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  ticker: string;
  todaysChangePerc?: number;
  todaysChange?: number;
  day?: { c?: number; v?: number; o?: number; h?: number; l?: number };
  prevDay?: { c?: number };
};

type Rejected = {
  ticker: string;
  reason: string;
  price: number;
  gain: number;
  volume: number;
};

function money(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "0.0%";
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function isJunkTicker(ticker: string) {
  const t = ticker.toUpperCase();
  return (
    t.endsWith("W") ||
    t.endsWith("WS") ||
    t.endsWith("U") ||
    t.endsWith("R") ||
    t.includes(".W") ||
    t.includes(".U") ||
    t.includes(".R")
  );
}

function puckScore(s: Stock) {
  const price = s.day?.c || 0;
  const volume = s.day?.v || 0;
  const gain = s.todaysChangePerc || 0;

  let score = 0;
  score += Math.min(35, Math.max(0, gain * 1.15));
  score += Math.min(30, volume / 250000);
  score += price > 0 && price <= 5 ? 20 : price <= 20 ? 10 : 0;
  score += isJunkTicker(s.ticker) ? -25 : 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function verdict(score: number) {
  if (score >= 80) return "YES";
  if (score >= 60) return "WAIT";
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
  const price = s.day?.c || 0;
  const volume = s.day?.v || 0;
  const gain = s.todaysChangePerc || 0;

  if (removeJunk && isJunkTicker(s.ticker)) return "JUNK SYMBOL";
  if (price < minPrice) return "PRICE TOO LOW";
  if (price > maxPrice) return "PRICE TOO HIGH";
  if (volume < minVolume) return "LOW VOLUME";
  if (gain < minGain) return "WEAK GAIN";

  return "";
}

export default function Home() {
  const [time, setTime] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("LOADING");
  const [lastScan, setLastScan] = useState("NONE");
  const [showRejected, setShowRejected] = useState(false);

  const [draftMaxPrice, setDraftMaxPrice] = useState(5);
  const [draftMinPrice, setDraftMinPrice] = useState(0.1);
  const [draftMinVolume, setDraftMinVolume] = useState(500000);
  const [draftMinGain, setDraftMinGain] = useState(20);
  const [draftRemoveJunk, setDraftRemoveJunk] = useState(true);

  const [maxPrice, setMaxPrice] = useState(5);
  const [minPrice, setMinPrice] = useState(0.1);
  const [minVolume, setMinVolume] = useState(500000);
  const [minGain, setMinGain] = useState(20);
  const [removeJunk, setRemoveJunk] = useState(true);

  async function loadGainers() {
    setLoading(true);

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      const tickers = json?.data?.tickers || [];

      setStocks(tickers);
      setApiStatus("CONNECTED");
      setLastScan(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    } catch {
      setApiStatus("ERROR");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setMaxPrice(draftMaxPrice);
    setMinPrice(draftMinPrice);
    setMinVolume(draftMinVolume);
    setMinGain(draftMinGain);
    setRemoveJunk(draftRemoveJunk);
  }

  function resetFilters() {
    setDraftMaxPrice(5);
    setDraftMinPrice(0.1);
    setDraftMinVolume(500000);
    setDraftMinGain(20);
    setDraftRemoveJunk(true);

    setMaxPrice(5);
    setMinPrice(0.1);
    setMinVolume(500000);
    setMinGain(20);
    setRemoveJunk(true);
  }

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadGainers();
  }, []);

  const filtered = useMemo(() => {
    return stocks
      .filter((s) => {
        return !rejectReason(s, minPrice, maxPrice, minVolume, minGain, removeJunk);
      })
      .sort((a, b) => puckScore(b) - puckScore(a));
  }, [stocks, minPrice, maxPrice, minVolume, minGain, removeJunk]);

  const rejected: Rejected[] = useMemo(() => {
    return stocks
      .map((s) => {
        const reason = rejectReason(s, minPrice, maxPrice, minVolume, minGain, removeJunk);

        return {
          ticker: s.ticker,
          reason,
          price: s.day?.c || 0,
          gain: s.todaysChangePerc || 0,
          volume: s.day?.v || 0
        };
      })
      .filter((r) => r.reason)
      .slice(0, 20);
  }, [stocks, minPrice, maxPrice, minVolume, minGain, removeJunk]);

  const top10 = filtered.slice(0, 10);
  const top = top10[0];
  const topScore = top ? puckScore(top) : 0;
  const topVerdict = verdict(topScore);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PUCK SCANNER V8 ELITE MODE</p>
          <h1>MISSION CONTROL</h1>
          <span>Live Polygon gainers. Filter engine. Broker-ready previews.</span>
        </div>

        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Last Scan: {lastScan}</small>
        </div>
      </section>

      <section className="phaseBar">
        <div>4:00 IGNITION</div>
        <div>7:00 INJECTION</div>
        <div>9:30 OPEN</div>
        <div>11:00 FADE</div>
        <div className="active">ELITE MODE</div>
      </section>

      <section className="dash">
        <aside className="panel permission">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>{topVerdict}</h2>

          <div className="rule">🟢 Polygon Feed <b>{apiStatus}</b></div>
          <div className="rule">🟢 Raw Gainers <b>{stocks.length}</b></div>
          <div className="rule">🟢 Filtered <b>{filtered.length}</b></div>
          <div className="rule">🟢 Top Score <b>{topScore}</b></div>
          <div className="rule">🟡 IBKR Orders <b>LOCKED</b></div>
          <div className="rule">🟡 Live Trading <b>OFF</b></div>

          <button className="refresh" onClick={loadGainers}>
            NEW SCAN
          </button>

          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="center">
          <div className="panel filters">
            <p className="tag">FILTER CONTROL</p>

            <div className="filterGrid">
              <label>
                Max Price
                <input value={draftMaxPrice} onChange={(e) => setDraftMaxPrice(Number(e.target.value))} type="number" step="0.1" />
              </label>

              <label>
                Min Price
                <input value={draftMinPrice} onChange={(e) => setDraftMinPrice(Number(e.target.value))} type="number" step="0.01" />
              </label>

              <label>
                Min Volume
                <input value={draftMinVolume} onChange={(e) => setDraftMinVolume(Number(e.target.value))} type="number" step="10000" />
              </label>

              <label>
                Min Gain %
                <input value={draftMinGain} onChange={(e) => setDraftMinGain(Number(e.target.value))} type="number" step="1" />
              </label>
            </div>

            <div className="toggles">
              <button className={draftRemoveJunk ? "on" : ""} onClick={() => setDraftRemoveJunk(!draftRemoveJunk)}>
                Remove Junk: {draftRemoveJunk ? "ON" : "OFF"}
              </button>

              <button onClick={applyFilters}>
                APPLY FILTERS
              </button>

              <button onClick={resetFilters}>
                RESET $5 SAFE
              </button>

              <button onClick={() => setShowRejected(!showRejected)}>
                {showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}
              </button>
            </div>
          </div>

          <div className="panel radar">
            <p className="tag">LIVE RADAR</p>

            <div className="circle">
              <strong>{topScore || "--"}</strong>
              <span>{top?.ticker || "WAIT"}</span>
            </div>

            <div className="radarStats">
              <div>Top <b>{top?.ticker || "NONE"}</b></div>
              <div>Gain <b>{pct(top?.todaysChangePerc)}</b></div>
              <div>Volume <b>{vol(top?.day?.v)}</b></div>
              <div>Price <b>{money(top?.day?.c)}</b></div>
              <div>Verdict <b>{topVerdict}</b></div>
              <div>Mode <b>{maxPrice <= 5 ? "SAFE" : "CUSTOM"}</b></div>
            </div>
          </div>
        </section>

        <aside className="panel engine">
          <p className="tag">DIAGNOSTICS</p>
          <div className="stat"><span>API Status</span><b>{apiStatus}</b></div>
          <div className="stat"><span>Raw Count</span><b>{stocks.length}</b></div>
          <div className="stat"><span>Filtered Count</span><b>{filtered.length}</b></div>
          <div className="stat"><span>Rejected</span><b>{rejected.length}</b></div>
          <div className="stat"><span>Max Price</span><b>${maxPrice}</b></div>
          <div className="stat"><span>Min Volume</span><b>{vol(minVolume)}</b></div>
          <div className="stat"><span>Last Scan</span><b>{lastScan}</b></div>
        </aside>
      </section>

      {showRejected && (
        <section className="panel">
          <p className="tag">REJECTED STOCKS</p>
          <div className="rejectGrid">
            {rejected.map((r) => (
              <div className="reject" key={r.ticker}>
                <b>{r.ticker}</b>
                <span>{r.reason}</span>
                <em>{money(r.price)} / {pct(r.gain)} / {vol(r.volume)}</em>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <p className="tag">LIVE TOP 10</p>

        {loading ? (
          <h2 className="loading">Loading Polygon gainers...</h2>
        ) : (
          <div className="cards">
            {top10.map((s) => {
              const sScore = puckScore(s);
              const v = verdict(sScore);
              return (
                <article className="card" key={s.ticker}>
                  <div className="cardTop">
                    <h3>{s.ticker}</h3>
                    <strong>{pct(s.todaysChangePerc)}</strong>
                  </div>

                  <div className="data small">
                    <span>Current Price</span><b>{money(s.day?.c)}</b>
                    <span>PUCK Score</span><b>{sScore}</b>
                    <span>Day Change</span><b>{money(s.todaysChange)}</b>
                    <span>Volume</span><b>{vol(s.day?.v)}</b>
                    <span>Open</span><b>{money(s.day?.o)}</b>
                    <span>High</span><b>{money(s.day?.h)}</b>
                    <span>Low</span><b>{money(s.day?.l)}</b>
                  </div>

                  <div className={`pill ${v.toLowerCase()}`}>{v}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <p className="tag">TOP 10 POSITION CALCULATOR</p>

        <div className="positionCards">
          {top10.map((s) => {
            const entry = s.day?.c || 0;
            const stop = entry * 0.93;
            const target = entry * 1.15;
            const risk = entry - stop;

            return (
              <article className="positionCard" key={s.ticker + "pos"}>
                <h3>{s.ticker}</h3>

                <div className="data">
                  <span>Current Price</span><b>{money(entry)}</b>
                  <span>Entry Price</span><b>{money(entry)}</b>
                  <span>Stop Loss</span><b>{money(stop)}</b>
                  <span>Risk Per Share</span><b>{money(risk)}</b>
                  <span>Target Exit</span><b>{money(target)}</b>
                  <span>Risk / Reward</span><b>2.1</b>
                  <span>Order Type</span><b>LIMIT ONLY</b>
                  <span>Broker Status</span><b>IBKR LOCKED</b>
                </div>

                <button className="preview">
                  LIMIT ORDER PREVIEW
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">BROKER INTEGRATION PLAN</p>
          <div className="row"><b>Stage 1</b><span>Scanner only</span><em>DONE</em></div>
          <div className="row"><b>Stage 2</b><span>Limit order preview</span><em>NOW</em></div>
          <div className="row"><b>Stage 3</b><span>IBKR account connection</span><em>LATER</em></div>
          <div className="row"><b>Stage 4</b><span>Manual confirm only</span><em>LATER</em></div>
          <div className="row"><b>Safety</b><span>No market orders / no auto-buy</span><em>LOCKED</em></div>
        </div>

        <div className="panel">
          <p className="tag">PRODUCT PAGES</p>
          <div className="setting">Glossary Page: Planned</div>
          <div className="setting">Disclaimer Page: Planned</div>
          <div className="setting">Webhook Page: Planned</div>
          <div className="setting">User Tokens: Future</div>
        </div>

        <div className="panel disclaimer">
          <p className="tag">DISCLAIMER</p>
          <span>
            Educational and informational software only. Not financial advice.
            No recommendation to buy or sell securities. User is responsible
            for all trading decisions.
          </span>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #020202;
        }

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

        .clock,
        .panel,
        .phaseBar div {
          border-radius: 24px;
          border: 1px solid rgba(255,182,18,.25);
          background: linear-gradient(145deg, #121212, #050505);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .clock {
          padding: 22px;
        }

        .clock small,
        .data span,
        .stat span,
        .row span,
        .disclaimer span {
          color: #999;
        }

        .clock strong {
          display: block;
          color: #ffd700;
          font-size: 34px;
          margin: 10px 0;
        }

        .phaseBar {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin: 18px 0;
        }

        .phaseBar div {
          padding: 16px;
          color: #aaa;
          text-align: center;
          font-weight: 900;
        }

        .phaseBar .active {
          color: #050505;
          background: #ffb612;
          box-shadow: 0 0 28px rgba(255,182,18,.65);
        }

        .dash {
          display: grid;
          grid-template-columns: 320px 1fr 300px;
          gap: 18px;
        }

        .panel {
          padding: 20px;
          margin-bottom: 18px;
        }

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

        .rule,
        .row,
        .stat {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        .rule b,
        .row b,
        .row em,
        .stat b {
          color: #ffb612;
          font-style: normal;
          font-weight: 900;
        }

        .refresh,
        .toggles button,
        .preview {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border-radius: 14px;
          border: 1px solid rgba(255,182,18,.45);
          background: rgba(255,182,18,.12);
          color: #ffd700;
          font-weight: 900;
        }

        .toggles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 14px;
        }

        .toggles .on {
          background: #ffb612;
          color: #050505;
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

        .filterGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        label {
          color: #aaa;
          font-size: 13px;
        }

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

        .circle strong {
          display: block;
          color: #ffd700;
          font-size: 68px;
          text-align: center;
        }

        .circle span {
          color: #ffb612;
          font-weight: 900;
        }

        .radarStats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .radarStats div {
          padding: 15px;
          border-radius: 14px;
          background: #070707;
          border: 1px solid rgba(255,182,18,.18);
        }

        .radarStats b {
          float: right;
          color: #ffd700;
        }

        .cards,
        .positionCards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }

        .card,
        .positionCard {
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(255,182,18,.24);
          background: #070707;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card h3,
        .positionCard h3 {
          margin: 0;
          color: #ffb612;
          font-size: 28px;
        }

        .cardTop strong {
          color: #00ff88;
        }

        .data {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 12px;
          margin-top: 14px;
        }

        .data b {
          color: #f5f5f5;
        }

        .small {
          font-size: 13px;
        }

        .pill {
          margin-top: 14px;
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          font-weight: 900;
        }

        .yes {
          background: #ffb612;
          color: #050505;
        }

        .wait {
          background: rgba(255,182,18,.18);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.38);
        }

        .no {
          background: rgba(255,77,77,.16);
          color: #ff4d4d;
          border: 1px solid rgba(255,77,77,.35);
        }

        .rejectGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .reject {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255,77,77,.1);
          border: 1px solid rgba(255,77,77,.3);
        }

        .reject b {
          color: #ff4d4d;
          display: block;
        }

        .reject span {
          color: #ffd700;
          display: block;
          margin: 6px 0;
        }

        .reject em {
          color: #aaa;
          font-style: normal;
        }

        .bottom {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
        }

        .setting {
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          background: #070707;
          color: #bbb;
          border: 1px dashed rgba(255,182,18,.25);
        }

        .loading {
          color: #ffd700;
        }

        @media (max-width: 1100px) {
          .hero,
          .phaseBar,
          .dash,
          .radar,
          .cards,
          .positionCards,
          .bottom,
          .filterGrid,
          .toggles,
          .rejectGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
