"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * PROOF OF STRUCTURE™ ELITE
 * Executive Trading Intelligence - Light Rustic Theme
 *
 * - Light grey background with rustic paint-chips texture
 * - Blue primary text (headings & body)
 * - Retains full functionality: scanner, formation, why engine, structure, watchlist, journal, market intelligence
 *
 * Replace previous app/page.tsx with this file to change theme.
 */

/* ---------------------------
   Types & Constants (unchanged functionality)
   --------------------------- */

type Lifecycle =
  | "SLEEPING"
  | "ACCUMULATING"
  | "WAKING"
  | "FORMING"
  | "IGNITING"
  | "RUNNING"
  | "EXTENDED"
  | "FAILING";

interface TickerData {
  ticker: string;
  price: number;
  prevPrice?: number;
  gain: number;
  spreadPct: number;
  speedScore: number;
  volumeAccel: number;
  floatScore: number;
  support?: number;
  resistance?: number;
  tapeScore: number;
  catalystScore: number;
  environmentScore: number;
  formationScore: number;
  journeyScore: number;
  eliteScore: number;
  lifecycle: Lifecycle;
  volume: number;
  marketCap?: number;
  verdict?: "YES" | "WAIT" | "NO";
  lastSeen: string;
}

const LIFECYCLE_COLORS: Record<Lifecycle, string> = {
  SLEEPING: "#c08c2b",
  ACCUMULATING: "#c08c2b",
  WAKING: "#0e7a55",
  FORMING: "#0e7a55",
  IGNITING: "#0b6b45",
  RUNNING: "#095b38",
  EXTENDED: "#b33a3a",
  FAILING: "#a80f1f",
};

const WATCHLIST_KEY = "ps_elite_watch_v2";
const JOURNAL_KEY = "ps_elite_journal_v2";

/* ---------------------------
   Helpers & Scoring (same logic)
   --------------------------- */

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

function scoreSpread(spreadPct: number) {
  if (spreadPct < 0.2) return 100;
  if (spreadPct < 0.6) return 90;
  if (spreadPct < 1.5) return 70;
  if (spreadPct < 3) return 50;
  return 20;
}
function scoreSpeed(changePct: number) {
  const abs = Math.abs(changePct);
  if (abs < 0.2) return 30;
  if (abs < 1) return 55;
  if (abs < 3) return 75;
  return 95;
}
function scoreVolumeAccel(accelRatio: number) {
  if (accelRatio < 0.5) return 10;
  if (accelRatio < 1) return 40;
  if (accelRatio < 2) return 70;
  return 95;
}
function scoreFloat(floatMillions: number) {
  if (floatMillions <= 0) return 40;
  if (floatMillions < 5) return 75;
  if (floatMillions < 50) return 95;
  if (floatMillions < 200) return 70;
  return 40;
}
function scoreSupportIntegrity(price: number, support?: number) {
  if (!support) return 50;
  const dist = (price - support) / support;
  if (dist < 0) return 10;
  if (dist < 0.02) return 95;
  if (dist < 0.07) return 80;
  if (dist < 0.15) return 60;
  return 40;
}
function scoreTape(tapeScore: number) {
  return clamp(tapeScore);
}

function computeFormationScore(inputs: {
  spreadPct: number;
  speedChangePct: number;
  volumeAccelRatio: number;
  floatMillions: number;
  support?: number;
  price: number;
  tapeScore: number;
  catalystScore: number;
  environmentScore: number;
}) {
  const sSpread = scoreSpread(inputs.spreadPct);
  const sSpeed = scoreSpeed(inputs.speedChangePct);
  const sVol = scoreVolumeAccel(inputs.volumeAccelRatio);
  const sFloat = scoreFloat(inputs.floatMillions);
  const sSupport = scoreSupportIntegrity(inputs.price, inputs.support);
  const sTape = scoreTape(inputs.tapeScore);

  const formation =
    0.18 * sSpread +
    0.18 * sSpeed +
    0.18 * sVol +
    0.12 * sFloat +
    0.14 * sSupport +
    0.1 * sTape +
    0.06 * inputs.catalystScore +
    0.04 * inputs.environmentScore;

  return Math.round(formation * 100) / 100;
}

function computeEliteScore(inputs: {
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  catalystScore: number;
  environmentScore: number;
}) {
  const elite =
    0.25 * inputs.formationScore +
    0.25 * inputs.journeyScore +
    0.2 * inputs.proofScore +
    0.15 * inputs.catalystScore +
    0.15 * inputs.environmentScore;
  return Math.round(elite * 100) / 100;
}

/* ---------------------------
   Market intelligence & data generator
   --------------------------- */

function computeMarketEnvironment(inputs: {
  spyChangePct: number;
  qqqChangePct: number;
  iwmChangePct: number;
  vix: number;
  sectorStrength: number;
  premarketParticipation: number;
  newsRisk: "LOW" | "MEDIUM" | "HIGH";
  spreadEnvironment: "NARROW" | "MODERATE" | "BROAD";
}) {
  const regimeScore =
    (inputs.spyChangePct > 0 ? 1 : -1) * 20 +
    (inputs.qqqChangePct > 0 ? 1 : -1) * 15 +
    (inputs.iwmChangePct > 0 ? 1 : -1) * 10 +
    (inputs.vix < 20 ? 12 : inputs.vix < 30 ? 5 : -10) +
    (inputs.sectorStrength / 2) +
    (inputs.premarketParticipation / 10);

  const newsAdj = inputs.newsRisk === "LOW" ? 8 : inputs.newsRisk === "MEDIUM" ? -2 : -14;
  const spreadAdj = inputs.spreadEnvironment === "NARROW" ? 10 : inputs.spreadEnvironment === "MODERATE" ? 0 : -8;

  let envScore = Math.round(clamp((regimeScore + newsAdj + spreadAdj + 50) * 0.7, 0, 100));
  let color: "GREEN" | "YELLOW" | "RED" = envScore > 65 ? "GREEN" : envScore > 40 ? "YELLOW" : "RED";
  return { envScore, color };
}

const SAMPLE_TICKERS = [
  "ARCX", "BLDR", "CENX", "DYNX", "EQRN", "FARO", "GLEN", "HELD", "INTR", "JCNX", "KERN", "LYTX", "MTRX", "NOVX", "ORBN",
];

function generateTickerSample(): TickerData[] {
  const baseTime = Date.now();
  return SAMPLE_TICKERS.map((t) => {
    const price = Number((Math.random() * 40 + 2).toFixed(2));
    const prevPrice = Number((price / (1 + (Math.random() - 0.4) / 50)).toFixed(2));
    const gain = Number((((price - prevPrice) / prevPrice) * 100).toFixed(2));
    const spreadPct = Number((Math.random() * 1.5).toFixed(2));
    const speedScore = clamp(Math.round((Math.random() - 0.2) * 50 + Math.abs(gain) * 2 + 40));
    const volume = Math.round(Math.random() * 5_000_000 + 10_000);
    const avgVol = Math.max(10000, volume / (0.5 + Math.random() * 2));
    const volumeAccel = Number((volume / avgVol).toFixed(2));
    const volumeAccelScore = scoreVolumeAccel(volumeAccel);
    const floatMillions = Math.round(Math.random() * 300);
    const floatScore = scoreFloat(floatMillions);
    const tapeScore = Math.round(Math.random() * 100);
    const catalystScore = Math.round(Math.random() * 100 * (Math.random() > 0.85 ? 1 : 0.4));
    const environmentScore = Math.round(Math.random() * 100);
    const support = Number((price * (0.86 + Math.random() * 0.08)).toFixed(2));
    const resistance = Number((price * (1.05 + Math.random() * 0.22)).toFixed(2));
    const formationScore = computeFormationScore({
      spreadPct,
      speedChangePct: gain,
      volumeAccelRatio: volume / Math.max(1, avgVol),
      floatMillions,
      support,
      price,
      tapeScore,
      catalystScore,
      environmentScore,
    });
    const journeyScore = clamp(Math.round((Math.random() * 40) + (formationScore * 0.3)));
    const proofScore = Math.round((formationScore * 0.6 + tapeScore * 0.4) / 1);
    const eliteScore = computeEliteScore({
      formationScore,
      journeyScore,
      proofScore,
      catalystScore,
      environmentScore,
    });

    const lifecycle = pickLifecycle(gain, formationScore, tapeScore, volume / Math.max(1, avgVol));

    const verdict: TickerData["verdict"] = eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

    return {
      ticker: t,
      price,
      prevPrice,
      gain,
      spreadPct,
      speedScore,
      volumeAccel: volumeAccelScore,
      floatScore,
      support,
      resistance,
      tapeScore,
      catalystScore,
      environmentScore,
      formationScore,
      journeyScore,
      eliteScore,
      lifecycle,
      volume,
      marketCap: Math.round(Math.random() * 2000),
      verdict,
      lastSeen: new Date(baseTime - Math.floor(Math.random() * 48) * 3600 * 1000).toISOString(),
    };
  });
}

function pickLifecycle(gain: number, formation: number, tape: number, volAccelRatio: number): Lifecycle {
  if (formation < 30 && gain < 0) return "FAILING";
  if (formation < 35 && gain < 1) return "SLEEPING";
  if (formation < 50 && gain >= 0 && volAccelRatio < 1) return "ACCUMULATING";
  if (formation >= 50 && gain < 3) return "WAKING";
  if (formation >= 55 && gain >= 3 && gain < 12) return "FORMING";
  if (formation >= 65 && gain >= 12 && gain < 25) return "IGNITING";
  if (formation >= 70 && gain >= 25 && gain < 80) return "RUNNING";
  if (gain >= 80) return "EXTENDED";
  return "ACCUMULATING";
}

/* ---------------------------
   Persistence
   --------------------------- */

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

interface JournalEntry {
  id: string;
  dateISO: string;
  ticker: string;
  entryPrice?: number;
  exitPrice?: number;
  reason?: string;
  evidence?: string;
  mistake?: string;
  lesson?: string;
  outcome?: string;
}

function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveJournal(entries: JournalEntry[]) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

/* ---------------------------
   Page - UI (light rustic theme)
   --------------------------- */

export default function Page() {
  const [tickers, setTickers] = useState<TickerData[]>(() => generateTickerSample());
  const [market, setMarket] = useState(() => ({
    spyChangePct: 0.12,
    qqqChangePct: 0.22,
    iwmChangePct: -0.03,
    vix: 16,
    sectorStrength: 20,
    premarketParticipation: 48,
    newsRisk: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    spreadEnvironment: "MODERATE" as "NARROW" | "MODERATE" | "BROAD",
  }));

  const [selectedTicker, setSelectedTicker] = useState<string | null>(tickers[0]?.ticker ?? null);
  const [watchlist, setWatchlist] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadWatchlist()));
  const [journal, setJournal] = useState<JournalEntry[]>(() => (typeof window === "undefined" ? [] : loadJournal()));

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof TickerData | "eliteScore" | "formationScore">("eliteScore");

  const [lastScan, setLastScan] = useState<string>(nowISO());
  const [refreshSeconds, setRefreshSeconds] = useState<number>(30);

  const marketEnv = useMemo(() => computeMarketEnvironment(market), [market]);

  useEffect(() => {
    const id = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const drift = (Math.random() - 0.45) * 0.8;
          const newPrice = Number((t.price * (1 + drift / 100)).toFixed(2));
          const gain = Number((((newPrice - (t.prevPrice ?? t.price)) / (t.prevPrice ?? t.price)) * 100).toFixed(2));
          const spreadPct = clamp(t.spreadPct * (1 + (Math.random() - 0.5) * 0.2), 0.05, 5);
          const speedScore = clamp(Math.round(t.speedScore + (Math.random() - 0.5) * 8));
          const volume = Math.max(1000, Math.round(t.volume * (1 + (Math.random() - 0.4) * 0.1)));
          const avgVol = Math.max(1000, Math.round(volume / (0.7 + Math.random() * 1.6)));
          const volAccelRatio = volume / avgVol;
          const volumeAccel = scoreVolumeAccel(volAccelRatio);
          const floatMillions = Math.max(0, t.marketCap ? Math.round(t.marketCap / 1) : Math.round(Math.random() * 300));
          const tapeScore = clamp(Math.round(t.tapeScore + (Math.random() - 0.5) * 10));
          const catalystScore = clamp(Math.round(t.catalystScore + (Math.random() - 0.5) * 8));
          const environmentScore = clamp(Math.round(t.environmentScore + (Math.random() - 0.5) * 6));
          const formationScore = computeFormationScore({
            spreadPct,
            speedChangePct: gain,
            volumeAccelRatio: volAccelRatio,
            floatMillions,
            support: t.support,
            price: newPrice,
            tapeScore,
            catalystScore,
            environmentScore,
          });
          const journeyScore = clamp(Math.round((t.journeyScore * 0.92 + formationScore * 0.08) + (Math.random() - 0.5) * 4));
          const proofScore = Math.round((formationScore * 0.6 + tapeScore * 0.4));
          const eliteScore = computeEliteScore({
            formationScore,
            journeyScore,
            proofScore,
            catalystScore,
            environmentScore,
          });
          const lifecycle = pickLifecycle(gain, formationScore, tapeScore, volAccelRatio);
          const verdict: TickerData["verdict"] =
            eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

          return {
            ...t,
            prevPrice: t.price,
            price: newPrice,
            gain,
            spreadPct,
            speedScore,
            volumeAccel,
            floatScore: scoreFloat(floatMillions),
            tapeScore,
            catalystScore,
            environmentScore,
            formationScore,
            journeyScore,
            eliteScore,
            lifecycle,
            volume,
            verdict,
            lastSeen: nowISO(),
          };
        })
      );
      setLastScan(nowISO());
    }, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [refreshSeconds]);

  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  useEffect(() => {
    saveJournal(journal);
  }, [journal]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let rows = tickers.slice();
    if (q) rows = rows.filter((r) => r.ticker.includes(q));
    rows.sort((a, b) => {
      if (sortKey === "eliteScore") return b.eliteScore - a.eliteScore;
      if (sortKey === "formationScore") return b.formationScore - a.formationScore;
      const k = sortKey as keyof TickerData;
      if (typeof a[k] === "number" && typeof b[k] === "number") return (b[k] as number) - (a[k] as number);
      return a.ticker.localeCompare(b.ticker);
    });
    return rows;
  }, [tickers, search, sortKey]);

  const selected = tickers.find((t) => t.ticker === selectedTicker) ?? null;

  const toggleWatch = (ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((p) => p !== ticker) : [...prev, ticker];
      saveWatchlist(next);
      return next;
    });
  };

  function addJournal(entry: Partial<JournalEntry>) {
    const note: JournalEntry = {
      id: uid(),
      dateISO: nowISO(),
      ticker: entry.ticker ?? (selected?.ticker ?? "N/A"),
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      reason: entry.reason,
      evidence: entry.evidence,
      mistake: entry.mistake,
      lesson: entry.lesson,
      outcome: entry.outcome,
    };
    setJournal((p) => [note, ...p]);
    saveJournal([note, ...journal]);
  }

  function runStructureAnalysis(input: {
    ticker: string;
    currentPrice: number;
    support?: number;
    resistance?: number;
    lifecycle?: Lifecycle;
    journeyScore?: number;
  }) {
    const { currentPrice, support = currentPrice * 0.9, resistance, lifecycle = "FORMING", journeyScore = 50 } = input;
    const rangeHigh = resistance ?? currentPrice * 1.12;
    const rangeLow = support;
    const rangePos = clamp(((currentPrice - rangeLow) / (rangeHigh - rangeLow)) * 100, 0, 100);
    const formationEntry = Number((rangeLow + (rangeHigh - rangeLow) * 0.33).toFixed(2));
    const aggressiveEntry = Number((rangeLow + (rangeHigh - rangeLow) * 0.12).toFixed(2));
    const confirmationEntry = Number((rangeLow + (rangeHigh - rangeLow) * 0.62).toFixed(2));
    const proofEntry = Number(((formationEntry + confirmationEntry) / 2).toFixed(2));
    const stop =
      lifecycle === "SLEEPING" ? Number((rangeLow * 0.995).toFixed(2)) : lifecycle === "ACCUMULATING" ? Number((rangeLow * 0.985).toFixed(2)) : Number((rangeLow * 0.97).toFixed(2));
    const t1 = Number((currentPrice * 1.12).toFixed(2));
    const t2 = Number((currentPrice * 1.26).toFixed(2));
    const t3 = Number((currentPrice * 1.6).toFixed(2));
    const rrT1 = parseFloat(((t1 - formationEntry) / (formationEntry - stop) || 0).toFixed(2));
    const rrT2 = parseFloat(((t2 - formationEntry) / (formationEntry - stop) || 0).toFixed(2));
    const rrT3 = parseFloat(((t3 - formationEntry) / (formationEntry - stop) || 0).toFixed(2));

    const warnings: string[] = [];
    if (!input.support) warnings.push("Support missing: define key support level before entries.");
    if (!input.resistance) warnings.push("Resistance not provided: use with other evidence, do not use resistance alone.");
    if (journeyScore < 35) warnings.push("Weak journey — limited historical conviction.");
    if (lifecycle === "EXTENDED") warnings.push("Extended stage — avoid new core entries.");

    return {
      rangeLow,
      rangeHigh,
      rangePos,
      formationEntry,
      aggressiveEntry,
      confirmationEntry,
      proofEntry,
      stop,
      targets: { t1, t2, t3 },
      rr: { rrT1, rrT2, rrT3 },
      warnings,
    };
  }

  function whyEngine(t: TickerData) {
    const positive: string[] = [];
    const negative: string[] = [];
    const supportQuality: string[] = [];
    const resistanceQuality: string[] = [];
    const volumeBehavior: string[] = [];
    const spreadBehavior: string[] = [];
    const catalystAnalysis: string[] = [];
    const environmentAnalysis: string[] = [];

    if (t.formationScore > 65) positive.push("High formation quality");
    if (t.volumeAccel >= 70) positive.push("Sustained volume acceleration");
    if (t.floatScore >= 70) positive.push("Attractive float profile");
    if (t.tapeScore >= 60) positive.push("Order flow supporting move");
    if (t.catalystScore >= 60) positive.push("Material catalyst present");

    if (t.spreadPct > 2.5) negative.push("Wide spreads — execution risk");
    if (t.formationScore < 40) negative.push("Weak formation quality");
    if (t.volumeAccel < 40) negative.push("Insufficient volume support");
    if (t.lifecycle === "EXTENDED") negative.push("Extended stage — late entry risk");
    if (t.lifecycle === "FAILING") negative.push("Failing lifecycle — strong invalidation");

    if (t.support) {
      const dist = ((t.price - t.support) / t.support) * 100;
      supportQuality.push(`Support ${t.support.toFixed(2)} (${dist.toFixed(1)}% above)`);
    } else supportQuality.push("No validated support level");

    if (t.resistance) {
      const dist = ((t.resistance - t.price) / t.price) * 100;
      resistanceQuality.push(`Resistance ${t.resistance.toFixed(2)} (${dist.toFixed(1)}% overhead)`);
    } else resistanceQuality.push("No validated resistance level");

    if (t.volumeAccel >= 70) volumeBehavior.push("Volume accelerating relative to recent average");
    else if (t.volumeAccel >= 40) volumeBehavior.push("Volume stable");
    else volumeBehavior.push("Low/declining volume");

    spreadBehavior.push(`Spread ${t.spreadPct.toFixed(2)}% — ${t.spreadPct < 1 ? "tight" : t.spreadPct < 2 ? "moderate" : "wide"}`);

    catalystAnalysis.push(`${t.catalystScore} catalyst score — ${t.catalystScore > 60 ? "material" : t.catalystScore > 35 ? "minor" : "none"}`);
    environmentAnalysis.push(`${t.environmentScore} environment score — ${marketEnv.color}`);

    const question = "What proves this thesis correct? Look for sustained volume, support retest holding, tape confirming buy-side interest, and corroborating catalyst.";
    const invalidation = "What proves this thesis wrong? Failure to hold support, violent distribution, material negative news, or environment regime flipping to RED.";

    return {
      positive,
      negative,
      supportQuality,
      resistanceQuality,
      volumeBehavior,
      spreadBehavior,
      catalystAnalysis,
      environmentAnalysis,
      question,
      invalidation,
    };
  }

  return (
    <div className="app">
      <aside className="left-col">
        <div className="brand">
          <div className="title">PROOF OF STRUCTURE™ ELITE</div>
          <div className="tag">Evidence Before Entry.</div>
        </div>

        <nav className="nav">
          <NavButton label="Dashboard" />
          <NavButton label="Market Intelligence" />
          <NavButton label="Scanner" active />
          <NavButton label="Formation Engine" />
          <NavButton label="Structure Analysis" />
          <NavButton label="Runner Lifecycle" />
          <NavButton label="Watchlist" />
          <NavButton label="Journal" />
          <NavButton label="Settings" />
        </nav>

        <div className="left-footer">
          <div className="small muted">Version 1.0 • Professional</div>
          <div className="muted">Last Scan: {new Date(lastScan).toLocaleString()}</div>
        </div>
      </aside>

      <main className="center-col">
        <header className="center-header">
          <div className="search-row">
            <div className="search-controls">
              <input className="input search" placeholder="Search tickers, sectors, tags..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
                <option value="eliteScore">Elite Score</option>
                <option value="formationScore">Formation Score</option>
                <option value="gain">Gain</option>
                <option value="volume">Volume</option>
                <option value="speedScore">Speed</option>
              </select>
              <div className="small muted">Refresh</div>
              <select value={refreshSeconds} onChange={(e) => setRefreshSeconds(Number(e.target.value))} className="input small">
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>

            <div className="market-mini">
              <div className="mi-row">
                <div>SPY</div>
                <div className="mi-val">{market.spyChangePct?.toFixed(2)}%</div>
              </div>
              <div className="mi-row">
                <div>QQQ</div>
                <div className="mi-val">{market.qqqChangePct?.toFixed(2)}%</div>
              </div>
              <div className="mi-row">
                <div>VIX</div>
                <div className="mi-val">{market.vix}</div>
              </div>
              <div className="mi-badge">{marketEnv.color}</div>
            </div>
          </div>

          <div className="center-meta">
            <div className="stat">
              <div className="muted">Scanned</div>
              <div className="stat-val">{tickers.length}</div>
            </div>
            <div className="stat">
              <div className="muted">Watchlist</div>
              <div className="stat-val">{watchlist.length}</div>
            </div>
            <div className="stat">
              <div className="muted">Env Score</div>
              <div className="stat-val">{marketEnv.envScore}</div>
            </div>
          </div>
        </header>

        <section className="scanner-section">
          <div className="table-wrap">
            <table className="scanner-table" role="grid" aria-label="Scanner">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price</th>
                  <th>Gain</th>
                  <th>Spread</th>
                  <th>Speed</th>
                  <th>Vol Accel</th>
                  <th>Float</th>
                  <th>Support</th>
                  <th>Resistance</th>
                  <th>Lifecycle</th>
                  <th>Formation</th>
                  <th>Journey</th>
                  <th>Catalyst</th>
                  <th>Environment</th>
                  <th>Elite</th>
                  <th>Verdict</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const selectedRow = r.ticker === selectedTicker;
                  return (
                    <tr key={r.ticker} className={selectedRow ? "row-selected" : ""} onClick={() => setSelectedTicker(r.ticker)}>
                      <td className="mono">{r.ticker}</td>
                      <td>${r.price.toFixed(2)}</td>
                      <td className={`gain ${r.gain >= 0 ? "pos" : "neg"}`}>{pct(r.gain)}</td>
                      <td>{r.spreadPct.toFixed(2)}%</td>
                      <td>{r.speedScore}</td>
                      <td>{r.volumeAccel}</td>
                      <td>{r.floatScore}</td>
                      <td>{r.support ? `$${r.support.toFixed(2)}` : "—"}</td>
                      <td>{r.resistance ? `$${r.resistance.toFixed(2)}` : "—"}</td>
                      <td>
                        <span className="lifecycle" style={{ background: LIFECYCLE_COLORS[r.lifecycle] }}>
                          {r.lifecycle}
                        </span>
                      </td>
                      <td>{r.formationScore}</td>
                      <td>{r.journeyScore}</td>
                      <td>{r.catalystScore}</td>
                      <td>{r.environmentScore}</td>
                      <td>{r.eliteScore}</td>
                      <td>
                        <span className={`verdict ${r.verdict?.toLowerCase()}`}>{r.verdict}</span>
                      </td>
                      <td className="actions">
                        <button className={`btn mini`} onClick={(e) => { e.stopPropagation(); toggleWatch(r.ticker); }}>
                          {watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}
                        </button>
                        <button className="btn mini ghost" onClick={(e) => { e.stopPropagation(); const ev = new CustomEvent("ps_elite:openWhy", { detail: { r, why: whyEngine(r) } }); window.dispatchEvent(ev); }}>
                          WHY
                        </button>
                        <button className="btn mini ghost" onClick={(e) => { e.stopPropagation(); const s = runStructureAnalysis({ ticker: r.ticker, currentPrice: r.price, support: r.support, resistance: r.resistance, lifecycle: r.lifecycle, journeyScore: r.journeyScore }); window.dispatchEvent(new CustomEvent("ps_elite:openStructure", { detail: { r, structure: s } })); }}>
                          STRUCTURE
                        </button>
                        <button className="btn mini ghost" onClick={(e) => { e.stopPropagation(); addJournal({ ticker: r.ticker, entryPrice: r.price, reason: "Quick note", evidence: `Elite ${r.eliteScore}` }); }}>
                          JOURNAL
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <aside className="right-col">
        <div className="right-header">
          <div className="right-title">Selected Ticker</div>
          <div className="muted small">{selected?.ticker ?? "None"}</div>
          <div className="right-actions">
            <button className="btn tiny" onClick={() => selected && toggleWatch(selected.ticker)}>{selected && watchlist.includes(selected.ticker) ? "UNWATCH" : "WATCH"}</button>
            <button className="btn tiny ghost" onClick={() => selected && addJournal({ ticker: selected.ticker, entryPrice: selected.price, reason: "Saved from dossier" })}>JOURNAL</button>
          </div>
        </div>

        {selected ? (
          <div className="dossier">
            <div className="d-row">
              <div>
                <div className="muted">Price</div>
                <div className="large mono">${selected.price.toFixed(2)}</div>
              </div>
              <div>
                <div className="muted">Elite</div>
                <div className="large">{selected.eliteScore}</div>
              </div>
            </div>

            <div className="compact-grid">
              <div className="kv">
                <div className="muted">Lifecycle</div>
                <div><span className="lifecycle" style={{ background: LIFECYCLE_COLORS[selected.lifecycle] }}>{selected.lifecycle}</span></div>
              </div>
              <div className="kv">
                <div className="muted">Formation</div>
                <div>{selected.formationScore}</div>
              </div>
              <div className="kv">
                <div className="muted">Journey</div>
                <div>{selected.journeyScore}</div>
              </div>
              <div className="kv">
                <div className="muted">Catalyst</div>
                <div>{selected.catalystScore}</div>
              </div>
              <div className="kv">
                <div className="muted">Env</div>
                <div>{selected.environmentScore}</div>
              </div>
              <div className="kv">
                <div className="muted">Spread</div>
                <div>{selected.spreadPct.toFixed(2)}%</div>
              </div>
            </div>

            <div className="section-mid">
              <div className="subhead">Market Intelligence</div>
              <div className="mi-list">
                <div>SPY: {market.spyChangePct}%</div>
                <div>QQQ: {market.qqChangePct ?? market.qqqChangePct}%</div>
                <div>VIX: {market.vix}</div>
                <div>Env: {marketEnv.color} ({marketEnv.envScore})</div>
              </div>
            </div>

            <div className="section-mid">
              <div className="subhead">WHY — Evidence Snapshot</div>
              <WhyCard t={selected} why={whyEngine(selected)} onSave={() => addJournal({ ticker: selected.ticker, entryPrice: selected.price, reason: "WHY saved", evidence: `Elite ${selected.eliteScore}` })} />
            </div>

            <div className="section-mid">
              <div className="subhead">Quick Structure</div>
              <StructureQuick t={selected} onRun={(s) => { const out = runStructureAnalysis({ ticker: selected.ticker, currentPrice: selected.price, support: selected.support, resistance: selected.resistance, lifecycle: selected.lifecycle, journeyScore: selected.journeyScore }); window.dispatchEvent(new CustomEvent("ps_elite:openStructure", { detail: { r: selected, structure: out } })); }} />
            </div>
          </div>
        ) : (
          <div className="empty">Select a ticker to view intelligence.</div>
        )}
      </aside>

      <WhyModalContainer />
      <StructurePanelContainer runStructureAnalysis={runStructureAnalysis} />

      <style jsx>{`
        :root{
          --bg:#e9e8e6; /* light grey canvas */
          --panel:#f8f6f4; /* soft off-white panels */
          --muted:#6b7786;
          --accent:#1e6fff; /* bright blue writing */
          --accent-2:#0b4cd8;
          --text:#08306b; /* deep blue for primary text */
          --rust-ink: rgba(4,20,45,0.04);
        }

        *{box-sizing:border-box}
        body { margin:0; background:var(--bg); font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial; color:var(--text); }

        /* Rustic textured background - layered radial gradients + subtle speckle overlay */
        .app{
          display:grid;
          grid-template-columns:260px 1fr 380px;
          gap:18px;
          min-height:100vh;
          padding:18px;
          background:
            radial-gradient(circle at 10% 10%, rgba(0,0,0,0.02) 0 2px, transparent 2px),
            radial-gradient(circle at 80% 20%, rgba(0,0,0,0.015) 0 3px, transparent 3px),
            radial-gradient(circle at 30% 80%, rgba(0,0,0,0.01) 0 1.5px, transparent 1.5px),
            linear-gradient(180deg, rgba(255,255,255,0.6), rgba(250,250,250,0.6));
          /* faint "peeling paint" overlay - SVG speckle as DATA URL */
          position:relative;
        }
        .app::after{
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><g fill='rgba(0,0,0,0.015)'><circle cx='40' cy='80' r='2'/><circle cx='120' cy='150' r='3'/><circle cx='200' cy='40' r='1.5'/><circle cx='380' cy='120' r='2.5'/><circle cx='520' cy='200' r='2'/><circle cx='690' cy='90' r='3'/></g></svg>");
          background-repeat: repeat;
          mix-blend-mode: multiply;
          opacity:0.9;
        }

        .left-col{background:var(--panel); padding:14px; border-radius:8px; display:flex; flex-direction:column; gap:12px; box-shadow: 0 6px 20px rgba(0,0,0,0.06); border-left:8px solid rgba(13,86,190,0.06)}
        .brand .title{font-weight:700; color:var(--accent); letter-spacing:0.6px}
        .brand .tag{color:var(--muted); font-size:12px}
        .nav{display:flex; flex-direction:column; gap:6px; margin-top:6px}
        .left-footer{margin-top:auto; color:var(--muted); font-size:12px}

        .center-col{display:flex; flex-direction:column; gap:12px}
        .center-header{display:flex; justify-content:space-between; align-items:center; gap:12px}
        .search-row{display:flex; align-items:center; gap:16px; width:100%}
        .search-controls{display:flex; gap:8px; align-items:center; flex:1}
        .input{background:transparent; border:1px dashed rgba(8,48,107,0.08); color:var(--text); padding:8px; border-radius:6px}
        .input.small{padding:6px; font-size:12px}
        .search{min-width:320px}
        .market-mini{display:flex; gap:8px; align-items:center}
        .mi-row{display:flex; gap:6px; align-items:center}
        .mi-val{font-weight:700; color:var(--accent-2)}
        .mi-badge{background:rgba(13,86,190,0.08); padding:6px 8px; border-radius:6px; font-weight:700; color:var(--accent)}

        .center-meta{display:flex; gap:12px; align-items:center}
        .stat{display:flex; flex-direction:column; gap:4px}
        .stat-val{font-weight:700}

        .scanner-section{background:linear-gradient(180deg,var(--panel), #fff); padding:8px; border-radius:6px; box-shadow: 0 2px 10px rgba(4,20,45,0.04); overflow:auto; border:1px solid rgba(8,48,107,0.04)}
        .table-wrap{overflow:auto}
        .scanner-table{width:100%; border-collapse:collapse; min-width:1200px}
        thead th{position:sticky; top:0; background:linear-gradient(180deg,#fbfbfb,#f3f3f2); padding:10px; text-align:left; color:var(--accent-2); font-size:12px; border-bottom:1px solid rgba(8,48,107,0.04)}
        tbody td{padding:8px; border-bottom:1px solid rgba(8,48,107,0.03); color:var(--text)}
        .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Roboto Mono,monospace}
        .lifecycle{color:#021; padding:6px 8px; border-radius:999px; font-weight:700; font-size:11px}
        .verdict{padding:6px 8px; border-radius:6px; font-weight:700}
        .verdict.yes{background:rgba(20,150,90,0.08); color:#0f7d4e}
        .verdict.wait{background:rgba(245,166,35,0.08); color:#9a6a00}
        .verdict.no{background:rgba(180,60,60,0.06); color:#8b2b2b}
        .actions{display:flex; gap:6px}
        .btn{background:transparent; border:1px solid rgba(8,48,107,0.06); color:var(--accent-2); padding:6px 8px; border-radius:6px; cursor:pointer}
        .btn.mini{padding:6px 6px; font-size:12px}
        .btn.tiny{padding:4px 6px; font-size:12px}
        .btn.ghost{background:transparent}
        .row-selected{background:linear-gradient(90deg, rgba(30,111,255,0.04), rgba(13,86,190,0.02)); border-left:4px solid rgba(13,86,190,0.12)}

        .right-col{background:var(--panel); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:10px; border-right:8px solid rgba(13,86,190,0.04)}
        .right-header{display:flex; justify-content:space-between; align-items:center; gap:8px}
        .right-title{font-weight:700; color:var(--accent-2)}
        .right-actions{display:flex; gap:6px}
        .dossier{display:flex; flex-direction:column; gap:10px}
        .d-row{display:flex; justify-content:space-between; gap:12px; align-items:center}
        .large{font-size:20px; font-weight:700; color:var(--accent-2)}
        .compact-grid{display:grid; grid-template-columns:repeat(2,1fr); gap:8px}
        .kv{display:flex; flex-direction:column; gap:4px}
        .muted{color:var(--muted); font-size:12px}
        .subhead{font-weight:700; margin-bottom:8px; color:var(--accent)}
        .section-mid{background:rgba(255,255,255,0.6); padding:8px; border-radius:6px; border:1px dashed rgba(8,48,107,0.04)}
        .empty{color:var(--muted); padding:12px}
        .small{font-size:12px}
        .compact-grid .kv div{font-weight:700}
        .why-card{display:flex; flex-direction:column; gap:8px}
        .why-list{display:flex; gap:8px; flex-direction:column}
        .why-list ul{margin:0; padding-left:18px}
        .right-footer{margin-top:auto; color:var(--muted)}

        /* modal styles */
        .modal-backdrop{position:fixed; inset:0; background:rgba(4,20,45,0.35); display:flex; align-items:center; justify-content:center; z-index:2000}
        .modal{background:var(--panel); padding:18px; border-radius:8px; width:900px; max-height:80vh; overflow:auto; border:1px solid rgba(8,48,107,0.04)}

        @media(max-width:1200px){ .app{grid-template-columns:220px 1fr; grid-template-rows:auto 1fr;} .right-col{display:none;} }
      `}</style>
    </div>
  );
}

/* ---------------------------
   Small UI helpers (Why/Structure modals / components)
   --------------------------- */

function NavButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <button className={`nav-btn ${active ? "active" : ""}`} title={label}>
      <div className="nav-label">{label}</div>
      <style jsx>{`
        .nav-btn {
          background: transparent;
          border: 1px dashed rgba(8,48,107,0.04);
          color: var(--accent-2);
          padding: 8px;
          border-radius: 6px;
          text-align: left;
          cursor: pointer;
        }
        .nav-btn.active { background: linear-gradient(90deg, rgba(30,111,255,0.06), rgba(13,86,190,0.02)); }
        .nav-label { font-size:13px; color:var(--text) }
      `}</style>
    </button>
  );
}

function WhyCard({ t, why, onSave }: { t: any; why: any; onSave: () => void }) {
  return (
    <div className="why-card">
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="muted">Positive Evidence</div>
          <ul>{why.positive.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted">Negative Evidence</div>
          <ul>{why.negative.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="muted">Support</div>
          <ul>{why.supportQuality.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted">Resistance</div>
          <ul>{why.resistanceQuality.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="muted">Volume</div>
          <ul>{why.volumeBehavior.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted">Spread</div>
          <ul>{why.spreadBehavior.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={() => onSave()}>Save Note</button>
        <button className="btn ghost" onClick={() => { window.dispatchEvent(new CustomEvent("ps_elite:openWhy", { detail: null })); }}>Close</button>
      </div>
    </div>
  );
}

function WhyModalContainer() {
  const [payload, setPayload] = useState<{ r: TickerData; why: any } | null>(null);
  useEffect(() => {
    function handler(e: any) {
      setPayload(e.detail ?? null);
    }
    window.addEventListener("ps_elite:openWhy", handler as EventListener);
    return () => window.removeEventListener("ps_elite:openWhy", handler as EventListener);
  }, []);
  if (!payload) return null;
  const { r, why } = payload;
  return (
    <div className="modal-backdrop" onClick={() => window.dispatchEvent(new CustomEvent("ps_elite:openWhy", { detail: null }))}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "var(--accent-2)" }}>WHY — {r.ticker} <span className="muted">({r.eliteScore})</span></h3>
          <div>
            <button className="btn" onClick={() => { /* export */ }}>Export</button>
            <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent("ps_elite:openWhy", { detail: null }))}>Close</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <div className="muted">Positive Evidence</div>
            <ul>{why.positive.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            <div className="muted">Support Quality</div>
            <ul>{why.supportQuality.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            <div className="muted">Volume Behavior</div>
            <ul>{why.volumeBehavior.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
          </div>

          <div>
            <div className="muted">Negative Evidence</div>
            <ul>{why.negative.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            <div className="muted">Resistance Quality</div>
            <ul>{why.resistanceQuality.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            <div className="muted">Spread Behavior</div>
            <ul>{why.spreadBehavior.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted">Catalyst Analysis</div>
          <ul>{why.catalystAnalysis.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
          <div className="muted">Environment Analysis</div>
          <ul>{why.environmentAnalysis.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
        </div>

        <div style={{ marginTop: 12 }}>
          <div><strong>QUESTION</strong></div>
          <div className="muted" style={{ marginBottom: 6 }}>{why.question}</div>
          <div><strong>INVALIDATION</strong></div>
          <div className="muted">{why.invalidation}</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => { /* create journal */ }}>Create Journal</button>
          <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent("ps_elite:openWhy", { detail: null }))}>Close</button>
        </div>
      </div>
    </div>
  );
}

function StructureQuick({ t, onRun }: { t: TickerData; onRun: (s: any) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <div className="muted">Support</div>
        <div>{t.support ? `$${t.support.toFixed(2)}` : "—"}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="muted">Resistance</div>
        <div>{t.resistance ? `$${t.resistance.toFixed(2)}` : "—"}</div>
      </div>
      <div>
        <button className="btn" onClick={() => onRun(null)}>Run</button>
      </div>
    </div>
  );
}

function StructurePanelContainer({ runStructureAnalysis }: { runStructureAnalysis: (input: any) => any }) {
  const [state, setState] = useState<{ r: TickerData; structure: any } | null>(null);
  useEffect(() => {
    function handler(e: any) {
      setState(e.detail ?? null);
    }
    window.addEventListener("ps_elite:openStructure", handler as EventListener);
    return () => window.removeEventListener("ps_elite:openStructure", handler as EventListener);
  }, []);

  if (!state) return null;
  const { r, structure } = state;
  return (
    <div className="modal-backdrop" onClick={() => window.dispatchEvent(new CustomEvent("ps_elite:openStructure", { detail: null }))}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <h3 style={{ color: "var(--accent-2)" }}>Structure Analysis — {r.ticker}</h3>
        <div className="muted">Structure engine refuses to rely on resistance alone for entries — it evaluates range position, support, journey, and lifecycle.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.6)", padding: 8, borderRadius: 6 }}>
            <div className="muted">Inputs</div>
            <div>Price: ${r.price.toFixed(2)}</div>
            <div>Support: {r.support ? `$${r.support.toFixed(2)}` : "—"}</div>
            <div>Resistance: {r.resistance ? `$${r.resistance.toFixed(2)}` : "—"}</div>
            <div>Lifecycle: {r.lifecycle}</div>
            <div>Journey: {r.journeyScore}</div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.6)", padding: 8, borderRadius: 6 }}>
            <div className="muted">Outputs</div>
            <div>Range Low: ${structure.rangeLow.toFixed(2)}</div>
            <div>Range High: ${structure.rangeHigh.toFixed(2)}</div>
            <div>Range Position: {structure.rangePos.toFixed(0)}%</div>
            <div>Formation Entry: ${structure.formationEntry}</div>
            <div>Aggressive Entry: ${structure.aggressiveEntry}</div>
            <div>Confirmation Entry: ${structure.confirmationEntry}</div>
            <div>Proof Entry: ${structure.proofEntry}</div>
            <div>Stop: ${structure.stop}</div>
            <div>Targets: ${structure.targets.t1} / ${structure.targets.t2} / ${structure.targets.t3}</div>
            <div>Risk-Reward (t1): {structure.rr.rrT1}x</div>
            <div style={{ color: "var(--muted)" }}>
              Warnings:
              <ul>{structure.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn">Export Levels</button>
          <button className="btn ghost" onClick={() => window.dispatchEvent(new CustomEvent("ps_elite:openStructure", { detail: null }))}>Close</button>
        </div>
      </div>
    </div>
  );
}
