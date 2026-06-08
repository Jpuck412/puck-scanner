const gainers = [
  ["ONCY", "+127.4%", "$1.27", "97", "YES"],
  ["ABCD", "+88.2%", "$0.74", "84", "WAIT"],
  ["XYZ", "+42.7%", "$2.13", "61", "NO"],
  ["LMNO", "+36.1%", "$0.49", "58", "WATCH"],
  ["QRST", "+29.8%", "$1.88", "55", "WATCH"]
];

const metrics = [
  ["Stocks Scanned", "5142"],
  ["Passed Filters", "72"],
  ["Low Float", "19"],
  ["News Catalysts", "14"],
  ["Elite Setups", "4"],
  ["Trap Risk", "5"]
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p>PUCK SCANNER V2</p>
          <h1>MISSION CONTROL</h1>
          <span>Speed. Volume. Spread. Support. Proof.</span>
        </div>

        <div className="phase">
          <small>MARKET PHASE</small>
          <strong>MIDDAY</strong>
          <small>Last Scan: TEST MODE</small>
        </div>
      </section>

      <section className="top">
        <div><span>Market Heat</span><b>82 HOT</b></div>
        <div><span>Scanner</span><b>ACTIVE</b></div>
        <div><span>Mission</span><b>READY</b></div>
        <div><span>Mode</span><b>TEST</b></div>
      </section>

      <section className="grid">
        <div className="panel elite">
          <p>ELITE SETUP</p>
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
            <span>Support</span><b>$1.18</b>
            <span>Resistance</span><b>$1.42</b>
            <span>RSI</span><b>67</b>
            <span>MFI</span><b>79</b>
            <span>ADX</span><b>42</b>
          </div>

          <div className="rules">
            <div>🟢 Speed Up</div>
            <div>🟢 Volume Up</div>
            <div>🟢 Spread Tight</div>
            <div>🟢 Support Found</div>
            <div>🟢 Risk Defined</div>
            <div>🟢 Evidence &gt; Prediction</div>
          </div>

          <div className="permission">PERMISSION: YES</div>
        </div>

        <div className="panel mainPanel">
          <p>TOP GAINERS</p>

          <div className="cards">
            {gainers.map((s) => (
              <article className="card" key={s[0]}>
                <div className="cardTop">
                  <h3>{s[0]}</h3>
                  <strong>{s[1]}</strong>
                </div>

                <div className="data small">
                  <span>Price</span><b>{s[2]}</b>
                  <span>Score</span><b>{s[3]}</b>
                  <span>Speed</span><b>RISING</b>
                  <span>Volume</span><b>HOT</b>
                  <span>Spread</span><b>TIGHT</b>
                  <span>Status</span><b>{s[4]}</b>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel side">
          <p>SCANNER ENGINE</p>

          {metrics.map((m) => (
            <div className="metric" key={m[0]}>
              <span>{m[0]}</span>
              <b>{m[1]}</b>
            </div>
          ))}

          <p>SYSTEM STATUS</p>
          <div className="status"><span>Polygon</span><b>READY</b></div>
          <div className="status"><span>Supabase</span><b>READY</b></div>
          <div className="status"><span>Anthropic</span><b>READY</b></div>
          <div className="status"><span>Scanner</span><b>RUNNING</b></div>
        </div>
      </section>

      <section className="bottom">
        <div className="panel">
          <p>CATALYST FEED</p>
          <div className="feed"><b>ONCY</b><span>Cancer Trial Results</span><em>HIGH</em></div>
          <div className="feed"><b>ABCD</b><span>Merger News</span><em>MED</em></div>
          <div className="feed"><b>XYZ</b><span>FDA Filing</span><em>MED</em></div>
        </div>

        <div className="panel">
          <p>POSITION CALCULATOR</p>
          <div className="data">
            <span>Entry</span><b>$1.27</b>
            <span>Stop</span><b>$1.18</b>
            <span>Risk</span><b>$0.09</b>
            <span>Target</span><b>$1.45</b>
            <span>R:R</span><b>2.0</b>
          </div>
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
            linear-gradient(135deg, #020202, #0b0b0b);
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 18px;
          padding: 28px;
          border-radius: 28px;
          border: 1px solid rgba(255,182,18,.35);
          background: linear-gradient(145deg, #111, #030303);
          box-shadow: 0 0 40px rgba(255,182,18,.15);
        }

        .hero p,
        .panel p {
          color: #ffb612;
          letter-spacing: 3px;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          margin: 8px 0;
          color: #ffb612;
          font-size: clamp(44px, 7vw, 82px);
          text-shadow: 0 0 25px rgba(255,182,18,.75);
        }

        .phase,
        .top div,
        .panel {
          border-radius: 22px;
          border: 1px solid rgba(255,182,18,.25);
          background: linear-gradient(145deg, #121212, #050505);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .phase {
          padding: 22px;
        }

        .phase small,
        .top span,
        .data span,
        .metric span,
        .status span {
          display: block;
          color: #999;
        }

        .phase strong,
        .top b {
          display: block;
          color: #ffd700;
          font-size: 30px;
          margin: 8px 0;
        }

        .top {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin: 18px 0;
        }

        .top div {
          padding: 18px;
        }

        .grid {
          display: grid;
          grid-template-columns: 330px 1fr 310px;
          gap: 18px;
        }

        .panel {
          padding: 20px;
        }

        .elite {
          border-color: rgba(255,182,18,.55);
          background: linear-gradient(150deg, rgba(255,182,18,.16), #050505);
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

        .rules {
          margin-top: 16px;
          line-height: 1.7;
        }

        .permission {
          margin-top: 18px;
          padding: 14px;
          border-radius: 14px;
          background: #ffb612;
          color: #000;
          text-align: center;
          font-weight: 900;
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
          font-size: 34px;
        }

        .card strong {
          color: #00ff88;
        }

        .small {
          font-size: 14px;
        }

        .metric,
        .status,
        .feed {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        .metric b,
        .status b,
        .feed em {
          color: #ffb612;
          font-style: normal;
          font-weight: 800;
        }

        .bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .feed b {
          color: #ffd700;
        }

        .feed span {
          color: #ddd;
        }

        @media (max-width: 1100px) {
          .hero,
          .top,
          .grid,
          .cards,
          .bottom {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
