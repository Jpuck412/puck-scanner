"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * PROOF OF STRUCTURE™ ELITE
 * app/page.tsx - clean, professional single-file implementation
 *
 * Notes:
 * - Dark theme with blue accents
 * - Responsive sidebar + main content
 * - All pages function in-memory with simple persistence (localStorage)
 * - No references to disallowed text (e.g., "BIG DADDY")
 *
 * Drop into: app/page.tsx
 */

/* ---------------------------
   Types and Constants
   --------------------------- */

type Stage =
  | "SLEEPING"
  | "WAKING"
  | "FORMING"
  | "IGNITING"
  | "RUNNING"
  | "EXTENDED"
  | "FAILING";

interface TickerRow {
  ticker: string;
  price: number;
  prevPrice?: number;
  gain: number; // percent
  volume: number;
  stage: Stage;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  catalystScore: number;
  environmentScore: number;
  eliteScore: number;
  support?: number;
  resistance?: number;
  formationEntry?: number;
  aggressiveEntry?: number;
  confirmationEntry?: number;
  proofEntry?: number;
  verdict?: "YES" | "WAIT" | "NO";
}

interface JournalEntry {
  id: string;
  dateISO: string;
  ticker: string;
  price: number;
  stage: Stage;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  eliteScore: number;
  notes: string;
}

/* ---------------------------
   Stage Color Mapping
   --------------------------- */

const STAGE_COLORS: Record<Stage, string> = {
  SLEEPING: "#D1A913", // yellow
  WAKING: "#1BC97B",
  FORMING: "#1BC97B",
  IGNITING: "#16A34A",
  RUNNING: "#059669",
  EXTENDED: "#E11D48",
  FAILING: "#DC2626",
};

/* ---------------------------
   Helpers
   --------------------------- */

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

const calculateEliteScore = (r: {
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  catalystScore: number;
  environmentScore: number;
}) => {
  const { formationScore, journeyScore, proofScore, catalystScore, environmentScore } = r;
  const elite =
    0.25 * formationScore +
    0.25 * journeyScore +
    0.2 * proofScore +
    0.15 * catalystScore +
    0.15 * environmentScore;
  return Math.round(elite * 100) / 100;
};

const formatPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

/* ---------------------------
   Sample data generator
   --------------------------- */

const SAMPLE_TICKERS = [
  "ALFA", "BRAV", "CHAR", "DELTA", "ECHO", "FOXT", "GOLF", "HOTL", "INDX", "JUNO", "KITE", "LUNA",
  "MARS", "NOVA", "ORCA", "PULSE", "QUAD", "RIFT", "SAGA", "TIDE",
];

const pickStage = (gain: number): Stage => {
  if (gain < 0) return "FAILING";
  if (gain < 2) return "SLEEPING";
  if (gain < 6) return "WAKING";
  if (gain < 15) return "FORMING";
  if (gain < 30) return "IGNITING";
  if (gain < 60) return "RUNNING";
  return "EXTENDED";
};

const generateSampleData = (): TickerRow[] => {
  return SAMPLE_TICKERS.map((t, i) => {
    const price = Number((Math.random() * 20 + 1).toFixed(2));
    const prevPrice = Number((price / (1 + (Math.random() - 0.3) / 50)).toFixed(2));
    const gain = Number((((price - prevPrice) / prevPrice) * 100).toFixed(2));
    const volume = Math.floor(Math.random() * 5_000_000 + 10_000);
    const formationScore = clamp(Math.random() * 100, 0, 100);
    const journeyScore = clamp(Math.random() * 100, 0, 100);
    const proofScore = clamp(Math.random() * 100, 0, 100);
    const catalystScore = clamp(Math.random() * 100, 0, 100);
    const environmentScore = clamp(Math.random() * 100, 0, 100);
    const eliteScore = calculateEliteScore({
      formationScore,
      journeyScore,
      proofScore,
      catalystScore,
      environmentScore,
    });
    const stage = pickStage(gain);
    const support = Number((price * (0.85 + Math.random() * 0.1)).toFixed(2));
    const resistance = Number((price * (1.05 + Math.random() * 0.25)).toFixed(2));
    const formationEntry = Number((support + (price - support) * 0.4).toFixed(2));
    const aggressiveEntry = Number((support + (price - support) * 0.1).toFixed(2));
    const confirmationEntry = Number((support + (price - support) * 0.6).toFixed(2));
    const proofEntry = Number((formationEntry + confirmationEntry) / 2);
    const verdict: TickerRow["verdict"] =
      eliteScore > 65 && stage !== "SLEEPING" && stage !== "EXTENDED" ? "YES" : eliteScore > 45 ? "WAIT" : "NO";

    return {
      ticker: t,
      price,
      prevPrice,
      gain,
      volume,
      stage,
      formationScore: Math.round(formationScore),
      journeyScore: Math.round(journeyScore),
      proofScore: Math.round(proofScore),
      catalystScore: Math.round(catalystScore),
      environmentScore: Math.round(environmentScore),
      eliteScore,
      support,
      resistance,
      formationEntry,
      aggressiveEntry,
      confirmationEntry,
      proofEntry,
      verdict,
    };
  });
};

/* ---------------------------
   Persistence helpers
   --------------------------- */

const WATCHLIST_KEY = "ps_elite_watchlist_v1";
const JOURNAL_KEY = "ps_elite_journal_v1";

const loadWatchlist = (): string[] => {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const saveWatchlist = (list: string[]) => {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
};

const loadJournal = (): JournalEntry[] => {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const saveJournal = (entries: JournalEntry[]) => {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
};

/* ---------------------------
   UI Components
   --------------------------- */

const Icon = ({ name }: { name: string }) => {
  return <span className="icon">{name}</span>;
};

function useNow(interval = 1000) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

/* ---------------------------
   Main Page
   --------------------------- */

export default function Page() {
  // global sample data
  const [data, setData] = useState<TickerRow[]>(() => generateSampleData());
  const now = useNow(30_000); // update every 30s visual
  const [lastScan, setLastScan] = useState<Date>(() => new Date());
  const [selectedPage, setSelectedPage] = useState<
    | "Dashboard"
    | "Scanner"
    | "Formation"
    | "Journey"
    | "Watchlist"
    | "Journal"
    | "Structure"
    | "News"
    | "Help"
    | "Settings"
  >("Dashboard");

  // watchlist & journal
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return loadWatchlist();
  });
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return loadJournal();
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [scannerSearch, setScannerSearch] = useState<string>("");
  const [scannerSort, setScannerSort] = useState<string>("eliteScore");
  const [whyTicker, setWhyTicker] = useState<TickerRow | null>(null);
  const [structureTicker, setStructureTicker] = useState<TickerRow | null>(null);
  const [structureResult, setStructureResult] = useState<any | null>(null);
  const [verdictLarge, setVerdictLarge] = useState<"YES" | "WAIT" | "NO">("WAIT");

  // Top metrics
  const totalScanned = data.length;
  const rejected = data.filter((d) => d.verdict === "NO").length;

  // Market environment mock
  const marketEnvironment = useMemo(() => {
    const spyTrend = Math.random() > 0.5 ? "UP" : "DOWN";
    const qqqTrend = Math.random() > 0.5 ? "UP" : "DOWN";
    const vix = Number((Math.random() * 10 + 10).toFixed(2));
    const newsRisk = Math.random() > 0.8 ? "HIGH" : Math.random() > 0.5 ? "MEDIUM" : "LOW";
    const sectorStrength = Math.random() > 0.6 ? "STRONG" : "WEAK";
    const spreadEnvironment = Math.random() > 0.7 ? "BROAD" : "NARROW";
    const premarketParticipation = Math.random() > 0.6 ? "HIGH" : "LOW";
    const envScore = Math.round(
      60 * (spyTrend === "UP" ? 1 : 0.6) +
        20 * (qqqTrend === "UP" ? 1 : 0.6) +
        (vix < 20 ? 10 : 5) +
        (newsRisk === "LOW" ? 10 : newsRisk === "MEDIUM" ? 5 : 0)
    );
    const color = envScore > 70 ? "GREEN" : envScore > 45 ? "YELLOW" : "RED";
    return { spyTrend, qqqTrend, vix, newsRisk, sectorStrength, spreadEnvironment, premarketParticipation, envScore, color };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // Rescan function
  const rescan = () => {
    setData((prev) => {
      // mutate some numbers to simulate a rescan
      const next = prev.map((r) => {
        const changePct = (Math.random() - 0.45) * 6; // -2.7% to +3.5%
        const price = Number((r.price * (1 + changePct / 100)).toFixed(2));
        const gain = Number((((price - (r.prevPrice ?? r.price)) / (r.prevPrice ?? r.price)) * 100).toFixed(2));
        const stage = pickStage(gain);
        // small random drift in scores
        const formationScore = clamp(r.formationScore + (Math.random() - 0.5) * 6, 0, 100);
        const journeyScore = clamp(r.journeyScore + (Math.random() - 0.5) * 6, 0, 100);
        const proofScore = clamp(r.proofScore + (Math.random() - 0.5) * 6, 0, 100);
        const catalystScore = clamp(r.catalystScore + (Math.random() - 0.5) * 6, 0, 100);
        const environmentScore = clamp(r.environmentScore + (Math.random() - 0.5) * 6, 0, 100);
        const eliteScore = calculateEliteScore({
          formationScore,
          journeyScore,
          proofScore,
          catalystScore,
          environmentScore,
        });
        const verdict: TickerRow["verdict"] =
          eliteScore > 65 && stage !== "SLEEPING" && stage !== "EXTENDED" ? "YES" : eliteScore > 45 ? "WAIT" : "NO";
        const support = Number((price * (0.85 + Math.random() * 0.1)).toFixed(2));
        const resistance = Number((price * (1.05 + Math.random() * 0.25)).toFixed(2));
        const formationEntry = Number((support + (price - support) * 0.4).toFixed(2));
        const aggressiveEntry = Number((support + (price - support) * 0.1).toFixed(2));
        const confirmationEntry = Number((support + (price - support) * 0.6).toFixed(2));
        const proofEntry = Number((formationEntry + confirmationEntry) / 2);
        return {
          ...r,
          prevPrice: r.price,
          price,
          gain,
          stage,
          formationScore: Math.round(formationScore),
          journeyScore: Math.round(journeyScore),
          proofScore: Math.round(proofScore),
          catalystScore: Math.round(catalystScore),
          environmentScore: Math.round(environmentScore),
          eliteScore,
          verdict,
          support,
          resistance,
          formationEntry,
          aggressiveEntry,
          confirmationEntry,
          proofEntry,
        };
      });
      return next;
    });
    setLastScan(new Date());
  };

  useEffect(() => {
    // sync persistence
    saveWatchlist(watchlist);
  }, [watchlist]);

  useEffect(() => {
    saveJournal(journal);
  }, [journal]);

  // Scanner filtered & sorted
  const scannerRows = useMemo(() => {
    const q = scannerSearch.trim().toUpperCase();
    let rows = data.slice();
    if (q) {
      rows = rows.filter((r) => r.ticker.includes(q));
    }
    rows.sort((a, b) => {
      const order = -1;
      if (scannerSort === "eliteScore") return order * (a.eliteScore - b.eliteScore);
      if (scannerSort === "formationScore") return order * (a.formationScore - b.formationScore);
      if (scannerSort === "journeyScore") return order * (a.journeyScore - b.journeyScore);
      if (scannerSort === "gain") return order * (a.gain - b.gain);
      if (scannerSort === "volume") return order * (a.volume - b.volume);
      return 0;
    });
    return rows;
  }, [data, scannerSearch, scannerSort]);

  // Formation page: gain between 5% and 50%, sort by formationScore
  const formationRows = useMemo(
    () => data.filter((r) => r.gain >= 5 && r.gain <= 50).sort((a, b) => b.formationScore - a.formationScore),
    [data]
  );

  // Journey page: simulate "firstSeen" and change metrics
  const journeyRows = useMemo(() => {
    return data.map((r, i) => {
      const firstSeen = new Date(Date.now() - (Math.floor(Math.random() * 10) + 1) * 24 * 60 * 60 * 1000);
      const gainThen = Number((r.gain * (0.3 + Math.random() * 1.2)).toFixed(2));
      const gainNow = r.gain;
      const rankChange = Math.floor((Math.random() - 0.5) * 20);
      const volumeChange = Math.round((Math.random() - 0.5) * 200);
      return {
        ticker: r.ticker,
        firstSeen,
        gainThen,
        gainNow,
        rankChange,
        volumeChange,
        journeyScore: r.journeyScore,
        stage: r.stage,
        eliteScore: r.eliteScore,
      };
    });
  }, [data]);

  // Dashboard top picks
  const topFormation = data.reduce((best, r) => (r.formationScore > (best?.formationScore ?? -1) ? r : best), null as TickerRow | null);
  const topElite = data.reduce((best, r) => (r.eliteScore > (best?.eliteScore ?? -1) ? r : best), null as TickerRow | null);
  const topJourney = data.reduce((best, r) => (r.journeyScore > (best?.journeyScore ?? -1) ? r : best), null as TickerRow | null);

  // Watchlist CRUD
  const toggleWatch = (ticker: string) => {
    setWatchlist((prev) => {
      const found = prev.includes(ticker);
      const next = found ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      saveWatchlist(next);
      return next;
    });
  };

  // Journal functions
  const addJournalNote = (entry: Omit<JournalEntry, "id" | "dateISO">) => {
    const dataEntry: JournalEntry = {
      ...entry,
      id: String(Math.random()).slice(2),
      dateISO: new Date().toISOString(),
    };
    setJournal((prev) => [dataEntry, ...prev]);
  };
  const deleteJournalNote = (id: string) => {
    setJournal((prev) => prev.filter((p) => p.id !== id));
  };

  // WHY engine (qualitative explanation)
  const whyEngine = (r: TickerRow) => {
    const likes: string[] = [];
    const dislikes: string[] = [];
    if (r.volume > 500_000) likes.push("Volume increasing");
    if (r.support && r.price > r.support) likes.push("Support holding");
    if (r.formationScore > 60) likes.push("Formation building");
    if (r.journeyScore > 55) likes.push("Journey improving");
    if (r.catalystScore > 60) likes.push("Catalyst present");
    if (r.volume < 100_000) dislikes.push("Weak volume");
    if (r.stage === "EXTENDED" || r.gain > 60) dislikes.push("Extended move");
    if (r.resistance && r.price > r.resistance * 0.98) dislikes.push("Resistance overhead");
    if (r.environmentScore < 40) dislikes.push("Weak environment");
    if (r.catalystScore < 30) dislikes.push("No catalyst");
    return { likes, dislikes, validation: `Elite Score: ${r.eliteScore}` };
  };

  // Structure engine: compute entries and risk/reward
  const runStructureEngine = (input: {
    ticker: string;
    currentPrice: number;
    support?: number;
    resistance?: number;
    stage?: Stage;
    journey?: number;
  }) => {
    const { currentPrice, support = currentPrice * 0.9, resistance = currentPrice * 1.12, stage = "FORMING", journey = 50 } = input;
    // range position: where current price sits between support and resistance
    const rangePosition = Number(((currentPrice - support) / (resistance - support)).toFixed(2));
    const formationEntry = Number((support + (resistance - support) * 0.35).toFixed(2));
    const aggressiveEntry = Number((support + (resistance - support) * 0.12).toFixed(2));
    const confirmationEntry = Number((support + (resistance - support) * 0.6).toFixed(2));
    const proofEntry = Number(((formationEntry + confirmationEntry) / 2).toFixed(2));

    // Stop: below support or dynamic based on stage/journey
    const stop =
      stage === "SLEEPING" ? Number((support * 0.98).toFixed(2)) : stage === "RUNNING" ? Number((support * 0.96).toFixed(2)) : Number((support * 0.985).toFixed(2));

    const targets = {
      t1: Number((currentPrice * 1.12).toFixed(2)),
      t2: Number((currentPrice * 1.25).toFixed(2)),
      t3: Number((currentPrice * 1.5).toFixed(2)),
    };

    const rr1 = Number(((targets.t1 - formationEntry) / (formationEntry - stop)).toFixed(2));
    const rr2 = Number(((targets.t2 - formationEntry) / (formationEntry - stop)).toFixed(2));
    const rr3 = Number(((targets.t3 - formationEntry) / (formationEntry - stop)).toFixed(2));

    // Structure must consider support, range position, journey, stage
    const notes: string[] = [];
    if (rangePosition < 0 || rangePosition > 1) notes.push("Price outside support/resistance range — review levels.");
    if (journey < 30) notes.push("Short journey — higher risk.");
    if (stage === "EXTENDED") notes.push("Extended stage — avoid new core entries.");
    if (!support || !resistance) notes.push("Missing support/resistance — manual review recommended.");

    const riskReward = { rr1, rr2, rr3 };

    const out = {
      rangePosition,
      formationEntry,
      aggressiveEntry,
      confirmationEntry,
      proofEntry,
      stop,
      targets,
      riskReward,
      notes,
    };
    setStructureResult(out);
    return out;
  };

  // Structure modal action
  const openStructureFor = (r: TickerRow | null) => {
    setStructureTicker(r);
    if (r) runStructureEngine({ ticker: r.ticker, currentPrice: r.price, support: r.support, resistance: r.resistance, stage: r.stage, journey: r.journeyScore });
  };

  // Verdict large calculation (Dashboard)
  useEffect(() => {
    // derive verdict large from distribution
    const yesCount = data.filter((d) => d.verdict === "YES").length;
    const waitCount = data.filter((d) => d.verdict === "WAIT").length;
    const noCount = data.filter((d) => d.verdict === "NO").length;
    const total = data.length || 1;
    const ratioYes = yesCount / total;
    const ratioNo = noCount / total;
    if (ratioYes > 0.25) setVerdictLarge("YES");
    else if (ratioNo > 0.45) setVerdictLarge("NO");
    else setVerdictLarge("WAIT");
  }, [data]);

  /* ---------------------------
     Page Render
     --------------------------- */

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="brand">
          <div className="logo">PROOF OF STRUCTURE™ ELITE</div>
          <div className="subtitle">Find the runner before the crowd finds the runner.</div>
        </div>

        <nav className="nav">
          {[
            "Dashboard",
            "Scanner",
            "Formation",
            "Journey",
            "Watchlist",
            "Journal",
            "Structure",
            "News",
            "Help",
            "Settings",
          ].map((page) => (
            <button
              key={page}
              className={`nav-item ${selectedPage === (page as any) ? "active" : ""}`}
              onClick={() => setSelectedPage(page as any)}
            >
              <span className="nav-label">{page}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="meta">Version 1.0.0</div>
          <button className="compact" onClick={() => setSidebarOpen((s) => !s)}>
            {sidebarOpen ? "Collapse" : "Expand"}
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="menu" onClick={() => setSidebarOpen((s) => !s)}>
              ☰
            </button>
            <h1 className="page-title">{selectedPage}</h1>
            <div className="small-sub">PROOF OF STRUCTURE™ ELITE</div>
          </div>
          <div className="top-right">
            <div className="last-scan">
              <div>Last Scan</div>
              <div className="muted">{lastScan.toLocaleString()}</div>
            </div>
            <button className="btn primary" onClick={rescan}>
              Scan Now
            </button>
          </div>
        </header>

        <section className="content">
          {selectedPage === "Dashboard" && (
            <Dashboard
              totalScanned={totalScanned}
              rejected={rejected}
              marketEnvironment={marketEnvironment}
              topFormation={topFormation}
              topElite={topElite}
              topJourney={topJourney}
              verdictLarge={verdictLarge}
              lastScan={lastScan}
            />
          )}

          {selectedPage === "Scanner" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Scanner</h2>
                <div className="controls">
                  <input
                    placeholder="Search ticker..."
                    value={scannerSearch}
                    onChange={(e) => setScannerSearch(e.target.value)}
                    className="input"
                  />
                  <select className="input" value={scannerSort} onChange={(e) => setScannerSort(e.target.value)}>
                    <option value="eliteScore">Elite Score</option>
                    <option value="formationScore">Formation Score</option>
                    <option value="journeyScore">Journey Score</option>
                    <option value="gain">Gain</option>
                    <option value="volume">Volume</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table" aria-label="scanner-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Gain</th>
                      <th>Volume</th>
                      <th>Stage</th>
                      <th>Formation</th>
                      <th>Journey</th>
                      <th>Proof</th>
                      <th>Catalyst</th>
                      <th>Environment</th>
                      <th>Elite</th>
                      <th>Support</th>
                      <th>Resistance</th>
                      <th>Formation Entry</th>
                      <th>Aggressive Entry</th>
                      <th>Confirmation Entry</th>
                      <th>Proof Entry</th>
                      <th>Verdict</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannerRows.map((r) => (
                      <tr key={r.ticker}>
                        <td className="mono">{r.ticker}</td>
                        <td>${r.price.toFixed(2)}</td>
                        <td className={`gain ${r.gain >= 0 ? "pos" : "neg"}`}>{formatPct(r.gain)}</td>
                        <td>{r.volume.toLocaleString()}</td>
                        <td>
                          <span className="stage" style={{ background: STAGE_COLORS[r.stage] }}>
                            {r.stage}
                          </span>
                        </td>
                        <td>{r.formationScore}</td>
                        <td>{r.journeyScore}</td>
                        <td>{r.proofScore}</td>
                        <td>{r.catalystScore}</td>
                        <td>{r.environmentScore}</td>
                        <td>{r.eliteScore}</td>
                        <td>${r.support?.toFixed(2)}</td>
                        <td>${r.resistance?.toFixed(2)}</td>
                        <td>${r.formationEntry?.toFixed(2)}</td>
                        <td>${r.aggressiveEntry?.toFixed(2)}</td>
                        <td>${r.confirmationEntry?.toFixed(2)}</td>
                        <td>${r.proofEntry?.toFixed(2)}</td>
                        <td>
                          <span className={`verdict ${r.verdict?.toLowerCase()}`}>{r.verdict}</span>
                        </td>
                        <td className="actions">
                          <button className={`btn ghost`} onClick={() => toggleWatch(r.ticker)}>
                            {watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}
                          </button>
                          <button className="btn ghost" onClick={() => setWhyTicker(r)}>
                            WHY
                          </button>
                          <button
                            className="btn ghost"
                            onClick={() =>
                              addJournalNote({
                                ticker: r.ticker,
                                price: r.price,
                                stage: r.stage,
                                formationScore: r.formationScore,
                                journeyScore: r.journeyScore,
                                proofScore: r.proofScore,
                                eliteScore: r.eliteScore,
                                notes: `Quick note for ${r.ticker}`,
                              } as any)
                            }
                          >
                            JOURNAL
                          </button>
                          <button
                            className="btn ghost"
                            onClick={() => {
                              openStructureFor(r);
                              setSelectedPage("Structure");
                            }}
                          >
                            STRUCTURE
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "Formation" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Formation — Gain 5% to 50% (sorted by Formation Score)</h2>
                <div className="controls">
                  <div className="muted">Purpose: Find runners early.</div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Stage</th>
                      <th>Gain</th>
                      <th>Formation</th>
                      <th>Journey</th>
                      <th>Elite</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formationRows.map((r) => (
                      <tr key={r.ticker}>
                        <td className="mono">{r.ticker}</td>
                        <td>
                          <span className="stage" style={{ background: STAGE_COLORS[r.stage] }}>
                            {r.stage}
                          </span>
                        </td>
                        <td className={`gain ${r.gain >= 0 ? "pos" : "neg"}`}>{formatPct(r.gain)}</td>
                        <td>{r.formationScore}</td>
                        <td>{r.journeyScore}</td>
                        <td>{r.eliteScore}</td>
                        <td className="actions">
                          <button className="btn ghost" onClick={() => toggleWatch(r.ticker)}>
                            {watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}
                          </button>
                          <button className="btn ghost" onClick={() => setWhyTicker(r)}>
                            WHY
                          </button>
                        </td>
                      </tr>
                    ))}
                    {formationRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="muted">
                          No formation matches (gain 5%–50%)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "Journey" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Journey — Track runner evolution</h2>
                <div className="muted">Purpose: Show how runners developed over time.</div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>First Seen</th>
                      <th>Gain Then</th>
                      <th>Gain Now</th>
                      <th>Rank Change</th>
                      <th>Volume Change</th>
                      <th>Journey Score</th>
                      <th>Stage</th>
                      <th>Elite Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journeyRows.map((r) => (
                      <tr key={r.ticker}>
                        <td className="mono">{r.ticker}</td>
                        <td>{r.firstSeen.toLocaleDateString()}</td>
                        <td className={`gain ${r.gainThen >= 0 ? "pos" : "neg"}`}>{formatPct(r.gainThen)}</td>
                        <td className={`gain ${r.gainNow >= 0 ? "pos" : "neg"}`}>{formatPct(r.gainNow)}</td>
                        <td>{r.rankChange}</td>
                        <td>{r.volumeChange}%</td>
                        <td>{r.journeyScore}</td>
                        <td>
                          <span className="stage" style={{ background: STAGE_COLORS[r.stage] }}>
                            {r.stage}
                          </span>
                        </td>
                        <td>{r.eliteScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "Watchlist" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Watchlist</h2>
                <div className="muted">Save tickers for quick access.</div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Stage</th>
                      <th>Elite Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((t) => {
                      const r = data.find((d) => d.ticker === t);
                      if (!r) return null;
                      return (
                        <tr key={t}>
                          <td className="mono">{t}</td>
                          <td>${r.price.toFixed(2)}</td>
                          <td>
                            <span className="stage" style={{ background: STAGE_COLORS[r.stage] }}>
                              {r.stage}
                            </span>
                          </td>
                          <td>{r.eliteScore}</td>
                          <td className="actions">
                            <button className="btn ghost" onClick={() => setWhyTicker(r)}>
                              WHY
                            </button>
                            <button className="btn ghost" onClick={() => toggleWatch(t)}>
                              Remove
                            </button>
                            <button
                              className="btn ghost"
                              onClick={() =>
                                addJournalNote({
                                  ticker: r.ticker,
                                  price: r.price,
                                  stage: r.stage,
                                  formationScore: r.formationScore,
                                  journeyScore: r.journeyScore,
                                  proofScore: r.proofScore,
                                  eliteScore: r.eliteScore,
                                  notes: `Added from Watchlist`,
                                } as any)
                              }
                            >
                              Journal
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {watchlist.length === 0 && (
                      <tr>
                        <td colSpan={5} className="muted">
                          Watchlist is empty
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "Journal" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Journal</h2>
                <div className="muted">Add notes and record observations.</div>
              </div>

              <div className="journal-form">
                <JournalForm
                  onAdd={(payload) => {
                    addJournalNote(payload as any);
                  }}
                />
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Stage</th>
                      <th>Formation</th>
                      <th>Journey</th>
                      <th>Proof</th>
                      <th>Elite</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.map((j) => (
                      <tr key={j.id}>
                        <td>{new Date(j.dateISO).toLocaleString()}</td>
                        <td className="mono">{j.ticker}</td>
                        <td>${j.price.toFixed(2)}</td>
                        <td>
                          <span className="stage" style={{ background: STAGE_COLORS[j.stage] }}>
                            {j.stage}
                          </span>
                        </td>
                        <td>{j.formationScore}</td>
                        <td>{j.journeyScore}</td>
                        <td>{j.proofScore}</td>
                        <td>{j.eliteScore}</td>
                        <td className="notes">{j.notes}</td>
                        <td className="actions">
                          <button className="btn ghost" onClick={() => deleteJournalNote(j.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {journal.length === 0 && (
                      <tr>
                        <td colSpan={10} className="muted">
                          No journal entries yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "Structure" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Manual Structure Engine</h2>
                <div className="muted">Inputs produce recommended entries, stops, targets and R:R.</div>
              </div>

              <div className="structure-grid">
                <div className="structure-left">
                  <StructureForm
                    initialTicker={structureTicker?.ticker}
                    initialPrice={structureTicker?.price}
                    initialSupport={structureTicker?.support}
                    initialResistance={structureTicker?.resistance}
                    onRun={(input) => runStructureEngine(input)}
                  />
                </div>

                <div className="structure-right">
                  <div className="panel-subhead">Outputs</div>
                  {structureResult ? (
                    <div className="results">
                      <div>
                        <strong>Range Position:</strong> {(structureResult.rangePosition * 100).toFixed(0)}%
                      </div>
                      <div>
                        <strong>Formation Entry:</strong> ${structureResult.formationEntry}
                      </div>
                      <div>
                        <strong>Aggressive Entry:</strong> ${structureResult.aggressiveEntry}
                      </div>
                      <div>
                        <strong>Confirmation Entry:</strong> ${structureResult.confirmationEntry}
                      </div>
                      <div>
                        <strong>Proof Entry:</strong> ${structureResult.proofEntry}
                      </div>
                      <div>
                        <strong>Stop:</strong> ${structureResult.stop}
                      </div>
                      <div>
                        <strong>Targets:</strong> ${structureResult.targets.t1} / ${structureResult.targets.t2} / $
                        {structureResult.targets.t3}
                      </div>
                      <div>
                        <strong>Risk-Reward (t1):</strong> {structureResult.riskReward.rr1}x
                      </div>
                      <div>
                        <strong>Notes:</strong>
                        <ul>
                          {structureResult.notes.map((n: string, i: number) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="muted">Structure must consider Support, Range Position, Journey, and Stage.</div>
                    </div>
                  ) : (
                    <div className="muted">Run the engine to compute outputs.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedPage === "News" && (
            <div className="panel">
              <div className="panel-head">
                <h2>News — Catalyst Checklist</h2>
                <div className="muted">Real catalyst checklist used to create Catalyst Score.</div>
              </div>

              <div className="news-grid">
                {[
                  "FDA",
                  "Earnings",
                  "8-K",
                  "Press Release",
                  "Offering",
                  "Reverse Split",
                  "Merger",
                  "Government Contract",
                  "Analyst Upgrade",
                  "New CEO",
                  "Partnership",
                  "Patent",
                ].map((item) => (
                  <div key={item} className="news-item">
                    <input type="checkbox" id={item} />
                    <label htmlFor={item}>{item}</label>
                  </div>
                ))}
              </div>

              <div className="muted">Catalyst Score is calculated from checked items and weighted importance.</div>
            </div>
          )}

          {selectedPage === "Help" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Help</h2>
                <div className="muted">Explanations and operating principles.</div>
              </div>

              <div className="help-grid">
                <section>
                  <h3>Scores</h3>
                  <p>
                    Formation Score — quality of formation (25% weight). Journey Score — evolution and strength over time
                    (25%). Proof Score — confirmations like support hold, breakout volume (20%). Catalyst Score — material
                    news or events (15%). Environment Score — market/sector conditions (15%).
                  </p>
                  <p>
                    Elite Score = 25% Formation + 25% Journey + 20% Proof + 15% Catalyst + 15% Environment. Final Score =
                    Elite Score.
                  </p>
                </section>

                <section>
                  <h3>Entries</h3>
                  <p>
                    Formation Entry — conservative entry when formation is validated. Aggressive Entry — early entry closer to
                    support. Confirmation Entry — after breakout confirmation. Proof Entry — after proof conditions (volume,
                    retest) are met. No proof = no trade.
                  </p>
                </section>

                <section>
                  <h3>Stages</h3>
                  <ul>
                    <li>Green: WAKING, FORMING, IGNITING, RUNNING</li>
                    <li>Yellow: SLEEPING</li>
                    <li>Red: EXTENDED, FAILING</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          {selectedPage === "Settings" && (
            <div className="panel">
              <div className="panel-head">
                <h2>Settings</h2>
                <div className="muted">Theme, refresh, market hours and toggles.</div>
              </div>

              <div className="settings-grid">
                <div className="settings-item">
                  <label>Theme</label>
                  <select defaultValue="dark" className="input">
                    <option value="dark">Dark</option>
                    <option value="light">Light (not recommended)</option>
                  </select>
                </div>

                <div className="settings-item">
                  <label>Refresh Speed</label>
                  <select defaultValue="30" className="input">
                    <option value="10">10s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                </div>

                <div className="settings-item">
                  <label>Market Hours</label>
                  <div className="muted">Premarket / Regular session toggles</div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ marginRight: 8 }}>
                      <input type="checkbox" defaultChecked /> Premarket
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked /> Regular
                    </label>
                  </div>
                </div>

                <div className="settings-item">
                  <label>Version</label>
                  <div className="muted">1.0.0</div>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer className="footer">
          <div>
            © {new Date().getFullYear()} PROOF OF STRUCTURE™ ELITE — Command Center
          </div>
          <div className="muted">SPY Trend: {marketEnvironment.spyTrend} — Environment: {marketEnvironment.color}</div>
        </footer>
      </main>

      {/* WHY modal */}
      {whyTicker && (
        <div className="modal-backdrop" onClick={() => setWhyTicker(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              WHY — {whyTicker.ticker} <span className="muted">({whyTicker.eliteScore})</span>
            </h3>

            <div className="why-columns">
              <div>
                <h4>WHY IT LIKES IT</h4>
                <ul>
                  {whyEngine(whyTicker).likes.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4>WHY IT DISLIKES IT</h4>
                <ul>
                  {whyEngine(whyTicker).dislikes.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="qa">
              <div>
                <strong>QUESTION: What proves I am right?</strong>
                <div className="muted">Look for volume spikes, support retest, confirmation entry held.</div>
              </div>
              <div>
                <strong>INVALIDATION: What proves I am wrong?</strong>
                <div className="muted">Failure to hold support, heavy distribution, negative catalyst.</div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => addJournalNote({
                ticker: whyTicker.ticker,
                price: whyTicker.price,
                stage: whyTicker.stage,
                formationScore: whyTicker.formationScore,
                journeyScore: whyTicker.journeyScore,
                proofScore: whyTicker.proofScore,
                eliteScore: whyTicker.eliteScore,
                notes: `WHY review saved.`,
              } as any)}>
                Save Note
              </button>
              <button className="btn secondary" onClick={() => setWhyTicker(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* end WHY modal */}

      <style jsx>{`
        :root {
          --bg: #0b1221;
          --panel: #0f1724;
          --muted: #93a3b6;
          --accent: #0ea5ff;
          --accent-2: #3b82f6;
          --text: #e6eef8;
          --glass: rgba(255, 255, 255, 0.03);
        }
        * {
          box-sizing: border-box;
        }
        .app {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(180deg, #071026 0%, #06121c 100%);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          font-size: 14px;
        }
        .sidebar {
          width: 260px;
          padding: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-right: 1px solid rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          transition: width 0.2s ease;
        }
        .sidebar.closed {
          width: 72px;
        }
        .brand {
          margin-bottom: 18px;
        }
        .logo {
          font-weight: 700;
          font-size: 14px;
          color: var(--accent);
          letter-spacing: 0.6px;
        }
        .subtitle {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
        }
        .nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--text);
          text-align: left;
          cursor: pointer;
        }
        .nav-item.active {
          background: linear-gradient(90deg, rgba(59,130,246,0.12), rgba(14,165,255,0.06));
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset;
        }
        .nav-label { font-size: 13px; }
        .sidebar-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--muted);
          font-size: 12px;
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .topbar {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .menu {
          background: var(--glass);
          border: none;
          color: var(--text);
          padding: 8px 10px;
          border-radius: 8px;
          margin-right: 12px;
          cursor: pointer;
        }
        .page-title {
          margin: 0 12px 0 0;
          font-size: 18px;
        }
        .small-sub {
          color: var(--muted);
          font-size: 12px;
        }
        .top-right { display: flex; gap: 12px; align-items: center; }
        .last-scan { text-align: right; margin-right: 8px; font-size: 12px; color: var(--muted); }
        .btn { padding: 8px 12px; background: transparent; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); color: var(--text); cursor: pointer; }
        .btn.primary { background: linear-gradient(90deg, var(--accent), var(--accent-2)); border: none; color: #022; font-weight: 700; }
        .btn.secondary { background: rgba(255,255,255,0.02); color: var(--text); }
        .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.03); padding: 6px 8px; font-size: 13px; }
        .content { padding: 18px; flex: 1; overflow: auto; }
        .panel { background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.01)); padding: 14px; border-radius: 10px; box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset; }
        .panel-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
        .controls { display:flex; gap:8px; align-items:center; }
        .input { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.02); color: var(--text); padding: 8px; border-radius: 8px; }
        .table-wrap { overflow:auto; border-radius: 8px; }
        .table { width: 100%; border-collapse: collapse; min-width: 1100px; }
        thead th { text-align: left; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--muted); font-size: 12px; }
        tbody td { padding: 10px; border-bottom: 1px dashed rgba(255,255,255,0.02); vertical-align: middle; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; letter-spacing: 0.6px; }
        .gain.pos { color: #16a34a; }
        .gain.neg { color: #ef4444; }
        .stage { color: #021; padding: 6px 8px; border-radius: 999px; font-weight: 700; font-size: 12px; display: inline-block; }
        .verdict { padding: 6px 8px; border-radius: 8px; font-weight: 700; }
        .verdict.yes { background: rgba(16,185,129,0.12); color: #10b981; }
        .verdict.wait { background: rgba(245,158,11,0.08); color: #f59e0b; }
        .verdict.no { background: rgba(239,68,68,0.08); color: #ef4444; }

        .actions { display:flex; gap:6px; flex-wrap:wrap; }

        .sidebar.closed .nav-label { display: none; }
        .sidebar.closed .brand .subtitle { display: none; }
        .sidebar.closed .logo { font-size: 12px; }

        .footer { padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.02); display:flex; justify-content:space-between; color: var(--muted); font-size: 12px; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,0.6); display:flex; align-items:center; justify-content:center; z-index: 1000; }
        .modal { background: var(--panel); padding: 18px; border-radius: 10px; max-width: 820px; width: 94%; box-shadow: 0 10px 30px rgba(2,6,23,0.8); }
        .why-columns { display:flex; gap: 24px; margin-top: 10px; }
        .qa { margin-top: 12px; display:flex; gap: 16px; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top: 12px; }

        /* Structure layout */
        .structure-grid { display: grid; grid-template-columns: 1fr 420px; gap: 20px; align-items: start; }
        .structure-left, .structure-right { background: rgba(255,255,255,0.01); padding: 12px; border-radius: 8px; }
        .panel-subhead { font-weight: 700; margin-bottom: 8px; }

        /* Journal form */
        .journal-form { margin-bottom: 12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .notes { max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* News grid */
        .news-grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap:8px; margin-top: 8px; }
        .news-item { display:flex; gap:8px; align-items:center; background: rgba(255,255,255,0.01); padding:8px; border-radius:8px; }

        /* Help */
        .help-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:12px; margin-top: 8px; }

        /* Settings */
        .settings-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-top: 8px; }
        .settings-item { background: rgba(255,255,255,0.01); padding: 12px; border-radius:8px; }

        /* Responsive */
        @media (max-width: 980px) {
          .sidebar { display: none; }
          .main { padding: 12px; }
          .structure-grid { grid-template-columns: 1fr; }
          .table { min-width: 900px; }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------
   Dashboard component
   --------------------------- */
function Dashboard({
  totalScanned,
  rejected,
  marketEnvironment,
  topFormation,
  topElite,
  topJourney,
  verdictLarge,
  lastScan,
}: {
  totalScanned: number;
  rejected: number;
  marketEnvironment: any;
  topFormation: any;
  topElite: any;
  topJourney: any;
  verdictLarge: "YES" | "WAIT" | "NO";
  lastScan: Date;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Command Center</h2>
        <div className="muted">Overview of system status and market environment</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div style={{ minHeight: 220 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="stat">
              <div className="muted">Status</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>Operational</div>
            </div>

            <div className="stat">
              <div className="muted">Last Scan</div>
              <div style={{ fontSize: 16 }}>{lastScan.toLocaleString()}</div>
            </div>

            <div className="stat">
              <div className="muted">Market Env</div>
              <div style={{ fontSize: 16 }}>{marketEnvironment.color}</div>
            </div>

            <div className="stat">
              <div className="muted">Total Scanned</div>
              <div style={{ fontSize: 16 }}>{totalScanned}</div>
            </div>

            <div className="stat">
              <div className="muted">Rejected</div>
              <div style={{ fontSize: 16 }}>{rejected}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Top Formation</div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              <Card title="Top Formation" body={topFormation ? `${topFormation.ticker} — ${topFormation.formationScore}` : "—"} />
              <Card title="Top Elite" body={topElite ? `${topElite.ticker} — ${topElite.eliteScore}` : "—"} />
              <Card title="Top Journey" body={topJourney ? `${topJourney.ticker} — ${topJourney.journeyScore}` : "—"} />
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Large Verdict</div>
          <div style={{ marginTop: 12, fontSize: 36, fontWeight: 800, color: verdictLarge === "YES" ? "#10b981" : verdictLarge === "NO" ? "#ef4444" : "#f59e0b" }}>
            {verdictLarge}
          </div>
          <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
            Example: Ticker YES — Environment {marketEnvironment.color}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Small Card
   --------------------------- */
function Card({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 8, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{title}</div>
      <div style={{ fontSize: 16, marginTop: 6 }}>{body}</div>
    </div>
  );
}

/* ---------------------------
   Journal Form Component
   --------------------------- */
function JournalForm({ onAdd }: { onAdd: (payload: Partial<JournalEntry>) => void }) {
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [stage, setStage] = useState<Stage>("FORMING");
  const [formationScore, setFormationScore] = useState<number>(50);
  const [journeyScore, setJourneyScore] = useState<number>(50);
  const [proofScore, setProofScore] = useState<number>(50);
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!ticker) return;
    const eliteScore = calculateEliteScore({
      formationScore,
      journeyScore,
      proofScore,
      catalystScore: 50,
      environmentScore: 50,
    });
    onAdd({
      ticker: ticker.toUpperCase(),
      price: typeof price === "number" ? price : 0,
      stage,
      formationScore,
      journeyScore,
      proofScore,
      eliteScore,
      notes,
    } as any);
    setTicker("");
    setPrice("");
    setNotes("");
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input placeholder="Ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} className="input" />
      <input placeholder="Price" value={price as any} onChange={(e) => setPrice(Number(e.target.value) || "")} className="input" />
      <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="input">
        <option>FORMING</option>
        <option>WAKING</option>
        <option>IGNITING</option>
        <option>RUNNING</option>
        <option>SLEEPING</option>
        <option>EXTENDED</option>
        <option>FAILING</option>
      </select>
      <input type="number" value={formationScore} onChange={(e) => setFormationScore(Number(e.target.value))} className="input" />
      <input type="number" value={journeyScore} onChange={(e) => setJourneyScore(Number(e.target.value))} className="input" />
      <input type="number" value={proofScore} onChange={(e) => setProofScore(Number(e.target.value))} className="input" />
      <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" style={{ minWidth: 200 }} />
      <button className="btn primary" onClick={submit}>
        Add Note
      </button>
    </div>
  );
}

/* ---------------------------
   Structure Form Component
   --------------------------- */
function StructureForm({
  initialTicker,
  initialPrice,
  initialSupport,
  initialResistance,
  onRun,
}: {
  initialTicker?: string | null;
  initialPrice?: number | null;
  initialSupport?: number | null;
  initialResistance?: number | null;
  onRun: (input: { ticker: string; currentPrice: number; support?: number; resistance?: number; stage?: Stage; journey?: number }) => any;
}) {
  const [ticker, setTicker] = useState(initialTicker ?? "");
  const [price, setPrice] = useState<number | "">(initialPrice ?? "");
  const [support, setSupport] = useState<number | "">(initialSupport ?? "");
  const [resistance, setResistance] = useState<number | "">(initialResistance ?? "");
  const [stage, setStage] = useState<Stage>("FORMING");
  const [journey, setJourney] = useState<number>(50);

  useEffect(() => {
    setTicker(initialTicker ?? "");
    setPrice(initialPrice ?? "");
    setSupport(initialSupport ?? "");
    setResistance(initialResistance ?? "");
  }, [initialTicker, initialPrice, initialSupport, initialResistance]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input placeholder="Ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="input" />
        <input placeholder="Current Price" value={price as any} onChange={(e) => setPrice(Number(e.target.value) || "")} className="input" />
        <input placeholder="Support" value={support as any} onChange={(e) => setSupport(Number(e.target.value) || "")} className="input" />
        <input placeholder="Resistance" value={resistance as any} onChange={(e) => setResistance(Number(e.target.value) || "")} className="input" />
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="input">
          <option>FORMING</option>
          <option>WAKING</option>
          <option>IGNITING</option>
          <option>RUNNING</option>
          <option>SLEEPING</option>
          <option>EXTENDED</option>
          <option>FAILING</option>
        </select>
        <input type="number" value={journey} onChange={(e) => setJourney(Number(e.target.value))} className="input" />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          className="btn primary"
          onClick={() =>
            onRun({
              ticker: ticker || "N/A",
              currentPrice: typeof price === "number" ? price : Number(price) || 0,
              support: typeof support === "number" ? support : undefined,
              resistance: typeof resistance === "number" ? resistance : undefined,
              stage,
              journey,
            })
          }
        >
          Run Structure
        </button>
        <div className="muted" style={{ alignSelf: "center" }}>
          Note: Structure must consider Support, Range Position, Journey, Stage — resistance alone must not determine entries.
        </div>
      </div>
    </div>
  );
}
