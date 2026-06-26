"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Page =
  | "dashboard"
  | "scanner"
  | "structure"
  | "news"
  | "help"
  | "glossary"
  | "watchlist"
  | "journal"
  | "replay"
  | "settings";

type ScanMode = "BOTTOM" | "RANK" | "VOLUME" | "VWAP" | "TOP" | "REVERSAL" | "CUSTOM";

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  support: number;
  resistance: number;
  aggressiveEntry: number;
  confirmationEntry: number;
  proofEntry: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rr: number;
  speedScore: number;
  volumeScore: number;
  ignitionScore: number;
  proofScore: number;
  spreadStatus: "PASS" | "CAUTION" | "FAIL";
  verdict: "YES" | "WAIT" | "NO";
  rejection: string;
};

type JournalEntry = {
  id: number;
  date: string;
  ticker: string;
  setup: string;
  entryExitTarget: string;
  stopRiskShares: string;
  result: string;
  reason: string;
  rightProof: string;
  wrongProof: string;
  lesson: string;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "N/A";
  return "$" + v.toFixed(v < 1 ? 4 : 2);
}

function pct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

function vol(v: number): string {
  if (!v) return "N/A";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(Math.round(v));
}

function isJunk(ticker: string): boolean {
  const t = ticker.toUpperCase();
  return t.endsWith("W") || t.endsWith("WS") || t.endsWith("U") || t.endsWith("R");
}

function normalize(raw: any): Stock {
  const ticker = String(raw?.ticker || "");
  const price = toNum(raw?.price ?? raw?.day?.c ?? raw?.min?.c ?? ((raw?.prevDay?.c ?? 0) + (raw?.todaysChange ?? 0)));
  const gain = toNum(raw?.gain ?? raw?.todaysChangePerc);
  const change = toNum(raw?.change ?? raw?.todaysChange);
  const volume = toNum(raw?.volume ?? raw?.day?.v ?? raw?.min?.v);
  const open = toNum(raw?.open ?? raw?.day?.o ?? raw?.min?.o ?? price);
  const high = toNum(raw?.high ?? raw?.day?.h ?? raw?.resistance ?? price * 1.12);
  const low = toNum(raw?.low ?? raw?.day?.l ?? raw?.support ?? price * 0.94);

  const support = toNum(raw?.support ?? raw?.structure?.support ?? low);
  const resistance = toNum(raw?.resistance ?? raw?.structure?.resistance ?? high);

  const aggressiveEntry = resistance * 0.985;
  const confirmationEntry = resistance * 1.01;
  const proofEntry = resistance * 1.045;

  const stop = support;
  const target1 = resistance * 1.08;
  const target2 = resistance * 1.18;
  const target3 = resistance * 1.35;

  const risk = Math.max(0, proofEntry - stop);
  const reward = Math.max(0, target1 - proofEntry);
  const rr = risk > 0 ? reward / risk : 0;

  const volumeScore = Math.min(100, Math.round(volume / 75_000));
  const speedScore = Math.min(100, Math.round(gain * 0.5 + volumeScore * 0.35));

  const spreadStatus: Stock["spreadStatus"] =
    volume >= 5_000_000 ? "PASS" : volume >= 750_000 ? "CAUTION" : "FAIL";

  let ignitionScore = 0;
  ignitionScore += Math.min(30, Math.max(0, gain * 0.7));
  ignitionScore += Math.min(25, volume / 400_000);
  ignitionScore += Math.min(20, speedScore * 0.2);
  ignitionScore += price > 0 && price <= 5 ? 15 : price <= 10 ? 10 : 4;
  ignitionScore += isJunk(ticker) ? -35 : 10;
  ignitionScore = Math.max(0, Math.min(100, Math.round(ignitionScore)));

  let proofScore = ignitionScore;
  if (rr >= 2) proofScore += 10;
  else if (rr >= 1) proofScore += 5;
  if (spreadStatus === "FAIL") proofScore -= 15;
  if (price > resistance) proofScore += 8;
  proofScore = Math.max(0, Math.min(100, Math.round(proofScore)));

  const verdict: Stock["verdict"] = proofScore >= 80 ? "YES" : proofScore >= 60 ? "WAIT" : "NO";

  let rejection = "";
  if (isJunk(ticker)) rejection = "JUNK SYMBOL";
  else if (volume < 100_000) rejection = "LOW VOLUME";
  else if (spreadStatus === "FAIL") rejection = "SPREAD RISK";
  else if (proofScore < 60) rejection = "NO PROOF";

  return {
    ticker,
    price,
    gain,
    change,
    volume,
    open,
    high,
    low,
    support,
    resistance,
    aggressiveEntry,
    confirmationEntry,
    proofEntry,
    stop,
    target1,
    target2,
    target3,
    risk,
    reward,
    rr,
    speedScore,
    volumeScore,
    ignitionScore,
    proofScore,
    spreadStatus,
    verdict,
    rejection
  };
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<ScanMode>("BOTTOM");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(15);
  const [showRejected, setShowRejected] = useState(false);

  const [minPrice, setMinPrice] = useState(0.1);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minGain, setMinGain] = useState(0);
  const [minVolume, setMinVolume] = useState(100000);
  const [removeJunk, setRemoveJunk] = useState(true);

  const [manualTicker, setManualTicker] = useState("CAST");
  const [manualSupport, setManualSupport] = useState(28);
  const [manualResistance, setManualResistance] = useState(34);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 1,
      date: new Date().toLocaleDateString(),
      ticker: "",
      setup: "Bottom Ignition",
      entryExitTarget: "",
      stopRiskShares: "",
      result: "WAIT",
      reason: "",
      rightProof: "",
      wrongProof: "",
      lesson: ""
    }
  ]);

  async function load() {
    setStatus("SCANNING");

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      const list = json?.data?.tickers || json?.tickers || json?.results || [];

      setStocks(list.map(normalize));
      setStatus("CONNECTED");
      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();

    const clock = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!autoScan) return;

    const id = setInterval(load, refreshSec * 1000);
    return () => clearInterval(id);
  }, [autoScan, refreshSec]);

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => {
      if (removeJunk && isJunk(s.ticker)) return false;
      if (s.price < minPrice || s.price > maxPrice) return false;
      if (s.gain < minGain) return false;
      if (s.volume < minVolume) return false;
      return true;
    });

    if (mode === "BOTTOM") list = [...list].sort((a, b) => b.ignitionScore - a.ignitionScore);
    if (mode === "RANK") list = [...list].sort((a, b) => b.speedScore - a.speedScore);
    if (mode === "VOLUME") list = [...list].sort((a, b) => b.volumeScore - a.volumeScore);
    if (mode === "VWAP") list = [...list].sort((a, b) => b.proofScore - a.proofScore);
    if (mode === "TOP") list = [...list].sort((a, b) => b.gain - a.gain);
    if (mode === "REVERSAL") list = [...list].sort((a, b) => (b.price - b.low) - (a.price - a.low));
    if (mode === "CUSTOM") list = [...list].sort((a, b) => b.proofScore - a.proofScore);

    return list.slice(0, 40);
  }, [stocks, mode, minPrice, maxPrice, minGain, minVolume, removeJunk]);

  const rejected = stocks.filter((s) => s.rejection);
  const top = filtered[0];

  const manualAggressive = manualResistance * 0.985;
  const manualConfirmation = manualResistance * 1.01;
  const manualProof = manualResistance * 1.045;
  const manualStop = manualSupport;
  const manualTarget1 = manualResistance * 1.08;
  const manualTarget2 = manualResistance * 1.18;
  const manualTarget3 = manualResistance * 1.35;
  const manualRisk = Math.max(0, manualProof - manualStop);
  const manualReward = Math.max(0, manualTarget1 - manualProof);
  const manualRR = manualRisk > 0 ? manualReward / manualRisk : 0;

  function addWatchlist(ticker: string) {
    if (!ticker) return;
    setWatchlist((prev) => (prev.includes(ticker) ? prev : [ticker, ...prev]));
  }

  function removeWatchlist(ticker: string) {
    setWatchlist((prev) => prev.filter((t) => t !== ticker));
  }

  function addJournalEntry(ticker?: string) {
    setJournalEntries((prev) => [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ticker: ticker || "",
        setup: "Bottom Ignition",
        entryExitTarget: "",
        stopRiskShares: "",
        result: "WAIT",
        reason: "",
        rightProof: "",
        wrongProof: "",
        lesson: ""
      },
      ...prev
    ]);
  }

  function updateJournal(id: number, field: keyof JournalEntry, value: string) {
    setJournalEntries((prev) => prev.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
  }

  function deleteJournal(id: number) {
    setJournalEntries((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <main className="app">
      <aside className="sidebar metal dark">
        <div className="brand">
          <small>PROOF OF STRUCTURE™</small>
          <h2>ELITE</h2>
          <span>MISSION CONTROL</span>
        </div>

        {[
          ["dashboard", "Dashboard"],
          ["scanner", "Scanner"],
          ["structure", "Structure"],
          ["news", "News"],
          ["help", "Help"],
          ["glossary", "Glossary"],
          ["watchlist", "Watchlist"],
          ["journal", "Journal"],
          ["replay", "Replay"],
          ["settings", "Settings"]
        ].map(([key, label]) => (
          <button key={key} onClick={() => setPage(key as Page)} className={page === key ? "active nav" : "nav"}>
            {label}
          </button>
        ))}
      </aside>

      <section className="main">
        <header className="hero metal light">
          <div>
            <p className="tag">PROOF OF STRUCTURE™ ELITE</p>
            <h1>MISSION CONTROL</h1>
            <span>Bottom ignition. Rank climbers. Real entries after proof.</span>
          </div>

          <div className="clock">
            <small>ET CLOCK</small>
            <strong>{time || "LOADING"}</strong>
            <small>LAST SCAN: {lastScan}</small>
          </div>
        </header>

        {page === "dashboard" && (
          <>
            <section className="modes">
              {[
                ["BOTTOM", "Bottom Ignition"],
                ["RANK", "Rank Climbers"],
                ["VOLUME", "Volume Awakening"],
                ["VWAP", "VWAP Breakout"],
                ["TOP", "Top Gainers"],
                ["REVERSAL", "Reversal Watch"],
                ["CUSTOM", "Custom Scan"]
              ].map(([key, label]) => (
                <button key={key} onClick={() => setMode(key as ScanMode)} className={mode === key ? "active" : ""}>
                  {label}
                </button>
              ))}
            </section>

            <section className="grid3">
              <Panel title="COMMAND CENTER">
                <h3 className={top?.verdict === "YES" ? "big yesText" : top?.verdict === "NO" ? "big noText" : "big waitText"}>
                  {top?.verdict || "WAIT"}
                </h3>
                <Row a="Feed" b={status} />
                <Row a="Raw Count" b={stocks.length} />
                <Row a="Showing" b={filtered.length} />
                <Row a="Rejected" b={rejected.length} />
                <Row a="Top Ticker" b={top?.ticker || "NONE"} />
                <Row a="Proof Score" b={top?.proofScore || 0} />
                <button onClick={load}>RUN SCAN</button>
                <button onClick={() => setAutoScan(!autoScan)}>AUTO SCAN: {autoScan ? "ON" : "OFF"}</button>
              </Panel>

              <Panel title="PRECISION FILTERS">
                <div className="filters">
                  <label>Min Price<input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} /></label>
                  <label>Max Price<input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label>
                  <label>Min Gain<input type="number" value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} /></label>
                  <label>Min Volume<input type="number" value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} /></label>
                  <label>Refresh Sec<input type="number" value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} /></label>
                  <button onClick={() => setRemoveJunk(!removeJunk)}>JUNK FILTER: {removeJunk ? "ON" : "OFF"}</button>
                </div>
              </Panel>

              <Panel title="TOP STRUCTURE">
                <Row a="Ticker" b={top?.ticker || "NONE"} />
                <Row a="Support" b={top ? money(top.support) : "N/A"} />
                <Row a="Resistance" b={top ? money(top.resistance) : "N/A"} />
                <Row a="Aggressive Entry" b={top ? money(top.aggressiveEntry) : "N/A"} />
                <Row a="Confirmation Entry" b={top ? money(top.confirmationEntry) : "N/A"} />
                <Row a="Proof Entry" b={top ? money(top.proofEntry) : "N/A"} />
                <Row a="Stop" b={top ? money(top.stop) : "N/A"} />
                <Row a="Target 1" b={top ? money(top.target1) : "N/A"} />
              </Panel>
            </section>
          </>
        )}

        {page === "scanner" && (
          <Panel title="LIVE RESULTS GRID">
            <div className="tableWrap">
              <div className="table">
                {["Ticker", "Price", "Gain", "Vol", "Speed", "Spread", "Support", "Resist", "Agg", "Confirm", "Proof", "Score", "Verdict", "Actions"].map((h) => (
                  <b key={h}>{h}</b>
                ))}

                {filtered.map((s) => (
                  <div className="rowGrid" key={s.ticker}>
                    <span>{s.ticker}</span>
                    <span>{money(s.price)}</span>
                    <span className="good">{pct(s.gain)}</span>
                    <span>{vol(s.volume)}</span>
                    <span>{s.speedScore}</span>
                    <span className={s.spreadStatus === "PASS" ? "good" : s.spreadStatus === "FAIL" ? "bad" : "warn"}>{s.spreadStatus}</span>
                    <span>{money(s.support)}</span>
                    <span>{money(s.resistance)}</span>
                    <span>{money(s.aggressiveEntry)}</span>
                    <span>{money(s.confirmationEntry)}</span>
                    <span>{money(s.proofEntry)}</span>
                    <span>{s.proofScore}</span>
                    <span className={s.verdict === "YES" ? "good" : s.verdict === "NO" ? "bad" : "warn"}>
                      {s.verdict}
                    </span>
                    <span className="actionsCell">
                      <button
                        onClick={() =>
                          watchlist.includes(s.ticker) ? removeWatchlist(s.ticker) : addWatchlist(s.ticker)
                        }
                      >
                        {watchlist.includes(s.ticker) ? "REMOVE" : "ADD"}
                      </button>

                      <button
                        onClick={() => {
                          setManualTicker(s.ticker);
                          setManualSupport(s.support);
                          setManualResistance(s.resistance);
                          setPage("structure");
                        }}
                      >
                        STRUCTURE
                      </button>

                      <button onClick={() => addJournalEntry(s.ticker)}>JOURNAL</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowRejected(!showRejected)}>{showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}</button>
            {showRejected && rejected.map((s) => <Row key={s.ticker} a={s.ticker} b={s.rejection} />)}
          </Panel>
        )}

        {page === "structure" && (
          <Panel title="MANUAL STRUCTURE ENGINE">
            <div className="filters">
              <label>Ticker<input value={manualTicker} onChange={(e) => setManualTicker(e.target.value.toUpperCase())} /></label>
              <label>Support<input type="number" value={manualSupport} onChange={(e) => setManualSupport(Number(e.target.value))} /></label>
              <label>Resistance<input type="number" value={manualResistance} onChange={(e) => setManualResistance(Number(e.target.value))} /></label>
            </div>
            <Row a="Aggressive Entry" b={money(manualAggressive)} />
            <Row a="Confirmation Entry" b={money(manualConfirmation)} />
            <Row a="Proof Entry" b={money(manualProof)} />
            <Row a="Stop" b={money(manualStop)} />
            <Row a="Target 1" b={money(manualTarget1)} />
            <Row a="Target 2" b={money(manualTarget2)} />
            <Row a="Target 3" b={money(manualTarget3)} />
            <Row a="Risk / Reward" b={manualRR.toFixed(2)} />
          </Panel>
        )}

        {page === "news" && (
          <Panel title="LIVE NEWS / CATALYST CENTER">
            <div className="newsGrid">
              {[
                ["FDA", "CHECK", "FDA news can move biotech fast. Confirm whether approval, trial update, or rejection."],
                ["Earnings", "CHECK", "Good earnings can continue. Bad guidance can reverse."],
                ["8-K", "CHECK", "Read carefully. Could be contract, offering, merger, or dilution."],
                ["Offering", "BAD", "Usually dilution risk. Red until proven absorbed."],
                ["Reverse Split", "BAD", "High caution. Often weak structure."],
                ["Government Contract", "GOOD", "Green if contract has real money and verified source."],
                ["Analyst Upgrade", "GOOD", "Can create attention and short-term momentum."]
              ].map(([name, statusText, detail]) => (
                <article className="newsCard" key={name}>
                  <h3>{name}</h3>
                  <strong className={statusText === "GOOD" ? "good" : statusText === "BAD" ? "bad" : "warn"}>{statusText}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </Panel>
        )}

        {page === "help" && (
          <Info title="HELP CENTER" items={[
            ["How Scanner Works", "Find bottom and mid-list gainers waking up before they reach the top."],
            ["Aggressive Entry", "Earliest entry near resistance. Highest risk, best price."],
            ["Confirmation Entry", "Entry after resistance breaks. Balanced risk."],
            ["Proof Entry", "Entry after resistance breaks and proves itself. Best confirmation."],
            ["Support", "Area buyers defended. Stop lives under it."],
            ["Resistance", "Area sellers defended. Entry comes after it breaks."],
            ["Risk", "Distance between entry and stop."],
            ["News Page", "Catalyst center. Good catalysts show green, bad/dilution risk shows red."],
            ["Watchlist", "Saved tickers you want to monitor."],
            ["Journal", "Guided trade notebook that tells you what to write."]
          ]} />
        )}

        {page === "glossary" && (
          <Info title="GLOSSARY" items={[
            ["VWAP", "Average price weighted by volume."],
            ["EMA", "Fast moving average used for trend structure."],
            ["RVOL", "Relative volume compared to normal volume."],
            ["Float", "Shares available to trade."],
            ["Spread", "Difference between bid and ask."],
            ["Support", "Buyer defense area."],
            ["Resistance", "Seller defense area."],
            ["Catalyst", "Reason traders care now."],
            ["Limit Order", "Order with max buy or min sell price."],
            ["Risk / Reward", "Reward compared to risk."]
          ]} />
        )}

        {page === "watchlist" && (
          <Panel title="INTERACTIVE WATCHLIST">
            <div className="watchGrid">
              {watchlist.length === 0 && <h2>No tickers saved yet. Use ADD on the scanner page.</h2>}
              {watchlist.map((ticker) => (
                <article className="watchCard" key={ticker}>
                  <h3>{ticker}</h3>
                  <button onClick={() => { setManualTicker(ticker); setPage("structure"); }}>OPEN STRUCTURE</button>
                  <button onClick={() => removeWatchlist(ticker)}>REMOVE</button>
                </article>
              ))}
            </div>
          </Panel>
        )}

        {page === "journal" && (
          <Panel title="GUIDED TRADE JOURNAL">
            <button onClick={() => addJournalEntry()}>+ NEW TRADE NOTE</button>

            <div className="journalStack">
              {journalEntries.map((j) => (
                <article className="journalCard" key={j.id}>
                  <div className="journalTop">
                    <input value={j.date} onChange={(e) => updateJournal(j.id, "date", e.target.value)} />
                    <input placeholder="TICKER" value={j.ticker} onChange={(e) => updateJournal(j.id, "ticker", e.target.value.toUpperCase())} />
                    <select value={j.setup} onChange={(e) => updateJournal(j.id, "setup", e.target.value)}>
                      <option>Bottom Ignition</option>
                      <option>Rank Climber</option>
                      <option>VWAP Breakout</option>
                      <option>Top Gainer</option>
                      <option>Manual Entry</option>
                    </select>
                  </div>

                  <div className="journalNumbers">
                    <input placeholder="Entry / Exit / Target" value={j.entryExitTarget} onChange={(e) => updateJournal(j.id, "entryExitTarget", e.target.value)} />
                    <input placeholder="Stop / Risk / Shares" value={j.stopRiskShares} onChange={(e) => updateJournal(j.id, "stopRiskShares", e.target.value)} />
                    <select value={j.result} onChange={(e) => updateJournal(j.id, "result", e.target.value)}>
                      <option>WIN</option>
                      <option>LOSS</option>
                      <option>BREAKEVEN</option>
                      <option>WAIT</option>
                    </select>
                  </div>

                  <textarea placeholder="WHY DID I ENTER?" value={j.reason} onChange={(e) => updateJournal(j.id, "reason", e.target.value)} />
                  <textarea placeholder="WHAT PROVED I WAS RIGHT?" value={j.rightProof} onChange={(e) => updateJournal(j.id, "rightProof", e.target.value)} />
                  <textarea placeholder="WHAT PROVED I WAS WRONG?" value={j.wrongProof} onChange={(e) => updateJournal(j.id, "wrongProof", e.target.value)} />
                  <textarea placeholder="LESSON LEARNED" value={j.lesson} onChange={(e) => updateJournal(j.id, "lesson", e.target.value)} />

                  <button onClick={() => deleteJournal(j.id)}>DELETE TRADE NOTE</button>
                </article>
              ))}
            </div>
          </Panel>
        )}

        {page === "replay" && <Info title="REPLAY MODE" items={[["Winning Trades", "Study what worked."], ["Losing Trades", "Study what failed."], ["Triggers", "See scanner trigger reason."], ["Structure Review", "Replay support/resistance."]]} />}

        {page === "settings" && <Info title="SETTINGS" items={[["Theme", "Rusty light gray steel."], ["Safe Mode", "Protective scanner defaults."], ["Broker", "Preview only."], ["IBKR", "Later."], ["Auto Buy", "Off by default."]]} />}

        <footer>
          This software is educational only. Not financial advice. All trading decisions are the user&apos;s responsibility.
        </footer>
      </section>

      <style>{`
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;background:#1b1c1e;color:#252525;font-family:Arial,sans-serif;overflow:auto}

        .app{
          min-height:100vh;
          display:grid;
          grid-template-columns:240px minmax(0,1fr);
          background:
            radial-gradient(circle at 20% -10%, rgba(120,170,255,.08), transparent 45%),
            radial-gradient(circle at 100% 0%, rgba(255,180,90,.05), transparent 50%),
            linear-gradient(160deg,#3a3b3d 0%, #1b1c1e 55%, #101112 100%);
          overflow:visible;
        }

        .sidebar{
          padding:18px;
          height:100vh;
          position:sticky;
          top:0;
          overflow-y:auto;
          overflow-x:hidden;
          background:linear-gradient(180deg,#3d4044,#23262a);
          box-shadow: inset -1px 0 0 rgba(255,255,255,.04), 8px 0 30px rgba(0,0,0,.55);
          border-right:1px solid #111;
          z-index:2;
        }

        .main{padding:22px;min-width:0;overflow-x:auto;overflow-y:visible}

        .brand{
          padding:20px 18px;
          border-radius:14px;
          margin-bottom:16px;
          background:linear-gradient(155deg,#e4ded0,#b9b2a2 60%,#8d8676);
          box-shadow:
            0 1px 0 rgba(255,255,255,.6) inset,
            0 -8px 18px rgba(0,0,0,.25) inset,
            0 14px 28px rgba(0,0,0,.5);
          border:1px solid rgba(0,0,0,.35);
        }
        .brand small,.tag{color:#1f6da8;letter-spacing:4px;font-weight:900;font-size:12px;text-shadow:0 1px 0 rgba(255,255,255,.4)}
        .brand h2{font-size:46px;margin:4px 0;color:#272727;letter-spacing:2px;text-shadow:0 2px 1px rgba(255,255,255,.5), 0 -1px 1px rgba(0,0,0,.2)}
        .brand span{color:#4a4a44;font-size:11px;font-weight:700;letter-spacing:1px}

        .nav,button{
          width:100%;
          padding:13px;
          margin:7px 0;
          border-radius:10px;
          border:1px solid #0c0d0e;
          background:linear-gradient(180deg,#3a3d40,#262829);
          color:#d9d3c4;
          font-weight:900;
          letter-spacing:1px;
          box-shadow:
            0 1px 0 rgba(255,255,255,.06) inset,
            0 3px 6px rgba(0,0,0,.45),
            0 1px 0 rgba(0,0,0,.6);
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .nav:active, button:active{ transform: translateY(1px); }
        .active,button:hover{
          background:linear-gradient(180deg,#3da0f0,#1f7eea)!important;
          color:white!important;
          box-shadow:
            0 1px 0 rgba(255,255,255,.4) inset,
            0 0 16px rgba(45,140,255,.55),
            0 4px 10px rgba(0,0,0,.5)!important;
        }

        .metal,.panel{
          border-radius:16px;
          position:relative;
          overflow:hidden;
        }
        .dark{
          background:linear-gradient(155deg,#4a4d49,#34362f 70%);
          color:#e0ddd2;
          box-shadow:
            0 1px 0 rgba(255,255,255,.06) inset,
            0 -10px 24px rgba(0,0,0,.35) inset,
            0 18px 40px rgba(0,0,0,.55);
          border:1px solid rgba(0,0,0,.4);
        }
        .light,.panel{
          background:linear-gradient(150deg,#d6d0c2,#aba48f 75%);
          color:#222;
          box-shadow:
            0 1px 0 rgba(255,255,255,.7) inset,
            0 -10px 22px rgba(0,0,0,.18) inset,
            0 16px 32px rgba(0,0,0,.45);
          border:1px solid rgba(0,0,0,.3);
        }

        .hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;padding:26px;margin-bottom:18px}
        h1{font-size:60px;line-height:.95;margin:8px 0;color:#2e2e2e;text-shadow:0 2px 0 rgba(255,255,255,.6), 0 -1px 1px rgba(0,0,0,.15);letter-spacing:2px}
        .clock{
          background:linear-gradient(160deg,#23262a,#101214);
          border-radius:12px;
          padding:14px;
          box-shadow: 0 -6px 14px rgba(0,0,0,.4) inset, 0 8px 18px rgba(0,0,0,.4);
          border:1px solid rgba(0,0,0,.5);
        }
        .clock small{color:#7fa8c9;letter-spacing:2px;font-weight:800}
        .clock strong{display:block;font-size:32px;color:#5fc4ff;text-shadow:0 0 14px rgba(95,196,255,.65);margin:4px 0}

        .modes{display:grid;grid-template-columns:repeat(7,minmax(130px,1fr));gap:10px;margin-bottom:18px;overflow-x:auto}

        .grid3{display:grid;grid-template-columns:320px minmax(0,1fr) 330px;gap:18px}
        .panel{padding:20px;margin-bottom:18px}
        .panel h3.big{font-size:64px;margin:0 0 8px;text-shadow:0 2px 0 rgba(255,255,255,.4)}
        .yesText,.good{color:#1e8f44!important;text-shadow:0 0 8px rgba(30,143,68,.3)}
        .noText,.bad{color:#b6212f!important;text-shadow:0 0 8px rgba(182,33,47,.3)}
        .waitText,.warn{color:#b67900!important;text-shadow:0 0 8px rgba(182,121,0,.3)}

        .row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(0,0,0,.2);padding:10px 2px}
        .row span{color:#4c4c4c;font-weight:700}
        .row b{color:#161616}

        .filters{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:14px}
        label{font-weight:900;color:#2c2c2c;font-size:12px}
        input,select,textarea{
          width:100%;
          padding:11px;
          margin-top:6px;
          border-radius:8px;
          border:1px solid #050505;
          background:linear-gradient(180deg,#1d1f21,#101112);
          color:#6bbcff;
          font-weight:800;
          box-shadow: 0 2px 6px rgba(0,0,0,.5) inset, 0 1px 0 rgba(255,255,255,.04);
        }

        .tableWrap{max-width:100%;overflow:auto;border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.5)}
        .table{display:grid;grid-template-columns:90px 90px 80px 80px 70px 90px 90px 90px 90px 95px 90px 70px 80px 230px;min-width:1500px;border:1px solid #0d0d0d;border-radius:12px;overflow:hidden}
        .table>b,.rowGrid span{padding:11px 8px;border-bottom:1px solid rgba(0,0,0,.2);font-size:12px}
        .rowGrid{display:contents}
        .rowGrid:hover span{background:rgba(31,126,234,.08)}
        .table>b{background:linear-gradient(180deg,#3a3a3a,#262626);color:#d9d3c4;letter-spacing:.5px;font-size:11px}
        .actionsCell{display:flex;gap:5px;align-items:center}
        .actionsCell button{width:auto;padding:7px 9px;margin:0;font-size:10px;border-radius:6px}

        .newsGrid,.watchGrid{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:14px}
        .newsCard,.watchCard,.journalCard{
          background:linear-gradient(155deg,#e1dbcd,#beb8a6);
          border-radius:12px;
          padding:16px;
          box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 10px 22px rgba(0,0,0,.35);
          border:1px solid rgba(0,0,0,.25);
        }
        .journalStack{display:grid;gap:18px;margin-top:14px}
        .journalTop,.journalNumbers{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
        .journalCard textarea{min-height:90px;resize:vertical;margin-bottom:10px}

        ul{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:12px;padding:0;list-style:none}
        li{
          background:linear-gradient(155deg,#e1dbcd,#beb8a6);
          border-radius:12px;
          padding:14px;
          cursor:pointer;
          box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 8px 18px rgba(0,0,0,.3);
          border:1px solid rgba(0,0,0,.25);
        }
        li b{display:block;color:#1f6da8;margin-bottom:6px}

        footer{color:#9a9a9a;padding:24px 4px;font-size:11px}

        @media(max-width:1050px){
          .app{grid-template-columns:1fr}
          .sidebar{position:relative;height:auto}
          .hero,.grid3,.filters,.newsGrid,.watchGrid,.journalTop,.journalNumbers,ul{grid-template-columns:1fr}
          .modes{grid-template-columns:repeat(7,180px)}
          h1{font-size:42px}
        }
      `}</style>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <p className="tag">{title}</p>
      {children}
    </section>
  );
}

function Row({ a, b }: { a: string; b: ReactNode }) {
  return (
    <div className="row">
      <span>{a}</span>
      <b>{b}</b>
    </div>
  );
}

function Info({ title, items }: { title: string; items: [string, string][] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.[0] || null);
  const active = items.find(([name]) => name === open);

  return (
    <Panel title={title}>
      <ul>
        {items.map(([name, text]) => (
          <li key={name} onClick={() => setOpen(name)}>
            <b>{name}</b>
            <span>{open === name ? text : "Tap to open"}</span>
          </li>
        ))}
      </ul>

      {active && (
        <div className="newsCard">
          <h2>{active[0]}</h2>
          <p>{active[1]}</p>
        </div>
      )}
    </Panel>
  );
}
