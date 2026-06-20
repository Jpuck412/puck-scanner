"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type NewsItem = {
  title: string;
  publisher?: string;
  published_utc?: string;
  article_url?: string;
  description?: string;
};

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
  entryAggressive: number;
  entryConfirmation: number;
  entryProof: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rr: number;
  speed: number;
  speedLabel: string;
  volumeSurge: number;
  spreadStatus: string;
  spreadPct: number;
bid: number;
ask: number;

floatShares: number;
sharesOutstanding: number;
floatProxy: number;
floatStatus: string;
floatScore: number;
marketMode: string;

gainBand: string;
runnerLane: string;
bottomIgnitionScore: number;
gainerStructureScore: number;
runnerScore: number;
overExtensionPenalty: number;

  catalyst: string;
  catalystGrade: string;
  newsScore: number;
  news: NewsItem[];
  proofScore: number;
  ignitionScore: number;
  verdict: string;
  rejection: string;
  permissionText: string;
  candles: number;
};

type Page =
  | "dashboard"
  | "scanner"
  | "structure"
  | "news"
  | "help"
  | "glossary"
  | "settings";

type Mode = "BOTTOM" | "RANK" | "VOLUME" | "VWAP" | "TOP" | "CUSTOM";

const pages: Page[] = [
  "dashboard",
  "scanner",
  "structure",
  "news",
  "help",
  "glossary",
  "settings"
];

const modes: { key: Mode; label: string; desc: string }[] = [
  { key: "BOTTOM", label: "BOTTOM IGNITION", desc: "Early pressure + score" },
  { key: "RANK", label: "SPEED CLIMBERS", desc: "Fastest live movement" },
  { key: "VOLUME", label: "VOLUME AWAKENING", desc: "Volume surge priority" },
  { key: "VWAP", label: "PROOF SCORE", desc: "Best structure score" },
  { key: "TOP", label: "TOP GAINERS", desc: "Largest % gain" },
  { key: "CUSTOM", label: "CUSTOM COURT", desc: "Balanced permission" }
];

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function money(v: number) {
  const n = num(v);
  if (!n) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(v: number) {
  const n = num(v);
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(v: number) {
  const n = num(v);
  if (!n) return "N/A";
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + "B";
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function isJunk(t: string) {
  const x = String(t || "").toUpperCase();
  return (
    x.endsWith("W") ||
    x.endsWith("WS") ||
    x.endsWith("U") ||
    x.endsWith("R") ||
    x.includes(".")
  );
}

function scoreClass(v: number) {
  if (v >= 80) return "good";
  if (v >= 60) return "warn";
  return "bad";
}

function verdictClass(v: string) {
  if (v === "YES" || v === "PROOF") return "good";
  if (v === "WAIT") return "warn";
  return "bad";
}

function spreadClass(v: string) {
  if (v === "PASS" || v === "LIKELY TIGHT") return "good";
  if (v === "CAUTION" || v === "CHECK") return "warn";
  return "bad";
}

function catalystClass(v: string) {
  if (v === "A" || v === "B") return "good";
  if (v === "C" || v === "RISK") return "warn";
  if (v === "DANGER") return "bad";
  return "";
}

function shortTitle(v: string, max = 92) {
  const x = String(v || "").trim();
  if (!x) return "NO FRESH NEWS FOUND";
  return x.length > max ? x.slice(0, max - 3) + "..." : x;
}

function dateShort(v?: string) {
  if (!v) return "N/A";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function normalize(s: any): Stock {
  const ticker = String(s?.ticker || "").toUpperCase();

  const price = num(
    s?.price ??
      s?.day?.c ??
      s?.min?.c ??
      ((s?.prevDay?.c ?? 0) + (s?.todaysChange ?? 0))
  );

  const gain = num(s?.gain ?? s?.todaysChangePerc);
  const change = num(s?.change ?? s?.todaysChange);
  const volume = num(s?.volume ?? s?.day?.v ?? s?.min?.v);
  const open = num(s?.open ?? s?.day?.o ?? s?.min?.o ?? price);
  const high = num(s?.high ?? s?.day?.h ?? price * 1.08);
  const low = num(s?.low ?? s?.day?.l ?? price * 0.94);

  const support = num(s?.support ?? low ?? price * 0.94);
  const resistance = num(s?.resistance ?? high ?? price * 1.08);

  const entryAggressive = num(s?.entryAggressive ?? resistance * 0.985);
  const entryConfirmation = num(s?.entryConfirmation ?? resistance * 1.01);
  const entryProof = num(s?.entryProof ?? resistance * 1.045);

  const stop = num(s?.stop ?? support);
  const target1 = num(s?.target1 ?? s?.target ?? resistance * 1.08);
  const target2 = num(s?.target2 ?? resistance * 1.18);
  const target3 = num(s?.target3 ?? resistance * 1.35);

  const risk = num(s?.risk ?? Math.max(0, entryProof - stop));
  const reward = num(s?.reward ?? Math.max(0, target1 - entryProof));
  const rr = num(s?.rr ?? (risk > 0 ? reward / risk : 0));

  const volumeSurge = num(s?.volumeSurge ?? s?.structure?.volumeSurge);
  const speedRaw = num(s?.speed);
  const speed = clamp(
    speedRaw || Math.round(gain * 0.45 + volumeSurge * 16),
    0,
    100
  );

  const speedLabel =
    s?.speedLabel ||
    (speed >= 85 ? "VIOLENT" : speed >= 65 ? "FAST" : speed >= 40 ? "ACTIVE" : "SLOW");

  const spreadStatus = String(s?.spreadStatus ?? s?.spreadEstimate ?? "CHECK").toUpperCase();
  const spreadPct = num(s?.spreadPct);
  const bid = num(s?.bid);
  const ask = num(s?.ask);

  const catalyst = String(s?.catalyst || "NO FRESH NEWS FOUND");
  const catalystGrade = String(s?.catalystGrade || "NONE");
  const newsScore = num(s?.newsScore);
  const news = Array.isArray(s?.news) ? s.news : [];
  const floatShares = num(s?.floatShares);
  const sharesOutstanding = num(s?.sharesOutstanding);
  const floatProxy = num(s?.floatProxy);
  const floatStatus = String(s?.floatStatus || "UNKNOWN");
  const floatScore = num(s?.floatScore);
  const marketMode = String(s?.marketMode || "");
  const gainBand = String(s?.gainBand || "UNKNOWN");
  const runnerLane = String(s?.runnerLane || "UNCLASSIFIED");
  const bottomIgnitionScore = num(s?.bottomIgnitionScore);
  const gainerStructureScore = num(s?.gainerStructureScore);
  const runnerScore = num(s?.runnerScore);
  const overExtensionPenalty = num(s?.overExtensionPenalty);
  let ignitionScore = num(s?.ignitionScore);
  if (!ignitionScore) {
    ignitionScore += Math.min(28, Math.max(0, gain) * 0.75);
    ignitionScore += Math.min(22, volume / 500000);
    ignitionScore += Math.min(20, volumeSurge * 5);
    ignitionScore += price > 0 && price <= 1 ? 15 : price <= 5 ? 12 : price <= 10 ? 8 : 3;
    if (spreadStatus === "PASS") ignitionScore += 6;
    if (spreadStatus === "FAIL") ignitionScore -= 16;
    if (isJunk(ticker)) ignitionScore -= 35;
  }

  ignitionScore = clamp(Math.round(ignitionScore), 0, 100);

  let proofScore = num(s?.proofScore);
  if (!proofScore) {
    proofScore = ignitionScore;
    if (rr >= 2) proofScore += 10;
    if (spreadStatus === "FAIL") proofScore -= 15;
    if (volume < 100000) proofScore -= 20;
  }

  proofScore = clamp(Math.round(proofScore), 0, 100);

  const verdict = String(
    s?.verdict || (proofScore >= 80 ? "YES" : proofScore >= 60 ? "WAIT" : "NO")
  ).replace("PROOF", "YES");

  let rejection = String(s?.rejection || "");
  if (!rejection) {
    if (isJunk(ticker)) rejection = "JUNK SYMBOL";
    else if (volume < 100000) rejection = "LOW VOLUME";
    else if (spreadStatus === "FAIL") rejection = "SPREAD RISK";
    else if (proofScore < 60) rejection = "NO PROOF";
  }

  const permissionText =
    s?.permissionText ||
    (verdict === "YES"
      ? "PERMISSION POSSIBLE — STRUCTURE MUST HOLD"
      : verdict === "WAIT"
      ? "WAIT — NEED MORE PROOF"
      : "DENIED — NO CLEAN PERMISSION");

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
    entryAggressive,
    entryConfirmation,
    entryProof,
    stop,
    target1,
    target2,
    target3,
    risk,
    reward,
    rr,
    speed,
    speedLabel,
    volumeSurge,
    spreadStatus,
    spreadPct,
    bid,
    ask,
    floatShares,
    sharesOutstanding,
    floatProxy,
    floatStatus,
    floatScore,
    marketMode,
    gainBand,
    runnerLane,
    bottomIgnitionScore,
    gainerStructureScore,
    runnerScore,
    overExtensionPenalty,

    catalyst,
    catalystGrade,
    newsScore,
    news,
    proofScore,
    ignitionScore,
    verdict,
    rejection,
    permissionText,
    candles: num(s?.candles)
  };
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>("BOTTOM");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [errorText, setErrorText] = useState("");
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

  const [selectedTicker, setSelectedTicker] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const [manualTicker, setManualTicker] = useState("");
  const [manualSupport, setManualSupport] = useState(0.28);
  const [manualResistance, setManualResistance] = useState(0.34);

  async function load() {
    setStatus("SCANNING");
    setErrorText("");

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();

      if (!json?.ok && json?.error) {
        setStatus("ERROR");
        setErrorText(String(json.error));
      } else {
        setStatus("CONNECTED");
      }

      const list = json?.data?.tickers || json?.tickers || json?.results || [];
      setStocks(Array.isArray(list) ? list.map(normalize) : []);
      setLastScan(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York"
        })
      );
    } catch (error) {
      setStatus("ERROR");
      setErrorText(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    load();

    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York"
        })
      );
    }, 1000);

    try {
      const saved = window.localStorage.getItem("proof-watchlist");
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoScan) return;
    const seconds = clamp(refreshSec, 5, 300);
    const id = setInterval(load, seconds * 1000);
    return () => clearInterval(id);
  }, [autoScan, refreshSec]);

  useEffect(() => {
    try {
      window.localStorage.setItem("proof-watchlist", JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => {
      if (removeJunk && isJunk(s.ticker)) return false;
      if (s.price < minPrice || s.price > maxPrice) return false;
      if (s.gain < minGain) return false;
      if (s.volume < minVolume) return false;
      return true;
    });

    if (mode === "BOTTOM") list = [...list].sort((a, b) => b.bottomIgnitionScore - a.bottomIgnitionScore);
if (mode === "RANK") list = [...list].sort((a, b) => b.speed - a.speed);
if (mode === "VOLUME") list = [...list].sort((a, b) => b.volumeSurge - a.volumeSurge);
if (mode === "VWAP") list = [...list].sort((a, b) => b.gainerStructureScore - a.gainerStructureScore);
if (mode === "TOP") list = [...list].sort((a, b) => b.gain - a.gain);
if (mode === "CUSTOM") list = [...list].sort((a, b) => b.runnerScore - a.runnerScore);

    return list.slice(0, 30);
  }, [stocks, minPrice, maxPrice, minGain, minVolume, removeJunk, mode]);

  const rejected = useMemo(() => stocks.filter((s) => s.rejection), [stocks]);

  const top = filtered[0];

  const selected =
    filtered.find((s) => s.ticker === selectedTicker) ||
    stocks.find((s) => s.ticker === selectedTicker) ||
    top;

  const yesCount = filtered.filter((s) => s.verdict === "YES").length;
  const waitCount = filtered.filter((s) => s.verdict === "WAIT").length;
  const noCount = filtered.filter((s) => s.verdict === "NO").length;

  const liveNews = useMemo(() => {
    return stocks
      .flatMap((s) =>
        s.news.map((n) => ({
          ticker: s.ticker,
          grade: s.catalystGrade,
          score: s.newsScore,
          ...n
        }))
      )
      .filter((n) => n.title)
      .slice(0, 20);
  }, [stocks]);

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

  function toggleWatchlist(ticker: string) {
    if (!ticker) return;
    setWatchlist((prev) =>
      prev.includes(ticker)
        ? prev.filter((x) => x !== ticker)
        : [...prev, ticker]
    );
  }

  function discordProof(s?: Stock) {
    if (!s) return "No ticker selected.";
    return [
      `TICKER TRIAL — ${s.ticker}`,
      ``,
      `Verdict: ${s.verdict}`,
      `Permission Text: ${s.permissionText}`,
      `Price: ${money(s.price)}`,
      `Gain: ${pct(s.gain)}`,
      `Volume: ${vol(s.volume)}`,
      `Speed: ${s.speedLabel} / ${s.speed}`,
      `Spread: ${s.spreadStatus}${s.spreadPct ? ` / ${s.spreadPct.toFixed(2)}%` : ""}`,
      `Support: ${money(s.support)}`,
      `Resistance: ${money(s.resistance)}`,
      `Aggressive Entry: ${money(s.entryAggressive)}`,
      `Confirmation Entry: ${money(s.entryConfirmation)}`,
      `Proof Entry: ${money(s.entryProof)}`,
      `Stop: ${money(s.stop)}`,
      `Target 1: ${money(s.target1)}`,
      `Risk/Reward: ${s.rr.toFixed(2)}`,
      `Float: ${s.floatStatus} / ${vol(s.floatProxy)}`, 
      `Catalyst Grade: ${s.catalystGrade}`,
      `Catalyst: ${shortTitle(s.catalyst, 140)}`,
      ``,
      `What proves it right?`,
      `Support holds, spread stays clean, volume/speed continue, and price confirms over resistance.`,
      ``,
      `What proves it wrong?`,
      `Support breaks, spread expands, volume fades, or buyers lose control.`,
      ``,
      `Educational review only. Not financial advice.`
    ].join("\n");
  }

  async function copyProof(s?: Stock) {
    try {
      await navigator.clipboard.writeText(discordProof(s));
      alert("Discord proof copied.");
    } catch {
      alert("Copy failed. Highlight the proof text manually.");
    }
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">PS</div>
          <h2>PROOF<br />STRUCTURE</h2>
          <p>ELITE DEV</p>
        </div>

        <nav>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={page === p ? "active" : ""}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </nav>

        <div className="sideCard">
          <small>STATUS</small>
          <strong className={status === "ERROR" ? "bad" : status === "CONNECTED" ? "good" : "warn"}>
            {status}
          </strong>
          <span>{errorText || "Scanner route active"}</span>
        </div>
      </aside>

      <section className="main">
        <header className="hero">
          <div>
            <p>PROOF OF STRUCTURE™ ELITE</p>
            <h1>MISSION CONTROL</h1>
            <span>The market must earn permission. No Proof = No Trade.</span>
          </div>

          <div className="clock">
            <small>ET CLOCK</small>
            <strong>{time || "LOADING"}</strong>
            <small>Last Scan: {lastScan}</small>
            <button onClick={load}>RUN SCAN</button>
          </div>
        </header>

        {page === "dashboard" && (
          <>
            <section className="modebar">
              {modes.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={mode === m.key ? "active" : ""}
                >
                  <strong>{m.label}</strong>
                  <small>{m.desc}</small>
                </button>
              ))}
            </section>

            <section className="stats">
              <Stat title="Raw Count" value={stocks.length} />
              <Stat title="Showing" value={filtered.length} />
              <Stat title="YES" value={yesCount} tone="good" />
              <Stat title="WAIT" value={waitCount} tone="warn" />
              <Stat title="NO" value={noCount} tone="bad" />
              <Stat title="Rejected" value={rejected.length} />
            </section>

            <section className="grid3">
              <Panel title="COMMAND CENTER">
                <h3 className={`big ${verdictClass(top?.verdict || "NO")}`}>
                  {top?.verdict || "WAIT"}
                </h3>
                <Row a="Top Ticker" b={top?.ticker || "NONE"} />
                <Row a="Permission" b={top?.permissionText || "NO SCAN YET"} />
                <Row a="Runner Lane" b={top?.runnerLane || "N/A"} />
                <Row a="Gain Band" b={top?.gainBand || "N/A"} />
                <Row a="Runner Score" b={top?.runnerScore ?? 0} />
                <Row a="Bottom Ignition" b={top?.bottomIgnitionScore ?? 0} />
                <Row a="Gainer Structure" b={top?.gainerStructureScore ?? 0} />
                <Row a="Proof Score" b={top?.proofScore ?? 0} />
                <Row a="Ignition" b={top?.ignitionScore ?? 0} />
                <Row a="Speed" b={top ? `${top.speedLabel} / ${top.speed}` : "N/A"} />
                <Row a="Catalyst" b={top ? top.catalystGrade : "N/A"} />
                <Row a="Float" b={top ? `${top.floatStatus} / ${vol(top.floatProxy)}` : "N/A"} />
                <Row a="Mode" b={top?.marketMode || "LIVE / WAITING"} />
                <button onClick={load}>NEW SCAN</button>
                <button onClick={() => setAutoScan(!autoScan)}>
                  AUTO SCAN: {autoScan ? "ON" : "OFF"}
                </button>
              </Panel>

              <Panel title="PRECISION FILTERS">
                <div className="filters">
                  <label>
                    Min Price
                    <input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} type="number" step="0.01" />
                  </label>
                  <label>
                    Max Price
                    <input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} type="number" step="0.01" />
                  </label>
                  <label>
                    Min Gain %
                    <input value={minGain} onChange={(e) => setMinGain(Number(e.target.value))} type="number" />
                  </label>
                  <label>
                    Min Volume
                    <input value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} type="number" />
                  </label>
                  <label>
                    Refresh Seconds
                    <input value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} type="number" />
                  </label>
                  <button onClick={() => setRemoveJunk(!removeJunk)}>
                    REMOVE JUNK: {removeJunk ? "ON" : "OFF"}
                  </button>
                </div>
              </Panel>

              <Panel title="TOP STRUCTURE">
                <Row a="Ticker" b={top?.ticker || "NONE"} />
                <Row a="Price" b={top ? money(top.price) : "N/A"} />
                <Row a="Support" b={top ? money(top.support) : "N/A"} />
                <Row a="Resistance" b={top ? money(top.resistance) : "N/A"} />
                <Row a="Aggressive" b={top ? money(top.entryAggressive) : "N/A"} />
                <Row a="Confirmation" b={top ? money(top.entryConfirmation) : "N/A"} />
                <Row a="Proof Entry" b={top ? money(top.entryProof) : "N/A"} />
                <Row a="Stop" b={top ? money(top.stop) : "N/A"} />
                <Row a="Target 1" b={top ? money(top.target1) : "N/A"} />
                <Row a="R/R" b={top ? top.rr.toFixed(2) : "N/A"} />
                <Row a="Float" b={top ? `${top.floatStatus} / ${vol(top.floatProxy)}` : "N/A"} />
              </Panel>
            </section>

            <section className="grid2">
              <Panel title="TOP 10 PERMISSION BOARD">
                <div className="cards">
                  {filtered.slice(0, 10).map((s, i) => (
                    <button
                      key={s.ticker}
                      className={`tickerCard ${selected?.ticker === s.ticker ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedTicker(s.ticker);
                        setPage("scanner");
                      }}
                    >
                      <span>#{i + 1}</span>
                      <strong>{s.ticker}</strong>
                      <em className={verdictClass(s.verdict)}>{s.verdict}</em>
                      <small>{money(s.price)} / {pct(s.gain)}</small>
                      <small>{s.runnerLane || "UNCLASSIFIED"}</small>
                      <small>{s.gainBand || "UNKNOWN"}</small>
                      <small>Runner {s.runnerScore} · BI {s.bottomIgnitionScore} · GS {s.gainerStructureScore}</small>  
                    </button>
                  ))}
                </div>
              </Panel>
<Panel title="LIVE CATALYST RADAR">
  {filtered.slice(0, 6).map((s) => {
    const articleUrl = s.news?.[0]?.article_url || "";

    return articleUrl ? (
      <a
        className="newsLine newsLink"
        key={s.ticker}
        href={articleUrl}
        target="_blank"
        rel="noreferrer"
      >
        <b>{s.ticker}</b>
        <span className={catalystClass(s.catalystGrade)}>{s.catalystGrade}</span>
        <p>{shortTitle(s.catalyst)}</p>
        <small>OPEN ARTICLE ↗</small>
      </a>
    ) : (
      <div className="newsLine" key={s.ticker}>
        <b>{s.ticker}</b>
        <span className={catalystClass(s.catalystGrade)}>{s.catalystGrade}</span>
        <p>{shortTitle(s.catalyst)}</p>
        <small>NO ARTICLE LINK</small>
      </div>
    );
  })}
</Panel>
              
            </section>
          </>
        )}

        {page === "scanner" && (
          <section className="gridScan">
            <Panel title="LIVE RESULTS GRID">
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Gain</th>
                      <th>Vol</th>
                      <th>Speed</th>
                      <th>Lane</th>
                      <th>Band</th>
                      <th>BI</th>
                      <th>GS</th>
                      <th>Spread</th>
                      <th>Support</th>
                      <th>Resist</th>
                      <th>Proof</th>
                      <th>Score</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.ticker}
                        onClick={() => setSelectedTicker(s.ticker)}
                        className={selected?.ticker === s.ticker ? "rowSelected" : ""}
                      >
                        <td><b>{s.ticker}</b></td>
                        <td>{money(s.price)}</td>
                        <td className="good">{pct(s.gain)}</td>
                        <td>{vol(s.volume)}</td>
                        <td>{s.speedLabel} {s.speed}</td>
                        <td>{s.runnerLane || "N/A"}</td>
                        <td>{s.gainBand || "N/A"}</td>
                        <td>{s.bottomIgnitionScore}</td>
                        <td>{s.gainerStructureScore}</td>
                        <td className={spreadClass(s.spreadStatus)}>{s.spreadStatus}</td>
                        <td>{money(s.support)}</td>
                        <td>{money(s.resistance)}</td>
                        <td>{money(s.entryProof)}</td>
                        <td className={scoreClass(s.proofScore)}>{s.proofScore}</td>
                        <td className={verdictClass(s.verdict)}>{s.verdict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setShowRejected(!showRejected)}>
                {showRejected ? "HIDE REJECTED" : "SHOW REJECTED"}
              </button>

              {showRejected && (
                <div className="rejectBox">
                  {rejected.map((s) => (
                    <Row key={s.ticker} a={s.ticker} b={s.rejection} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="TICKER TRIAL PANEL">
              {selected ? (
                <>
                  <h3 className="tickerTitle">{selected.ticker}</h3>
                  <div className={`verdictPill ${verdictClass(selected.verdict)}`}>
                    {selected.verdict} · {selected.permissionText}
                  </div>

                  <Row a="Price" b={money(selected.price)} />
                  <Row a="Gain" b={pct(selected.gain)} />
                  <Row a="Runner Lane" b={selected.runnerLane || "N/A"} />
                  <Row a="Gain Band" b={selected.gainBand || "N/A"} />
                  <Row a="Runner Score" b={selected.runnerScore} />
                  <Row a="Bottom Ignition" b={selected.bottomIgnitionScore} />
                  <Row a="Gainer Structure" b={selected.gainerStructureScore} />
                  <Row a="Volume" b={vol(selected.volume)} />
                  <Row a="Speed" b={`${selected.speedLabel} / ${selected.speed}`} />
                  <Row a="Spread" b={`${selected.spreadStatus}${selected.spreadPct ? ` / ${selected.spreadPct.toFixed(2)}%` : ""}`} />
                  <Row a="Support" b={money(selected.support)} />
                  <Row a="Resistance" b={money(selected.resistance)} />
                  <Row a="Aggressive" b={money(selected.entryAggressive)} />
                  <Row a="Confirmation" b={money(selected.entryConfirmation)} />
                  <Row a="Proof Entry" b={money(selected.entryProof)} />
                  <Row a="Stop" b={money(selected.stop)} />
                  <Row a="Target 1" b={money(selected.target1)} />
                  <Row a="Target 2" b={money(selected.target2)} />
                  <Row a="Target 3" b={money(selected.target3)} />
                  <Row a="Risk/Reward" b={selected.rr.toFixed(2)} />
                  <Row a="Float" b={`${selected.floatStatus} / ${vol(selected.floatProxy)}`} />
                  <Row a="Float Score" b={selected.floatScore} />
                  <Row a="Catalyst Grade" b={selected.catalystGrade} />
                  <Row a="Catalyst" b={shortTitle(selected.catalyst, 60)} />

                  <div className="actionRow">
                    <button onClick={() => toggleWatchlist(selected.ticker)}>
                      {watchlist.includes(selected.ticker) ? "REMOVE WATCH" : "ADD WATCH"}
                    </button>
                    <button onClick={() => copyProof(selected)}>COPY DISCORD PROOF</button>
                  </div>
                </>
              ) : (
                <p>No ticker selected.</p>
              )}
            </Panel>
          </section>
        )}

        {page === "structure" && (
          <section className="grid2">
            <Panel title="MANUAL STRUCTURE ENGINE">
              <div className="filters">
                <label>
                  Ticker
                  <input value={manualTicker} onChange={(e) => setManualTicker(e.target.value.toUpperCase())} />
                </label>
                <label>
                  Support
                  <input value={manualSupport} onChange={(e) => setManualSupport(Number(e.target.value))} type="number" step="0.0001" />
                </label>
                <label>
                  Resistance
                  <input value={manualResistance} onChange={(e) => setManualResistance(Number(e.target.value))} type="number" step="0.0001" />
                </label>
              </div>

              <Row a="Aggressive Entry" b={money(manualAggressive)} />
              <Row a="Confirmation Entry" b={money(manualConfirmation)} />
              <Row a="Proof Entry" b={money(manualProof)} />
              <Row a="Stop / Invalidation" b={money(manualStop)} />
              <Row a="Target 1" b={money(manualTarget1)} />
              <Row a="Target 2" b={money(manualTarget2)} />
              <Row a="Target 3" b={money(manualTarget3)} />
              <Row a="Risk" b={money(manualRisk)} />
              <Row a="Reward" b={money(manualReward)} />
              <Row a="Risk/Reward" b={manualRR.toFixed(2)} />
            </Panel>

            <Panel title="STRUCTURE VERDICT">
              <h3 className={`big ${manualRR >= 2 ? "good" : manualRR >= 1 ? "warn" : "bad"}`}>
                {manualRR >= 2 ? "YES" : manualRR >= 1 ? "WAIT" : "NO"}
              </h3>
              <p>
                Manual structure requires support, resistance, proof entry,
                stop/invalidation, target, and clean risk/reward.
              </p>
              <div className="ruleBox">
                <b>Final Test</b>
                <span>What proves I’m right?</span>
                <span>What proves I’m wrong?</span>
                <span>No proof = no trade.</span>
              </div>
            </Panel>
          </section>
        )}

        {page === "news" && (
          <section className="grid2">
            <Panel title="LIVE NEWS ENGINE">
              {liveNews.length ? (
                liveNews.map((n, i) => (
                  <div className="newsCard" key={`${n.ticker}-${i}`}>
                    <div>
                      <b>{n.ticker}</b>
                      <span className={catalystClass(n.grade)}>{n.grade || "NEWS"}</span>
                    </div>
                    <h3>{shortTitle(n.title, 120)}</h3>
                    <small>{n.publisher || "Unknown"} · {dateShort(n.published_utc)}</small>
                    <p>{shortTitle(n.description || "", 180)}</p>
                    {n.article_url && (
                      <a href={n.article_url} target="_blank" rel="noreferrer">
                        Open Article
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty">
                  <h3>No live news loaded yet.</h3>
                  <p>Run scan. If still empty, Polygon news access may be limited on your API tier.</p>
                </div>
              )}
            </Panel>

            <Panel title="CATALYST RULES">
              <ul className="lessonList">
                <li>FDA / trial / approval = high attention.</li>
                <li>Earnings / revenue / guidance = high attention.</li>
                <li>Contract / government / defense = strong watch.</li>
                <li>Offering / ATM / reverse split = danger.</li>
                <li>News without volume = not enough.</li>
                <li>News with wide spread = still dangerous.</li>
                <li>The market still must earn permission.</li>
              </ul>
            </Panel>
          </section>
        )}

        {page === "help" && (
          <>
            <div className="demoNotice">
             <strong>(SAT/SUN SCANNER IS IN DEMO MODE — NOT A REAL LIVE GAINERS SCAN.)</strong>
            </div>
            <Info
              title="HELP CENTER"
              items={[
              ["How Scanner Works", "The scanner ranks candidates by proof, speed, volume, spread, catalyst, and structure."],
              ["Aggressive Entry", "Near resistance before confirmation. Highest risk. Needs tight spread."],
              ["Confirmation Entry", "After resistance starts to prove itself. Cleaner than guessing."],
              ["Proof Entry", "After the market earns permission. Less first, more right."],
              ["Support", "The floor. If this breaks, the idea is wrong."],
              ["Resistance", "The ceiling. A break and hold can become confirmation."],
              ["Risk", "Entry minus invalidation. No risk defined = no permission."],
              ["Spread", "Bid/ask gap. Wide spread can rob the trade."],
              ["Catalyst", "News can attract attention, but does not replace structure."]
             ]}
               />
               </>
             )}

        {page === "glossary" && (
          <Info
            title="GLOSSARY"
            items={[
              ["VWAP", "Average price weighted by volume. A common intraday control level."],
              ["EMA", "Moving average that reacts faster to recent price."],
              ["RVOL", "Relative volume compared to normal activity."],
              ["Float", "Shares available to trade. Lower float can move faster."],
              ["Spread", "Gap between bid and ask."],
              ["Support", "Price area buyers defend."],
              ["Resistance", "Price area sellers defend."],
              ["Catalyst", "News or event that attracts attention."],
              ["Limit Order", "Order that controls the price you accept."],
              ["Risk/Reward", "Potential reward divided by potential risk."],
              ["Tape", "Live trades and order flow behavior."],
              ["Absorption", "Sellers hit but price holds because buyers absorb supply."]
            ]}
          />
        )}

        {page === "settings" && (
          <section className="grid2">
            <Panel title="SETTINGS">
              <Row a="Theme" b="Elite gray + neon blue" />
              <Row a="Market Window" b="4:00 AM–8:00 PM ET" />
              <Row a="Auto Scan" b={autoScan ? "ON" : "OFF"} />
              <Row a="Refresh" b={`${refreshSec}s`} />
              <Row a="Max Price" b={money(maxPrice)} />
              <Row a="Min Volume" b={vol(minVolume)} />
              <Row a="Remove Junk" b={removeJunk ? "ON" : "OFF"} />
              <Row a="Broker" b="Preview only / IBKR later" />
              <Row a="Auto Buy" b="OFF ALWAYS" />
            </Panel>

            <Panel title="WATCHLIST">
              {watchlist.length ? (
                watchlist.map((t) => <Row key={t} a={t} b="WATCHING" />)
              ) : (
                <p>No tickers saved yet.</p>
              )}
            </Panel>
          </section>
        )}

        <footer>
          Educational software only. Not financial advice. No buy/sell commands.
          All trading decisions are the user's responsibility.
        </footer>
      </section>

      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#151a20;color:#e8f3ff;font-family:Arial,Helvetica,sans-serif}
        button,input{font-family:inherit}
        .app{display:grid;grid-template-columns:245px 1fr;min-height:100vh;background:
          radial-gradient(circle at 35% 0%,rgba(77,183,255,.18),transparent 34%),
          linear-gradient(135deg,#151a20,#222933 55%,#171d24)}
        .sidebar{background:rgba(15,20,26,.92);border-right:1px solid #31475e;padding:20px;position:sticky;top:0;height:100vh;backdrop-filter:blur(12px)}
        .brand{border:1px solid #2f4a63;border-radius:20px;padding:16px;background:linear-gradient(145deg,#1c252f,#111820);box-shadow:0 18px 40px rgba(0,0,0,.35)}
        .logo{width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,#0b77ff,#5ad7ff);display:grid;place-items:center;color:white;font-weight:1000;box-shadow:0 0 25px rgba(77,183,255,.45)}
        .brand h2{color:#76ceff;letter-spacing:3px;margin:14px 0 4px;font-size:22px}
        .brand p,.hero p,.tag{color:#48aaff;letter-spacing:4px;font-weight:900;font-size:12px;text-transform:uppercase}
        nav{margin-top:18px}
        .sidebar button,.modebar button,button{width:100%;padding:12px;margin:7px 0;border-radius:14px;border:1px solid #39536b;background:linear-gradient(145deg,#26313c,#1a222b);color:#93d8ff;font-weight:900;cursor:pointer;transition:.15s}
        button:hover,.active{background:linear-gradient(145deg,#0b77ff,#024aa8)!important;color:white!important;border-color:#69c9ff!important;transform:translateY(-1px)}
        .sideCard{margin-top:16px;border:1px solid #31475e;border-radius:16px;padding:14px;background:#151d26;display:grid;gap:6px}
        .sideCard small{color:#91a8bc}
        .sideCard strong{font-size:20px}
        .sideCard span{color:#9fb4c6;font-size:12px;line-height:1.4}
        .main{padding:22px;min-width:0}
        .hero,.panel,.stat{background:rgba(37,44,53,.92);border:1px solid #3b536b;border-radius:24px;padding:20px;margin-bottom:16px;box-shadow:0 18px 45px rgba(0,0,0,.35)}
        .hero{display:grid;grid-template-columns:1fr 290px;gap:20px;align-items:center}
        h1{font-size:58px;margin:4px 0;color:#8bd8ff;line-height:.95;text-shadow:0 0 25px rgba(77,183,255,.35)}
        .hero span{color:#cfefff}
        .clock{border:1px solid #365979;border-radius:18px;padding:16px;background:#131b24;display:grid;gap:6px}
        .clock strong{font-size:30px;color:#75d4ff}
        .modebar{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}
        .modebar button{display:grid;gap:4px;min-height:78px}
        .modebar small{color:#b7c8d6;font-weight:700}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:16px}
        .stat{margin:0;padding:16px}
        .stat small{color:#96aabd;text-transform:uppercase;font-weight:900;letter-spacing:2px}
        .stat strong{display:block;font-size:30px;color:#e8f3ff;margin-top:6px}
        .grid3{display:grid;grid-template-columns:330px 1fr 340px;gap:16px}
        .grid2{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
        .gridScan{display:grid;grid-template-columns:1fr 380px;gap:16px;align-items:start}
      
        .demoNotice{
         border:1px solid #ffd166;
         background:rgba(255,209,102,.12);
         color:#ffd166;
         border-radius:16px;
         padding:14px 16px;
         margin-bottom:16px;
         font-size:14px;
         letter-spacing:1px;
      }
    
        .panel{overflow:hidden}
        .panel h2{color:#63c4ff}
        .row{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #35495f;padding:9px 0;align-items:flex-start}
        .row span:first-child{color:#9baab8}
        .row b{color:#dcefff;text-align:right;word-break:break-word}
        .big{font-size:68px;margin:0 0 8px;line-height:1}
        .good{color:#00ff91!important}
        .bad{color:#ff4d5e!important}
        .warn{color:#ffd166!important}
        .filters{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .filters label{color:#a9bbcb;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px}
        .filters input{width:100%;margin-top:7px;padding:12px;border-radius:12px;border:1px solid #45627d;background:#111820;color:#6cc8ff;font-weight:900;outline:none}
        .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .tickerCard{display:grid;text-align:left;gap:4px;margin:0;min-height:105px}
        .tickerCard strong{font-size:24px;color:#e9f7ff}
        .tickerCard em{font-style:normal;font-weight:1000}
        .tickerCard span,.tickerCard small{color:#aac0d2}
        .selected,.rowSelected{outline:2px solid #5acaff!important;background:rgba(11,119,255,.18)!important}
        .newsLine{border:1px solid #334e66;border-radius:14px;padding:12px;margin-bottom:10px;background:#17212b}
        .newsLine b{color:#75d4ff;margin-right:8px}
        .newsLine span{font-weight:1000}
        .newsLine p{margin:6px 0 0;color:#d6eaff}
      .newsLink{
  display:block;
  text-decoration:none;
}
.newsLink:hover{
  border-color:#69c9ff;
  box-shadow:0 0 20px rgba(77,183,255,.25);
  transform:translateY(-1px);
}
.newsLine small{
  color:#67c7ff;
  font-weight:900;
  letter-spacing:1px;
}
        .tableWrap{overflow:auto;border:1px solid #39536b;border-radius:16px}
        table{width:100%;border-collapse:collapse;min-width:1050px}
        th,td{padding:12px;border-bottom:1px solid #34495d;text-align:left;white-space:nowrap}
        th{background:#172230;color:#69c9ff;font-size:12px;text-transform:uppercase;letter-spacing:1px}
        td{color:#e5f4ff}
        tr{cursor:pointer}
        tr:hover{background:rgba(77,183,255,.08)}
        .rejectBox{margin-top:12px;border:1px solid #3c5368;border-radius:14px;padding:10px;background:#141d26}
        .tickerTitle{font-size:42px;color:#8bd8ff;margin:0 0 10px}
        .verdictPill{border:1px solid #3d5b74;border-radius:999px;padding:10px 12px;margin-bottom:10px;background:#121a22;font-weight:1000;text-align:center}
        .actionRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
        .ruleBox{display:grid;gap:10px;border:1px solid #3b536b;border-radius:16px;padding:16px;background:#141d26}
        .ruleBox b{color:#79d4ff}
        .newsCard{border:1px solid #39536b;background:#17212b;border-radius:18px;padding:16px;margin-bottom:12px}
        .newsCard div{display:flex;justify-content:space-between;gap:10px}
        .newsCard b{color:#76ceff;font-size:20px}
        .newsCard span{font-weight:1000}
        .newsCard h3{margin:10px 0;color:#eaf7ff}
        .newsCard small{color:#9fb4c6}
        .newsCard p{color:#ccdeed;line-height:1.45}
        .newsCard a{color:#67c7ff;font-weight:900}
        .empty{border:1px dashed #45627d;border-radius:18px;padding:20px;color:#b8c9d8}
        .lessonList{display:grid;gap:10px;padding:0}
        .lessonList li,.panel li{background:#1b222b;border:1px solid #31475e;padding:12px;border-radius:12px;list-style:none}
        .infoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .infoCard{background:#1b222b;border:1px solid #31475e;padding:14px;border-radius:14px;min-height:110px}
        .infoCard b{color:#75d4ff;display:block;margin-bottom:8px}
        .infoCard span{color:#c6d7e5;line-height:1.4}
        footer{color:#94a7b7;padding:20px;text-align:center}
        @media(max-width:1200px){.grid3,.grid2,.gridScan{grid-template-columns:1fr}.stats,.modebar{grid-template-columns:repeat(2,1fr)}.cards{grid-template-columns:1fr}}
        @media(max-width:800px){.app{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.hero{grid-template-columns:1fr}h1{font-size:42px}.stats,.modebar,.filters,.infoGrid{grid-template-columns:1fr}}
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

function Row({ a, b }: { a: string; b: any }) {
  return (
    <div className="row">
      <span>{a}</span>
      <b>{b}</b>
    </div>
  );
}

function Stat({ title, value, tone = "" }: { title: string; value: any; tone?: string }) {
  return (
    <div className="stat">
      <small>{title}</small>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function Info({
  title,
  items
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <Panel title={title}>
      <div className="infoGrid">
        {items.map(([name, desc]) => (
          <div className="infoCard" key={name}>
            <b>{name}</b>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
