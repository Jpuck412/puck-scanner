const gainers = [
  {
    rank: 1,
    ticker: "ONCY",
    price: "$1.27",
    gain: "+127.4%",
    score: 97,
    speed: 94,
    volume: "18.4M",
    rvol: "14.8",
    spread: "0.23%",
    float: "8.2M",
    support: "$1.18",
    resistance: "$1.42",
    catalyst: "Cancer Trial Results",
    permission: "YES"
  },
  {
    rank: 2,
    ticker: "ABCD",
    price: "$0.74",
    gain: "+88.2%",
    score: 84,
    speed: 82,
    volume: "9.8M",
    rvol: "9.1",
    spread: "0.41%",
    float: "12.6M",
    support: "$0.69",
    resistance: "$0.82",
    catalyst: "Merger News",
    permission: "WAIT"
  },
  {
    rank: 3,
    ticker: "XYZ",
    price: "$2.13",
    gain: "+42.7%",
    score: 61,
    speed: 58,
    volume: "5.1M",
    rvol: "4.4",
    spread: "0.88%",
    float: "34.1M",
    support: "$2.02",
    resistance: "$2.31",
    catalyst: "FDA Filing",
    permission: "NO"
  }
];

const ruleEngine = [
  ["Speed ↑", "PASS"],
  ["Volume ↑", "PASS"],
  ["Spread Tight", "PASS"],
  ["Support Found", "PASS"],
  ["Risk Defined", "PASS"],
  ["Evidence > Prediction", "PASS"],
  ["Confirmation", "PASS"]
];

const catalysts = [
  ["ONCY", "Cancer Trial Results", "BIO", "HIGH"],
  ["ABCD", "Merger News", "M&A", "MED"],
  ["XYZ", "FDA Filing", "BIO", "MED"],
  ["LMNO", "Government Contract", "DEFENSE", "HIGH"]
];

export default function Home() {
  return (
    <main className="page">
      <section className="topBar">
        <div className="brand">
          <span>PUCK SCANNER V2</span>
          <h1>MISSION CONTROL</h1>
        </div>

        <div className="topStat">
          <small>ET CLOCK</small>
          <strong>LIVE</strong>
        </div>

        <div className="topStat">
          <small>MARKET PHASE</small>
          <strong>MIDDAY</strong>
        </div>

        <div className="topStat">
          <small>MARKET HEAT</small>
          <strong>82 HOT</strong>
        </div>

        <div className="topStat">
          <small>LAST SCAN</small>
          <strong>TEST</strong>
        </div>
      </section>

      <section className="layout">
        <aside className="leftCol">
          <div className="panel elite">
            <p className="label">ELITE SETUP</p>
            <h2>ONCY</h2>
            <h3>PUCK SCORE 97</h3>

            <div className="infoGrid">
              <span>Price</span><b>$1.27</b>
              <span>Gain</span><b className="green">+127.4%</b>
              <span>Speed</span><b>94</b>
              <span>Volume</span><b>18.4M</b>
              <span>RVOL</span><b>14.8</b>
              <span>Spread</span><b>0.23%</b>
              <span>Float</span><b>8.2M</b>
              <span>Market Cap</span><b>12.4M</b>
              <span>Support</span><b>$1.18</b>
              <span>Resistance</span><b>$1.42</b>
              <span>RSI</span><b>67</b>
              <span>MFI</span><b>79</b>
              <span>ADX</span><b>42</b>
              <span>VWAP</span><b>ABOVE</b>
            </div>

            <div className="permission yes">PERMISSION: YES</div>
          </div>

          <div className="panel">
            <p className="label">PUCK RULE ENGINE</p>
            {ruleEngine.map((rule) => (
              <div className="rule" key={rule[0]}>
                <span>🟢 {rule[0]}</span>
                <b>{rule[1]}</b>
              </div>
            ))}
            <div className="verdict">FINAL VERDICT: GO ONLY WITH PROOF</div>
          </div>

          <div className="panel">
            <p className="label">POSITION CALCULATOR</p>
            <div className="infoGrid">
              <span>Entry</span><b>$1.27</b>
              <span>Stop</span><b>$1.18</b>
              <span>Risk</span><b>$0.09</b>
              <span>Target</span><b>$1.45</b>
              <span>R:R</span><b>2.0</b>
              <span>Shares</span><b>500</b>
            </div>
          </div>
        </aside>

        <section className="centerCol">
          <div className="panel">
            <p className="label">TOP GAINERS</p>
            <div className="gainerGrid">
              {gainers.map((stock) => (
                <article className="stockCard" key={stock.ticker}>
                  <div className="stockHead">
                    <div>
                      <small>#{stock.rank}</small>
                      <h3>{stock.ticker}</h3>
                    </div>
                    <strong>{stock.gain}</strong>
                  </div>

                  <div className="stockMeta">
                    <span>Price</span><b>{stock.price}</b>
                    <span>Score</span><b>{stock.score}</b>
                    <span>Speed</span><b>{stock.speed}</b>
                    <span>Volume</span><b>{stock.volume}</b>
                    <span>RVOL</span><b>{stock.rvol}</b>
                    <span>Spread</span><b>{stock.spread}</b>
                    <span>Float</span><b>{stock.float}</b>
                    <span>Support</span><b>{stock.support}</b>
                    <span>Resistance</span><b>{stock.resistance}</b>
                  </div>

                  <div className="catalyst">{stock.catalyst}</div>
                  <div className={`miniPerm ${stock.permission.toLowerCase()}`}>
                    {stock.permission}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <p className="label">CATALYST FEED</p>
            {catalysts.map((cat) => (
              <div className="feed" key={cat[0]}>
                <b>{cat[0]}</b>
                <span>{cat[1]}</span>
                <em>{cat[2]}</em>
                <strong>{cat[3]}</strong>
              </div>
            ))}
          </div>

          <div className="panel market">
            <p className="label">MARKET HEALTH</p>
            <div className="miniGrid">
              <div><span>SPY</span><b>GREEN</b></div>
              <div><span>QQQ</span><b>GREEN</b></div>
              <div><span>IWM</span><b>GREEN</b></div>
              <div><span>Advancers</span><b>4821</b></div>
              <div><span>Decliners</span><b>3098</b></div>
              <div><span>Hot Sector</span><b>AI</b></div>
            </div>
          </div>
        </section>

        <aside className="rightCol">
          <div className="panel">
            <p className="label">SCANNER ENGINE</p>
            <div className="bigStat"><span>Stocks Scanned</span><b>5142</b></div>
            <div className="bigStat"><span>Passed Filters</span><b>72</b></div>
            <div className="bigStat"><span>Low Float</span><b>19</b></div>
            <div className="bigStat"><span>News Catalyst</span><b>14</b></div>
            <div className="bigStat"><span>Elite Setups</span><b>4</b></div>
            <div className="bigStat"><span>Trap Risk</span><b>5</b></div>
          </div>

          <div className="panel">
            <p className="label">TAPE ANALYSIS</p>
            <div className="infoGrid">
              <span>Buyers</span><b className="green">78%</b>
              <span>Sellers</span><b>22%</b>
              <span>Absorption</span><b>YES</b>
              <span>Spoofing</span><b>NO</b>
              <span>Walls</span><b>2</b>
              <span>Air Pocket</span><b>YES</b>
            </div>
          </div>

          <div className="panel">
            <p className="label">SYSTEM STATUS</p>
            <div className="statusLine"><span>Polygon</span><b>READY</b></div>
            <div className="statusLine"><span>Supabase</span><b>READY</b></div>
            <div className="statusLine"><span>Anthropic</span><b>READY</b></div>
            <div className="statusLine"><span>Scanner</span><b>RUNNING</b></div>
            <div className="statusLine"><span>Records</span><b>TEST MODE</b></div>
          </div>

          <div className="panel settings">
            <p className="label">SETTINGS</p>
            <div>Polygon API Key</div>
            <div>Supabase URL</div>
            <div>Supabase Key</div>
            <div>Anthropic Key</div>
            <div>TradingView Webhook</div>
          </div>
        </aside>
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
            radial-gradient(circle at top left, rgba(255, 182, 18, 0.25), transparent 28%),
            radial-gradient(circle at bottom right, rgba(255, 215, 0, 0.12), transparent 32%),
            linear-gradient(135deg, #020202, #0c0c0c 55%, #010101);
        }

        .topBar {
          display: grid;
          grid-template-columns: 2fr repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .brand,
        .topStat,
        .panel {
          border: 1px solid rgba(255, 182, 18, 0.28);
          background: linear-gradient(145deg, rgba(18,18,18,.97), rgba(4,4,4,.97));
          box-shadow:
            0 22px 55px rgba(0,0,0,.75),
            inset 0 1px 0 rgba(255,255,255,.06),
            0 0 24px rgba(255,182,18,.08);
        }

        .brand {
          padding: 22px;
          border-radius: 26px;
        }

        .brand span,
        .label {
          color: #ffb612;
          letter-spacing: 3px;
          font-size: 11px;
          font-weight: 900;
        }

        .brand h1 {
          margin: 7px 0 0;
          color: #ffb612;
          font-size: clamp(34px, 5vw, 62px);
          line-height: .9;
          text-shadow: 0 0 22px rgba(255,182,18,.7);
        }

        .topStat {
          border-radius: 22px;
          padding: 18px;
        }

        .topStat small {
          color: #999;
          display: block;
        }

        .topStat strong {
          color: #ffd700;
          display: block;
          margin-top: 8px;
          font-size: 26px;
          text-shadow: 0 0 14px rgba(255,215,0,.55);
        }

        .layout {
          display: grid;
          grid-template-columns: 330px 1fr 330px;
          gap: 18px;
        }

        .leftCol,
        .centerCol,
        .rightCol {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .panel {
          border-radius: 24px;
          padding: 20px;
        }

        .elite {
          border-color: rgba(255,182,18,.55);
          background:
            linear-gradient(150deg, rgba(255,182,18,.18), rgba(6,6,6,.98));
        }

        .elite h2 {
          color: #ffd700;
          margin: 4px 0;
          font-size: 70px;
          text-shadow: 0 0 26px rgba(255,215,0,.65);
        }

        .elite h3 {
          margin-top: 0;
        }

        .infoGrid,
        .stockMeta {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 14px;
          margin-top: 14px;
        }

        .infoGrid span,
        .stockMeta span {
          color: #999;
        }

        .infoGrid b,
        .stockMeta b {
          color: #f5f5f5;
        }

        .green {
          color: #00ff88 !important;
        }

        .permission,
        .verdict,
        .miniPerm {
          margin-top: 16px;
          padding: 13px;
          border-radius: 14px;
          text-align: center;
          font-weight: 900;
        }

        .permission.yes,
        .miniPerm.yes {
          background: #ffb612;
          color: #050505;
          box-shadow: 0 0 24px rgba(255,182,18,.45);
        }

        .miniPerm.wait {
          background: rgba(255,182,18,.18);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.4);
        }

        .miniPerm.no {
          background: rgba(255,77,77,.15);
          color: #ff4d4d;
          border: 1px solid rgba(255,77,77,.35);
        }

        .rule,
        .statusLine,
        .feed {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        .rule b,
        .statusLine b,
        .feed strong {
          color: #ffb612;
        }

        .verdict {
          background: rgba(255,182,18,.12);
          color: #ffd700;
          border: 1px solid rgba(255,182,18,.3);
        }

        .gainerGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .stockCard {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          padding: 18px;
          background: linear-gradient(145deg, #151515, #050505);
          border: 1px solid rgba(255,182,18,.24);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .stockCard::before {
          content: "";
          position: absolute;
          inset: -90px;
          background: linear-gradient(115deg, transparent, rgba(255,215,0,.12), transparent);
          transform: rotate(25deg);
        }

        .stockHead,
        .stockMeta,
        .catalyst,
        .miniPerm {
          position: relative;
        }

        .stockHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .stockHead small {
          color: #999;
        }

        .stockHead h3 {
          color: #ffb612;
          font-size: 38px;
          margin: 0;
        }

        .stockHead strong {
          color: #00ff88;
          font-size: 21px;
        }

        .catalyst {
          margin-top: 14px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255,182,18,.1);
          color: #ffd700;
        }

        .feed b {
          color: #ffd700;
          min-width: 55px;
        }

        .feed span {
          color: #ddd;
          flex: 1;
        }

        .feed em {
          color: #999;
          font-style: normal;
        }

        .miniGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .miniGrid div,
        .bigStat {
          background: #070707;
          border: 1px solid rgba(255,182,18,.16);
          border-radius: 16px;
          padding: 14px;
        }

        .miniGrid span,
        .bigStat span {
          display: block;
          color: #888;
          font-size: 12px;
        }

        .miniGrid b,
        .bigStat b {
          color: #ffb612;
          font-size: 24px;
          display: block;
          margin-top: 5px;
