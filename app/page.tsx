"use client";

import { useEffect, useState } from "react";

const gainers = [
  ["ONCY", "+127.4%", "$1.27", "97", "YES", "18.4M", "14.8", "0.23%", "$1.18", "$1.42"],
  ["ABCD", "+88.2%", "$0.74", "84", "WAIT", "9.8M", "9.1", "0.41%", "$0.69", "$0.82"],
  ["XYZ", "+42.7%", "$2.13", "61", "NO", "5.1M", "4.4", "0.88%", "$2.02", "$2.31"],
  ["LMNO", "+36.1%", "$0.49", "58", "WATCH", "3.7M", "3.8", "1.10%", "$0.44", "$0.56"],
  ["QRST", "+29.8%", "$1.88", "55", "WATCH", "2.9M", "3.2", "0.92%", "$1.72", "$2.04"]
];

const phases = ["4:00 IGNITION", "7:00 INJECTION", "9:30 OPEN", "11:00 FADE", "3:00 POWER"];

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
          <p className="tag">PUCK SCANNER V4</p>
          <h1>MISSION CONTROL</h1>
          <span>Speed. Volume. Spread. Support. Proof.</span>
        </div>

        <div className="clock">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>Live command center</small>
        </div>
      </section>

      <section className="phaseBar">
        {phases.map((p, i) => (
          <div className={i === 4 ? "phase active" : "phase"} key={p}>
            {p}
          </div>
        ))}
      </section>

      <section className="dash">
        <aside className="panel permissionPanel">
          <p className="tag">PERMISSION ENGINE</p>
          <h2>YES</h2>
          <div className="rule">🟢 Speed Up <b>PASS</b></div>
          <div className="rule">🟢 Volume Up <b>PASS</b></div>
          <div className="rule">🟢 Spread Tight <b>PASS</b></div>
          <div className="rule">🟢 Buyers Control <b>PASS</b></div>
          <div className="rule">🟢 Support Found <b>PASS</b></div>
          <div className="rule">🟢 Risk Defined <b>PASS</b></div>
          <div className="rule">🟢 Evidence &gt; Prediction <b>PASS</b></div>
          <div className="final">WHAT PROVES I'M RIGHT?</div>
        </aside>

        <section className="center">
          <div className="panel radar">
            <p className="tag">LIVE RADAR</p>
            <div className="circle">
              <strong>97</strong>
              <span>ELITE</span>
            </div>
            <div className="radarStats">
              <div>Speed <b>94</b></div>
              <div>Volume <b>98</b></div>
              <div>Spread <b>91</b></div>
              <div>Buyers <b>78%</b></div>
            </div>
          </div>

          <div className="panel opportunity">
            <p className="tag">TOP OPPORTUNITY</p>
            <h2>ONCY</h2>
            <div className="bigData">
              <span>Price</span><b>$1.27</b>
              <span>Gain</span><b className="green">+127.4%</b>
              <span>Volume</span><b>18.4M</b>
              <span>RVOL</span><b>14.8</b>
              <span>Spread</span><b>0.23%</b>
              <span>Float</span><b>8.2M</b>
              <span>Support</span><b>$1.18</b>
              <span>Resistance</span><b>$1.42</b>
              <span>Catalyst</span><b>Trial Results</b>
            </div>
          </div>
        </section>

        <aside className="panel engine">
          <p className="tag">SCANNER ENGINE</p>
          <div className="stat"><span>Stocks Scanned</span><b>5142</b></div>
          <div className="stat"><span>Passed Filters</span><b>72</b></div>
          <div className="stat"><span>Low Float</span><b>19</b></div>
          <div className="stat"><span>News Catalysts</span><b>14</b></div>
          <div className="stat"><span>Elite Setups</span><b>4</b></div>
          <div className="stat"><span>Trap Risk</span><b>5</b></div>
          <div className="stat"><span>Polygon</span><b>READY</b></div>
          <div className="stat"><span>Supabase</span><b>READY</b></div>
        </aside>
      </section>

      <section className="panel">
        <p className="tag">TOP GAINERS</p>
        <div className="cards">
          {gainers.map((s) => (
            <article className="card" key={s[0]}>
              <div className="cardTop">
                <h3>{s[0]}</h3>
                <strong>{s[1]}</strong>
              </div>

              <div className="data">
                <span>Price</span><b>{s[2]}</b>
                <span>Score</span><b>{s[3]}</b>
                <span>Status</span><b>{s[4]}</b>
                <span>Volume</span><b>{s[5]}</b>
                <span>RVOL</span><b>{s[6]}</b>
                <span>Spread</span><b>{s[7]}</b>
                <span>Support</span><b>{s[8]}</b>
                <span>Resist</span><b>{s[9]}</b>
              </div>

              <div className={`pill ${s[4].toLowerCase()}`}>{s[4]}</div>
            </article>
          ))}
        </div>
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
          <p className="tag">SETTINGS</p>
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
        .phase {
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

        .phase {
          padding: 16px;
          color: #aaa;
          text-align: center;
          font-weight: 900;
        }

        .phase.active {
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

        .permissionPanel {
          border-color: rgba(255,182,18,.55);
          background: linear-gradient(150deg, rgba(255,182,18,.18), #050505);
        }

        .permissionPanel h2 {
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

        .center {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
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

        .data,
        .bigData {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 12px;
          margin-top: 14px;
        }

        .data b,
        .bigData b {
          color: #f5f5f5;
        }

        .green {
          color: #00ff88 !important;
        }

        .cards {
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
