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
  | "settings";

type Mode =
  | "BOTTOM"
  | "RANK"
  | "VOLUME"
  | "VWAP"
  | "TOP"
  | "REVERSAL"
  | "CUSTOM";

type Signal = "GOOD" | "BAD" | "CHECK";
type Verdict = "YES" | "WAIT" | "NO";

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
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
  rvol: number;
  floatSize: number;
  spread: number;
  speedScore: number;
  ignitionScore: number;
  proofScore: number;
  rankChange: number;
  volumeAcceleration: number;
  spreadStatus: Signal;
  trapRisk: Signal;
  structureGrade: string;
  verdict: Verdict;
  earlyRunner: string;
  rejection: string;
  whyLikes: string[];
  whyRejects: string[];
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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: number): string {
  if (!v || !Number.isFinite(v)) return "N/A";
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

function cleanTicker(ticker: string): string {
  return String(ticker || "").toUpperCase().trim();
}

function isJunk(ticker: string): boolean {
  const t = cleanTicker(ticker);
  return (
    t.endsWith("W") ||
    t.endsWith("WS") ||
    t.endsWith("U") ||
    t.endsWith("R") ||
    t.includes(".")
  );
}

function normalize(raw: any, index: number): Stock {
  const ticker = cleanTicker(raw?.ticker || raw?.T || "");
  const price = num(
    raw?.price ??
      raw?.day?.c ??
      raw?.min?.c ??
      ((raw?.prevDay?.c ?? 0) + (raw?.todaysChange ?? 0))
  );

  const gain = num(raw?.gain ?? raw?.todaysChangePerc);
  const change = num(raw?.change ?? raw?.todaysChange);
  const volume = num(raw?.volume ?? raw?.day?.v ?? raw?.min?.v);
  const high = num(raw?.high ?? raw?.day?.h ?? raw?.resistance ?? price * 1.12);
  const low = num(raw?.low ?? raw?.day?.l ?? raw?.support ?? price * 0.94);

  const support = num(raw?.support ?? raw?.structure?.support ?? low);
  const resistance = num(raw?.resistance ?? raw?.structure?.resistance ?? high);

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

  const rvol = Math.max(0, num(raw?.rvol ?? raw?.relativeVolume ?? volume / 1_000_000));
  const floatSize = num(raw?.float ?? raw?.sharesFloat ?? 0);
  const spread = num(raw?.spread ?? (price > 0 ? price * 0.015 : 0));

  const rankChange = Math.max(0, num(raw?.rankChange ?? 80 - index * 4));
  const volumeAcceleration = Math.min(
    100,
    Math.max(0, num(raw?.volumeAcceleration ?? volume / 75_000 + Math.max(0, gain)))
  );

  const speedScore = Math.min(
    100,
    Math.round(Math.max(0, gain) * 0.55 + volumeAcceleration * 0.35 + rankChange * 0.15)
  );

  const spreadStatus: Signal =
    spread > price * 0.06 ? "BAD" : spread > price * 0.025 ? "CHECK" : "GOOD";

  let ignitionScore = 0;
  ignitionScore += Math.min(30, Math.max(0, gain * 0.7));
  ignitionScore += Math.min(25, volume / 400_000);
  ignitionScore += Math.min(15, rankChange * 0.25);
  ignitionScore += Math.min(15, volumeAcceleration * 0.15);
  ignitionScore += price > 0 && price <= 5 ? 15 : price <= 10 ? 10 : 4;
  ignitionScore += isJunk(ticker) ? -35 : 10;
  ignitionScore = Math.max(0, Math.min(100, Math.round(ignitionScore)));

  let proofScore = ignitionScore;
  if (rr >= 2) proofScore += 10;
  else if (rr >= 1) proofScore += 5;
  if (spreadStatus === "BAD") proofScore -= 15;
  if (price > resistance) proofScore += 8;
  if (volumeAcceleration >= 70) proofScore += 6;
  proofScore = Math.max(0, Math.min(100, Math.round(proofScore)));

  const verdict: Verdict = proofScore >= 80 ? "YES" : proofScore >= 60 ? "WAIT" : "NO";
  const structureGrade = rr >= 2 && spreadStatus === "GOOD" ? "A" : rr >= 1.2 ? "B" : rr >= 0.6 ? "C" : "D";
  const trapRisk: Signal =
    gain > 80 && volume < 500_000 ? "BAD" : spreadStatus === "BAD" ? "BAD" : proofScore < 55 ? "CHECK" : "GOOD";
  const earlyRunner =
    rankChange >= 35 && volumeAcceleration >= 65 && gain < 35
      ? "EARLY"
      : rankChange >= 20 && volumeAcceleration >= 50 && gain < 60
      ? "WARMING"
      : proofScore >= 80
      ? "HOT"
      : gain >= 80
      ? "EXTENDED"
      : "WATCH";
  const whyLikes: string[] = [];
  const whyRejects: string[] = [];

  if (rankChange >= 20) whyLikes.push("Rank climbing before the crowd sees it");
  else whyRejects.push("Rank movement is not strong yet");

  if (volumeAcceleration >= 60) whyLikes.push("Volume acceleration is waking up");
  else whyRejects.push("Volume acceleration still weak");

  if (spreadStatus === "GOOD") whyLikes.push("Spread is acceptable");
  else whyRejects.push("Spread can damage entry and exit");

  if (rr >= 1) whyLikes.push("Risk/reward is defined");
  else whyRejects.push("Risk/reward is not clean");

  if (!isJunk(ticker)) whyLikes.push("Symbol passes basic junk filter");
  else whyRejects.push("Junk symbol risk");

  let rejection = "";
  if (isJunk(ticker)) rejection = "JUNK SYMBOL";
  else if (volume < 100_000) rejection = "LOW VOLUME";
  else if (spreadStatus === "BAD") rejection = "SPREAD RISK";
  else if (proofScore < 60) rejection = "NO PROOF";

  return {
    ticker,
    price,
    gain,
    change,
    volume,
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
    rvol,
    floatSize,
    spread,
    speedScore,
    ignitionScore,
    proofScore,
    rankChange,
    volumeAcceleration,
    spreadStatus,
    trapRisk,
    structureGrade,
    verdict,
    earlyRunner,
    rejection,
    whyLikes,
    whyRejects,
  };
}

function demoStocks(): Stock[] {
  return [
    { ticker: "TEST", price: 1.42, gain: 18.4, volume: 820_000, day: { h: 1.48, l: 1.21 } },
    { ticker: "DEMO", price: 0.74, gain: 11.2, volume: 430_000, day: { h: 0.79, l: 0.66 } },
    { ticker: "SCAN", price: 2.18, gain: 31.5, volume: 1_200_000, day: { h: 2.29, l: 1.92 } },
  ].map(normalize);
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>("BOTTOM");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");
  const [lastScan, setLastScan] = useState("NONE");
  const [emptyFeed, setEmptyFeed] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [refreshSec, setRefreshSec] = useState(15);
  const [showRejected, setShowRejected] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState("");

  const [minPrice, setMinPrice] = useState(0.1);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minGain, setMinGain] = useState(0);
  const [maxGain, setMaxGain] = useState(999);
  const [minVolume, setMinVolume] = useState(100_000);
  const [minRvol, setMinRvol] = useState(0);
  const [maxSpread, setMaxSpread] = useState(999);
  const [minIgnition, setMinIgnition] = useState(0);
  const [minProof, setMinProof] = useState(0);
  const [minSpeed, setMinSpeed] = useState(0);
  const [minVolAccel, setMinVolAccel] = useState(0);
  const [minRankChange, setMinRankChange] = useState(0);
  const [minRR, setMinRR] = useState(0);
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
      lesson: "",
    },
  ]);

  async function load() {
    setStatus("SCANNING");
    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();
      const list = json?.data?.tickers || json?.tickers || json?.results || [];

      if (!Array.isArray(list) || list.length === 0) {
        setStocks(demoStocks());
        setEmptyFeed(true);
        setStatus("MARKET CLOSED / DEMO");
      } else {
        setStocks(list.map(normalize));
        setEmptyFeed(false);
        setStatus("CONNECTED");
      }

      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
    } catch {
      setStocks(demoStocks());
      setEmptyFeed(true);
      setStatus("API ERROR / DEMO");
      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
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
    const id = setInterval(load, Math.max(5, refreshSec) * 1000);
    return () => clearInterval(id);
  }, [autoScan, refreshSec]);

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => {
      if (removeJunk && isJunk(s.ticker)) return false;
      if (s.price < minPrice || s.price > maxPrice) return false;
      if (s.gain < minGain || s.gain > maxGain) return false;
      if (s.volume < minVolume) return false;
      if (s.rvol < minRvol) return false;
      if (s.spread > maxSpread) return false;
      if (s.ignitionScore < minIgnition) return false;
      if (s.proofScore < minProof) return false;
      if (s.speedScore < minSpeed) return false;
      if (s.volumeAcceleration < minVolAccel) return false;
      if (s.rankChange < minRankChange) return false;
      if (s.rr < minRR) return false;
      return true;
    });

    const sorters: Record<Mode, (a: Stock, b: Stock) => number> = {
      BOTTOM: (a, b) => b.ignitionScore - a.ignitionScore,
      RANK: (a, b) => b.rankChange - a.rankChange,
      VOLUME: (a, b) => b.volumeAcceleration - a.volumeAcceleration,
      VWAP: (a, b) => b.proofScore - a.proofScore,
      TOP: (a, b) => b.gain - a.gain,
      REVERSAL: (a, b) => b.price - b.support - (a.price - a.support),
      CUSTOM: (a, b) => b.proofScore + b.ignitionScore - (a.proofScore + a.ignitionScore),
    };

    return [...list].sort(sorters[mode]).slice(0, 50);
  }, [
    stocks,
    mode,
    minPrice,
    maxPrice,
    minGain,
    maxGain,
    minVolume,
    minRvol,
    maxSpread,
    minIgnition,
    minProof,
    minSpeed,
    minVolAccel,
    minRankChange,
    minRR,
    removeJunk,
  ]);

  const rejected = stocks.filter((s) => s.rejection);
  const rejectionLog = rejected.slice(0, 10);
  const top = filtered[0];
  const marketWeather = emptyFeed ? "MARKET CLOSED" : filtered.length >= 10 ? "HOT" : filtered.length >= 3 ? "MIXED" : "DEAD";

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
    const t = cleanTicker(ticker);
    if (!t) return;
    setWatchlist((prev) => (prev.includes(t) ? prev : [t, ...prev]));
  }

  function removeWatchlist(ticker: string) {
    setWatchlist((prev) => prev.filter((t) => t !== ticker));
  }

  function addJournalEntry(ticker = "") {
    setJournalEntries((prev) => [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ticker: cleanTicker(ticker),
        setup: modeLabel(mode),
        entryExitTarget: "",
        stopRiskShares: "",
        result: "WAIT",
        reason: "",
        rightProof: "",
        wrongProof: "",
        lesson: "",
      },
      ...prev,
    ]);
    setPage("journal");
  }

  function updateJournal(id: number, field: keyof JournalEntry, value: string) {
    setJournalEntries((prev) =>
      prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  }

  function deleteJournal(id: number) {
    setJournalEntries((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <small>PROOF OF STRUCTURE™</small>
          <h2>ELITE</h2>
          <span>PROTOTYPE 1.5</span>
        </div>

        {pageLinks.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPage(key as Page)}
            className={page === key ? "active nav" : "nav"}
          >
            {label}
          </button>
        ))}
      </aside>

      <section className="main">
        <header className="hero panel">
          <div>
            <p className="tag">PROOF OF STRUCTURE™ ELITE</p>
            <h1>STRUCTURE ZONE</h1>
            <span>Proof first. Entry second. Find early runners before they reach the top.</span>
          </div>

          <div className="clock">
            <small>ET CLOCK</small>
            <strong>{time || "LOADING"}</strong>
            <small>LAST SCAN: {lastScan}</small>
          </div>
        </header>

        {emptyFeed && (
          <div className="alert">
            Market closed or no live gainers returned. Demo tickers are loaded so testers can inspect the app flow.
          </div>
        )}

        {page === "dashboard" && (
          <>
            <section className="modes">
              {modes.map(([k, label]) => (
                <button key={k} onClick={() => setMode(k)} className={mode === k ? "active" : ""}>
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
                <Row a="Data Source" b="POLYGON" />
                <Row a="Last Scan" b={lastScan} />
                <Row a="API Status" b={emptyFeed ? "NO LIVE DATA" : "CONNECTED"} />
                <Row a="Tickers Returned" b={stocks.length} />
                <Row a="Filter Passed" b={filtered.length} />
                <Row a="Filter Rejected" b={Math.max(0, stocks.length - filtered.length)} />
                <Row a="Market Weather" b={marketWeather} />
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
                  <Filter label="Min Price" value={minPrice} setValue={setMinPrice} />
                  <Filter label="Max Price" value={maxPrice} setValue={setMaxPrice} />
                  <Filter label="Min Gain" value={minGain} setValue={setMinGain} />
                  <Filter label="Max Gain" value={maxGain} setValue={setMaxGain} />
                  <Filter label="Min Volume" value={minVolume} setValue={setMinVolume} />
                  <Filter label="RVOL Min" value={minRvol} setValue={setMinRvol} />
                  <Filter label="Spread Max" value={maxSpread} setValue={setMaxSpread} />
                  <Filter label="Ignition Min" value={minIgnition} setValue={setMinIgnition} />
                  <Filter label="Proof Min" value={minProof} setValue={setMinProof} />
                  <Filter label="Speed Min" value={minSpeed} setValue={setMinSpeed} />
                  <Filter label="Vol Accel Min" value={minVolAccel} setValue={setMinVolAccel} />
                  <Filter label="Rank Change Min" value={minRankChange} setValue={setMinRankChange} />
                  <Filter label="Risk/Reward Min" value={minRR} setValue={setMinRR} />
                  <Filter label="Refresh Sec" value={refreshSec} setValue={setRefreshSec} />
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
                <Row a="R/R" b={top ? top.rr.toFixed(2) : "N/A"} />
              </Panel>
            </section>
          </>
        )}

        {page === "scanner" && (
          <Panel title="LIVE RESULTS GRID">
            <div className="tableWrap">
              <div className="table">
                {[
                  "Ticker",
                  "Price",
                  "Gain",
                  "Vol",
                  "Rank+",
                  "VolAccel",
                  "Spread",
                  "Support",
                  "Resist",
                  "Agg",
                  "Confirm",
                  "Proof",
                  "R/R",
                  "Score",
                  "Verdict",
                  "Actions",
                ].map((h) => (
                  <b key={h}>{h}</b>
                ))}

                {filtered.map((s) => (
                  <div className="rowGrid" key={s.ticker}>
                    <span>{s.ticker}</span>
                    <span>{money(s.price)}</span>
                    <span className="good">{pct(s.gain)}</span>
                    <span>{vol(s.volume)}</span>
                    <span>{s.rankChange}</span>
                    <span>{s.volumeAcceleration}</span>
                    <span className={classFor(s.spreadStatus)}>{s.spreadStatus}</span>
                    <span>{money(s.support)}</span>
                    <span>{money(s.resistance)}</span>
                    <span>{money(s.aggressiveEntry)}</span>
                    <span>{money(s.confirmationEntry)}</span>
                    <span>{money(s.proofEntry)}</span>
                    <span>{s.rr.toFixed(2)}</span>
                    <span>{s.proofScore}</span>
                    <span>{s.earlyRunner}</span>
                    <span className={s.verdict === "YES" ? "good" : s.verdict === "NO" ? "bad" : "warn"}>{s.verdict}</span>
                    <span className="actionCell">
                      <button onClick={() => (watchlist.includes(s.ticker) ? removeWatchlist(s.ticker) : addWatchlist(s.ticker))}>
                        {watchlist.includes(s.ticker) ? "REMOVE" : "ADD"}
                      </button>
                      <button onClick={() => { setManualTicker(s.ticker); setPage("structure"); }}>STRUCTURE</button>
                      <button onClick={() => addJournalEntry(s.ticker)}>JOURNAL</button>
                      <button onClick={() => { setSelectedTicker(s.ticker); setPage("help"); }}>WHY?</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowRejected(!showRejected)}>
              {showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}
            </button>

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

            <div className="detailBox">
              <h2>How to use it</h2>
              <p>
                Enter the real support buyers defended and the real resistance sellers defended.
                The engine gives three entries: aggressive before the break, confirmation on the break,
                and proof after the break holds. No support means no defined risk.
              </p>
            </div>
          </Panel>
        )}

        {page === "news" && <News />}
        {page === "help" && <Help selectedTicker={selectedTicker} stocks={stocks} />}
        {page === "glossary" && <Info title="GLOSSARY" items={glossaryItems} />}
        {page === "watchlist" && (
          <Watchlist
            watchlist={watchlist}
            stocks={stocks}
            removeWatchlist={removeWatchlist}
            openStructure={(t) => { setManualTicker(t); setPage("structure"); }}
            addJournalEntry={addJournalEntry}
          />
        )}
        {page === "journal" && (
          <Journal entries={journalEntries} addJournalEntry={addJournalEntry} updateJournal={updateJournal} deleteJournal={deleteJournal} />
        )}
        {page === "settings" && <Info title="SETTINGS" items={settingsItems} />}

        <footer>This software is educational only. Not financial advice. All trading decisions are the user's responsibility.</footer>
      </section>

      <style>{css}</style>
    </main>
  );
}

function News() {
  const cards: [string, Signal, string][] = [
    ["FDA", "CHECK", "Biotech catalyst. Confirm approval, trial update, hold, or rejection."],
    ["Earnings", "CHECK", "Good numbers can fuel continuation. Weak guidance can reverse fast."],
    ["8-K", "CHECK", "Read carefully. It may be contract, merger, offering, debt, or management change."],
    ["Offering", "BAD", "Usually dilution risk until the stock proves it absorbed supply."],
    ["Reverse Split", "BAD", "High caution. Often weak structure unless catalyst is exceptional."],
    ["Government Contract", "GOOD", "Green only when real dollar value and source are verified."],
    ["Analyst Upgrade", "GOOD", "Can create attention and short-term momentum."],
    ["Merger / LOI", "CHECK", "Can move hard, but verify terms and whether it is binding."],
    ["Short Squeeze", "CHECK", "Only matters if volume, spread, and buyers confirm it."],
  ];

  return (
    <Panel title="CATALYST CENTER">
      <div className="newsGrid">
        {cards.map(([name, signal, text]) => (
          <article className="newsCard" key={name}>
            <h3>{name}</h3>
            <strong className={classFor(signal)}>{signal}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="detailBox">
        <h2>News Checklist</h2>
        <p>Is the catalyst real? Is it current? Is volume increasing? Are buyers controlling price? Is support identifiable? What proves the trade is right?</p>
      </div>
    </Panel>
  );
}

function Help({ selectedTicker, stocks }: { selectedTicker: string; stocks: Stock[] }) {
  const selected = stocks.find((s) => s.ticker === selectedTicker);

  return (
    <Panel title="HELP CENTER">
      <div className="detailBox">
        <h2>How To Use This Scanner</h2>
        <p>
          The goal is not to chase the number one top gainer. The goal is to find early runners while they are still climbing from the bottom or middle of the list.
          Start with Bottom Ignition, check Why, verify news, mark support and resistance, define risk, then ask: What proves I am right?
        </p>
      </div>

      {selected && (
        <div className="detailBox">
          <h2>Why Scanner Likes {selected.ticker}</h2>
          {selected.whyLikes.map((x) => <p key={x}>✓ {x}</p>)}
          <h2>Warnings / Rejections</h2>
          {selected.whyRejects.map((x) => <p key={x}>✗ {x}</p>)}
        </div>
      )}

      <Info title="ACTIVE FEATURE GUIDE" items={helpItems} />
      <Info title="COMING SOON" items={comingSoonItems} />
    </Panel>
  );
}

function Watchlist({ watchlist, stocks, removeWatchlist, openStructure, addJournalEntry }: any) {
  return (
    <Panel title="INTERACTIVE WATCHLIST">
      <div className="watchGrid">
        {watchlist.length === 0 && <h2>No tickers saved yet. Use ADD on the scanner page.</h2>}
        {watchlist.map((ticker: string) => {
          const s = stocks.find((x: Stock) => x.ticker === ticker);
          return (
            <article className="watchCard" key={ticker}>
              <h3>{ticker}</h3>
              <Row a="Price" b={s ? money(s.price) : "N/A"} />
              <Row a="Gain" b={s ? pct(s.gain) : "N/A"} />
              <Row a="Proof" b={s?.proofScore ?? "N/A"} />
              <button onClick={() => openStructure(ticker)}>OPEN STRUCTURE</button>
              <button onClick={() => addJournalEntry(ticker)}>JOURNAL</button>
              <button onClick={() => removeWatchlist(ticker)}>REMOVE</button>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function Journal({ entries, addJournalEntry, updateJournal, deleteJournal }: any) {
  return (
    <Panel title="GUIDED TRADE JOURNAL">
      <button onClick={() => addJournalEntry()}>+ NEW TRADE NOTE</button>

      <div className="journalStack">
        {entries.map((j: JournalEntry) => (
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
  );
}

function Filter({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
    </label>
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
    <div>
      <p className="tag">{title}</p>
      <ul>
        {items.map(([name, text]) => (
          <li key={name} onClick={() => setOpen(name)}>
            <b>{name}</b>
            <span>{open === name ? text : "Tap to open"}</span>
          </li>
        ))}
      </ul>

      {active && (
        <div className="detailBox">
          <h2>{active[0]}</h2>
          <p>{active[1]}</p>
        </div>
      )}
    </div>
  );
}

function classFor(s: Signal) {
  return s === "GOOD" ? "good" : s === "BAD" ? "bad" : "warn";
}

function modeLabel(m: Mode) {
  return modes.find(([k]) => k === m)?.[1] || "Manual Entry";
}

const pageLinks = [
  ["dashboard", "Dashboard"],
  ["scanner", "Scanner"],
  ["structure", "Structure"],
  ["news", "News"],
  ["help", "Help"],
  ["glossary", "Glossary"],
  ["watchlist", "Watchlist"],
  ["journal", "Journal"],
  ["settings", "Settings"],
];

const modes: [Mode, string][] = [
  ["BOTTOM", "Bottom Ignition"],
  ["RANK", "Rank Climbers"],
  ["VOLUME", "Volume Awakening"],
  ["VWAP", "VWAP Breakout"],
  ["TOP", "Top Gainers"],
  ["REVERSAL", "Reversal Watch"],
  ["CUSTOM", "Custom Scan"],
];

const helpItems: [string, string][] = [
  ["Bottom Ignition", "Looks for early pressure before the stock is obvious. Rank movement, volume acceleration, price range, and proof score matter more than being #1 already."],
  ["Rank Climbers", "Tracks movement through the list. A stock climbing from #80 to #20 can be more useful than one already sitting at #1."],
  ["Volume Awakening", "Volume acceleration matters. A smaller stock with sudden increasing volume can be earlier than a stock with stale high volume."],
  ["VWAP Breakout", "Looks for price reclaiming or holding VWAP with volume. VWAP without volume is not proof."],
  ["Top Gainers", "Shows obvious movers. Useful for confirmation, but often late."],
  ["Reversal Watch", "Finds stocks bouncing from lows. Requires extra caution and proof."],
  ["Manual Structure", "Enter real support and resistance. The app calculates aggressive, confirmation, and proof entries."],
  ["Aggressive Entry", "Earliest entry near resistance. Best price, highest risk."],
  ["Confirmation Entry", "Entry after resistance breaks. Better proof, slightly higher price."],
  ["Proof Entry", "Entry after breakout proves itself. Requires hold, volume, and buyers still controlling."],
  ["Risk/Reward", "Reward divided by risk. No defined risk means no trade."],
  ["Watchlist", "Save tickers worth monitoring without taking a trade yet."],
  ["Journal", "Guided notes force the trader to record why they entered and what proved them right or wrong."],
];

const comingSoonItems: [string, string][] = [
  ["Spread Compression", "Will track bid/ask tightening before ignition."],
  ["Trap Detector", "Will warn when gain is huge but volume/structure is weak."],
  ["Market Weather Pro", "Will rate the whole premarket as hot, mixed, or dead."],
  ["Real News Feed", "Will pull live catalyst headlines per ticker."],
  ["Broker Integration", "Preview only for now. No auto-buy default."],
  ["Tape Pressure", "Future buyer/seller pressure meter."],
];

const glossaryItems: [string, string][] = [
  ["VWAP", "Average price weighted by volume."],
  ["EMA", "Fast moving average used for trend structure."],
  ["RVOL", "Relative volume compared to normal volume."],
  ["Float", "Shares available to trade."],
  ["Spread", "Difference between bid and ask."],
  ["Support", "Buyer defense area."],
  ["Resistance", "Seller defense area."],
  ["Catalyst", "Reason traders care now."],
  ["Limit Order", "Order with max buy or min sell price."],
  ["Risk / Reward", "Reward compared to risk."],
];

const settingsItems: [string, string][] = [
  ["Version", "Prototype 1.5 elite scanner."],
  ["Theme", "Light industrial steel. Final visual pass comes after core logic."],
  ["Safe Mode", "Protective defaults and no auto-buy."],
  ["Broker", "Preview only."],
  ["Auto Buy", "Off by default."],
  ["Disclaimer", "Educational only. Not financial advice."],
];

const css = `
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#262722;color:#1f1f1f;font-family:Arial,sans-serif;overflow:auto}
.app{min-height:100vh;display:grid;grid-template-columns:245px minmax(0,1fr);background:radial-gradient(circle at top,#4a4b43,#262722 65%);overflow:visible}
.sidebar{padding:18px;min-height:100vh;height:100vh;position:sticky;top:0;overflow-y:auto;overflow-x:hidden;background:#343733}
.main{padding:22px;min-width:0;overflow-x:auto;overflow-y:visible}
.brand{padding:18px;border:1px solid #202020;background:#b8b2a6;border-radius:12px;margin-bottom:14px;box-shadow:inset 0 0 24px rgba(0,0,0,.18),0 12px 24px rgba(0,0,0,.35)}
.brand small,.tag{color:#1f75bc;letter-spacing:4px;font-weight:900;font-size:12px}
.brand h2{font-size:48px;margin:4px 0;color:#242424;letter-spacing:2px}
.nav,button{width:100%;padding:12px;margin:7px 0;border-radius:10px;border:1px solid #1d2225;background:#292d2f;color:#ddd6c8;font-weight:900;letter-spacing:1px}
.active,button:hover{background:#2377d6!important;color:white!important}
.hero,.panel{border:1px solid #3d3b35;border-radius:16px;background:#b8b2a6;color:#222;box-shadow:0 18px 35px rgba(0,0,0,.45),inset 0 0 22px rgba(0,0,0,.13);position:relative;overflow:hidden}
.hero:before,.panel:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.14;background:radial-gradient(circle at 18% 18%,#fff 0%,transparent 20%),radial-gradient(circle at 88% 78%,#000 0%,transparent 25%),linear-gradient(115deg,rgba(255,255,255,.2),transparent 25%,rgba(0,0,0,.14))}
.hero>*,.panel>*{position:relative}
.hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;padding:24px;margin-bottom:18px}
h1{font-size:64px;line-height:.95;margin:8px 0;color:#2c2c2c;text-shadow:1px 1px #d3cdc0;letter-spacing:2px}
.clock strong{display:block;font-size:34px;color:#1f75bc}
.alert{padding:14px;border:1px solid #b07800;border-radius:12px;background:#3a3122;color:#ffd27a;margin-bottom:18px;font-weight:900}
.modes{display:grid;grid-template-columns:repeat(7,minmax(145px,1fr));gap:10px;margin-bottom:18px;overflow-x:auto}
.grid3{display:grid;grid-template-columns:320px minmax(0,1fr) 330px;gap:18px}
.panel{padding:18px;margin-bottom:18px}
.big{font-size:70px;margin:0}
.yesText,.good{color:#128f3c!important}
.noText,.bad{color:#b52832!important}
.waitText,.warn{color:#a66f00!important}
.row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(0,0,0,.25);padding:9px 0}
.row span{color:#444}
.row b{color:#1f1f1f}
.filters{display:grid;grid-template-columns:repeat(3,minmax(155px,1fr));gap:14px}
label{font-weight:900;color:#333}
input,select,textarea{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:1px solid #1f1f1f;background:#202020;color:#63b8ff;font-weight:900}
.tableWrap{max-width:100%;overflow:auto}
.table{display:grid;grid-template-columns:repeat(17,minmax(118px,1fr));min-width:1900px;border:1px solid #333;border-radius:12px;overflow:hidden}
.table>b,.rowGrid span{padding:10px;border-bottom:1px solid rgba(0,0,0,.25)}
.rowGrid{display:contents}
.table>b{background:#303233;color:#ddd6c8}
.actionCell{display:grid!important;grid-template-columns:1fr;gap:4px}
.actionCell button{padding:7px;margin:1px 0}
.newsGrid,.watchGrid{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:14px}
.newsCard,.watchCard,.journalCard,.detailBox{background:#aaa397;border:1px solid #333;border-radius:12px;padding:14px;box-shadow:inset 0 0 18px rgba(0,0,0,.12)}
.journalStack{display:grid;gap:18px}
.journalTop,.journalNumbers{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
.journalCard textarea{min-height:90px;resize:vertical}
ul{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:12px;padding:0}
li{list-style:none;background:#aaa397;border:1px solid #333;border-radius:12px;padding:14px;cursor:pointer}
li b{display:block;color:#1f75bc;margin-bottom:6px}
footer{color:#ddd6c8;padding:20px}
@media(max-width:1050px){
  .app{grid-template-columns:1fr}
  .sidebar{position:relative;height:auto;min-height:auto}
  .hero,.grid3,.filters,.newsGrid,.watchGrid,.journalTop,.journalNumbers,ul{grid-template-columns:1fr}
  .modes{grid-template-columns:repeat(7,190px)}
  .table{grid-template-columns:repeat(16,150px)}
  h1{font-size:46px}
}
`;
