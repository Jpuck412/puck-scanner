"use client";

import { useEffect, useState } from "react";

type Gainer = {
  ticker: string;
  todayChangePerc: number;
  todayChange: number;
  day?: {
    c?: number;
    v?: number;
    o?: number;
    h?: number;
    l?: number;
  };
  prevDay?: {
    c?: number;
  };
};

function money(n?: number) {
  if (typeof n !== "number") return "N/A";
  return "$" + n.toFixed(2);
}

function pct(n?: number) {
  if (typeof n !== "number") return "0.0%";
  return "+" + n.toFixed(1) + "%";
}

function volume(n?: number) {
  if (typeof n !== "number") return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function score(stock: Gainer) {
  const gainScore = Math.min(50, Math.max(0, stock.todayChangePerc / 4));
  const volumeScore = Math.min(35, ((stock.day?.v || 0) / 10000000) * 35);
  const priceScore = stock.day?.c && stock.day.c <= 20 ? 15 : 5;
  return Math.round(gainScore + volumeScore + priceScore);
}

export default function Home() {
  const [time, setTime] = useState("");
  const [stocks, setStocks] = useState<Gainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("LOADING");

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
    async function loadGainers() {
      try {
        const res = await fetch("/api/gainers", { cache: "no-store" });
        const json = await res.json();

        const tickers = json?.data?.tickers || [];

        setStocks(tickers.slice(0, 12));
        setApiStatus("CONNECTED");
      } catch {
        setApiStatus("ERROR");
      } finally {
        setLoading(false);
      }
    }

    loadGainers();
  }, []);

  const top = stocks[0];
  const topScore = top ? score(top) : 0;
  const heat = topScore >= 80 ? "HOT" : topScore >= 60 ? "ACTIVE" : "WATCH";

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PUCK SCANNER LIVE</p>
          <h1>MISSION CONTROL</h1>
          <span>Real Polygon gainers. Speed. Volume. Spread. Proof.</span>
        </div>

        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Live market scanner</small>
        </div>
      </section>

      <section className="phaseBar">
        <div>4:00 IGNITION</div>
        <div>7:00 INJECTION</div>
        <div>9:30 OPEN</div>
        <div>11:00 FADE</div>
        <div className="active">LIVE DATA</div>
      </section>

      <section className="dash">
        <aside className="panel permission">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>{topScore >= 80 ? "YES" : topScore >= 60 ? "WAIT" : "NO"}</h2>

          <div className="rule">🟢 Real Data <b>PASS</b></div>
          <div className="rule">🟢 Polygon Feed <b>{apiStatus}</b></div>
          <div className="rule">🟢 Gainers Found <b>{stocks.length}</b></div>
          <div className="rule">🟢 Evidence First <b>PASS</b></div>
          <div className="rule">🟡 Float Filter <b>NEXT</b></div>
          <div className="rule">🟡 News Filter <b>NEXT</b></div>

          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="center">
          <div className="panel radar">
            <p className="tag">LIVE RADAR</p>

            <div className="circle">
              <strong>{topScore || "--"}</strong>
              <span>{heat}</span>
            </div>

            <div className="radarStats">
              <div>Top Ticker <b>{top?.ticker || "WAIT"}</b></div>
              <div>Gain <b>{pct(top?.todayChangePerc)}</b></div>
              <div>Volume <b>{volume(top?.day?.v)}</b></div>
              <div>Price <b>{money(top?.day?.c)}</b></div>
            </div>
          </div>

          <div className="panel opportunity">
            <p className="tag">TOP OPPORTUNITY</p>
            <h2>{top?.ticker || "LOADING"}</h2>

            <div className="bigData">
              <span>Price</span><b>{money(top?.day?.c)}</b>
              <span>Gain</span><b className="green">{pct(top?.todayChangePerc)}</b>
              <span>Change</span><b>{money(top?.todayChange)}</b>
              <span>Volume</span><b>{volume(top?.day?.v)}</b>
              <span>Open</span><b>{money(top?.day?.o)}</b>
              <span>High</span><b>{money(top?.day?.h)}</b>
              <span>Low</span><b>{money(top?.day?.l)}</b>
              <span>Prev Close</span><b>{money(top?.prevDay?.c)}</b>
              <span>PUCK Score</span><b>{topScore}</b>
            </div>
          </div>
        </section>

        <aside className="panel engine">
          <p className="tag">SCANNER ENGINE</p>
          <div className="stat"><span>API Status</span><b>{apiStatus}</b></div>
          <div className="stat"><span>Raw Gainers</span><b>{stocks.length}</b></div>
          <div className="stat"><span>Mode</span><b>LIVE</b></div>
          <div className="stat"><span>Source</span><b>POLYGON</b></div>
          <div className="stat"><span>Filter Stage</span><b>BASIC</b></div>
          <div className="stat"><span>Next</span><b>FLOAT</b></div>
        </aside>
      </section>

      <section className="panel">
        <p className="tag">LIVE TOP GAINERS</p>

        {loading ? (
          <h2 className="loading">Loading Polygon gainers...</h2>
        ) : (
          <div className="cards">
            {stocks.map((s) => {
              const sScore = score(s);
              const verdict = sScore >= 80 ? "YES" : sScore >= 60 ? "WAIT" : "NO";

              return (
                <article className="card" key={s.ticker}>
                  <div className="cardTop">
                    <h3>{s.ticker}</h3>
                    <strong>{pct(s.todayChangePerc)}</strong>
                  </div>

                  <div className="bigData small">
                    <span>Price</span><b>{money(s.day?.c)}</b>
                    <span>Score</span><b>{sScore}</b>
                    <span>Change</span><b>{money(s.todayChange)}</b>
                    <span>Volume</span><b>{volume(s.day?.v)}</b>
                    <span>Open</span><b>{money(s.day?.o)}</b>
                    <span>High</span><b>{money(s.day?.h)}</b>
                    <span>Low</span><b>{money(s.day?.l)}</b>
                  </div>

                  <div className={`pill ${verdict.toLowerCase()}`}>{verdict}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">NEXT FILTERS</p>
          <div className="row"><b>Remove</b><span>Warrants / Units / Rights</span><em>NEXT</em></div>
          <div className="row"><b>Add</b><span>Price 0.10 - 20</span><em>NEXT</em></div>
          <div className="row"><b>Add</b><span>Volume 500K+</span><em>NEXT</em></div>
          <div className="row"><b>Add</b><span>Float Under 50M</span><em>NEXT</em></div>
        </div>

        <div className="panel">
          <p className="tag">POSITION CALCULATOR</p>
          <div className="bigData">
            <span>Entry</span><b>{money(top?.day?.c)}</b>
            <span>Stop</span><b>{money((top?.day?.c || 0) * 0.93)}</b>
            <span>Risk</span><b>7%</b>
            <span>Target</span><b>{money((top?.day?.c || 0) * 1.15)}</b>
            <span>R:R</span><b>2.1</b>
          </div>
        </div>

        <div className="panel">
          <p className="tag">SETTINGS</p>
          <div className="setting">Polygon API: {apiStatus}</div>
          <div className="setting">Dashboard: LIVE DATA</div>
          <div className="setting">Webhook: LATER</div>
          <div className="setting">Supabase: LATER</div>
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
        .bigData span,
        .stat span,
        .row span {
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
          font-size: 96px;
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

        .opportunity h2 {
          margin: 0;
          color: #ffd700;
          font-size: 58px;
        }

        .bigData {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 12px;
          margin-top: 14px;
        }

        .bigData b {
          color: #f5f5f5;
        }

        .green {
          color: #00ff88 !important;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .card {
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

        .card h3 {
          margin: 0;
          color: #ffb612;
          font-size: 30px;
        }

        .cardTop strong {
          color: #00ff88;
        }

        .small {
          font-size: 14px;
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
          .bottom {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
