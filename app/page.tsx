// app/elite/page.tsx
// Branch: elite-dev-v2
// PROOF OF STRUCTURE™ ELITE - Single-file drop-in for Phase 1 foundation
// Assumes existing API routes in repo: /api/scanner, /api/market-intel
'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* ============================
   Types
   ============================ */

type ConnectionStatus = 'connected' | 'disconnected';

interface DataHealth {
  status: ConnectionStatus;
  lastUpdate: Date | null;
  dataAgeMs: number | null;
  errorMessage?: string;
}

type RunnerLifecycle =
  | 'SLEEPING'
  | 'ACCUMULATING'
  | 'WAKING'
  | 'FORMING'
  | 'IGNITING'
  | 'RUNNING'
  | 'EXTENDED'
  | 'FAILING';

interface ScannerRow {
  ticker: string;
  price: number;
  gainPct: number;
  spreadPct: number;
  speedScore: number;
  volumeAcceleration: number;
  floatShares: number;
  supportLevel: number | null;
  resistanceLevel: number | null;
  lifecycle: RunnerLifecycle;
  formationScore: number | null;
  journeyScore: number | null;
  proofScore: number | null;
  catalystScore: number | null;
  environmentScore: number | null;
  eliteScore: number | null;
  verdict?: string;
}

interface ScannerSnapshot {
  rows: ScannerRow[];
  health: DataHealth;
}

interface MarketIndex {
  symbol: 'SPY' | 'QQQ' | 'IWM' | 'VIX';
  lastPrice: number;
  changePct: number;
}

interface MarketIntelSnapshot {
  indices: MarketIndex[];
  sectorStrength: number | null;
  marketBreadth: number | null;
  premarketParticipation: number | null;
  newsRisk: number | null;
  spreadEnvironment: number | null;
  marketRegime: string | null;
  environmentScore: number | null;
  health: DataHealth;
}

interface WatchlistItem {
  ticker: string;
  notes: string;
  status: string;
  lifecycle: RunnerLifecycle;
  eliteScore: number | null;
}

interface JournalEntry {
  id: string;
  date: string;
  time: string;
  ticker: string;
  entry: string;
  exit: string;
  reason: string;
  evidence: string;
  mistake: string;
  lesson: string;
  outcome: string;
}

/* ============================
   Theme
   ============================ */

const theme = {
  background: '#20242B',
  panel: '#2A2F38',
  border: '#3A404C',
  textPrimary: '#E6EAF0',
  textSecondary: '#9AA4B2',
  accentBlue: '#4DA3FF',
  success: '#00D084',
  warning: '#FFB547',
  danger: '#FF5C5C',
};

/* ============================
   Scoring Engine
   ============================ */

interface ScoringInput {
  spreadPct: number;
  speedScore: number;
  volumeAcceleration: number;
  floatShares: number;
  supportScore: number;
  catalystScore: number;
  environmentScore: number;
  journeyScore: number;
}

interface ScoringOutput {
  spreadScore: number;
  speedScore: number;
  volumeAccelerationScore: number;
  floatScore: number;
  supportScore: number;
  catalystScore: number;
  environmentScore: number;
  journeyScore: number;
  formationScore: number;
  proofScore: number;
  eliteScore: number;
}

function computeScoring(input: ScoringInput): ScoringOutput {
  const spreadScore = Math.max(0, Math.min(100, 100 - Math.abs(input.spreadPct) * 8));
  const speedScore = Math.max(0, Math.min(100, input.speedScore));
  const volumeAccelerationScore = Math.max(0, Math.min(100, input.volumeAcceleration * 20));
  const floatScore =
    input.floatShares > 0 ? Math.max(0, Math.min(100, (50_000_000 / input.floatShares) * 100)) : 0;
  const supportScore = Math.max(0, Math.min(100, input.supportScore));
  const catalystScore = Math.max(0, Math.min(100, input.catalystScore));
  const environmentScore = Math.max(0, Math.min(100, input.environmentScore));
  const journeyScore = Math.max(0, Math.min(100, input.journeyScore));

  const formationScore = Math.round(
    (spreadScore * 0.2 + speedScore * 0.2 + volumeAccelerationScore * 0.2 + supportScore * 0.2 + floatScore * 0.2) / 1,
  );

  const proofScore = Math.round(
    (formationScore * 0.4 + catalystScore * 0.2 + environmentScore * 0.2 + journeyScore * 0.2) / 1,
  );

  const eliteScore = Math.round(
    spreadScore * 0.2 +
      speedScore * 0.2 +
      volumeAccelerationScore * 0.2 +
      floatScore * 0.1 +
      supportScore * 0.1 +
      catalystScore * 0.1 +
      environmentScore * 0.1 +
      journeyScore * 0.1,
  );

  return {
    spreadScore,
    speedScore,
    volumeAccelerationScore,
    floatScore,
    supportScore,
    catalystScore,
    environmentScore,
    journeyScore,
    formationScore,
    proofScore,
    eliteScore,
  };
}

/* ============================
   Lifecycle Engine
   ============================ */

function inferLifecycle(row: ScannerRow): RunnerLifecycle {
  const g = row.gainPct;
  const v = row.volumeAcceleration;
  const s = row.speedScore;

  if (g < -5) return 'FAILING';
  if (g > 15 && v > 2 && s > 80) return 'RUNNING';
  if (g > 10 && v > 1.5) return 'IGNITING';
  if (g > 5 && v > 1) return 'FORMING';
  if (g > 2) return 'WAKING';
  if (v > 0.5) return 'ACCUMULATING';
  return 'SLEEPING';
}

/* ============================
   Structure Analysis
   ============================ */

interface StructureAnalysis {
  support: number | null;
  resistance: number | null;
  rangePosition: string;
  formationEntry: number | null;
  aggressiveEntry: number | null;
  confirmationEntry: number | null;
  proofEntry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  riskReward: string;
}

function analyzeStructure(row: ScannerRow): StructureAnalysis {
  const { price, supportLevel, resistanceLevel } = row;

  const support = supportLevel ?? null;
  const resistance = resistanceLevel ?? null;

  let rangePosition = 'Unknown';
  if (support != null && resistance != null) {
    const range = resistance - support;
    const pos = price - support;
    const pct = range > 0 ? (pos / range) * 100 : 0;
    if (pct < 25) rangePosition = 'Lower Quartile';
    else if (pct < 50) rangePosition = 'Lower Half';
    else if (pct < 75) rangePosition = 'Upper Half';
    else rangePosition = 'Upper Quartile';
  }

  const formationEntry = support != null ? support + (price - support) * 0.25 : null;
  const aggressiveEntry = support != null ? support + (price - support) * 0.1 : null;
  const confirmationEntry = resistance != null ? resistance - (resistance - price) * 0.2 : null;
  const proofEntry = resistance != null ? resistance + (resistance - price) * 0.1 : null;

  const stop = support != null ? support * 0.98 : null;
  const target1 = resistance != null ? resistance * 1.02 : null;
  const target2 = resistance != null ? resistance * 1.05 : null;
  const target3 = resistance != null ? resistance * 1.1 : null;

  let riskReward = 'Unknown';
  if (stop != null && target1 != null) {
    const risk = price - stop;
    const reward = target1 - price;
    if (risk > 0) {
      const rr = reward / risk;
      riskReward = `${rr.toFixed(2)}R`;
    }
  }

  return {
    support,
    resistance,
    rangePosition,
    formationEntry,
    aggressiveEntry,
    confirmationEntry,
    proofEntry,
    stop,
    target1,
    target2,
    target3,
    riskReward,
  };
}

/* ============================
   Hooks: Scanner & Market Intel
   ============================ */

function initialHealth(label: string): DataHealth {
  return {
    status: 'disconnected',
    lastUpdate: null,
    dataAgeMs: null,
    errorMessage: `${label} disconnected`,
  };
}

function useScanner(): ScannerSnapshot {
  const [snapshot, setSnapshot] = useState<ScannerSnapshot>({
    rows: [],
    health: initialHealth('Scanner'),
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/scanner', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const now = new Date();

        const rows: ScannerRow[] = (json.rows ?? []).map((r: any) => {
          const base: ScannerRow = {
            ticker: r.ticker,
            price: Number(r.price),
            gainPct: Number(r.gainPct),
            spreadPct: Number(r.spreadPct),
            speedScore: Number(r.speedScore),
            volumeAcceleration: Number(r.volumeAcceleration),
            floatShares: Number(r.floatShares),
            supportLevel: r.supportLevel != null ? Number(r.supportLevel) : null,
            resistanceLevel: r.resistanceLevel != null ? Number(r.resistanceLevel) : null,
            lifecycle: 'SLEEPING',
            formationScore: r.formationScore != null ? Number(r.formationScore) : null,
            journeyScore: r.journeyScore != null ? Number(r.journeyScore) : null,
            proofScore: r.proofScore != null ? Number(r.proofScore) : null,
            catalystScore: r.catalystScore != null ? Number(r.catalystScore) : null,
            environmentScore: r.environmentScore != null ? Number(r.environmentScore) : null,
            eliteScore: null,
            verdict: r.verdict,
          };

          const lifecycle = inferLifecycle(base);

          const scoring = computeScoring({
            spreadPct: base.spreadPct,
            speedScore: base.speedScore,
            volumeAcceleration: base.volumeAcceleration,
            floatShares: base.floatShares,
            supportScore: base.supportLevel != null ? 80 : 40,
            catalystScore: base.catalystScore ?? 0,
            environmentScore: base.environmentScore ?? 50,
            journeyScore: base.journeyScore ?? 50,
          });

          return {
            ...base,
            lifecycle,
            formationScore: scoring.formationScore,
            proofScore: scoring.proofScore,
            eliteScore: scoring.eliteScore,
          };
        });

        if (!cancelled) {
          setSnapshot({
            rows,
            health: {
              status: 'connected',
              lastUpdate: now,
              dataAgeMs: json.dataAgeMs ?? null,
            },
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setSnapshot({
            rows: [],
            health: {
              status: 'disconnected',
              lastUpdate: null,
              dataAgeMs: null,
              errorMessage: err?.message ?? 'Scanner disconnected',
            },
          });
        }
      }
    }

    load();
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return snapshot;
}

function useMarketIntel(): MarketIntelSnapshot {
  const [snapshot, setSnapshot] = useState<MarketIntelSnapshot>({
    indices: [],
    sectorStrength: null,
    marketBreadth: null,
    premarketParticipation: null,
    newsRisk: null,
    spreadEnvironment: null,
    marketRegime: null,
    environmentScore: null,
    health: initialHealth('Market Intelligence'),
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/market-intel', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const now = new Date();

        const indices: MarketIndex[] = (json.indices ?? []).map((idx: any) => ({
          symbol: idx.symbol,
          lastPrice: Number(idx.lastPrice),
          changePct: Number(idx.changePct),
        }));

        setSnapshot({
          indices,
          sectorStrength: json.sectorStrength != null ? Number(json.sectorStrength) : null,
          marketBreadth: json.marketBreadth != null ? Number(json.marketBreadth) : null,
          premarketParticipation: json.premarketParticipation != null ? Number(json.premarketParticipation) : null,
          newsRisk: json.newsRisk != null ? Number(json.newsRisk) : null,
          spreadEnvironment: json.spreadEnvironment != null ? Number(json.spreadEnvironment) : null,
          marketRegime: json.marketRegime ?? null,
          environmentScore: json.environmentScore != null ? Number(json.environmentScore) : null,
          health: {
            status: 'connected',
            lastUpdate: now,
            dataAgeMs: json.dataAgeMs ?? null,
          },
        });
      } catch (err: any) {
        if (!cancelled) {
          setSnapshot({
            indices: [],
            sectorStrength: null,
            marketBreadth: null,
            premarketParticipation: null,
            newsRisk: null,
            spreadEnvironment: null,
            marketRegime: null,
            environmentScore: null,
            health: {
              status: 'disconnected',
              lastUpdate: null,
              dataAgeMs: null,
              errorMessage: err?.message ?? 'Market intelligence disconnected',
            },
          });
        }
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return snapshot;
}

/* ============================
   App Root
   ============================ */

type PageId =
  | 'dashboard'
  | 'scanner'
  | 'formation'
  | 'runner'
  | 'intel'
  | 'structure'
  | 'watchlist'
  | 'journal'
  | 'settings';

export default function ProofOfStructureElite() {
  const scanner = useScanner();
  const intel = useMarketIntel();

  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const selectedRow = useMemo(
    () => scanner.rows.find((r) => r.ticker === selectedTicker) ?? null,
    [scanner.rows, selectedTicker],
  );

  function handleWatch(row: ScannerRow) {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === row.ticker)) return prev;
      return [
        ...prev,
        {
          ticker: row.ticker,
          notes: '',
          status: 'Active',
          lifecycle: row.lifecycle,
          eliteScore: row.eliteScore,
        },
      ];
    });
    setSelectedTicker(row.ticker);
    setActivePage('watchlist');
  }

  function handleWhy(row: ScannerRow) {
    setSelectedTicker(row.ticker);
    setActivePage('structure');
  }

  function handleStructure(row: ScannerRow) {
    setSelectedTicker(row.ticker);
    setActivePage('structure');
  }

  function handleJournal(row: ScannerRow) {
    setSelectedTicker(row.ticker);
    setActivePage('journal');
  }

  function addJournalEntry(entry: Omit<JournalEntry, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setJournal((prev) => [...prev, { ...entry, id }]);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        color: theme.textPrimary,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
      }}
    >
      <Header intel={intel} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1.6fr) 340px',
          gap: 16,
          marginTop: 12,
          flex: 1,
        }}
      >
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel>
            <Sidebar activePage={activePage} onChangePage={setActivePage} />
          </Panel>
          <Panel>
            <WatchlistPanel
              scanner={scanner}
              watchlist={watchlist}
              setWatchlist={setWatchlist}
              onSelectTicker={(t) => {
                setSelectedTicker(t);
                setActivePage('scanner');
              }}
            />
          </Panel>
          <Panel>
            <MarketIntelPanel intel={intel} />
          </Panel>
        </div>

        {/* CENTER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel>
            {activePage === 'dashboard' && (
              <DashboardPage
                scanner={scanner}
                intel={intel}
                onWatch={handleWatch}
                onWhy={handleWhy}
                onStructure={handleStructure}
                onJournal={handleJournal}
              />
            )}
            {activePage === 'scanner' && (
              <ScannerPage
                scanner={scanner}
                onWatch={handleWatch}
                onWhy={handleWhy}
                onStructure={handleStructure}
                onJournal={handleJournal}
              />
            )}
            {activePage === 'formation' && (
              <FormationPage scanner={scanner} selectedRow={selectedRow} />
            )}
            {activePage === 'runner' && <RunnerLifecyclePage scanner={scanner} />}
            {activePage === 'intel' && <MarketIntelDetailPage intel={intel} />}
            {activePage === 'structure' && (
              <StructureAnalysisPage selectedRow={selectedRow} />
            )}
            {activePage === 'watchlist' && (
              <WatchlistDetailPage
                watchlist={watchlist}
                setWatchlist={setWatchlist}
                scanner={scanner}
                onSelectTicker={(t) => {
                  setSelectedTicker(t);
                  setActivePage('scanner');
                }}
              />
            )}
            {activePage === 'journal' && (
              <JournalPage
                journal={journal}
                addJournalEntry={addJournalEntry}
                selectedTicker={selectedTicker}
              />
            )}
            {activePage === 'settings' && <SettingsPage />}
          </Panel>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel>
            <WhyEnginePanel selectedRow={selectedRow} />
          </Panel>
          <Panel>
            <StructureSummaryPanel selectedRow={selectedRow} />
          </Panel>
          <Panel>
            <JournalSummaryPanel journal={journal} selectedTicker={selectedTicker} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ============================
   Shared UI Components
   ============================ */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: theme.panel,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        padding: 12,
      }}
    >
      {children}
    </div>
  );
}

function Header({ intel }: { intel: MarketIntelSnapshot }) {
  const status = intel.health.status === 'connected' ? 'Connected · Live' : 'Disconnected';
  const statusColor = intel.health.status === 'connected' ? theme.success : theme.danger;
  const envScore = intel.environmentScore ?? 0;
  const regime = intel.marketRegime ?? 'Unknown';

  return (
    <div
      style={{
        backgroundColor: theme.panel,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        padding: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
          PROOF OF STRUCTURE™ ELITE
        </div>
        <div style={{ fontSize: 12, color: theme.textSecondary }}>
          Market intelligence workstation · Evidence over prediction · No proof = no trade
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${statusColor}`,
            padding: '4px 10px',
            fontSize: 11,
            color: statusColor,
          }}
        >
          {status}
        </span>
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${theme.accentBlue}`,
            padding: '4px 10px',
            fontSize: 11,
            color: theme.accentBlue,
          }}
        >
          Environment {envScore}% · {regime}
        </span>
      </div>
    </div>
  );
}

function Sidebar({
  activePage,
  onChangePage,
}: {
  activePage: PageId;
  onChangePage: (p: PageId) => void;
}) {
  const items: { id: PageId; label: string; section: string }[] = [
    { id: 'dashboard', label: 'Dashboard', section: 'Workspace' },
    { id: 'scanner', label: 'Scanner', section: 'Workspace' },
    { id: 'formation', label: 'Formation Engine', section: 'Structure' },
    { id: 'runner', label: 'Runner Lifecycle', section: 'Structure' },
    { id: 'intel', label: 'Market Intelligence', section: 'Environment' },
    { id: 'structure', label: 'Structure Analysis', section: 'Risk' },
    { id: 'watchlist', label: 'Watchlist', section: 'Focus' },
    { id: 'journal', label: 'Journal', section: 'Discipline' },
    { id: 'settings', label: 'Settings', section: 'System' },
  ];

  const sections = Array.from(new Set(items.map((i) => i.section)));

  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 6 }}>
        Navigation
      </div>
      {sections.map((section) => (
        <div key={section} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
            {section}
          </div>
          {items
            .filter((i) => i.section === section)
            .map((item) => {
              const active = item.id === activePage;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangePage(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: `1px solid ${active ? theme.accentBlue : 'transparent'}`,
                    backgroundColor: active ? '#323845' : '#262A33',
                    color: active ? theme.textPrimary : theme.textSecondary,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}

/* ============================
   Pages & Panels
   ============================ */

function DashboardPage({
  scanner,
  intel,
  onWatch,
  onWhy,
  onStructure,
  onJournal,
}: {
  scanner: ScannerSnapshot;
  intel: MarketIntelSnapshot;
  onWatch: (row: ScannerRow) => void;
  onWhy: (row: ScannerRow) => void;
  onStructure: (row: ScannerRow) => void;
  onJournal: (row: ScannerRow) => void;
}) {
  const topElite = scanner.rows
    .filter((r) => r.eliteScore != null)
    .sort((a, b) => (b.eliteScore ?? 0) - (a.eliteScore ?? 0))
    .slice(0, 10);

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Executive Dashboard
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Ranked by Elite Score · Spread · Speed · Volume Acceleration · Structure · Environment
      </div>
      <ScannerTable scanner={scanner} onWatch={onWatch} onWhy={onWhy} onStructure={onStructure} onJournal={onJournal} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
          Top Elite Candidates
        </div>
        {topElite.length === 0 ? (
          <div style={{ fontSize: 11, color: theme.textSecondary }}>No live elite candidates. Check scanner connection.</div>
        ) : (
          <div>
            {topElite.map((row) => (
              <div key={row.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <div style={{ color: theme.textPrimary }}>{row.ticker}</div>
                  <div style={{ color: theme.textSecondary }}>{row.lifecycle} · Proof {row.proofScore ?? '—'}</div>
                </div>
                <div style={{ color: theme.accentBlue }}>Elite {row.eliteScore ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScannerPage({
  scanner,
  onWatch,
  onWhy,
  onStructure,
  onJournal,
}: {
  scanner: ScannerSnapshot;
  onWatch: (row: ScannerRow) => void;
  onWhy: (row: ScannerRow) => void;
  onStructure: (row: ScannerRow) => void;
  onJournal: (row: ScannerRow) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Scanner
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Market intelligence scanner · Evidence-driven ranking
      </div>
      <ScannerTable scanner={scanner} onWatch={onWatch} onWhy={onWhy} onStructure={onStructure} onJournal={onJournal} />
    </div>
  );
}

function FormationPage({ scanner, selectedRow }: { scanner: ScannerSnapshot; selectedRow: ScannerRow | null }) {
  const rows = scanner.rows;

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Formation Engine
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Runner lifecycle · Structure stages · Formation scoring
      </div>
      {selectedRow ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: theme.textPrimary }}>{selectedRow.ticker}</div>
          <div style={{ fontSize: 11, color: theme.textSecondary }}>
            Lifecycle: {selectedRow.lifecycle} · Formation Score: {selectedRow.formationScore ?? '—'}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
          Select a ticker from Scanner or Watchlist to inspect formation.
        </div>
      )}
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Live runners:</div>
      <div>
        {rows.map((row) => (
          <div key={row.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
            <div>
              <div style={{ color: theme.textPrimary }}>{row.ticker}</div>
              <div style={{ color: theme.textSecondary }}>{row.lifecycle} · Formation {row.formationScore ?? '—'}</div>
            </div>
            <div style={{ color: theme.accentBlue }}>Elite {row.eliteScore ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunnerLifecyclePage({ scanner }: { scanner: ScannerSnapshot }) {
  const counts: Record<RunnerLifecycle, number> = {
    SLEEPING: 0,
    ACCUMULATING: 0,
    WAKING: 0,
    FORMING: 0,
    IGNITING: 0,
    RUNNING: 0,
    EXTENDED: 0,
    FAILING: 0,
  };

  scanner.rows.forEach((r) => {
    counts[r.lifecycle] = (counts[r.lifecycle] ?? 0) + 1;
  });

  const stages: RunnerLifecycle[] = ['SLEEPING', 'ACCUMULATING', 'WAKING', 'FORMING', 'IGNITING', 'RUNNING', 'EXTENDED', 'FAILING'];

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Runner Lifecycle
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Lifecycle distribution · Evidence over prediction · Structure before speed
      </div>
      {stages.map((stage) => (
        <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ color: theme.textPrimary }}>{stage}</div>
          <div style={{ color: theme.textSecondary }}>{counts[stage] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function MarketIntelDetailPage({ intel }: { intel: MarketIntelSnapshot }) {
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Market Intelligence
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        SPY · QQQ · IWM · VIX · Sector strength · Breadth · Regime
      </div>
      <MarketIntelPanel intel={intel} />
    </div>
  );
}

function StructureAnalysisPage({ selectedRow }: { selectedRow: ScannerRow | null }) {
  if (!selectedRow) {
    return (
      <div>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
          Structure Analysis
        </div>
        <div style={{ fontSize: 11, color: theme.textSecondary }}>Select a ticker from Scanner or Watchlist to analyze structure.</div>
      </div>
    );
  }

  const s = analyzeStructure(selectedRow);

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Structure Analysis · {selectedRow.ticker}
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Support, spread, speed, volume acceleration, and structure matter more than resistance.
      </div>
      <div style={{ fontSize: 11 }}>
        <div>Support: {s.support != null ? s.support.toFixed(2) : '—'}</div>
        <div>Resistance: {s.resistance != null ? s.resistance.toFixed(2) : '—'}</div>
        <div>Range Position: {s.rangePosition}</div>
        <div>Formation Entry: {s.formationEntry != null ? s.formationEntry.toFixed(2) : '—'}</div>
        <div>Aggressive Entry: {s.aggressiveEntry != null ? s.aggressiveEntry.toFixed(2) : '—'}</div>
        <div>Confirmation Entry: {s.confirmationEntry != null ? s.confirmationEntry.toFixed(2) : '—'}</div>
        <div>Proof Entry: {s.proofEntry != null ? s.proofEntry.toFixed(2) : '—'}</div>
        <div>Stop: {s.stop != null ? s.stop.toFixed(2) : '—'}</div>
        <div>Target 1: {s.target1 != null ? s.target1.toFixed(2) : '—'}</div>
        <div>Target 2: {s.target2 != null ? s.target2.toFixed(2) : '—'}</div>
        <div>Target 3: {s.target3 != null ? s.target3.toFixed(2) : '—'}</div>
        <div>Risk Reward: {s.riskReward}</div>
      </div>
    </div>
  );
}

function WatchlistDetailPage({
  watchlist,
  setWatchlist,
  scanner,
  onSelectTicker,
}: {
  watchlist: WatchlistItem[];
  setWatchlist: (w: WatchlistItem[]) => void;
  scanner: ScannerSnapshot;
  onSelectTicker: (t: string) => void;
}) {
  function remove(ticker: string) {
    setWatchlist(watchlist.filter((w) => w.ticker !== ticker));
  }

  function updateNotes(ticker: string, notes: string) {
    setWatchlist(watchlist.map((w) => (w.ticker === ticker ? { ...w, notes } : w)));
  }

  const sorted = [...watchlist].sort((a, b) => (b.eliteScore ?? 0) - (a.eliteScore ?? 0));

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Watchlist
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Add · Remove · Sort · Filter · Notes · Status · Lifecycle · Elite Score
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 11, color: theme.textSecondary }}>Use WATCH action in Scanner to add live tickers to the watchlist.</div>
      ) : (
        <div>
          {sorted.map((item) => (
            <div key={item.ticker} style={{ borderBottom: `1px solid ${theme.border}`, padding: '6px 0', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ color: theme.textPrimary }}>{item.ticker}</div>
                  <div style={{ color: theme.textSecondary }}>{item.lifecycle} · Elite {item.eliteScore ?? '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onSelectTicker(item.ticker)} style={smallButtonStyle}>Open</button>
                  <button onClick={() => remove(item.ticker)} style={{ ...smallButtonStyle, border: `1px solid ${theme.danger}`, color: theme.danger }}>Remove</button>
                </div>
              </div>
              <textarea value={item.notes} onChange={(e) => updateNotes(item.ticker, e.target.value)} placeholder="Notes" style={textareaStyle} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JournalPage({ journal, addJournalEntry, selectedTicker }: { journal: JournalEntry[]; addJournalEntry: (e: Omit<JournalEntry, 'id'>) => void; selectedTicker: string | null }) {
  const [form, setForm] = useState<Omit<JournalEntry, 'id'>>({
    date: '',
    time: '',
    ticker: selectedTicker ?? '',
    entry: '',
    exit: '',
    reason: '',
    evidence: '',
    mistake: '',
    lesson: '',
    outcome: '',
  });

  useEffect(() => {
    if (selectedTicker) {
      setForm((prev) => ({ ...prev, ticker: selectedTicker }));
    }
  }, [selectedTicker]);

  function submit() {
    if (!form.ticker) return;
    const now = new Date();
    const date = form.date || now.toISOString().slice(0, 10);
    const time = form.time || now.toTimeString().slice(0, 5);
    addJournalEntry({ ...form, date, time });
    setForm({
      date: '',
      time: '',
      ticker: selectedTicker ?? '',
      entry: '',
      exit: '',
      reason: '',
      evidence: '',
      mistake: '',
      lesson: '',
      outcome: '',
    });
  }

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Journal
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
        Date · Time · Ticker · Entry · Exit · Reason · Evidence · Mistake · Lesson · Outcome
      </div>
      <div style={{ fontSize: 11, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <input placeholder="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          <input placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={inputStyle} />
          <input placeholder="Ticker" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} style={inputStyle} />
        </div>
        <textarea placeholder="Entry" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Exit" value={form.exit} onChange={(e) => setForm({ ...form, exit: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Evidence" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Mistake" value={form.mistake} onChange={(e) => setForm({ ...form, mistake: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Lesson" value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} style={textareaStyle} />
        <textarea placeholder="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} style={textareaStyle} />
        <button onClick={submit} style={{ marginTop: 6, fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${theme.accentBlue}`, backgroundColor: '#323845', color: theme.accentBlue, cursor: 'pointer' }}>
          Save Entry
        </button>
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Recent entries:</div>
      <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 11 }}>
        {journal.length === 0 ? (
          <div style={{ color: theme.textSecondary }}>No journal entries yet.</div>
        ) : (
          journal.slice().reverse().map((e) => (
            <div key={e.id} style={{ borderBottom: `1px solid ${theme.border}`, padding: '4px 0' }}>
              <div style={{ color: theme.textPrimary }}>{e.date} {e.time} · {e.ticker}</div>
              <div style={{ color: theme.textSecondary }}>Outcome: {e.outcome || '—'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>
        Settings
      </div>
      <div style={{ fontSize: 11, color: theme.textSecondary }}>
        elite-dev-v2 branch · Do not alter production · Configuration lives in environment and API routes.
      </div>
    </div>
  );
}

/* ============================
   Scanner Table Component
   ============================ */

function ScannerTable({
  scanner,
  onWatch,
  onWhy,
  onStructure,
  onJournal,
}: {
  scanner: ScannerSnapshot;
  onWatch: (row: ScannerRow) => void;
  onWhy: (row: ScannerRow) => void;
  onStructure: (row: ScannerRow) => void;
  onJournal: (row: ScannerRow) => void;
}) {
  const { rows, health } = scanner;
  const statusColor = health.status === 'connected' ? theme.success : theme.danger;

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {[
                'Ticker',
                'Price',
                'Gain',
                'Spread',
                'Speed',
                'Volume Accel',
                'Float',
                'Support',
                'Resistance',
                'Lifecycle',
                'Formation',
                'Journey',
                'Proof',
                'Catalyst',
                'Environment',
                'Elite',
                'Verdict',
                'Actions',
              ].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={18} style={{ padding: 6, color: theme.textSecondary }}>
                  {health.status === 'connected' ? 'No live scanner rows returned.' : 'Disconnected · No live data.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.ticker}>
                  <td style={cellStyle}>{row.ticker}</td>
                  <td style={cellStyle}>{row.price.toFixed(2)}</td>
                  <td style={{ ...cellStyle, color: row.gainPct >= 0 ? theme.success : theme.danger }}>{row.gainPct.toFixed(2)}%</td>
                  <td style={cellStyle}>{row.spreadPct.toFixed(2)}%</td>
                  <td style={cellStyle}>{row.speedScore.toFixed(0)}</td>
                  <td style={cellStyle}>{row.volumeAcceleration.toFixed(2)}</td>
                  <td style={cellStyle}>{row.floatShares.toLocaleString()}</td>
                  <td style={cellStyle}>{row.supportLevel != null ? row.supportLevel.toFixed(2) : '—'}</td>
                  <td style={cellStyle}>{row.resistanceLevel != null ? row.resistanceLevel.toFixed(2) : '—'}</td>
                  <td style={cellStyle}>{row.lifecycle}</td>
                  <td style={cellStyle}>{row.formationScore != null ? row.formationScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.journeyScore != null ? row.journeyScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.proofScore != null ? row.proofScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.catalystScore != null ? row.catalystScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.environmentScore != null ? row.environmentScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.eliteScore != null ? row.eliteScore.toFixed(0) : '—'}</td>
                  <td style={cellStyle}>{row.verdict ?? '—'}</td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionButton label="WATCH" onClick={() => onWatch(row)} />
                      <ActionButton label="WHY" onClick={() => onWhy(row)} />
                      <ActionButton label="STRUCTURE" onClick={() => onStructure(row)} />
                      <ActionButton label="JOURNAL" onClick={() => onJournal(row)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.textSecondary }}>
        <span style={{ borderRadius: 999, border: `1px solid ${statusColor}`, padding: '2px 8px', color: statusColor }}>
          {health.status === 'connected' ? 'Connected' : 'Disconnected'}
        </span>
        <span>Last Update: {health.lastUpdate ? health.lastUpdate.toLocaleTimeString() : 'N/A'}</span>
        <span>Data Age: {health.dataAgeMs != null ? `${Math.round(health.dataAgeMs / 1000)}s` : 'Unknown'}</span>
      </div>
    </>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, border: `1px solid ${theme.accentBlue}`, backgroundColor: '#323845', color: theme.accentBlue, cursor: 'pointer' }}>
      {label}
    </button>
  );
}

/* ============================
   Right Column Panels
   ============================ */

function WhyEnginePanel({ selectedRow }: { selectedRow: ScannerRow | null }) {
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>WHY Engine</div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>Evidence discipline · What supports and invalidates the thesis</div>
      {selectedRow ? (
        <div style={{ fontSize: 11 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>Positive Evidence</strong>
            <div>Spread {selectedRow.spreadPct.toFixed(2)}% · Speed {selectedRow.speedScore.toFixed(0)} · Volume Accel {selectedRow.volumeAcceleration.toFixed(2)}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Negative Evidence</strong>
            <div>Lifecycle {selectedRow.lifecycle} · Proof {selectedRow.proofScore ?? '—'} · Elite {selectedRow.eliteScore ?? '—'}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Support Quality</strong>
            <div>Support {selectedRow.supportLevel != null ? selectedRow.supportLevel.toFixed(2) : '—'}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Resistance Quality</strong>
            <div>Resistance {selectedRow.resistanceLevel != null ? selectedRow.resistanceLevel.toFixed(2) : '—'}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Spread Behavior</strong>
            <div>{selectedRow.spreadPct.toFixed(2)}% spread</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Speed Behavior</strong>
            <div>Speed {selectedRow.speedScore.toFixed(0)}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Volume Behavior</strong>
            <div>Volume Accel {selectedRow.volumeAcceleration.toFixed(2)}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Catalyst Analysis</strong>
            <div>Catalyst {selectedRow.catalystScore ?? '—'}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Environment Analysis</strong>
            <div>Environment {selectedRow.environmentScore ?? '—'}</div>
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Question:</strong> What evidence supports this thesis?
          </div>
          <div>
            <strong>Invalidation:</strong> What evidence disproves this thesis?
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: theme.textSecondary }}>Select a ticker to inspect WHY evidence.</div>
      )}
    </div>
  );
}

function StructureSummaryPanel({ selectedRow }: { selectedRow: ScannerRow | null }) {
  if (!selectedRow) {
    return (
      <div>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>Structure Summary</div>
        <div style={{ fontSize: 11, color: theme.textSecondary }}>Select a ticker to view structure summary.</div>
      </div>
    );
  }

  const s = analyzeStructure(selectedRow);

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>Structure Summary · {selectedRow.ticker}</div>
      <div style={{ fontSize: 11 }}>
        <div>Support: {s.support != null ? s.support.toFixed(2) : '—'}</div>
        <div>Resistance: {s.resistance != null ? s.resistance.toFixed(2) : '—'}</div>
        <div>Range Position: {s.rangePosition}</div>
        <div>Risk Reward: {s.riskReward}</div>
      </div>
    </div>
  );
}

function JournalSummaryPanel({ journal, selectedTicker }: { journal: JournalEntry[]; selectedTicker: string | null }) {
  const filtered = selectedTicker ? journal.filter((e) => e.ticker === selectedTicker) : journal;

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>Journal Summary</div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 6 }}>{selectedTicker ? `Entries for ${selectedTicker}` : 'All entries · Filtered by selection'}</div>
      <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 11 }}>
        {filtered.length === 0 ? (
          <div style={{ color: theme.textSecondary }}>No entries.</div>
        ) : (
          filtered.slice().reverse().map((e) => (
            <div key={e.id} style={{ borderBottom: `1px solid ${theme.border}`, padding: '4px 0' }}>
              <div style={{ color: theme.textPrimary }}>{e.date} {e.time} · {e.ticker}</div>
              <div style={{ color: theme.textSecondary }}>Outcome: {e.outcome || '—'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================
   Left Column Panels
   ============================ */

function WatchlistPanel({ scanner, watchlist, setWatchlist, onSelectTicker }: { scanner: ScannerSnapshot; watchlist: WatchlistItem[]; setWatchlist: (w: WatchlistItem[]) => void; onSelectTicker: (t: string) => void }) {
  const focus = scanner.rows.slice(0, 10);

  function addFromScanner(row: ScannerRow) {
    if (watchlist.some((w) => w.ticker === row.ticker)) return;
    setWatchlist([...watchlist, { ticker: row.ticker, notes: '', status: 'Active', lifecycle: row.lifecycle, eliteScore: row.eliteScore }]);
  }

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>Watchlist</div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>Live candidates · No synthetic symbols · WATCH action adds from scanner</div>
      {focus.length === 0 ? (
        <div style={{ fontSize: 11, color: theme.textSecondary }}>No live scanner rows. Check connection.</div>
      ) : (
        <div style={{ fontSize: 11 }}>
          {focus.map((row) => (
            <div key={row.ticker} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ color: theme.textPrimary }}>{row.ticker}</div>
                <div style={{ color: theme.textSecondary }}>{row.price.toFixed(2)} · <span style={{ color: row.gainPct >= 0 ? theme.success : theme.danger }}>{row.gainPct.toFixed(2)}%</span></div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => onSelectTicker(row.ticker)} style={smallButtonStyle}>Open</button>
                <button onClick={() => addFromScanner(row)} style={smallButtonStyle}>Watch</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketIntelPanel({ intel }: { intel: MarketIntelSnapshot }) {
  const { indices, health } = intel;
  const statusColor = health.status === 'connected' ? theme.success : theme.danger;

  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: theme.textSecondary, marginBottom: 4 }}>Market Intelligence</div>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>SPY · QQQ · IWM · VIX · Sector strength · Breadth · Regime</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginBottom: 8, fontSize: 11 }}>
        {indices.length === 0 ? (
          <div style={{ color: theme.textSecondary }}>No live environment data.</div>
        ) : (
          indices.map((idx) => (
            <div key={idx.symbol} style={{ borderRadius: 8, border: `1px solid ${theme.border}`, padding: 6, backgroundColor: '#262A33' }}>
              <div style={{ color: theme.textPrimary }}>{idx.symbol}</div>
              <div style={{ color: theme.textSecondary }}>{idx.lastPrice.toFixed(2)} · <span style={{ color: idx.changePct >= 0 ? theme.success : theme.danger }}>{idx.changePct.toFixed(2)}%</span></div>
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: 11 }}>
        <div>Sector Strength: {intel.sectorStrength != null ? intel.sectorStrength : '—'}</div>
        <div>Market Breadth: {intel.marketBreadth != null ? intel.marketBreadth : '—'}</div>
        <div>Premarket Participation: {intel.premarketParticipation != null ? intel.premarketParticipation : '—'}</div>
        <div>News Risk: {intel.newsRisk != null ? intel.newsRisk : '—'}</div>
        <div>Spread Environment: {intel.spreadEnvironment != null ? intel.spreadEnvironment : '—'}</div>
        <div>Market Regime: {intel.marketRegime ?? '—'}</div>
        <div>Environment Score: {intel.environmentScore != null ? intel.environmentScore : '—'}</div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: theme.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ borderRadius: 999, border: `1px solid ${statusColor}`, padding: '2px 8px', color: statusColor }}>{health.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
        <span>Last Update: {health.lastUpdate ? health.lastUpdate.toLocaleTimeString() : 'N/A'}</span>
        <span>Data Age: {health.dataAgeMs != null ? `${Math.round(health.dataAgeMs / 1000)}s` : 'Unknown'}</span>
      </div>
    </div>
  );
}

/* ============================
   Small Styles
   ============================ */

const cellStyle: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: `1px solid ${theme.border}`,
  color: theme.textSecondary,
  whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  borderRadius: 6,
  border: `1px solid ${theme.border}`,
  backgroundColor: '#262A33',
  color: theme.textSecondary,
  fontSize: 11,
  padding: 4,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  backgroundColor: '#262A33',
  color: theme.textSecondary,
  fontSize: 11,
  padding: 6,
  resize: 'vertical',
  marginBottom: 4,
};

const smallButtonStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 6,
  border: `1px solid ${theme.accentBlue}`,
  backgroundColor: '#323845',
  color: theme.accentBlue,
  cursor: 'pointer',
};
