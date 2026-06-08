"use client";

import { useEffect, useState } from "react";

const gainers = [
  { ticker: "ONCY", gain: "+127.4%", price: "$1.27", score: 97, speed: 94, volume: "18.4M", rvol: "14.8", spread: "0.23%", float: "8.2M", support: "$1.18", resistance: "$1.42", status: "YES" },
  { ticker: "ABCD", gain: "+88.2%", price: "$0.74", score: 84, speed: 82, volume: "9.8M", rvol: "9.1", spread: "0.41%", float: "12.6M", support: "$0.69", resistance: "$0.82", status: "WAIT" },
  { ticker: "XYZ", gain: "+42.7%", price: "$2.13", score: 61, speed: 58, volume: "5.1M", rvol: "4.4", spread: "0.88%", float: "34.1M", support: "$2.02", resistance: "$2.31", status: "NO" },
  { ticker: "LMNO", gain: "+36.1%", price: "$0.49", score: 58, speed: 52, volume: "3.7M", rvol: "3.8", spread: "1.10%", float: "22.4M", support: "$0.44", resistance: "$0.56", status: "WATCH" },
  { ticker: "QRST", gain: "+29.8%", price: "$1.88", score: 55, speed: 49, volume: "2.9M", rvol: "3.2", spread: "0.92%", float: "18.9M", support: "$1.72", resistance: "$2.04", status: "WATCH" }
];

const rules = ["Speed ↑", "Volume ↑", "Spread Tight", "Buyers Control", "Support Found", "Risk Defined", "Evidence > Prediction"];

export default function Home() {
  const [time, setTime] = useState("");

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

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">PUCK SCANNER V3</p>
          <h1>MISSION CONTROL</h1>
          <span>Speed. Volume. Spread. Support. Proof.</span>
        </div>

        <div className="heroBox">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Live phase engine</small>
        </div>
      </section>

      <section className="top">
        <div><span>Market Heat</span><b>82 HOT</b></div>
        <div><span>Phase</span><b>MIDDAY</b></div>
        <div><span>Scanner</span><b>ACTIVE</b></div>
        <div><span>Mission</span><b>READY</b></div>
        <div><span>Mode</span><b>TEST</b></div>
      </section>

      <section className="layout">
        <aside className="panel elite">
          <p className="tag">ELITE SETUP</p>
          <h2>ONCY</h2>
          <h3>PUCK SCORE 97</h3>

          <div className="data">
            <span>Price</span><b>$1.27</b>
            <span>Gain</span><b className="green">+127.4%</b>
            <span>Speed</span><b>94</b>
            <span>Volume</span><b>18.4M</b>
            <span>RVOL</span><b>14.8</b>
            <span>Spread</span><b>0.23%</b>
            <span>Float</span><b>8.2M</b>
            <span>Market Cap</span><b>$12.4M</b>
            <span>Support</span><b>$1.18</b>
            <span>Resistance</span><b>$1.42</b>
            <span>RSI</span><b>67</b>
            <span>MFI</span><b>79</b>
            <span>ADX</span><b>42</b>
            <span>VWAP</span><b>ABOVE</b>
          </div>

          <div className="permission">PERMISSION: YES</div>
        </aside>

        <section className="center">
          <div className="panel radar">
            <p className="tag">PUCK RADAR</p>
            <div className="radarCircle">
              <div>
                <strong>97</strong>
                <span>ELITE</span>
              </div>
            </div>
            <div className="radarStats">
              <div>Speed <b>94</b></div>
              <div>Volume <b>98</b></div>
              <div>Spread <b>91</b></div>
              <div>Buyers <b>78%</b></div>
            </div>
          </div>

          <div className="panel">
            <p className="tag">TOP GAINERS</p>
            <div className="cards">
              {gainers.map((s) => (
                <article className="card" key={s.ticker}>
                  <div className="cardTop">
                    <h3>{s.ticker}</h3>
                    <strong>{s.gain}</strong>
                  </div>

                  <div className="data small">
                    <span>Price</span><b>{s.price}</b>
                    <span>Score</span><b>{s.score}</b>
                    <span>Speed</span><b>{s.speed}</b>
                    <span>Volume</span><b>{s.volume}</b>
                    <span>RVOL</span><b>{s.rvol}</b>
                    <span>Spread</span><b>{s.spread}</b>
                    <span>Float</span><b>{s.float}</b>
                    <span>Support</span><b>{s.support}</b>
                    <span>Resist</span><b>{s.resistance}</b>
                  </div>

                  <div className={`pill ${s.status.toLowerCase()}`}>{s.status}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="right">
          <div className="panel">
            <p className="tag">RULE ENGINE</p>
            {rules.map((r) => (
              <div className="row" key={r}>
                <span>🟢 {r}</span>
                <b>PASS</b>
              </div>
            ))}
            <div className="verdict">FINAL: PROOF REQUIRED</div>
          </div>

          <div className="panel">
            <p className="tag">SCANNER ENGINE</p>
            <div className="row"><span>Stocks Scanned</span><b>5142</b></div>
            <div className="row"><span>Passed Filters</span><b>72</b></div>
            <div className="row"><span>Low Float</span><b>19</b></div>
            <div className="row"><span>News Catalysts</span><b>14</b></div>
            <div className="row"><span>Elite Setups</span><b>4</b></div>
            <div className="row"><span>Trap Risk</span><b>5</b></div>
          </div>

          <div className="panel">
            <p className="tag">SYSTEM STATUS</p>
            <div className="row"><span>Polygon</span><b>READY</b></div>
            <div className="row"><span>Supabase</span><b>READY</b></div>
            <div className="row"><span>Anthropic</span><b>READY</b></div>
            <div className="row"><span>Scanner</span><b>RUNNING</b></div>
          </div>
        </aside>
      </section>

      <section className="bottom">
        <div className="panel">
          <p className="tag">CATALYST FEED</p>
          <div className="row"><b>ONCY</b><span>Cancer Trial Results</span><em>HIGH</em></div>
          <div className="row"><b>ABCD</b><span>Merger News</span><em>MED</em></div>
          <div className="row"><b>XYZ</b><span>FDA Filing</span><em>MED</em></div>
          <div className="row"><b>LMNO</b><span>Government Contract</span><em>HIGH</em></div>
        </div>

        <div className="panel">
          <p className="tag">POSITION CALCULATOR</p>
          <div className="data">
            <span>Entry</span><b>$1.27</b>
            <span>Stop</span><b>$1.18</b>
            <span>Risk</span><b>$0.09</b>
            <span>Target</span><b>$1.45</b>
            <span>R:R</span><b>2.0</b>
            <span>Shares</span><b>500</b>
          </div>
        </div>

        <div className="panel">
          <p className="tag">SETTINGS PLACEHOLDER</p>
          <div className="setting">Polygon API Key</div>
          <div className="setting">Supabase URL</div>
          <div className="setting">Supabase Key</div>
          <div className="setting">TradingView Webhook</div>
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
            radial-gradient(circle at top left, rgba(255,182,18,.24), transparent 32%),
            radial-gradient(circle at bottom right, rgba(255,215,0,.12), transparent 34%),
            linear-gradient(135deg, #020202, #0b0b0b);
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 18px;
          padding: 28px;
          border-radius: 28px;
          border: 1px solid rgba(255,182,18,.35);
          background: linear-gradient(145deg, #111, #030303);
          box-shadow: 0 0 45px rgba(255,182,18,.16);
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
          text-shadow: 0 0 25px rgba(255,182,18,.75);
        }

        .hero span {
          color: #cfcfcf;
        }

        .heroBox,
        .top div,
        .panel {
          border-radius: 22px;
          border: 1px solid rgba(255,182,18,.25);
          background: linear-gradient(145deg, #121212, #050505);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .heroBox {
          padding: 22px;
        }

        .heroBox small,
        .top span,
        .data span,
        .row span {
          color: #999;
        }

        .heroBox strong {
          display: block;
          color: #ffd700;
          font-size: 34px;
          margin: 10px 0;
        }

        .top {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin: 18px 0;
        }

        .top div {
          padding: 18px;
        }

        .top b {
          display: block;
          color: #ffd700;
          font-size: 28px;
          margin-top: 6px;
        }

        .layout {
          display: grid;
          grid-template-columns: 330px 1fr 320px;
          gap: 18px;
        }

        .panel {
          padding: 20px;
          margin-bottom: 18px;
        }

        .elite {
          border-color: rgba(255,182,18,.55);
          background: linear-gradient(150deg, rgba(255,182,18,.17), #050505);
        }

        .elite h2 {
          margin: 0;
          color: #ffd700;
          font-size: 64px;
          text-shadow: 0 0 24px rgba(255,215,0,.7);
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

        .green {
          color: #00ff88 !important;
        }

        .permission,
        .verdict,
        .pill {
          margin-top: 16px;
          padding: 13px;
          border-radius: 14px;
          text-align: center;
          font-weight: 900;
        }

        .permission,
        .yes {
          background: #ffb612;
          color: #050505;
        }

        .wait,
        .watch {
          background: rgba(255,182,18,.18);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.38);
        }

        .no {
          background: rgba(255,77,77,.16);
          color: #ff4d4d;
          border: 1px solid rgba(255,77,77,.35);
        }

        .radar {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 20px;
          align-items: center;
        }

        .radarCircle {
          width: 210px;
          height: 210px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 2px solid rgba(255,182,18,.6);
          background:
            radial-gradient(circle, rgba(255,182,18,.25), transparent 58%),
            #050505;
          box-shadow: 0 0 40px rgba(255,182,18,.25);
        }

        .radarCircle strong {
          display: block;
          color: #ffd700;
          font-size: 62px;
          text-align: center;
        }

        .radarCircle span {
          color: #ffb612;
          font-weight: 900;
        }

        .radarStats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .radarStats div {
          padding: 14px;
          border-radius: 14px;
          background: #070707;
          border: 1px solid rgba(255,182,18,.18);
        }

        .radarStats b {
          color: #ffd700;
          float: right;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .card {
          padding: 18px;
          border-radius: 20px;
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
          font-size: 32px;
        }

        .cardTop strong {
          color: #00ff88;
        }

        .small {
          font-size: 14px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        .row b,
        .row em {
          color: #ffb612;
          font-style: normal;
          font-weight: 900;
        }

        .verdict {
          background: rgba(255,182,18,.12);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.3);
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

        @media (max-width: 1100px) {
          .hero,
          .top,
          .layout,
          .cards,
          .bottom,
          .radar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
