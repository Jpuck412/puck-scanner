"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * PROOF OF STRUCTURE™ ELITE
 * Clean, compile-ready app/page.tsx
 *
 * - React imported to avoid JSX namespace errors
 * - No duplicate identifiers or object keys
 * - Valid numeric literals only
 * - market.qqq (not market.qq)
 */

type Lifecycle =
  | "SLEEPING"
  | "ACCUMULATING"
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
  gainPct: number;
  spreadPct: number;
  speedScore: number;
  volumeAccelScore: number;
  floatSize: number;
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
  lastSeenISO: string;
}

interface JournalEntry {
  id: string;
  createdISO: string;
  ticker: string;
  entryPrice?: number;
  exitPrice?: number;
  reason?: string;
  evidence?: string;
  lesson?: string;
  outcome?: string;
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const formatPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

function scoreSpread(spreadPct: number) {
  if (spreadPct < 0.2) return 100;
  if (spreadPct < 0.6) return 88;
  if (spreadPct < 1.5) return 70;
  if (spreadPct < 3) return 50;
  return 25;
}
function scoreSpeed(changePct: number) {
  const abs = Math.abs(changePct);
  if (abs < 0.2) return 30;
  if (abs < 1) return 55;
  if (abs < 3) return 78;
  return 95;
}
function scoreVolAccel(ratio: number) {
  if (ratio < 0.6) return 20;
  if (ratio < 1) return 45;
  if (ratio < 2) return 72;
  return 94;
}
function scoreFloatSize(floatM: number) {
  if (floatM <= 0) return 40;
  if (floatM < 5) return 80;
  if (floatM < 50) return 95;
  if (floatM < 200) return 68;
  return 35;
}
function scoreSupport(price: number, support?: number) {
  if (!support) return 50;
  const dist = (price - support) / Math.max(1, support);
  if (dist < 0) return 10;
  if (dist < 0.02) return 95;
  if (dist < 0.07) return 80;
  if (dist < 0.15) return 60;
  return 40;
}

function formationComposite(inputs: {
  spreadPct: number;
  speedChange: number;
  volAccelRatio: number;
  floatMillions: number;
  support?: number;
  price: number;
  tapeScore: number;
  catalystScore: number;
  envScore: number;
}) {
  const sSpread = scoreSpread(inputs.spreadPct);
  const sSpeed = scoreSpeed(inputs.speedChange);
  const sVol = scoreVolAccel(inputs.volAccelRatio);
  const sFloat = scoreFloatSize(inputs.floatMillions);
  const sSupport = scoreSupport(inputs.price, inputs.support);
  const sTape = clamp(inputs.tapeScore);

  const formation =
    0.18 * sSpread +
    0.18 * sSpeed +
    0.18 * sVol +
    0.12 * sFloat +
    0.14 * sSupport +
    0.1 * sTape +
    0.06 * inputs.catalystScore +
    0.04 * inputs.envScore;

  return Math.round(formation * 100) / 100;
}

function eliteComposite(inputs: {
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

function computeEnv(params: {
  spyPct: number;
  qqqPct: number;
  iwmPct: number;
  vix: number;
  sectorStrength: number;
  premarket: number;
  newsRisk: "LOW" | "MEDIUM" | "HIGH";
  spreadEnv: "NARROW" | "MODERATE" | "BROAD";
}) {
  const regimeScore =
    (params.spyPct > 0 ? 1 : -1) * 20 +
    (params.qqqPct > 0 ? 1 : -1) * 15 +
    (params.iwmPct > 0 ? 1 : -1) * 10 +
    (params.vix < 20 ? 12 : params.vix < 30 ? 5 : -10) +
    params.sectorStrength / 2 +
    params.premarket / 10;

  const newsAdj = params.newsRisk === "LOW" ? 8 : params.newsRisk === "MEDIUM" ? -2 : -14;
  const spreadAdj = params.spreadEnv === "NARROW" ? 10 : params.spreadEnv === "BROAD" ? -8 : 0;

  const raw = (regimeScore + newsAdj + spreadAdj + 50) * 0.7;
  const score = clamp(Math.round(raw), 0, 100);
  const color = score > 65 ? "GREEN" : score > 40 ? "YELLOW" : "RED";
  return { score, color } as const;
}

const SAMPLE_TICKERS = ["ARCX", "BLDR", "CENX", "DYNX", "EQRN", "FARO", "GLEN", "HELD"];

function makeSampleRows(): TickerRow[] {
  const t0 = Date.now();
  return SAMPLE_TICKERS.map((t, i) => {
    const price = Number((Math.random() * 40 + 2).toFixed(2));
    const prev = Number((price / (1 + (Math.random() - 0.4) / 50)).toFixed(2));
    const gainPct = Number((((price - prev) / prev) * 100).toFixed(2));
    const spreadPct = Number((Math.random() * 1.5).toFixed(2));
    const speedScore = clamp(Math.round(Math.abs(gainPct) * 2 + Math.random() * 40));
    const volume = Math.round(Math.random() * 4_000_000 + 5_000);
    const avgVol = Math.max(1000, volume / (0.6 + Math.random() * 2));
    const volRatio = volume / avgVol;
    const volAccelScore = scoreVolAccel(volRatio);
    const floatSize = Math.round(Math.random() * 300);
    const floatScore = scoreFloatSize(floatSize);
    const tapeScore = Math.round(Math.random() * 100);
    const catalystScore = Math.round(Math.random() * (Math.random() > 0.85 ? 100 : 40));
    const envScore = Math.round(Math.random() * 100);
    const support = Number((price * (0.86 + Math.random() * 0.08)).toFixed(2));
    const resistance = Number((price * (1.05 + Math.random() * 0.22)).toFixed(2));
    const formationScore = formationComposite({
      spreadPct,
      speedChange: gainPct,
      volAccelRatio: volRatio,
      floatMillions: floatSize,
      support,
      price,
      tapeScore,
      catalystScore,
      envScore,
    });
    const journeyScore = clamp(Math.round(formationScore * 0.3 + Math.random() * 40));
    const proofScore = Math.round((formationScore * 0.6 + tapeScore * 0.4));
    const eliteScore = eliteComposite({
      formationScore,
      journeyScore,
      proofScore,
      catalystScore,
      environmentScore: envScore,
    });
    const lifecycle = pickLifecycle(gainPct, formationScore, tapeScore, volRatio);
    const verdict = eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

    return {
      ticker: t,
      price,
      prevPrice: prev,
      gainPct,
      spreadPct,
      speedScore,
      volumeAccelScore: volAccelScore,
      floatSize,
      floatScore,
      support,
      resistance,
      tapeScore,
      catalystScore,
      environmentScore: envScore,
      formationScore,
      journeyScore,
      eliteScore,
      lifecycle,
      volume,
      marketCap: Math.round(Math.random() * 2000),
      verdict,
      lastSeenISO: new Date(t0 - i * 3600 * 1000).toISOString(),
    };
  });
}

function pickLifecycle(gain: number, formation: number, tape: number, volRatio: number): Lifecycle {
  if (formation < 30 && gain < 0) return "FAILING";
  if (formation < 35 && gain < 1) return "SLEEPING";
  if (formation < 50 && gain >= 0 && volRatio < 1) return "ACCUMULATING";
  if (formation >= 50 && gain < 3) return "WAKING";
  if (formation >= 55 && gain >= 3 && gain < 12) return "FORMING";
  if (formation >= 65 && gain >= 12 && gain < 25) return "IGNITING";
  if (formation >= 70 && gain >= 25 && gain < 80) return "RUNNING";
  if (gain >= 80) return "EXTENDED";
  return "ACCUMULATING";
}

const WATCH_KEY = "ps_elite_watch_v1";
const JOURNAL_KEY = "ps_elite_journal_v1";

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
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

function lifecycleColor(l: Lifecycle) {
  switch (l) {
    case "SLEEPING":
    case "ACCUMULATING":
      return "#c08c2b";
    case "WAKING":
    case "FORMING":
    case "IGNITING":
    case "RUNNING":
      return "#0e7a55";
    case "EXTENDED":
    case "FAILING":
      return "#b33a3a";
    default:
      return "#999";
  }
}

export default function Page(): React.ReactElement {
  const [rows, setRows] = useState<TickerRow[]>(() => makeSampleRows());
  const [watchlist, setWatchlist] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadWatchlist()));
  const [journal, setJournal] = useState<JournalEntry[]>(() => (typeof window === "undefined" ? [] : loadJournal()));

  const [selectedTicker, setSelectedTicker] = useState<string | null>(rows[0]?.ticker ?? null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"eliteScore" | "formationScore" | "gainPct">("eliteScore");
  const [refreshSec, setRefreshSec] = useState<number>(30);
  const [lastScan, setLastScan] = useState<string>(nowISO());

  const market = useMemo(
    () => ({ spy: 0.12, qqq: 0.22, iwm: -0.03, vix: 16, sectorStrength: 10, premarket: 45, newsRisk: "MEDIUM" as const, spreadEnv: "MODERATE" as const }),
    []
  );
  const env = useMemo(() => computeEnv({ spyPct: market.spy, qqqPct: market.qqq, iwmPct: market.iwm, vix: market.vix, sectorStrength: market.sectorStrength, premarket: market.premarket, newsRisk: market.newsRisk, spreadEnv: market.spreadEnv }), [market]);

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          const drift = (Math.random() - 0.45) * 0.9;
          const newPrice = Number((r.price * (1 + drift / 100)).toFixed(2));
          const gainPct = Number((((newPrice - (r.prevPrice ?? r.price)) / (r.prevPrice ?? r.price)) * 100).toFixed(2));
          const spreadPct = clamp(r.spreadPct * (1 + (Math.random() - 0.5) * 0.2), 0.05, 5);
          const speedScore = clamp(Math.round(r.speedScore + (Math.random() - 0.5) * 8));
          const volume = Math.max(1000, Math.round(r.volume * (1 + (Math.random() - 0.4) * 0.12)));
          const avgVol = Math.max(1000, Math.round(volume / (0.8 + Math.random() * 1.8)));
          const volRatio = volume / avgVol;
          const volAccel = scoreVolAccel(volRatio);
          const floatSize = r.floatSize ?? Math.round(Math.random() * 300);
          const floatScore = scoreFloatSize(floatSize);
          const tapeScore = clamp(Math.round(r.tapeScore + (Math.random() - 0.5) * 10));
          const catalystScore = clamp(Math.round(r.catalystScore + (Math.random() - 0.5) * 8));
          const envScore = clamp(Math.round(r.environmentScore + (Math.random() - 0.5) * 6));
          const formationScore = formationComposite({
            spreadPct,
            speedChange: gainPct,
            volAccelRatio: volRatio,
            floatMillions: floatSize,
            support: r.support,
            price: newPrice,
            tapeScore,
            catalystScore,
            envScore,
          });
          const journeyScore = clamp(Math.round(formationScore * 0.25 + r.journeyScore * 0.75 + (Math.random() - 0.5) * 6));
          const proofScore = Math.round(formationScore * 0.6 + tapeScore * 0.4);
          const eliteScore = eliteComposite({ formationScore, journeyScore, proofScore, catalystScore, environmentScore: envScore });
          const lifecycle = pickLifecycle(gainPct, formationScore, tapeScore, volRatio);
          const verdict = eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

          return {
            ...r,
            prevPrice: r.price,
            price: newPrice,
            gainPct,
            spreadPct,
            speedScore,
            volumeAccelScore: volAccel,
            floatSize,
            floatScore,
            tapeScore,
            catalystScore,
            environmentScore: envScore,
            formationScore,
            journeyScore,
            eliteScore,
            lifecycle,
            volume,
            verdict,
            lastSeenISO: nowISO(),
          };
        })
      );
      setLastScan(nowISO());
    }, refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec]);

  useEffect(() => saveWatchlist(watchlist), [watchlist]);
  useEffect(() => saveJournal(journal), [journal]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let list = rows.slice();
    if (q) list = list.filter((r) => r.ticker.includes(q));
    list.sort((a, b) => {
      if (sortKey === "eliteScore") return b.eliteScore - a.eliteScore;
      if (sortKey === "formationScore") return b.formationScore - a.formationScore;
      return b.gainPct - a.gainPct;
    });
    return list;
  }, [rows, search, sortKey]);

  const [whyState, setWhyState] = useState<{ row: TickerRow; analysis: ReturnType<typeof whyAnalyze> } | null>(null);
  const [structureState, setStructureState] = useState<{ row: TickerRow; out: ReturnType<typeof runStructure> } | null>(null);

  function toggleWatch(ticker: string) {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((p) => p !== ticker) : [...prev, ticker];
      saveWatchlist(next);
      return next;
    });
  }

  function addJournalEntry(entry: Partial<JournalEntry>) {
    const e: JournalEntry = {
      id: uid(),
      createdISO: nowISO(),
      ticker: entry.ticker ?? (selectedTicker ?? "N/A"),
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      reason: entry.reason,
      evidence: entry.evidence,
      lesson: entry.lesson,
      outcome: entry.outcome,
    };
    setJournal((p) => [e, ...p]);
  }

  function whyAnalyze(r: TickerRow) {
    const positives: string[] = [];
    const negatives: string[] = [];
    const support: string[] = [];
    const resistance: string[] = [];

    if (r.formationScore > 65) positives.push("High formation quality");
    if (r.volumeAccelScore >= 70) positives.push("Volume accelerating");
    if (r.floatScore >= 70) positives.push("Attractive float");
    if (r.tapeScore >= 60) positives.push("Tape supports buying");

    if (r.spreadPct > 2.5) negatives.push("Wide spreads — execution risk");
    if (r.formationScore < 40) negatives.push("Weak formation");
    if (r.volumeAccelScore < 40) negatives.push("Low volume support");

    support.push(r.support ? `Support ${r.support.toFixed(2)} (${((r.price - r.support) / Math.max(1, r.support) * 100).toFixed(1)}% above)` : "No validated support");
    resistance.push(r.resistance ? `Resistance ${r.resistance.toFixed(2)} (${((r.resistance - r.price) / Math.max(1, r.price) * 100).toFixed(1)}% overhead)` : "No validated resistance");

    const question = "What proves this thesis? Look for retained support, increasing volume, and tape confirmation.";
    const invalidation = "What proves this wrong? Support break on heavy volume or negative catalyst.";

    return { positives, negatives, support, resistance, question, invalidation } as const;
  }

  function runStructure(r: TickerRow) {
    const cur = r.price;
    const low = r.support ?? Number((cur * 0.9).toFixed(2));
    const high = r.resistance ?? Number((cur * 1.12).toFixed(2));
    const rangePos = clamp(((cur - low) / (high - low)) * 100, 0, 100);
    const formationEntry = Number((low + (high - low) * 0.33).toFixed(2));
    const aggressiveEntry = Number((low + (high - low) * 0.12).toFixed(2));
    const confirmationEntry = Number((low + (high - low) * 0.62).toFixed(2));
    const proofEntry = Number(((formationEntry + confirmationEntry) / 2).toFixed(2));
    const stop = r.lifecycle === "SLEEPING" ? Number((low * 0.995).toFixed(2)) : Number((low * 0.97).toFixed(2));
    const t1 = Number((cur * 1.12).toFixed(2));
    const t2 = Number((cur * 1.26).toFixed(2));
    const t3 = Number((cur * 1.6).toFixed(2));
    const rr1 = parseFloat(((t1 - formationEntry) / (formationEntry - stop) || 0).toFixed(2));
    return { low, high, rangePos, formationEntry, aggressiveEntry, confirmationEntry, proofEntry, stop, targets: { t1, t2, t3 }, rr1 } as const;
  }

  return (
    <div className="app">
      <aside className="left">
        <div className="brand">
          <div className="title">PROOF OF STRUCTURE™ ELITE</div>
          <div className="tag">Evidence Before Entry.</div>
        </div>
        <nav className="nav">
          <div className="nav-item">Dashboard</div>
          <div className="nav-item active">Scanner</div>
          <div className="nav-item">Formation</div>
          <div className="nav-item">Structure</div>
          <div className="nav-item">Lifecycle</div>
          <div className="nav-item">Watchlist</div>
          <div className="nav-item">Journal</div>
          <div className="nav-item">Settings</div>
        </nav>
        <div className="footer">Last scan: {new Date(lastScan).toLocaleString()}</div>
      </aside>

      <main className="center">
        <header className="header">
          <div className="controls">
            <input className="search" placeholder="Search ticker..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="eliteScore">Elite Score</option>
              <option value="formationScore">Formation</option>
              <option value="gainPct">Gain</option>
            </select>
            <label className="muted">Refresh</label>
            <select value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))}>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <div className="market">
            <div>SPY {market.spy}%</div>
            <div>QQQ {market.qqq}%</div>
            <div className="env">{env.color}</div>
          </div>
        </header>

        <section className="scanner">
          <table className="table" aria-label="Scanner table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>Gain</th>
                <th>Spread</th>
                <th>Speed</th>
                <th>VolAccel</th>
                <th>Float</th>
                <th>Support</th>
                <th>Resistance</th>
                <th>Lifecycle</th>
                <th>Formation</th>
                <th>Journey</th>
                <th>Elite</th>
                <th>Verdict</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sel = r.ticker === selectedTicker;
                return (
                  <tr key={r.ticker} className={sel ? "selected" : ""} onClick={() => setSelectedTicker(r.ticker)}>
                    <td className="mono">{r.ticker}</td>
                    <td>${r.price.toFixed(2)}</td>
                    <td className={r.gainPct >= 0 ? "pos" : "neg"}>{formatPct(r.gainPct)}</td>
                    <td>{r.spreadPct.toFixed(2)}%</td>
                    <td>{r.speedScore}</td>
                    <td>{r.volumeAccelScore}</td>
                    <td>{r.floatScore}</td>
                    <td>{r.support ? `$${r.support.toFixed(2)}` : "—"}</td>
                    <td>{r.resistance ? `$${r.resistance.toFixed(2)}` : "—"}</td>
                    <td><span className="life" style={{ background: lifecycleColor(r.lifecycle) }}>{r.lifecycle}</span></td>
                    <td>{r.formationScore}</td>
                    <td>{r.journeyScore}</td>
                    <td>{r.eliteScore}</td>
                    <td><span className={`verdict ${r.verdict?.toLowerCase()}`}>{r.verdict}</span></td>
                    <td className="actions">
                      <button onClick={(e) => { e.stopPropagation(); toggleWatch(r.ticker); }}>{watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}</button>
                      <button onClick={(e) => { e.stopPropagation(); setWhyState({ row: r, analysis: whyAnalyze(r) }); }}>WHY</button>
                      <button onClick={(e) => { e.stopPropagation(); setStructureState({ row: r, out: runStructure(r) }); }}>STRUCTURE</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>

      <aside className="right">
        <div className="dossier">
          <div className="muted">Selected</div>
          <div className="ticker">{selectedTicker ?? "—"}</div>
          {selectedTicker ? (() => {
            const r = rows.find((x) => x.ticker === selectedTicker) ?? null;
            if (!r) return <div className="muted">No data</div>;
            return (
              <>
                <div className="kv">
                  <div><div className="muted">Price</div><div className="big mono">${r.price.toFixed(2)}</div></div>
                  <div><div className="muted">Elite</div><div className="big mono">{r.eliteScore}</div></div>
                </div>
                <div className="grid2">
                  <div><div className="muted">Lifecycle</div><div>{r.lifecycle}</div></div>
                  <div><div className="muted">Formation</div><div>{r.formationScore}</div></div>
                  <div><div className="muted">Journey</div><div>{r.journeyScore}</div></div>
                  <div><div className="muted">Spread</div><div>{r.spreadPct.toFixed(2)}%</div></div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={() => toggleWatch(r.ticker)}>{watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}</button>
                  <button onClick={() => addJournalEntry({ ticker: r.ticker, entryPrice: r.price, reason: "Saved from dossier", evidence: `Elite ${r.eliteScore}` })}>JOURNAL</button>
                  <button onClick={() => setStructureState({ row: r, out: runStructure(r) })}>STRUCTURE</button>
                </div>
              </>
            );
          })() : <div className="muted">Select a row</div>}
        </div>

        <div className="journal">
          <div className="muted">Journal</div>
          <div>
            {journal.slice(0, 6).map((j) => (
              <div key={j.id} className="jItem">
                <div className="mono">{j.ticker}</div>
                <div className="muted small">{new Date(j.createdISO).toLocaleString()}</div>
                <div className="small">{j.reason}</div>
              </div>
            ))}
            {journal.length === 0 && <div className="muted">No entries</div>}
          </div>
        </div>
      </aside>

      {whyState && (
        <div className="modalBack" onClick={() => setWhyState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#1e6fff" }}>WHY — {whyState.row.ticker} <span className="muted">({whyState.row.eliteScore})</span></h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="muted">Positive Evidence</div>
                <ul>{whyState.analysis.positives.map((p, i) => <li key={i}>{p}</li>)}</ul>
                <div className="muted">Support</div>
                <ul>{whyState.analysis.support.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="muted">Negative Evidence</div>
                <ul>{whyState.analysis.negatives.map((p, i) => <li key={i}>{p}</li>)}</ul>
                <div className="muted">Resistance</div>
                <ul>{whyState.analysis.resistance.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div><strong>QUESTION</strong></div>
              <div className="muted" style={{ marginBottom: 6 }}>{whyState.analysis.question}</div>
              <div><strong>INVALIDATION</strong></div>
              <div className="muted">{whyState.analysis.invalidation}</div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => { addJournalEntry({ ticker: whyState.row.ticker, entryPrice: whyState.row.price, reason: "WHY saved", evidence: `Elite ${whyState.row.eliteScore}` }); setWhyState(null); }}>Save Note</button>
              <button onClick={() => setWhyState(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {structureState && (
        <div className="modalBack" onClick={() => setStructureState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#1e6fff" }}>Structure — {structureState.row.ticker}</h3>
            <div className="muted">Range position, entries, stops, targets. Resistance alone will not determine entries.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div className="muted">Inputs</div>
                <div>Price: ${structureState.row.price.toFixed(2)}</div>
                <div>Support: {structureState.row.support ? `$${structureState.row.support.toFixed(2)}` : "—"}</div>
                <div>Resistance: {structureState.row.resistance ? `$${structureState.row.resistance.toFixed(2)}` : "—"}</div>
                <div>Lifecycle: {structureState.row.lifecycle}</div>
              </div>

              <div>
                <div className="muted">Outputs</div>
                <div>Range Low: ${structureState.out.low.toFixed(2)}</div>
                <div>Range High: ${structureState.out.high.toFixed(2)}</div>
                <div>Range Pos: {structureState.out.rangePos.toFixed(0)}%</div>
                <div>Formation Entry: ${structureState.out.formationEntry}</div>
                <div>Aggressive Entry: ${structureState.out.aggressiveEntry}</div>
                <div>Confirmation Entry: ${structureState.out.confirmationEntry}</div>
                <div>Proof Entry: ${structureState.out.proofEntry}</div>
                <div>Stop: ${structureState.out.stop}</div>
                <div>Targets: ${structureState.out.targets.t1} / ${structureState.out.targets.t2} / ${structureState.out.targets.t3}</div>
                <div>R:R (t1): {structureState.out.rr1}x</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => setStructureState(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :root {
          --canvas: #e9e8e6;
          --panel: #f7f6f4;
          --muted: #6b7786;
          --blue: #1e6fff;
          --ink: #08306b;
        }
        * { box-sizing: border-box; }
        .app { display:grid; grid-template-columns: 240px 1fr 360px; gap:16px; min-height:100vh; padding:16px; background:var(--canvas); color:var(--ink); font-family:Inter,system-ui,Segoe UI,Roboto,Arial; }

        .app::before { content:""; position:fixed; inset:0; pointer-events:none; background-image: radial-gradient(circle at 5% 10%, rgba(0,0,0,0.02) 0 1px, transparent 1px), radial-gradient(circle at 70% 30%, rgba(0,0,0,0.015) 0 1.5px, transparent 1.5px); mix-blend-mode:multiply; opacity:0.9; }

        .left { background:var(--panel); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:12px; box-shadow:0 6px 20px rgba(4,20,45,0.05); border-left:6px solid rgba(30,111,255,0.06); }
        .title { color:var(--blue); font-weight:700; font-size:14px; }
        .tag { color:var(--muted); font-size:12px; margin-top:4px; }
        .nav { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
        .nav-item { padding:8px; border-radius:6px; }
        .nav-item.active { background: rgba(30,111,255,0.06); color:var(--blue); font-weight:600; }
        .footer { margin-top:auto; color:var(--muted); font-size:12px; }

        .center { display:flex; flex-direction:column; gap:10px; }
        .header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .controls { display:flex; gap:8px; align-items:center; }
        .search { padding:8px; border-radius:6px; border:1px dashed rgba(9,48,90,0.06); min-width:220px; }
        .market { display:flex; gap:8px; color:var(--muted); }
        .env { padding:6px 8px; border-radius:6px; color:var(--blue); background: rgba(30,111,255,0.06); font-weight:700; }

        .scanner { background:var(--panel); padding:8px; border-radius:8px; box-shadow:0 2px 10px rgba(4,20,45,0.04); border:1px solid rgba(9,48,90,0.03); overflow:auto; }
        .table { width:100%; border-collapse:collapse; min-width:1100px; }
        thead th { text-align:left; padding:10px; color:var(--blue); background:linear-gradient(180deg,#fff,#f3f3f2); border-bottom:1px solid rgba(9,48,90,0.04); font-size:12px; }
        tbody td { padding:10px; border-bottom:1px solid rgba(9,48,90,0.03); font-size:13px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }
        .pos { color:#0b7a3f; }
        .neg { color:#b33a3a; }
        .life { padding:6px 8px; border-radius:999px; font-weight:700; font-size:11px; }
        .actions button { padding:6px 8px; border-radius:6px; border:1px solid rgba(9,48,90,0.06); background:transparent; color:var(--blue); cursor:pointer; }

        .right { background:var(--panel); padding:12px; border-radius:8px; box-shadow:0 4px 20px rgba(4,20,45,0.04); display:flex; flex-direction:column; gap:12px; }
        .ticker { color:var(--blue); font-weight:700; font-size:18px; }
        .big { font-weight:700; font-size:16px; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
        .muted { color:var(--muted); font-size:12px; }
        .small { font-size:12px; }

        .modalBack { position:fixed; inset:0; background: rgba(4,20,45,0.35); display:flex; align-items:center; justify-content:center; z-index:1200; }
        .modal { background:var(--panel); padding:18px; border-radius:8px; width:820px; max-height:80vh; overflow:auto; border:1px solid rgba(9,48,90,0.04); }

        .selected { background: linear-gradient(90deg, rgba(30,111,255,0.04), rgba(13,86,190,0.02)); border-left: 4px solid rgba(30,111,255,0.09); }

        .verdict.yes { color:#0f7d4e; background: rgba(16,185,129,0.06); padding:4px 8px; border-radius:6px; font-weight:700; }
        .verdict.wait { color:#9a6a00; background: rgba(245,166,35,0.06); padding:4px 8px; border-radius:6px; font-weight:700; }
        .verdict.no { color:#8b2b2b; background: rgba(180,60,60,0.04); padding:4px 8px; border-radius:6px; font-weight:700; }

        .jItem { padding:8px 0; border-bottom:1px dashed rgba(9,48,90,0.02); }

        @media (max-width: 1100px) {
          .app { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; }
          .right { display:none; }
        }
      `}</style>
    </div>
  );
}
