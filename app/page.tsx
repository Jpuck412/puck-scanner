"use client";

import React, { useEffect, useMemo, useState } from "react";

const THEME = {
  bg: "#20242B",
  panel: "#2A2F38",
  border: "#3A404C",
  text: "#E6EAF0",
  text2: "#9AA4B2",
  blue: "#4DA3FF",
  success: "#00D084",
  warning: "#FFB547",
  danger: "#FF5C5C",
};

type RawTicker = any;

type EliteTicker = {
  raw: RawTicker;
  ticker: string;
  price: number | null;
  gainPct: number | null;
  spreadPct: number | null;
  speedScore: number | null;
  volumeAcceleration: number | null;
  floatShares: number | null;
  supportLevel: number | null;
  resistanceLevel: number | null;
  formationScore: number | null;
  journeyScore: number | null;
  catalystStrength: number | null;
  environmentScore: number | null;
  lifecycle: string | null;
  proofScore: number | null;
  verdict: string | null;
  eliteScore: number;
};

type MarketSnapshot = {
  SPY?: any;
  QQQ?: any;
  IWM?: any;
  VIX?: any;
};

type WatchItem = {
  ticker: string;
  notes: string;
  status: string;
  lifecycle: string | null;
  eliteScore: number;
};

type JournalEntry = {
  id: string;
  date: string;
  time: string;
  ticker: string;
  entry?: number | null;
  exit?: number | null;
  reason: string;
  evidence: string;
  mistake: string;
  lesson: string;
  outcome: string;
};

const STORAGE_KEYS = {
  watchlist: "elite_watchlist",
  journal: "elite_journal",
};

function extractTickers(json: any): RawTicker[] {
  if (!json) return [];
  if (Array.isArray(json.tickers)) return json.tickers;
  if (json.data && Array.isArray(json.data.tickers)) return json.data.tickers;
  if (Array.isArray(json.results)) return json.results;
  return [];
}

function computeEliteScoreFromRaw(raw: RawTicker): number {
  const spreadPct =
    typeof raw.spreadPct === "number"
      ? raw.spreadPct
      : typeof raw.spread === "number"
      ? raw.spread
      : 0;

  const speedScore =
    typeof raw.speedScore === "number"
      ? raw.speedScore
      : typeof raw.speed === "number"
      ? raw.speed
      : 0;

  const volumeAcceleration =
    typeof raw.volumeAcceleration === "number"
      ? raw.volumeAcceleration
      : typeof raw.volumeAccel === "number"
      ? raw.volumeAccel
      : 0;

  const floatShares =
    typeof raw.floatShares === "number"
      ? raw.floatShares
      : typeof raw.float === "number"
      ? raw.float
      : 0;

  const supportScore =
    typeof raw.supportScore === "number"
      ? raw.supportScore
      : typeof raw.support === "number"
      ? raw.support
      : 0;

  const catalystStrength =
    typeof raw.catalystStrength === "number"
      ? raw.catalystStrength
      : typeof raw.catalystScore === "number"
      ? raw.catalystScore
      : 0;

  const environmentScore =
    typeof raw.environmentScore === "number"
      ? raw.environmentScore
      : typeof raw.envScore === "number"
      ? raw.envScore
      : 0;

  const journeyScore =
    typeof raw.journeyScore === "number"
      ? raw.journeyScore
      : typeof raw.lifecycleScore === "number"
      ? raw.lifecycleScore
      : 0;

  const spreadScore = 100 - spreadPct * 100;

  return (
    0.2 * spreadScore +
    0.2 * speedScore +
    0.2 * volumeAcceleration +
    0.1 * (floatShares > 0 ? Math.min(100, 100000000 / floatShares) : 0) +
    0.1 * supportScore +
    0.1 * catalystStrength +
    0.1 * environmentScore +
    0.1 * journeyScore
  );
}

function normalizeTicker(raw: RawTicker): EliteTicker | null {
  const ticker =
    raw.ticker ||
    raw.symbol ||
    raw.T ||
    raw["ticker"] ||
    raw["symbol"] ||
    null;

  if (!ticker) return null;

  const price =
    typeof raw.price === "number"
      ? raw.price
      : typeof raw.last === "number"
      ? raw.last
      : typeof raw.close === "number"
      ? raw.close
      : typeof raw.c === "number"
      ? raw.c
      : null;

  const gainPct =
    typeof raw.gainPct === "number"
      ? raw.gainPct
      : typeof raw.changePercent === "number"
      ? raw.changePercent
      : typeof raw.todaysChangePerc === "number"
      ? raw.todaysChangePerc
      : null;

  const spreadPct =
    typeof raw.spreadPct === "number"
      ? raw.spreadPct
      : typeof raw.spread === "number"
      ? raw.spread
      : null;

  const speedScore =
    typeof raw.speedScore === "number"
      ? raw.speedScore
      : typeof raw.speed === "number"
      ? raw.speed
      : null;

  const volumeAcceleration =
    typeof raw.volumeAcceleration === "number"
      ? raw.volumeAcceleration
      : typeof raw.volumeAccel === "number"
      ? raw.volumeAccel
      : null;

  const floatShares =
    typeof raw.floatShares === "number"
      ? raw.floatShares
      : typeof raw.float === "number"
      ? raw.float
      : null;

  const supportLevel =
    typeof raw.supportLevel === "number"
      ? raw.supportLevel
      : typeof raw.support === "number"
      ? raw.support
      : typeof raw.low === "number"
      ? raw.low
      : null;

  const resistanceLevel =
    typeof raw.resistanceLevel === "number"
      ? raw.resistanceLevel
      : typeof raw.resistance === "number"
      ? raw.resistance
      : typeof raw.high === "number"
      ? raw.high
      : null;

  const formationScore =
    typeof raw.formationScore === "number"
      ? raw.formationScore
      : typeof raw.structureScore === "number"
      ? raw.structureScore
      : null;

  const journeyScore =
    typeof raw.journeyScore === "number"
      ? raw.journeyScore
      : typeof raw.lifecycleScore === "number"
      ? raw.lifecycleScore
      : null;

  const catalystStrength =
    typeof raw.catalystStrength === "number"
      ? raw.catalystStrength
      : typeof raw.catalystScore === "number"
      ? raw.catalystScore
      : null;

  const environmentScore =
    typeof raw.environmentScore === "number"
      ? raw.environmentScore
      : typeof raw.envScore === "number"
      ? raw.envScore
      : null;

  const lifecycle =
    raw.lifecycle ||
    raw.runnerLifecycle ||
    raw.state ||
    null;

  const proofScore =
    typeof raw.proofScore === "number"
      ? raw.proofScore
      : null;

  const verdict =
    raw.verdict ||
    (proofScore !== null && proofScore < 50 ? "NO PROOF = NO TRADE" : null);

  const eliteScore = computeEliteScoreFromRaw(raw);

  return {
    raw,
    ticker,
    price,
    gainPct,
    spreadPct,
    speedScore,
    volumeAcceleration,
    floatShares,
    supportLevel,
    resistanceLevel,
    formationScore,
    journeyScore,
    catalystStrength,
    environmentScore,
    lifecycle,
    proofScore,
    verdict,
    eliteScore,
  };
}

function useScanner() {
  const [tickers, setTickers] = useState<EliteTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/gainers");
        const json = await res.json();
        const rawTickers = extractTickers(json);
        const normalized = rawTickers
          .map(normalizeTicker)
          .filter((t): t is EliteTicker => t !== null)
          .sort((a, b) => b.eliteScore - a.eliteScore);
        if (!cancelled) setTickers(normalized);
      } catch (e) {
        console.error("Scanner API error:", e);
        if (!cancelled) setTickers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tickers, loading };
}

function useMarket() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        if (!cancelled) {
          setSnapshot({
            SPY: json.SPY,
            QQQ: json.QQQ,
            IWM: json.IWM,
            VIX: json.VIX,
          });
        }
      } catch (e) {
        console.error("Market API error:", e);
        if (!cancelled) setSnapshot({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { snapshot, loading };
}

function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.watchlist);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(items));
}

function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    setItems(loadWatchlist());
  }, []);

  const add = (t: EliteTicker) => {
    setItems((prev) => {
      if (prev.some((p) => p.ticker === t.ticker)) return prev;
      const next = [
        ...prev,
        {
          ticker: t.ticker,
          notes: "",
          status: "PLANNED",
          lifecycle: t.lifecycle,
          eliteScore: t.eliteScore,
        },
      ];
      saveWatchlist(next);
      return next;
    });
  };

  const remove = (ticker: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.ticker !== ticker);
      saveWatchlist(next);
      return next;
    });
  };

  const updateNotes = (ticker: string, notes: string) => {
    setItems((prev) => {
      const next = prev.map((p) =>
        p.ticker === ticker ? { ...p, notes } : p
      );
      saveWatchlist(next);
      return next;
    });
  };

  const updateStatus = (ticker: string, status: string) => {
    setItems((prev) => {
      const next = prev.map((p) =>
        p.ticker === ticker ? { ...p, status } : p
      );
      saveWatchlist(next);
      return next;
    });
  };

  return { items, add, remove, updateNotes, updateStatus };
}

function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.journal);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveJournal(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(entries));
}

function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    setEntries(loadJournal());
  }, []);

  const add = (entry: Omit<JournalEntry, "id">) => {
    const id = `${entry.ticker}-${Date.now()}`;
    setEntries((prev) => {
      const next = [...prev, { ...entry, id }];
      saveJournal(next);
      return next;
    });
  };

  const remove = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveJournal(next);
      return next;
    });
  };

  return { entries, add, remove };
}

type WhyContext = {
  positiveEvidence: string[];
  negativeEvidence: string[];
  supportQuality: string;
  resistanceQuality: string;
  spreadBehavior: string;
  speedBehavior: string;
  volumeBehavior: string;
  catalystAnalysis: string;
  environmentAnalysis: string;
};

function buildWhyContext(t: EliteTicker): WhyContext {
  const positives: string[] = [];
  const negatives: string[] = [];

  if (t.supportLevel !== null && t.price !== null && t.price >= t.supportLevel) {
    positives.push("Support holding above key level.");
  } else {
    negatives.push("Price not respecting support.");
  }

  if (t.spreadPct !== null && t.spreadPct < 0.01) {
    positives.push("Spread tight and stable.");
  } else {
    negatives.push("Spread wide or unstable.");
  }

  if (t.volumeAcceleration !== null && t.volumeAcceleration > 0) {
    positives.push("Volume accelerating vs baseline.");
  } else {
    negatives.push("Volume not confirming move.");
  }

  if (t.speedScore !== null && t.speedScore > 0) {
    positives.push("Speed aligned with direction.");
  } else {
    negatives.push("Speed weak or inconsistent.");
  }

  if (t.catalystStrength !== null && t.catalystStrength > 0) {
    positives.push("Catalyst present and active.");
  } else {
    negatives.push("No clear catalyst.");
  }

  if (t.environmentScore !== null && t.environmentScore > 50) {
    positives.push("Market environment supportive.");
  } else {
    negatives.push("Environment not supportive.");
  }

  return {
    positiveEvidence: positives,
    negativeEvidence: negatives,
    supportQuality:
      t.supportLevel !== null ? "Defined support level from structure." : "Support unclear.",
    resistanceQuality:
      t.resistanceLevel !== null ? "Defined resistance level from structure." : "Resistance unclear.",
    spreadBehavior:
      t.spreadPct !== null && t.spreadPct < 0.01
        ? "Tight, institutional spread."
        : "Wider, less controlled spread.",
    speedBehavior:
      t.speedScore !== null && t.speedScore > 0
        ? "Controlled speed with directional intent."
        : "Lack of speed or noisy tape.",
    volumeBehavior:
      t.volumeAcceleration !== null && t.volumeAcceleration > 0
        ? "Volume building into move."
        : "Volume not confirming.",
    catalystAnalysis:
      t.catalystStrength !== null && t.catalystStrength > 0
        ? "Catalyst supports thesis."
        : "Catalyst absent or weak.",
    environmentAnalysis:
      t.environmentScore !== null && t.environmentScore > 50
        ? "Environment aligned with risk-on behavior."
        : "Environment mixed or risk-off.",
  };
}

function computeStructureLevels(t: EliteTicker) {
  const support = t.supportLevel;
  const resistance = t.resistanceLevel;
  const price = t.price;

  if (support === null || resistance === null || price === null) {
    return null;
  }

  const rangePosition =
    price <= support
      ? "Bottom of range"
      : price >= resistance
      ? "Top of range"
      : "Mid-range";

  const formationEntry =
    price > support && price < resistance ? price : null;

  const aggressiveEntry =
    price > support && t.spreadPct !== null && t.spreadPct < 0.01 ? price : null;

  const confirmationEntry =
    price > resistance && t.volumeAcceleration !== null && t.volumeAcceleration > 0
      ? price
      : null;

  const proofEntry =
    aggressiveEntry !== null &&
    t.proofScore !== null &&
    t.proofScore >= 60
      ? aggressiveEntry
      : null;

  const stop = support;
  const target1 = resistance;
  const target2 = resistance * 1.03;
  const target3 = resistance * 1.06;

  const riskReward =
    stop !== null && target1 !== null
      ? (target1 - price) / (price - stop)
      : null;

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

type Tab =
  | "dashboard"
  | "scanner"
  | "formation"
  | "lifecycle"
  | "market"
  | "structure"
  | "watchlist"
  | "journal"
  | "settings";

export default function EliteApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { tickers, loading: scannerLoading } = useScanner();
  const { snapshot, loading: marketLoading } = useMarket();
  const watchlist = useWatchlist();
  const journal = useJournal();
  const [selectedTicker, setSelectedTicker] = useState<EliteTicker | null>(null);
  const [whyTicker, setWhyTicker] = useState<EliteTicker | null>(null);

  const environmentScore = useMemo(() => {
    if (!tickers.length) return null;
    const scores = tickers
      .map((t) => t.environmentScore)
      .filter((s): s is number => s !== null);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [tickers]);

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultTime = now.toTimeString().slice(0, 5);

  return (
    <div
      style={{
        background: THEME.bg,
        minHeight: "100vh",
        display: "flex",
        color: THEME.text,
      }}
    >
      <aside
        style={{
          width: 240,
          background: "#1B1F26",
          borderRight: `1px solid ${THEME.border}`,
          padding: 16,
        }}
      >
        <div
          style={{
            color: THEME.blue,
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 24,
          }}
        >
          PROOF OF STRUCTURE™ ELITE
        </div>
        {[
          ["dashboard", "Dashboard"],
          ["scanner", "Scanner"],
          ["formation", "Formation Engine"],
          ["lifecycle", "Runner Lifecycle"],
          ["market", "Market Intelligence"],
          ["structure", "Structure Analysis"],
          ["watchlist", "Watchlist"],
          ["journal", "Journal"],
          ["settings", "Settings"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              marginBottom: 4,
              borderRadius: 4,
              border: "none",
              background:
                tab === key ? THEME.panel : "transparent",
              color: tab === key ? THEME.text : THEME.text2,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, padding: 20 }}>
        {tab === "dashboard" && (
          <DashboardView
            tickers={tickers}
            scannerLoading={scannerLoading}
            environmentScore={environmentScore}
          />
        )}

        {tab === "scanner" && (
          <ScannerView
            tickers={tickers}
            loading={scannerLoading}
            onWatch={watchlist.add}
            onWhy={setWhyTicker}
            onStructure={(t) => {
              setSelectedTicker(t);
              setTab("structure");
            }}
            onJournal={(t) => {
              journal.add({
                date: defaultDate,
                time: defaultTime,
                ticker: t.ticker,
                reason: "Runner observation",
                evidence: "Live scanner evidence.",
                mistake: "",
                lesson: "",
                outcome: "",
              });
              setTab("journal");
            }}
          />
        )}

        {tab === "formation" && (
          <FormationView tickers={tickers} />
        )}

        {tab === "lifecycle" && (
          <LifecycleView tickers={tickers} />
        )}

        {tab === "market" && (
          <MarketView
            snapshot={snapshot}
            loading={marketLoading}
            environmentScore={environmentScore}
          />
        )}

        {tab === "structure" && (
          <StructureView
            tickers={tickers}
            selected={selectedTicker}
            onSelect={setSelectedTicker}
            watchlist={watchlist}
            journal={journal}
          />
        )}

        {tab === "watchlist" && (
          <WatchlistView watchlist={watchlist} />
        )}

        {tab === "journal" && (
          <JournalView journal={journal} />
        )}

        {tab === "settings" && (
          <SettingsView />
        )}

        {whyTicker && (
          <WhyPanel
            ticker={whyTicker}
            onClose={() => setWhyTicker(null)}
          />
        )}
      </main>
    </div>
  );
}

function DashboardView({
  tickers,
  scannerLoading,
  environmentScore,
}: {
  tickers: EliteTicker[];
  scannerLoading: boolean;
  environmentScore: number | null;
}) {
  const topElite = tickers.slice(0, 10);

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ color: THEME.text2, marginBottom: 8 }}>
            Environment Score
          </div>
          <div style={{ fontSize: 24 }}>
            {environmentScore !== null ? environmentScore.toFixed(1) : "N/A"}
          </div>
        </div>

        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ color: THEME.text2, marginBottom: 8 }}>
            Elite Runners
          </div>
          <div style={{ fontSize: 24 }}>
            {tickers.length}
          </div>
        </div>

        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ color: THEME.text2, marginBottom: 8 }}>
            Scanner Status
          </div>
          <div style={{ fontSize: 16 }}>
            {scannerLoading
              ? "Loading live data…"
              : tickers.length
              ? "Live"
              : "No qualifying runners"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 8, color: THEME.text2 }}>
          Top Elite by Score
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: THEME.text2 }}>
              <th>Ticker</th>
              <th>Price</th>
              <th>Gain</th>
              <th>Elite Score</th>
              <th>Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            {topElite.map((t) => (
              <tr
                key={t.ticker}
                style={{
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                <td>{t.ticker}</td>
                <td>{t.price !== null ? t.price.toFixed(2) : "N/A"}</td>
                <td
                  style={{
                    color:
                      t.gainPct !== null && t.gainPct >= 0
                        ? THEME.success
                        : THEME.danger,
                  }}
                >
                  {t.gainPct !== null ? `${t.gainPct.toFixed(2)}%` : "N/A"}
                </td>
                <td style={{ color: THEME.blue }}>
                  {t.eliteScore.toFixed(1)}
                </td>
                <td>{t.lifecycle || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScannerView({
  tickers,
  loading,
  onWatch,
  onWhy,
  onStructure,
  onJournal,
}: {
  tickers: EliteTicker[];
  loading: boolean;
  onWatch: (t: EliteTicker) => void;
  onWhy: (t: EliteTicker) => void;
  onStructure: (t: EliteTicker) => void;
  onJournal: (t: EliteTicker) => void;
}) {
  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Scanner
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        {loading && (
          <div style={{ marginBottom: 12 }}>
            Loading live runners…
          </div>
        )}

        {!loading && !tickers.length && (
          <div style={{ marginBottom: 12 }}>
            No live runners meeting Elite criteria.
          </div>
        )}

        {!!tickers.length && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: THEME.text2 }}>
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
                <th>Proof</th>
                <th>Catalyst</th>
                <th>Env</th>
                <th>Elite</th>
                <th>Verdict</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map((t) => (
                <tr
                  key={t.ticker}
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                  }}
                >
                  <td>{t.ticker}</td>
                  <td>{t.price !== null ? t.price.toFixed(2) : "N/A"}</td>
                  <td
                    style={{
                      color:
                        t.gainPct !== null && t.gainPct >= 0
                          ? THEME.success
                          : THEME.danger,
                    }}
                  >
                    {t.gainPct !== null ? `${t.gainPct.toFixed(2)}%` : "N/A"}
                  </td>
                  <td>
                    {t.spreadPct !== null
                      ? `${(t.spreadPct * 100).toFixed(2)}%`
                      : "N/A"}
                  </td>
                  <td>{t.speedScore ?? "N/A"}</td>
                  <td>{t.volumeAcceleration ?? "N/A"}</td>
                  <td>
                    {t.floatShares !== null
                      ? `${(t.floatShares / 1_000_000).toFixed(1)}M`
                      : "N/A"}
                  </td>
                  <td>
                    {t.supportLevel !== null
                      ? t.supportLevel.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>
                    {t.resistanceLevel !== null
                      ? t.resistanceLevel.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>{t.lifecycle || "N/A"}</td>
                  <td>{t.formationScore ?? "N/A"}</td>
                  <td>{t.journeyScore ?? "N/A"}</td>
                  <td>{t.proofScore ?? "N/A"}</td>
                  <td>{t.catalystStrength ?? "N/A"}</td>
                  <td>{t.environmentScore ?? "N/A"}</td>
                  <td style={{ color: THEME.blue }}>
                    {t.eliteScore.toFixed(1)}
                  </td>
                  <td>{t.verdict || "N/A"}</td>
                  <td>
                    <button
                      onClick={() => onWatch(t)}
                      style={{
                        background: THEME.blue,
                        color: THEME.bg,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "none",
                        marginRight: 4,
                        cursor: "pointer",
                      }}
                    >
                      WATCH
                    </button>
                    <button
                      onClick={() => onWhy(t)}
                      style={{
                        background: THEME.panel,
                        color: THEME.text2,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.border}`,
                        marginRight: 4,
                        cursor: "pointer",
                      }}
                    >
                      WHY
                    </button>
                    <button
                      onClick={() => onStructure(t)}
                      style={{
                        background: THEME.panel,
                        color: THEME.text2,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.border}`,
                        marginRight: 4,
                        cursor: "pointer",
                      }}
                    >
                      STRUCTURE
                    </button>
                    <button
                      onClick={() => onJournal(t)}
                      style={{
                        background: THEME.panel,
                        color: THEME.text2,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.border}`,
                        cursor: "pointer",
                      }}
                    >
                      JOURNAL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormationView({ tickers }: { tickers: EliteTicker[] }) {
  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Formation Engine
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: THEME.text2 }}>
              <th>Ticker</th>
              <th>Price</th>
              <th>Support</th>
              <th>Resistance</th>
              <th>Range Position</th>
              <th>Formation Score</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => {
              const levels = computeStructureLevels(t);
              return (
                <tr
                  key={t.ticker}
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                  }}
                >
                  <td>{t.ticker}</td>
                  <td>{t.price !== null ? t.price.toFixed(2) : "N/A"}</td>
                  <td>
                    {levels?.support !== null
                      ? levels.support.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>
                    {levels?.resistance !== null
                      ? levels.resistance.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>{levels?.rangePosition ?? "N/A"}</td>
                  <td>{t.formationScore ?? "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LifecycleView({ tickers }: { tickers: EliteTicker[] }) {
  const counts = tickers.reduce<Record<string, number>>((acc, t) => {
    const key = t.lifecycle || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const order = [
    "SLEEPING",
    "ACCUMULATING",
    "WAKING",
    "FORMING",
    "IGNITING",
    "RUNNING",
    "EXTENDED",
    "FAILING",
    "UNKNOWN",
  ];

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Runner Lifecycle
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: THEME.text2 }}>
              <th>Lifecycle</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {order.map((state) => (
              <tr
                key={state}
                style={{
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                <td>{state}</td>
                <td>{counts[state] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarketView({
  snapshot,
  loading,
  environmentScore,
}: {
  snapshot: MarketSnapshot;
  loading: boolean;
  environmentScore: number | null;
}) {
  const keys: (keyof MarketSnapshot)[] = ["SPY", "QQQ", "IWM", "VIX"];

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Market Intelligence
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {keys.map((k) => {
          const data = snapshot[k];
          const price =
            data && typeof data.price === "number"
              ? data.price
              : data && typeof data.last === "number"
              ? data.last
              : null;
          const change =
            data && typeof data.changePct === "number"
              ? data.changePct
              : null;

          return (
            <div
              key={k}
              style={{
                background: THEME.panel,
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ color: THEME.text2, marginBottom: 8 }}>
                {k}
              </div>
              <div style={{ fontSize: 20 }}>
                {price !== null ? price.toFixed(2) : "N/A"}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color:
                    change !== null && change >= 0
                      ? THEME.success
                      : THEME.danger,
                }}
              >
                {change !== null ? `${change.toFixed(2)}%` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div style={{ color: THEME.text2, marginBottom: 8 }}>
          Environment Score
        </div>
        <div style={{ fontSize: 24 }}>
          {environmentScore !== null ? environmentScore.toFixed(1) : "N/A"}
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 12 }}>
          Loading live market snapshot…
        </div>
      )}

      {!loading && !snapshot.SPY && !snapshot.QQQ && !snapshot.IWM && !snapshot.VIX && (
        <div style={{ marginTop: 12 }}>
          No live market data returned from /api/market.
        </div>
      )}
    </div>
  );
}

function StructureView({
  tickers,
  selected,
  onSelect,
  watchlist,
  journal,
}: {
  tickers: EliteTicker[];
  selected: EliteTicker | null;
  onSelect: (t: EliteTicker | null) => void;
  watchlist: ReturnType<typeof useWatchlist>;
  journal: ReturnType<typeof useJournal>;
}) {
  const levels = selected ? computeStructureLevels(selected) : null;
  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultTime = now.toTimeString().slice(0, 5);

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Structure Analysis
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ marginBottom: 8, color: THEME.text2 }}>
            Select Ticker
          </div>
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {tickers.map((t) => (
              <button
                key={t.ticker}
                onClick={() => onSelect(t)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderRadius: 4,
                  border: "none",
                  background:
                    selected?.ticker === t.ticker
                      ? THEME.panel
                      : "transparent",
                  color:
                    selected?.ticker === t.ticker
                      ? THEME.text
                      : THEME.text2,
                  cursor: "pointer",
                }}
              >
                {t.ticker} — {t.eliteScore.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          {!selected && (
            <div>Select a ticker to analyze structure.</div>
          )}

          {selected && levels && (
            <>
              <div
                style={{
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: THEME.text2 }}>
                    {selected.ticker}
                  </div>
                  <div style={{ fontSize: 20 }}>
                    {selected.price !== null
                      ? selected.price.toFixed(2)
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => watchlist.add(selected)}
                    style={{
                      background: THEME.blue,
                      color: THEME.bg,
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "none",
                      marginRight: 4,
                      cursor: "pointer",
                    }}
                  >
                    APPLY TO WATCHLIST
                  </button>
                  <button
                    onClick={() =>
                      journal.add({
                        date: defaultDate,
                        time: defaultTime,
                        ticker: selected.ticker,
                        entry: levels.aggressiveEntry ?? undefined,
                        exit: levels.stop ?? undefined,
                        reason: "Structure-based plan",
                        evidence: "Support, spread, speed, volume, structure.",
                        mistake: "",
                        lesson: "",
                        outcome: "",
                      })
                    }
                    style={{
                      background: THEME.panel,
                      color: THEME.text2,
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: `1px solid ${THEME.border}`,
                      cursor: "pointer",
                    }}
                  >
                    SEND TO JOURNAL
                  </button>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Support</td>
                    <td>
                      {levels.support !== null
                        ? levels.support.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Resistance</td>
                    <td>
                      {levels.resistance !== null
                        ? levels.resistance.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Range Position</td>
                    <td>{levels.rangePosition}</td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Formation Entry</td>
                    <td>
                      {levels.formationEntry !== null
                        ? levels.formationEntry.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Aggressive Entry</td>
                    <td>
                      {levels.aggressiveEntry !== null
                        ? levels.aggressiveEntry.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Confirmation Entry</td>
                    <td>
                      {levels.confirmationEntry !== null
                        ? levels.confirmationEntry.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Proof Entry</td>
                    <td>
                      {levels.proofEntry !== null
                        ? levels.proofEntry.toFixed(2)
                        : "NO PROOF = NO TRADE"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Stop</td>
                    <td>
                      {levels.stop !== null
                        ? levels.stop.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Target 1</td>
                    <td>
                      {levels.target1 !== null
                        ? levels.target1.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Target 2</td>
                    <td>
                      {levels.target2 !== null
                        ? levels.target2.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Target 3</td>
                    <td>
                      {levels.target3 !== null
                        ? levels.target3.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: THEME.text2 }}>Risk Reward</td>
                    <td>
                      {levels.riskReward !== null
                        ? levels.riskReward.toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  marginTop: 12,
                  color: THEME.warning,
                }}
              >
                Resistance alone never creates entries. Support, spread, speed,
                volume acceleration, and structure must align.
              </div>
            </>
          )}

          {selected && !levels && (
            <div>
              Structure levels cannot be computed from current data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchlistView({
  watchlist,
}: {
  watchlist: ReturnType<typeof useWatchlist>;
}) {
  const { items, remove, updateNotes, updateStatus } = watchlist;

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Watchlist
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        {!items.length && (
          <div>No tickers in watchlist.</div>
        )}

        {!!items.length && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: THEME.text2 }}>
                <th>Ticker</th>
                <th>Status</th>
                <th>Lifecycle</th>
                <th>Elite Score</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.ticker}
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                  }}
                >
                  <td>{item.ticker}</td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(item.ticker, e.target.value)
                      }
                      style={{
                        background: THEME.bg,
                        color: THEME.text,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 4,
                        padding: "2px 4px",
                      }}
                    >
                      <option value="PLANNED">PLANNED</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="INVALIDATED">INVALIDATED</option>
                    </select>
                  </td>
                  <td>{item.lifecycle || "N/A"}</td>
                  <td style={{ color: THEME.blue }}>
                    {item.eliteScore.toFixed(1)}
                  </td>
                  <td>
                    <textarea
                      value={item.notes}
                      onChange={(e) =>
                        updateNotes(item.ticker, e.target.value)
                      }
                      rows={2}
                      style={{
                        width: "100%",
                        background: THEME.bg,
                        color: THEME.text,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 4,
                      }}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => remove(item.ticker)}
                      style={{
                        background: THEME.danger,
                        color: THEME.bg,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      REMOVE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function JournalView({
  journal,
}: {
  journal: ReturnType<typeof useJournal>;
}) {
  const { entries, remove } = journal;

  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Journal
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        {!entries.length && (
          <div>No journal entries yet.</div>
        )}

        {!!entries.length && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: THEME.text2 }}>
                <th>Date</th>
                <th>Time</th>
                <th>Ticker</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Reason</th>
                <th>Evidence</th>
                <th>Mistake</th>
                <th>Lesson</th>
                <th>Outcome</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                  }}
                >
                  <td>{e.date}</td>
                  <td>{e.time}</td>
                  <td>{e.ticker}</td>
                  <td>
                    {e.entry !== undefined && e.entry !== null
                      ? e.entry.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>
                    {e.exit !== undefined && e.exit !== null
                      ? e.exit.toFixed(2)
                      : "N/A"}
                  </td>
                  <td>{e.reason}</td>
                  <td>{e.evidence}</td>
                  <td>{e.mistake}</td>
                  <td>{e.lesson}</td>
                  <td>{e.outcome}</td>
                  <td>
                    <button
                      onClick={() => remove(e.id)}
                      style={{
                        background: THEME.danger,
                        color: THEME.bg,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div>
      <h1
        style={{
          color: THEME.blue,
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        Settings
      </h1>

      <div
        style={{
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div style={{ color: THEME.text2, marginBottom: 8 }}>
          Scanner & Risk Preferences
        </div>
        <ul style={{ marginLeft: 16 }}>
          <li>Elite Score is primary ranking metric.</li>
          <li>Evidence over prediction. No proof = no trade.</li>
          <li>Resistance alone never creates entries.</li>
        </ul>
      </div>
    </div>
  );
}

function WhyPanel({
  ticker,
  onClose,
}: {
  ticker: EliteTicker;
  onClose: () => void;
}) {
  const ctx = buildWhyContext(ticker);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "80%",
          maxWidth: 900,
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ color: THEME.text2 }}>
              WHY — {ticker.ticker}
            </div>
            <div style={{ fontSize: 18 }}>
              What evidence supports this thesis?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: THEME.text2,
              border: "none",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ color: THEME.success, marginBottom: 8 }}>
              Positive Evidence
            </div>
            <ul>
              {ctx.positiveEvidence.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ color: THEME.danger, marginBottom: 8 }}>
              Negative Evidence (Invalidation)
            </div>
            <ul>
              {ctx.negativeEvidence.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div style={{ color: THEME.text2 }}>Support Quality</div>
            <div>{ctx.supportQuality}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Resistance Quality</div>
            <div>{ctx.resistanceQuality}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Spread Behavior</div>
            <div>{ctx.spreadBehavior}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Speed Behavior</div>
            <div>{ctx.speedBehavior}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Volume Behavior</div>
            <div>{ctx.volumeBehavior}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Catalyst Analysis</div>
            <div>{ctx.catalystAnalysis}</div>
          </div>
          <div>
            <div style={{ color: THEME.text2 }}>Environment Analysis</div>
            <div>{ctx.environmentAnalysis}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            color: THEME.warning,
          }}
        >
          Evidence over prediction. No proof = no trade.
        </div>
      </div>
    </div>
  );
}
