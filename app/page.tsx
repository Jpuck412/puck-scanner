const stocks = [
  {
    ticker: "ONCY",
    gain: 127.4,
    price: 1.27,
    volume: "18.4M",
    speed: 94,
    spread: 91,
    score: 97,
    status: "YES"
  },
  {
    ticker: "ABCD",
    gain: 88.2,
    price: 0.74,
    volume: "9.8M",
    speed: 82,
    spread: 76,
    score: 84,
    status: "WAIT"
  },
  {
    ticker: "XYZ",
    gain: 42.7,
    price: 2.13,
    volume: "5.1M",
    speed: 58,
    spread: 44,
    score: 61,
    status: "NO"
  }
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">PUCK PERMISSION ENGINE</p>
          <h1>COMMAND CENTER</h1>
          <p className="sub">
            Black & Gold momentum radar for gainers, speed, spread, and proof.
          </p>
        </div>

        <div className="heat">
          <span>MARKET HEAT</span>
          <strong>HOT</strong>
          <small>7:00 AM / 9:30 AM injection ready</small>
        </div>
      </section>

      <section className="stats">
        <div><span>Active Gainers</span><strong>18</strong></div>
        <div><span>Elite Setups</span><strong>3</strong></div>
        <div><span>Trap Risk</span><strong>5</strong></div>
        <div><span>Scanner Mode</span><strong>LIVE</strong></div>
      </section>

      <section className="grid">
        <div className="elite">
          <p className="eyebrow">ELITE SETUP</p>
          <h2>ONCY</h2>
          <h3>PUCK SCORE 97</h3>

          <ul>
            <li>✓ Speed increasing</li>
            <li>✓ Volume accelerating</li>
            <li>✓ Spread tight</li>
            <li>✓ Buyers control tape</li>
            <li>✓ Support identified</li>
          </ul>

          <div className="permission">PERMISSION: YES</div>
        </div>

        <div className="cards">
          {stocks.map((stock) => (
            <article className="card" key={stock.ticker}>
              <div className="cardTop">
                <div>
                  <h2>{stock.ticker}</h2>
                  <p>${stock.price}</p>
                </div>
                <strong>+{stock.gain}%</strong>
              </div>

              <div className="meter">
                <span>Speed</span>
                <div><i style={{ width: `${stock.speed}%` }} /></div>
                <b>{stock.speed}</b>
              </div>

              <div className="meter">
                <span>Spread</span>
                <div><i style={{ width: `${stock.spread}%` }} /></div>
                <b>{stock.spread}</b>
              </div>

              <div className="cardBottom">
                <span>Vol {stock.volume}</span>
                <strong>{stock.score}</strong>
              </div>

              <div className={`status ${stock.status.toLowerCase()}`}>
                {stock.status}
              </div>
            </article>
          ))}
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #030303;
        }

        .page {
          min-height: 100vh;
          padding: 28px;
          color: #f5f5f5;
          font-family: Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(255, 182, 18, 0.24), transparent 35%),
            radial-gradient(circle at bottom right, rgba(255, 214, 0, 0.12), transparent 30%),
            linear-gradient(135deg, #030303, #0b0b0b 60%, #020202);
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: stretch;
          padding: 28px;
          border: 1px solid rgba(255, 182, 18, 0.35);
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(20,20,20,.96), rgba(4,4,4,.96));
          box-shadow:
            0 30px 80px rgba(0,0,0,.85),
            inset 0 1px 0 rgba(255,255,255,.08),
            0 0 45px rgba(255,182,18,.16);
        }

        .eyebrow {
          color: #ffb612;
          letter-spacing: 4px;
          font-size: 12px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px, 8vw, 92px);
          line-height: .9;
          color: #ffb612;
          text-shadow:
            0 0 22px rgba(255,182,18,.6),
            0 8px 0 rgba(0,0,0,.8);
        }

        .sub {
          color: #cfcfcf;
          max-width: 650px;
          font-size: 18px;
        }

        .heat {
          min-width: 250px;
          border-radius: 24px;
          padding: 24px;
          background:
            linear-gradient(145deg, rgba(255,182,18,.22), rgba(15,15,15,.95));
          border: 1px solid rgba(255,182,18,.5);
          box-shadow: inset 0 0 30px rgba(255,182,18,.12);
        }

        .heat span,
        .heat small {
          display: block;
          color: #d7d7d7;
        }

        .heat strong {
          display: block;
          margin: 18px 0;
          font-size: 52px;
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255,215,0,.7);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .stats div {
          padding: 22px;
          border-radius: 22px;
          background: linear-gradient(145deg, #161616, #050505);
          border: 1px solid rgba(255,182,18,.25);
          box-shadow: 0 18px 45px rgba(0,0,0,.65);
        }

        .stats span {
          display: block;
          color: #aaa;
          font-size: 13px;
        }

        .stats strong {
          display: block;
          margin-top: 8px;
          color: #ffb612;
          font-size: 34px;
        }

        .grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
        }

        .elite {
          padding: 26px;
          border-radius: 28px;
          background:
            linear-gradient(150deg, rgba(255,182,18,.18), rgba(8,8,8,.98));
          border: 1px solid rgba(255,182,18,.55);
          box-shadow:
            0 35px 80px rgba(0,0,0,.8),
            0 0 40px rgba(255,182,18,.18);
        }

        .elite h2 {
          margin: 0;
          color: #ffd700;
          font-size: 80px;
          text-shadow: 0 0 25px rgba(255,215,0,.75);
        }

        .elite h3 {
          color: #fff;
          margin-top: 0;
        }

        .elite ul {
          list-style: none;
          padding: 0;
          line-height: 2;
          color: #e8e8e8;
        }

        .permission {
          margin-top: 22px;
          padding: 16px;
          text-align: center;
          border-radius: 18px;
          background: #ffb612;
          color: #050505;
          font-weight: 900;
          box-shadow: 0 0 28px rgba(255,182,18,.6);
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .card {
          position: relative;
          overflow: hidden;
          padding: 22px;
          border-radius: 26px;
          background:
            linear-gradient(145deg, rgba(28,28,28,.98), rgba(5,5,5,.98));
          border: 1px solid rgba(255,182,18,.3);
          box-shadow:
            0 24px 60px rgba(0,0,0,.75),
            inset 0 1px 0 rgba(255,255,255,.08);
          transform: perspective(900px) rotateX(1deg);
        }

        .card::before {
          content: "";
          position: absolute;
          inset: -80px;
          background: linear-gradient(120deg, transparent, rgba(255,215,0,.14), transparent);
          transform: rotate(25deg);
        }

        .cardTop,
        .cardBottom {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card h2 {
          margin: 0;
          color: #ffb612;
          font-size: 38px;
        }

        .card p {
          margin: 4px 0 0;
          color: #bdbdbd;
        }

        .cardTop strong {
          color: #00ff88;
          font-size: 24px;
        }

        .meter {
          position: relative;
          margin: 22px 0;
          display: grid;
          grid-template-columns: 70px 1fr 36px;
          gap: 10px;
          align-items: center;
        }

        .meter span {
          color: #ccc;
        }

        .meter div {
          height: 10px;
          border-radius: 999px;
          background: #222;
          overflow: hidden;
          box-shadow: inset 0 0 8px #000;
        }

        .meter i {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffb612, #ffd700);
          box-shadow: 0 0 14px rgba(255,215,0,.8);
        }

        .cardBottom span {
          color: #aaa;
        }

        .cardBottom strong {
          color: #ffd700;
          font-size: 42px;
        }

        .status {
          position: relative;
          margin-top: 18px;
          padding: 12px;
          text-align: center;
          border-radius: 14px;
          font-weight: 900;
        }

        .yes {
          background: rgba(0,255,136,.16);
          color: #00ff88;
          border: 1px solid rgba(0,255,136,.4);
        }

        .wait {
          background: rgba(255,182,18,.18);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.45);
        }

        .no {
          background: rgba(255,77,77,.16);
          color: #ff4d4d;
          border: 1px solid rgba(255,77,77,.4);
        }

        @media (max-width: 900px) {
          .hero,
          .grid {
            grid-template-columns: 1fr;
            display: grid;
          }

          .stats,
          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
