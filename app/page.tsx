"use client";

import { useEffect, useState } from "react";

const heat = [
  ["ONCY", 97, "YES"],
  ["ABCD", 84, "WAIT"],
  ["XYZ", 61, "NO"],
  ["LMNO", 58, "WATCH"],
  ["QRST", 55, "WATCH"],
  ["BIOX", 78, "WAIT"],
  ["AIMD", 73, "WATCH"],
  ["VOLT", 66, "NO"]
];

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
          <p className="tag">PUCK SCANNER V5</p>
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
        <div>4:00 IGNITION</div>
        <div>7:00 INJECTION</div>
        <div>9:30 OPEN</div>
        <div>11:00 FADE</div>
        <div className="active">3:00 POWER</div>
      </section>

      <section className="dash">
        <aside className="panel permission">
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
              <div>Float <b>8.2M</b></div>
              <div>Borrow Fee <b>143%</b></div>
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
              <span>Market Cap</span><b>$12.4M</b>
              <span>Short Interest</span><b>18%</b>
              <span>Borrow Fee</span><b>143%</b>
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

      <section className="triple">
        <div className="panel">
          <p className="tag">MARKET HEAT MAP</p>

          <div className="heatGrid">
            {heat.map((h) => (
              <div className={`heatTile ${h[2].toString().toLowerCase()}`} key={h[0]}>
                <strong>{h[0]}</strong>
                <span>{h[1]}</span>
                <small>{h[2]}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="tag">TAPE SPEED</p>

          <div className="speedMeter">
            <div className="needle" />
            <strong>FAST</strong>
            <span>DEAD · SLOW · ACTIVE · FAST · VIOLENT</span>
          </div>

          <div className="bar">
            <span>Buyers 78%</span>
            <i style={{ width: "78%" }} />
          </div>

          <div className="bar red">
            <span>Sellers 22%</span>
            <i style={{ width: "22%" }} />
          </div>
        </div>

        <div className="panel">
          <p className="tag">SUPPORT / RESISTANCE</p>

          <div className="level">
            <span>Support</span>
            <b>$1.18</b>
            <i style={{ width: "82%" }} />
          </div>

          <div className="level">
            <span>Current</span>
            <b>$1.27</b>
            <i style={{ width: "64%" }} />
          </div>

          <div className="level">
            <span>Resistance</span>
            <b>$1.42</b>
            <i style={{ width: "48%" }} />
          </div>
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

          <div className="bigData">
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
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 35px rgba(255,182,18,.25); }
          50% { transform: scale(1.03); box-shadow: 0 0 60px rgba(255,182,18,.45); }
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

        .triple,
        .bottom {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
        }

        .heatGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .heatTile {
          padding: 16px;
          border-radius: 16px;
          background: #070707;
          border: 1px solid rgba(255,182,18,.25);
        }

        .heatTile strong {
          display: block;
          color: #ffb612;
          font-size: 24px;
        }

        .heatTile span {
          display: block;
          color: #ffd700;
          font-size: 34px;
          font-weight: 900;
        }

        .heatTile small {
          color: #aaa;
        }

        .heatTile.yes {
          box-shadow: 0 0 22px rgba(255,182,18,.35);
        }

        .heatTile.no {
          border-color: rgba(255,77,77,.45);
        }

        .speedMeter {
          text-align: center;
          padding: 22px;
        }

        .speedMeter strong {
          display: block;
          color: #ffd700;
          font-size: 50px;
          text-shadow: 0 0 20px rgba(255,215,0,.6);
        }

        .needle {
          margin: 0 auto 10px;
          width: 120px;
          height: 8px;
          background: #ffb612;
          border-radius: 999px;
          transform: rotate(-12deg);
          box-shadow: 0 0 18px rgba(255,182,18,.7);
        }

        .bar,
        .level {
          margin-top: 18px;
        }

        .bar span,
        .level span {
          display: block;
          color: #aaa;
          margin-bottom: 8px;
        }

        .bar i,
        .level i {
          display: block;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffb612, #ffd700);
          box-shadow: 0 0 16px rgba(255,182,18,.6);
        }

        .bar.red i {
          background: linear-gradient(90deg, #ff4d4d, #7a1515);
        }

        .level b {
          float: right;
          color: #ffd700;
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
          .triple,
          .heatGrid,
          .bottom {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
