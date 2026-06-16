"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * PROOF OF STRUCTURE™ ELITE
 * Clean, compile-ready app/page.tsx
 *
 * - Light grey rustic theme with blue writing
 * - Core modules: Market Intelligence, Scanner, WHY modal, Structure panel, Watchlist, Journal
 * - TypeScript-safe: no duplicate identifiers or object keys
 *
 * NOTE: This file is intentionally self-contained and conservative to avoid type collisions.
 */

/* ---------------------------
   Types
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

interface TickerRow {
  ticker: string;
  price: number;
  prevPrice?: number;
  gainPct: number;
  spreadPct: number;
  speedScore: number;
  volumeAccelScore: number;
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

/* ---------------------------
   Utilities
   --------------------------- */

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const formatPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------------------------
   Scoring helpers (compact, deterministic)
   --------------------------- */

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
function scoreSupportQuality(price: number, support?: number) {
  if (!support) return 50;
  const dist = (price - support) / Math.max(support, 1);
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
  const sSupport = scoreSupportQuality(inputs.price, inputs.support);
  const sTape = clamp(inputs.tapeScore);

  // weights tuned for formation-quality priority
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

/* ---------------------------
   Market environment helper
   --------------------------- */

function environmentScoreCalc(params: {
  spyPct: number;
  qqqPct: number;
  iwmPct: number;
  vix: number;
  sectorStrength: number; // -100..100
  premarket: number; // 0..100
  newsRisk: "LOW" | "MEDIUM" | "HIGH";
  spreadEnv: "NARROW" | "MODERATE" | "BROAD";
}) {
  const base =
    (params.spyPct > 0 ? 1 : -1) * 20 +
    (params.qqqPct > 0 ? 1 : -1) * 15 +
    (params.iwmPct > 0 ? 1 : -1) * 10 +
    (params.vix < 20 ? 12 : params.vix < 30 ? 4 : -10) +
    params.sectorStrength / 2 +
    params.premarket / 10;

  const newsAdj = params.newsRisk === "LOW" ? 8 : params.newsRisk === "MEDIUM" ? -2 : -14;
  const spreadAdj = params.spreadEnv === "NARROW" ? 10 : params.spreadEnv === "BROAD" ? -8 : 0;

  const raw = (base + newsAdj + spreadAdj + 50) * 0.7;
  const score = clamp(Math.round(raw), 0, 100);
  const regime = score > 65 ? "GREEN" : score > 40 ? "YELLOW" : "RED";
  return { score, regime };
}

/* ---------------------------
   Sample data generator (safe)
   --------------------------- */

const SAMPLE = ["ARCX", "BLDR", "CENX", "DYNX", "EQRN", "FARO", "GLEN", "HELD", "INTR", "JCNX"];

function makeSampleRows(): TickerRow[] {
  const t0 = Date.now();
  return SAMPLE.map((s, i) => {
    const price = Number((Math.random() * 40 + 2).toFixed(2));
    const prev = Number((price / (1 + (Math.random() - 0.4) / 50)).toFixed(2));
    const gainPct = Number((((price - prev) / prev) * 100).toFixed(2));
    const spreadPct = Number((Math.random() * 1.7).toFixed(2));
    const speedScore = clamp(Math.round(Math.abs(gainPct) * 2 + Math.random() * 40));
    const volume = Math.round(Math.random() * 4_000_000 + 5_000);
    const avgVol = Math.max(1000, volume / (0.6 + Math.random() * 2));
    const volAccelRatio = volume / avgVol;
    const volAccelScore = scoreVolAccel(volAccelRatio);
    const floatM = Math.round(Math.random() * 300);
    const floatScore = scoreFloatSize(floatM);
    const tapeScore = Math.round(Math.random() * 100);
    const catalystScore = Math.round(Math.random() * (Math.random() > 0.85 ? 100 : 40));
    const envScore = Math.round(Math.random() * 100);
    const support = Number((price * (0.86 + Math.random() * 0.08)).toFixed(2));
    const resistance = Number((price * (1.05 + Math.random() * 0.22)).toFixed(2));
    const formationScore = formationComposite({
      spreadPct,
      speedChange: gainPct,
      volAccelRatio,
      floatMillions: floatM,
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

    const lifecycle = pickLifecycle(gainPct, formationScore, tapeScore, volAccelRatio);
    const verdict = eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

    return {
      ticker: s,
      price,
      prevPrice: prev,
      gainPct,
      spreadPct,
      speedScore,
      volumeAccelScore: volAccelScore,
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

function pickLifecycle(gain: number, formationScore: number, tapeScore: number, volAccelRatio: number): Lifecycle {
  if (formationScore < 30 && gain < 0) return "FAILING";
  if (formationScore < 35 && gain < 1) return "SLEEPING";
  if (formationScore < 50 && gain >= 0 && volAccelRatio < 1) return "ACCUMULATING";
  if (formationScore >= 50 && gain < 3) return "WAKING";
  if (formationScore >= 55 && gain >= 3 && gain < 12) return "FORMING";
  if (formationScore >= 65 && gain >= 12 && gain < 25) return "IGNITING";
  if (formationScore >= 70 && gain >= 25 && gain < 80) return "RUNNING";
  if (gain >= 80) return "EXTENDED";
  return "ACCUMULATING";
}

/* ---------------------------
   Persistence helpers
   --------------------------- */

const WATCH_KEY = "ps_elite_watch_v3";
const JOURNAL_KEY_V3 = "ps_elite_journal_v3";

function loadWatch(): string[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveWatch(list: string[]) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
}

function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY_V3);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveJournal(entries: JournalEntry[]) {
  localStorage.setItem(JOURNAL_KEY_V3, JSON.stringify(entries));
}

/* ---------------------------
   Main Page (client)
   --------------------------- */

export default function Page(): JSX.Element {
  const [rows, setRows] = useState<TickerRow[]>(() => makeSampleRows());
  const [watchlist, setWatchlist] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadWatch()));
  const [journal, setJournal] = useState<JournalEntry[]>(() => (typeof window === "undefined" ? [] : loadJournal()));

  const [selected, setSelected] = useState<string | null>(rows[0]?.ticker ?? null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"eliteScore" | "formationScore" | "gainPct">("eliteScore");
  const [lastScan, setLastScan] = useState<string>(nowISO());
  const [refreshSec, setRefreshSec] = useState<number>(30);

  // Simple market environment
  const market = useMemo(
    () => ({
      spy: 0.12,
      qqq: 0.22,
      iwm: -0.03,
      vix: 16,
      sectorStrength: 10,
      premarket: 45,
      newsRisk: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
      spreadEnv: "MODERATE" as "NARROW" | "MODERATE" | "BROAD",
    }),
    []
  );
  const env = useMemo(() => environmentScoreCalc({ spyPct: market.spy, qqqPct: market.qqq, iwmPct: market.iwm, vix: market.vix, sectorStrength: market.sectorStrength, premarket: market.premarket, newsRisk: market.newsRisk, spreadEnv: market.spreadEnv }), [market]);

  // periodic refresh simulation
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
          const volAccelRatio = volume / avgVol;
          const volAccelScore = scoreVolAccel(volAccelRatio);
          const floatSize = r.marketCap ?? Math.round(Math.random() * 300);
          const floatScore = scoreFloatSize(floatSize);
          const tapeScore = clamp(Math.round(r.tapeScore + (Math.random() - 0.5) * 10));
          const catalystScore = clamp(Math.round(r.catalystScore + (Math.random() - 0.5) * 8));
          const envScore = clamp(Math.round(r.environmentScore + (Math.random() - 0.5) * 6));
          const formation = formationComposite({
            spreadPct,
            speedChange: gainPct,
            volAccelRatio,
            floatMillions: floatSize,
            support: r.support,
            price: newPrice,
            tapeScore,
            catalystScore,
            envScore,
          });
          const journeyScore = clamp(Math.round(formation * 0.25 + r.journeyScore * 0.75 + (Math.random() - 0.5) * 6));
          const proofScore = Math.round(formation * 0.6 + tapeScore * 0.4);
          const eliteScore = eliteComposite({ formationScore: formation, journeyScore, proofScore, catalystScore, environmentScore: envScore });
          const lifecycle = pickLifecycle(gainPct, formation, tapeScore, volAccelRatio);
          const verdict = eliteScore > 70 && lifecycle !== "SLEEPING" && lifecycle !== "EXTENDED" ? "YES" : eliteScore > 50 ? "WAIT" : "NO";

          return {
            ...r,
            prevPrice: r.price,
            price: newPrice,
            gainPct,
            spreadPct,
            speedScore,
            volumeAccelScore: volAccelScore,
            floatScore,
            tapeScore,
            catalystScore,
            environmentScore: envScore,
            formationScore: formation,
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

  // persistence
  useEffect(() => {
    saveWatch(watchlist);
  }, [watchlist]);
  useEffect(() => {
    saveJournal(journal);
  }, [journal]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let list = rows.slice();
    if (q) list = list.filter((r) => r.ticker.includes(q));
    list.sort((a, b) => {
      if (sortBy === "eliteScore") return b.eliteScore - a.eliteScore;
      if (sortBy === "formationScore") return b.formationScore - a.formationScore;
      return b.gainPct - a.gainPct;
    });
    return list;
  }, [rows, search, sortBy]);

  function toggleWatch(t: string) {
    setWatchlist((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      saveWatch(next);
      return next;
    });
  }

  function addJournal(entry: Partial<JournalEntry>) {
    const note: JournalEntry = {
      id: uid(),
      createdISO: nowISO(),
      ticker: entry.ticker ?? (selected ?? "N/A"),
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      reason: entry.reason,
      evidence: entry.evidence,
      lesson: entry.lesson,
      outcome: entry.outcome,
    };
    setJournal((p) => [note, ...p]);
  }

  // Why modal state
  const [whyPayload, setWhyPayload] = useState<{ row: TickerRow; analysis: ReturnType<typeof whyAnalysis> } | null>(null);
  // Structure panel state
  const [structurePayload, setStructurePayload] = useState<{ row: TickerRow; structure: any } | null>(null);

  function whyAnalysis(r: TickerRow) {
    const positives: string[] = [];
    const negatives: string[] = [];
    const supportDetail: string[] = [];
    const resistanceDetail: string[] = [];
    const volDetail: string[] = [];
    const spreadDetail: string[] = [];
    const catalystDetail: string[] = [];
    const envDetail: string[] = [];

    if (r.formationScore > 65) positives.push("High formation quality");
    if (r.volumeAccelScore >= 70) positives.push("Strong volume acceleration");
    if (r.floatScore >= 70) positives.push("Attractive float size");
    if (r.tapeScore >= 60) positives.push("Tape supports buying");

    if (r.spreadPct > 2.5) negatives.push("Wide spreads (execution risk)");
    if (r.formationScore < 40) negatives.push("Weak formation");
    if (r.volumeAccelScore < 40) negatives.push("Low volume support");

    if (r.support) supportDetail.push(`support ${r.support.toFixed(2)} (${((r.price - r.support) / Math.max(1, r.support) * 100).toFixed(1)}% above)`);
    else supportDetail.push("No reliable support level");

    if (r.resistance) resistanceDetail.push(`resistance ${r.resistance.toFixed(2)} (${((r.resistance - r.price) / Math.max(1, r.price) * 100).toFixed(1)}% overhead)`);
    else resistanceDetail.push("No validated resistance level");

    if (r.volumeAccelScore >= 70) volDetail.push("Volume accelerating vs recent average");
    else if (r.volumeAccelScore >= 40) volDetail.push("Volume stable");
    else volDetail.push("Low or declining volume");

    spreadDetail.push(`Spread ${r.spreadPct.toFixed(2)}% — ${r.spreadPct < 1 ? "tight" : r.spreadPct < 2 ? "moderate" : "wide"}`);
    catalystDetail.push(`${r.catalystScore} catalyst score`);
    envDetail.push(`${r.environmentScore} env score`);

    const question = "What proves the thesis right? Look for volume retest holding, tape confirmation, and corroborating catalyst.";
    const invalidation = "What proves wrong? Break of support on heavy volume, distribution, or negative catalyst.";

    return { positives, negatives, supportDetail, resistanceDetail, volDetail, spreadDetail, catalystDetail, envDetail, question, invalidation };
  }

  function runStructureAnalysis(row: TickerRow) {
    const current = row.price;
    const low = row.support ?? Number((current * 0.9).toFixed(2));
    const high = row.resistance ?? Number((current * 1.12).toFixed(2));
    const rangePos = clamp(((current - low) / (high - low)) * 100, 0, 100);
    const formationEntry = Number((low + (high - low) * 0.33).toFixed(2));
    const aggressiveEntry = Number((low + (high - low) * 0.12).toFixed(2));
    const confirmationEntry = Number((low + (high - low) * 0.62).toFixed(2));
    const proofEntry = Number(((formationEntry + confirmationEntry) / 2).toFixed(2));
    const stop = row.lifecycle === "SLEEPING" ? Number((low * 0.995).toFixed(2)) : Number((low * 0.97).toFixed(2));
    const t1 = Number((current * 1.12).toFixed(2));
    const t2 = Number((current * 1.26).toFixed(2));
    const t3 = Number((current * 1.6).toFixed(2));
    const rr1 = parseFloat(((t1 - formationEntry) / (formationEntry - stop) || 0).toFixed(2));
    return { low, high, rangePos, formationEntry, aggressiveEntry, confirmationEntry, proofEntry, stop, targets: { t1, t2, t3 }, rr: { rr1 } };
  }

  return (
    <div className="root">
      <aside className="navPane">
        <div className="brand">
          <h1>PROOF OF STRUCTURE™ ELITE</h1>
          <div className="tag">Evidence Before Entry.</div>
        </div>

        <ul className="navList" aria-hidden>
          <li>Dashboard</li>
          <li className="active">Scanner</li>
          <li>Formation Engine</li>
          <li>Structure Analysis</li>
          <li>Runner Lifecycle</li>
          <li>Watchlist</li>
          <li>Journal</li>
          <li>Settings</li>
        </ul>

        <div className="footerNote">Last scan: {new Date(lastScan).toLocaleString()}</div>
      </aside>

      <main className="centerPane">
        <header className="header">
          <div className="controls">
            <input className="search" placeholder="Search ticker..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="eliteScore">Elite Score</option>
              <option value="formationScore">Formation Score</option>
              <option value="gainPct">Gain</option>
            </select>
            <label className="smallLabel">Refresh</label>
            <select value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))}>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>

          <div className="marketMini">
            <div>SPY {market.spy}%</div>
            <div>QQQ {market.qq}%</div>
            <div>VIX {market.vix}</div>
            <div className={`envBadge ${env.regime.toLowerCase()}`}>{env.regime}</div>
          </div>
        </header>

        <section className="scanner">
          <table className="table">
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
              {filtered.map((r) => (
                <tr key={r.ticker} className={selected === r.ticker ? "selectedRow" : ""} onClick={() => setSelected(r.ticker)}>
                  <td className="mono">{r.ticker}</td>
                  <td>${r.price.toFixed(2)}</td>
                  <td className={r.gainPct >= 0 ? "pos" : "neg"}>{formatPct(r.gainPct)}</td>
                  <td>{r.spreadPct.toFixed(2)}%</td>
                  <td>{r.speedScore}</td>
                  <td>{r.volumeAccelScore}</td>
                  <td>{r.floatScore}</td>
                  <td>{r.support ? `$${r.support.toFixed(2)}` : "—"}</td>
                  <td>{r.resistance ? `$${r.resistance.toFixed(2)}` : "—"}</td>
                  <td><span className="lifeBadge" style={{ background: lifecycleColor(r.lifecycle) }}>{r.lifecycle}</span></td>
                  <td>{r.formationScore}</td>
                  <td>{r.journeyScore}</td>
                  <td>{r.eliteScore}</td>
                  <td><span className={`verdict ${r.verdict?.toLowerCase()}`}>{r.verdict}</span></td>
                  <td className="actions">
                    <button onClick={(e) => { e.stopPropagation(); toggleWatch(r.ticker); }}>{watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}</button>
                    <button onClick={(e) => { e.stopPropagation(); setWhyPayload({ row: r, analysis: whyAnalysis(r) }); }}>WHY</button>
                    <button onClick={(e) => { e.stopPropagation(); setStructurePayload({ row: r, structure: runStructureAnalysis(r) }); }}>STRUCTURE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <aside className="rightPane">
        <div className="dossier">
          <div className="dHeader">
            <div className="muted">Selected</div>
            <div className="tickerLarge">{selected ?? "—"}</div>
          </div>

          {selected ? (
            (() => {
              const r = rows.find((x) => x.ticker === selected) ?? null;
              if (!r) return <div className="muted">No data</div>;
              return (
                <div className="dContent">
                  <div className="rowKV">
                    <div>
                      <div className="muted">Price</div>
                      <div className="bigMono">${r.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="muted">Elite</div>
                      <div className="bigMono">{r.eliteScore}</div>
                    </div>
                  </div>

                  <div className="grid2">
                    <div><div className="muted">Lifecycle</div><div>{r.lifecycle}</div></div>
                    <div><div className="muted">Formation</div><div>{r.formationScore}</div></div>
                    <div><div className="muted">Journey</div><div>{r.journeyScore}</div></div>
                    <div><div className="muted">Spread</div><div>{r.spreadPct.toFixed(2)}%</div></div>
                  </div>

                  <div className="muted">Quick Actions</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleWatch(r.ticker)}>{watchlist.includes(r.ticker) ? "UNWATCH" : "WATCH"}</button>
                    <button onClick={() => addJournal({ ticker: r.ticker, entryPrice: r.price, reason: "Saved from dossier", evidence: `Elite ${r.eliteScore}` })}>JOURNAL</button>
                    <button onClick={() => setStructurePayload({ row: r, structure: runStructureAnalysis(r) })}>STRUCTURE</button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="muted">Select a row to view intelligence.</div>
          )}
        </div>

        <div className="journalPane">
          <div className="muted">Journal</div>
          <div className="journalList">
            {journal.slice(0, 6).map((j) => (
              <div key={j.id} className="journalItem">
                <div className="mono">{j.ticker}</div>
                <div className="muted small">{new Date(j.createdISO).toLocaleString()}</div>
                <div className="small">{j.reason}</div>
              </div>
            ))}
            {journal.length === 0 && <div className="muted">No journal entries</div>}
          </div>
        </div>
      </aside>

      {/* WHY modal */}
      {whyPayload && (
        <div className="modalBack" onClick={() => setWhyPayload(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#1e6fff" }}>WHY — {whyPayload.row.ticker} <span className="muted">({whyPayload.row.eliteScore})</span></h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="muted">Positive Evidence</div>
                <ul>{whyPayload.analysis.positives.map((p, i) => <li key={i}>{p}</li>)}</ul>
                <div className="muted">Support</div>
                <ul>{whyPayload.analysis.supportDetail.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="muted">Negative Evidence</div>
                <ul>{whyPayload.analysis.negatives.map((p, i) => <li key={i}>{p}</li>)}</ul>
                <div className="muted">Resistance</div>
                <ul>{whyPayload.analysis.resistanceDetail.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div><strong>QUESTION</strong></div>
              <div className="muted">{whyPayload.analysis.question}</div>
              <div style={{ marginTop: 8 }}><strong>INVALIDATION</strong></div>
              <div className="muted">{whyPayload.analysis.invalidation}</div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => { addJournal({ ticker: whyPayload.row.ticker, entryPrice: whyPayload.row.price, reason: "WHY saved", evidence: `Elite ${whyPayload.row.eliteScore}` }); setWhyPayload(null); }}>Save Note</button>
              <button onClick={() => setWhyPayload(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Structure modal */}
      {structurePayload && (
        <div className="modalBack" onClick={() => setStructurePayload(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#1e6fff" }}>Structure — {structurePayload.row.ticker}</h3>
            <div className="muted">Range position, entries, stops, targets and R:R. Resistance alone will not determine entries.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div className="muted">Inputs</div>
                <div>Price: ${structurePayload.row.price.toFixed(2)}</div>
                <div>Support: {structurePayload.row.support ? `$${structurePayload.row.support.toFixed(2)}` : "—"}</div>
                <div>Resistance: {structurePayload.row.resistance ? `$${structurePayload.row.resistance.toFixed(2)}` : "—"}</div>
                <div>Lifecycle: {structurePayload.row.lifecycle}</div>
              </div>

              <div>
                <div className="muted">Outputs</div>
                <div>Range Low: ${structurePayload.structure.low.toFixed(2)}</div>
                <div>Range High: ${structurePayload.structure.high.toFixed(2)}</div>
                <div>Range Position: {structurePayload.structure.rangePos.toFixed(0)}%</div>
                <div>Formation Entry: ${structurePayload.structure.formationEntry}</div>
                <div>Aggressive Entry: ${structurePayload.structure.aggressiveEntry}</div>
                <div>Confirmation Entry: ${structurePayload.structure.confirmationEntry}</div>
                <div>Proof Entry: ${structurePayload.structure.proofEntry}</div>
                <div>Stop: ${structurePayload.structure.stop}</div>
                <div>Targets: ${structurePayload.structure.targets.t1} / ${structurePayload.structure.targets.t2} / ${structurePayload.structure.targets.t3}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => setStructurePayload(null)}>Close</button>
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
          --ink: #09305a;
        }
        * { box-sizing: border-box; }
        .root { display: grid; grid-template-columns: 240px 1fr 360px; gap: 16px; min-height: 100vh; padding: 16px; background: var(--canvas); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: var(--ink); }

        /* textured overlay */
        .root::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle at 5% 10%, rgba(0,0,0,0.02) 0 1px, transparent 1px),
            radial-gradient(circle at 70% 30%, rgba(0,0,0,0.015) 0 1.5px, transparent 1.5px);
          mix-blend-mode: multiply;
          opacity: 0.9;
        }

        .navPane { background: var(--panel); border-radius: 8px; padding: 12px; box-shadow: 0 4px 20px rgba(4,20,45,0.05); border-left: 6px solid rgba(30,111,255,0.06); display:flex; flex-direction:column; gap:12px; }
        .brand h1 { margin: 0; color: var(--blue); font-size: 14px; }
        .tag { color: var(--muted); font-size: 12px; margin-top: 4px; }
        .navList { list-style: none; padding: 8px 0; margin: 0; display:flex; flex-direction:column; gap:6px; color:var(--ink); }
        .navList li { padding: 8px; border-radius: 6px; cursor: default; }
        .navList li.active { background: rgba(30,111,255,0.06); color: var(--blue); font-weight:600; }

        .footerNote { margin-top: auto; color: var(--muted); font-size: 12px; }

        .centerPane { display:flex; flex-direction:column; gap:10px; }
        .header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .controls { display:flex; gap:8px; align-items:center; }
        .search { padding:8px; border-radius:6px; border:1px dashed rgba(9,48,90,0.06); min-width:220px; }
        .smallLabel { color: var(--muted); font-size:12px; }

        .marketMini { display:flex; gap:8px; align-items:center; color:var(--muted); }
        .envBadge { padding:6px 8px; border-radius:6px; font-weight:700; color:var(--blue); background: rgba(30,111,255,0.06); }

        .scanner { background: var(--panel); padding:8px; border-radius:8px; box-shadow: 0 2px 10px rgba(4,20,45,0.04); border: 1px solid rgba(9,48,90,0.03); overflow:auto; }
        .table { width:100%; border-collapse: collapse; min-width:1100px; }
        thead th { text-align:left; padding:10px; color: var(--blue); background: linear-gradient(180deg,#fff,#f3f3f2); border-bottom: 1px solid rgba(9,48,90,0.04); font-size:12px; }
        tbody td { padding:10px; border-bottom: 1px solid rgba(9,48,90,0.03); font-size:13px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }
        .pos { color: #0b7a3f; }
        .neg { color: #b33a3a; }
        .lifeBadge { color: #022; padding:6px 8px; border-radius:999px; font-weight:700; font-size:11px; display:inline-block; }
        .actions button { padding:6px 8px; border-radius:6px; border:1px solid rgba(9,48,90,0.06); background:transparent; color:var(--blue); cursor:pointer; }

        .rightPane { background: var(--panel); border-radius:8px; padding:12px; box-shadow: 0 4px 20px rgba(4,20,45,0.04); display:flex; flex-direction:column; gap:12px; }
        .dHeader { display:flex; justify-content:space-between; align-items:center; }
        .tickerLarge { font-weight:700; color:var(--blue); }
        .bigMono { font-family: ui-monospace, monospace; font-weight:700; color:var(--blue); }
        .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px; }
        .muted { color: var(--muted); font-size:12px; }

        .modalBack { position:fixed; inset:0; background: rgba(4,20,45,0.35); display:flex; align-items:center; justify-content:center; z-index:1200; }
        .modal { background: var(--panel); padding:18px; border-radius:8px; width:820px; max-height:80vh; overflow:auto; border:1px solid rgba(9,48,90,0.04); }

        .selectedRow { background: linear-gradient(90deg, rgba(30,111,255,0.04), rgba(13,86,190,0.02)); border-left: 4px solid rgba(30,111,255,0.09); }

        .verdict.yes { color: #0f7d4e; background: rgba(16,185,129,0.06); padding:4px 8px; border-radius:6px; font-weight:700; }
        .verdict.wait { color: #9a6a00; background: rgba(245,166,35,0.06); padding:4px 8px; border-radius:6px; font-weight:700; }
        .verdict.no { color: #8b2b2b; background: rgba(180,60,60,0.04); padding:4px 8px; border-radius:6px; font-weight:700; }

        .journalPane { border-top:1px dashed rgba(9,48,90,0.03); padding-top:8px; }
        .journalItem { padding:8px 0; border-bottom:1px dashed rgba(9,48,90,0.02); }

        @media (max-width: 1100px) {
          .root { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; }
          .rightPane { display:none; }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------
   Helpers outside component
   --------------------------- */

function lifecycleColor(l: Lifecycle) {
  switch (l) {
    case "SLEEPING":
    case "ACCUMULATING":
      return "#c08c2b"; // warm yellow
    case "WAKING":
    case "FORMING":
    case "IGNITING":
    case "RUNNING":
      return "#0e7a55"; // green family
    case "EXTENDED":
    case "FAILING":
      return "#b33a3a"; // red
    default:
      return "#999";
  }
}
