"use client";

import { useEffect, useMemo, useState } from "react";

type Page =
  | "dashboard"
  | "scanner"
  | "formation"
  | "lifecycle"
  | "structure"
  | "watchlist"
  | "journal"
  | "settings";

type Lifecycle =
  | "SLEEPING"
  | "ACCUMULATING"
  | "WAKING"
  | "FORMING"
  | "IGNITING"
  | "RUNNING"
  | "EXTENDED"
  | "FAILING";

type Verdict = "YES" | "WAIT" | "NO";

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  spread: number;
  speed: number;
  volumeAcceleration: number;
  float: number;
  support: number;
  resistance: number;
  rangePosition: number;
  spreadScore: number;
  speedScore: number;
  volumeAccelerationScore: number;
  floatScore: number;
  supportScore: number;
  catalystScore: number;
  environmentScore: number;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  eliteScore: number;
  lifecycle: Lifecycle;
  verdict: Verdict;
  positiveEvidence: string[];
  negativeEvidence: string[];
  invalidation: string;
};

type WatchItem = {
  ticker: string;
  notes: string;
  addedAt: string;
};

type JournalEntry = {
  id: string;
  date: string;
  time: string;
  ticker: string;
  price: number;
  gain: number;
  lifecycle: string;
  eliteScore: number;
  reason: string;
  evidence: string;
  mistake: string;
  lesson: string;
  outcome: string;
};

type Structure = {
  ticker: string;
  price: number;
  support: number;
  resistance: number;
};

const API = "/api/gainers";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function money(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "N/A";
  return "$" + v.toFixed(v < 1 ? 4 : 2);
}

function pct(v: number): string {
  if (!Number.isFinite(v)) return "N/A";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function volume(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "N/A";
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toString();
}

function tickerList(json: any): any[] {
  if (Array.isArray(json?.data?.tickers)) return json.data.tickers;
  if (Array.isArray(json?.tickers)) return json.tickers;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

function isJunkTicker(ticker: string): boolean {
  const t = ticker.toUpperCase();
  return (
    !t ||
    t.endsWith("W") ||
    t.endsWith("WS") ||
    t.endsWith("U") ||
    t.endsWith("R") ||
    t.includes(".")
  );
}

function floatScore(floatValue: number): number {
  if (!floatValue) return 45;
  if (floatValue <= 2_000_000) return 100;
  if (floatValue <= 5_000_000) return 90;
  if (floatValue <= 10_000_000) return 78;
  if (floatValue <= 25_000_000) return 55;
  if (floatValue <= 75_000_000) return 35;
  return 18;
}

function spreadScore(spread: number, price: number): number {
  if (!spread || !price) return 50;
  const pctSpread = (spread / price) * 100;
  if (pctSpread <= 0.5) return 100;
  if (pctSpread <= 1) return 90;
  if (pctSpread <= 2) return 75;
  if (pctSpread <= 4) return 52;
  if (pctSpread <= 7) return 30;
  return 12;
}

function classify(stock: {
  gain: number;
  price: number;
  support: number;
  spreadScore: number;
  speedScore: number;
  volumeAccelerationScore: number;
  formationScore: number;
  eliteScore: number;
}): Lifecycle {
  if (stock.price > 0 && stock.support > 0 && stock.price < stock.support) {
    return "FAILING";
  }

  if (stock.gain >= 75) return "EXTENDED";

  if (stock.eliteScore >= 88) return "RUNNING";
  if (stock.eliteScore >= 78 && stock.formationScore >= 65) return "IGNITING";
  if (stock.formationScore >= 62 && stock.gain >= 5 && stock.gain <= 50) {
    return "FORMING";
  }

  if (
    stock.spreadScore >= 55 &&
    stock.speedScore >= 50 &&
    stock.volumeAccelerationScore >= 50
  ) {
    return "WAKING";
  }

  if (stock.speedScore >= 35 || stock.volumeAccelerationScore >= 35) {
    return "ACCUMULATING";
  }

  return "SLEEPING";
}

function normalize(raw: any, index: number): Stock {
  const ticker = String(raw?.ticker || raw?.T || raw?.symbol || "")
    .toUpperCase()
    .trim();

  const price = num(
    raw?.price ??
      raw?.last ??
      raw?.lastPrice ??
      raw?.day?.c ??
      raw?.min?.c ??
      raw?.c ??
      ((raw?.prevDay?.c ?? 0) + (raw?.todaysChange ?? 0))
  );

  const gain = num(
    raw?.gain ??
      raw?.todaysChangePerc ??
      raw?.percentChange ??
      raw?.changePercent
  );

  const change = num(raw?.change ?? raw?.todaysChange ?? raw?.netChange);
  const vol = num(raw?.volume ?? raw?.day?.v ?? raw?.min?.v ?? raw?.v);

  const high = num(raw?.high ?? raw?.day?.h ?? raw?.h ?? price * 1.08);
  const low = num(raw?.low ?? raw?.day?.l ?? raw?.l ?? price * 0.94);

  const bid = num(raw?.bid ?? raw?.lastQuote?.bid ?? raw?.lastQuote?.bp);
  const ask = num(raw?.ask ?? raw?.lastQuote?.ask ?? raw?.lastQuote?.ap);
  const spread = num(raw?.spread ?? (ask > bid && bid > 0 ? ask - bid : 0));

  const floatValue = num(
    raw?.float ??
      raw?.sharesFloat ??
      raw?.floatSize ??
      raw?.share_class_shares_outstanding
  );

  const support = low || price;
  const resistance = high || price;
  const range = Math.max(0.0001, resistance - support);
  const rangePosition = clamp(((price - support) / range) * 100);

  const spreadQ = spreadScore(spread, price);
  const volAccel = clamp(
    num(
      raw?.volumeAcceleration ??
        raw?.volumeSurge ??
        raw?.relativeVolume ??
        raw?.rvol ??
        (vol > 0 ? vol / 100_000 : 0)
    ) * 8
  );

  const speed = clamp(
    num(
      raw?.speed ??
        raw?.speedScore ??
        raw?.velocity ??
        Math.max(0, gain) * 0.85 + volAccel * 0.35 + Math.max(0, 100 - index * 2) * 0.07
    )
  );

  const speedQ = clamp(speed);
  const volumeQ = clamp(volAccel);
  const floatQ = floatScore(floatValue);

  const supportQ =
    price <= 0 || support <= 0
      ? 45
      : price < support
      ? 0
      : rangePosition <= 15
      ? 82
      : rangePosition <= 55
      ? 92
      : rangePosition <= 75
      ? 70
      : 48;

  const catalystQ = clamp(num(raw?.catalystScore ?? raw?.newsScore ?? 50));
  const environmentQ = 50;

  const formationScore = Math.round(
    clamp(
      spreadQ * 0.2 +
        speedQ * 0.2 +
        volumeQ * 0.2 +
        floatQ * 0.1 +
        supportQ * 0.2 +
        (gain >= 5 && gain <= 50 ? 10 : gain >= 75 ? -18 : 2)
    )
  );

  const journeyScore = Math.round(
    clamp(
      formationScore * 0.45 +
        speedQ * 0.2 +
        volumeQ * 0.2 +
        (gain >= 5 && gain <= 50 ? 15 : gain >= 75 ? -20 : 5)
    )
  );

  const proofScore = Math.round(
    clamp(
      supportQ * 0.24 +
        spreadQ * 0.18 +
        speedQ * 0.18 +
        volumeQ * 0.16 +
        catalystQ * 0.1 +
        environmentQ * 0.08 +
        (price > resistance && resistance > 0 ? 6 : 0)
    )
  );

  const eliteScore = Math.round(
    clamp(
      spreadQ * 0.2 +
        speedQ * 0.2 +
        volumeQ * 0.2 +
        floatQ * 0.1 +
        supportQ * 0.1 +
        catalystQ * 0.1 +
        environmentQ * 0.1 +
        journeyScore * 0.1
    )
  );

  const lifecycle = classify({
    gain,
    price,
    support,
    spreadScore: spreadQ,
    speedScore: speedQ,
    volumeAccelerationScore: volumeQ,
    formationScore,
    eliteScore,
  });

  const verdict: Verdict =
    lifecycle === "FAILING" || lifecycle === "EXTENDED"
      ? "WAIT"
      : eliteScore >= 80 && proofScore >= 68
      ? "YES"
      : eliteScore >= 55 || formationScore >= 58
      ? "WAIT"
      : "NO";

  const positiveEvidence: string[] = [];
  const negativeEvidence: string[] = [];

  if (spreadQ >= 75) positiveEvidence.push("Spread quality supports controlled entry and exit.");
  else negativeEvidence.push("Spread quality is weak, wide, or unavailable.");

  if (speedQ >= 60) positiveEvidence.push("Speed is increasing.");
  else negativeEvidence.push("Speed is not yet strong.");

  if (volumeQ >= 60) positiveEvidence.push("Volume acceleration is active.");
  else negativeEvidence.push("Volume acceleration is limited.");

  if (floatQ >= 75) positiveEvidence.push("Float profile is favorable.");
  else negativeEvidence.push("Float is unknown or less favorable.");

  if (supportQ >= 70) positiveEvidence.push("Support structure is holding.");
  else negativeEvidence.push("Support quality is weak or failing.");

  if (gain >= 5 && gain <= 50) positiveEvidence.push("Gain is inside preferred formation zone.");
  if (gain >= 75) negativeEvidence.push("Move is extended and carries chase risk.");

  if (catalystQ >= 65) positiveEvidence.push("Catalyst score supports attention.");
  else negativeEvidence.push("Catalyst strength is unconfirmed.");

  const invalidation =
    support > 0
      ? `Support failure below ${money(support)}, spread widening, speed collapse, or volume acceleration fading.`
      : "Support failure, spread widening, speed collapse, or volume acceleration fading.";

  return {
    ticker,
    price,
    gain,
    change,
    volume: vol,
    spread,
    speed,
    volumeAcceleration: volAccel,
    float: floatValue,
    support,
    resistance,
    rangePosition,
    spreadScore: spreadQ,
    speedScore: speedQ,
    volumeAccelerationScore: volumeQ,
    floatScore: floatQ,
    supportScore: supportQ,
    catalystScore: catalystQ,
    environmentScore: environmentQ,
    formationScore,
    journeyScore,
    proofScore,
    eliteScore,
    lifecycle,
    verdict,
    positiveEvidence,
    negativeEvidence,
    invalidation,
  };
}

function formationEntry(s: Structure): number {
  const range = Math.max(0.0001, s.resistance - s.support);
  return s.support + range * 0.3;
}

function aggressiveEntry(s: Structure): number {
  const range = Math.max(0.0001, s.resistance - s.support);
  return Math.max(s.price, s.support + range * 0.42);
}

function confirmationEntry(s: Structure): number {
  return s.resistance * 1.01;
}

function proofEntry(s: Structure): number {
  return s.resistance * 1.035;
}

function target(s: Structure, multiple: number): number {
  const risk = proofEntry(s) - s.support;
  return proofEntry(s) + Math.max(risk, 0) * multiple;
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [apiStatus, setApiStatus] = useState("LOADING");
  const [lastUpdate, setLastUpdate] = useState("NEVER");
  const [source, setSource] = useState("POLYGON");
  const [refreshRate, setRefreshRate] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [premarket, setPremarket] = useState(true);
  const [regular, setRegular] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [history, setHistory] = useState<
    {
      ticker: string;
      seenAt: string;
      gain: number;
      volume: number;
      lifecycle: Lifecycle;
      journeyScore: number;
      eliteScore: number;
    }[]
  >([]);

  const [structure, setStructure] = useState<Structure>({
    ticker: "",
    price: 0,
    support: 0,
    resistance: 0,
  });

  useEffect(() => {
    const w = localStorage.getItem("pose_watchlist");
    const j = localStorage.getItem("pose_journal");
    const h = localStorage.getItem("pose_history");

    if (w) setWatchlist(JSON.parse(w));
    if (j) setJournal(JSON.parse(j));
    if (h) setHistory(JSON.parse(h));
  }, []);

  useEffect(() => {
    localStorage.setItem("pose_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("pose_journal", JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem("pose_history", JSON.stringify(history.slice(-500)));
  }, [history]);

  async function loadScanner() {
    setApiStatus("CONNECTING");

    try {
      const res = await fetch(API, { cache: "no-store" });
      const json = await res.json();
      const list = tickerList(json);

      setSource(String(json?.source || "POLYGON"));
      setLastUpdate(new Date().toLocaleTimeString("en-US"));

      if (!Array.isArray(list) || list.length === 0) {
        setStocks([]);
        setApiStatus("NO LIVE DATA");
        return;
      }

      const normalized = list
        .map((x, i) => normalize(x, i))
        .filter((s) => s.ticker && !isJunkTicker(s.ticker));

      setStocks(normalized);
      setApiStatus("CONNECTED");

      const seenAt = new Date().toISOString();

      setHistory((prev) =>
        [
          ...prev,
          ...normalized.map((s) => ({
            ticker: s.ticker,
            seenAt,
            gain: s.gain,
            volume: s.volume,
            lifecycle: s.lifecycle,
            journeyScore: s.journeyScore,
            eliteScore: s.eliteScore,
          })),
        ].slice(-500)
      );
    } catch {
      setStocks([]);
      setApiStatus("DISCONNECTED");
      setLastUpdate(new Date().toLocaleTimeString("en-US"));
    }
  }

  useEffect(() => {
    loadScanner();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadScanner, Math.max(5, refreshRate) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshRate]);

  const ranked = useMemo(() => {
    return [...stocks].sort((a, b) => b.eliteScore - a.eliteScore);
  }, [stocks]);

  const formation = useMemo(() => {
    return [...stocks]
      .filter((s) => s.gain >= 5 && s.gain <= 50 && s.lifecycle !== "FAILING")
      .sort((a, b) => b.formationScore - a.formationScore);
  }, [stocks]);

  const rejected = useMemo(() => {
    return stocks.filter(
      (s) =>
        s.lifecycle === "FAILING" ||
        s.lifecycle === "EXTENDED" ||
        s.verdict === "NO" ||
        s.eliteScore < 45
    );
  }, [stocks]);

  const selected = useMemo(() => {
    return stocks.find((s) => s.ticker === selectedTicker) || ranked[0] || null;
  }, [stocks, selectedTicker, ranked]);

  const lifecycleRows = useMemo(() => {
    const map = new Map<string, typeof history>();

    for (const h of history) {
      const list = map.get(h.ticker) || [];
      list.push(h);
      map.set(h.ticker, list);
    }

    return Array.from(map.entries())
      .map(([ticker, list]) => {
        const sorted = [...list].sort((a, b) => a.seenAt.localeCompare(b.seenAt));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        return {
          ticker,
          firstSeen: new Date(first.seenAt).toLocaleTimeString("en-US"),
          gainNow: last.gain,
          gainChange: last.gain - first.gain,
          volumeChange: last.volume - first.volume,
          lifecycle: last.lifecycle,
          journeyChange: last.journeyScore - first.journeyScore,
          eliteChange: last.eliteScore - first.eliteScore,
          eliteScore: last.eliteScore,
        };
      })
      .sort((a, b) => b.eliteScore - a.eliteScore);
  }, [history]);

  function addWatch(s: Stock) {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === s.ticker)) return prev;
      return [
        ...prev,
        {
          ticker: s.ticker,
          notes: "",
          addedAt: new Date().toLocaleString("en-US"),
        },
      ];
    });
  }

  function removeWatch(ticker: string) {
    setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
  }

  function updateWatchNote(ticker: string, notes: string) {
    setWatchlist((prev) =>
      prev.map((w) => (w.ticker === ticker ? { ...w, notes } : w))
    );
  }

  function why(s: Stock) {
    setSelectedTicker(s.ticker);
  }

  function openStructure(s: Stock) {
    setSelectedTicker(s.ticker);
    setStructure({
      ticker: s.ticker,
      price: s.price,
      support: s.support,
      resistance: s.resistance,
    });
    setPage("structure");
  }

  function addJournal(s: Stock) {
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString("en-US"),
      time: new Date().toLocaleTimeString("en-US"),
      ticker: s.ticker,
      price: s.price,
      gain: s.gain,
      lifecycle: s.lifecycle,
      eliteScore: s.eliteScore,
      reason: "Scanner action",
      evidence: s.positiveEvidence.join(" | "),
      mistake: "",
      lesson: "",
      outcome: "",
    };

    setJournal((prev) => [entry, ...prev]);
    setPage("journal");
  }

  function deleteJournal(id: string) {
    setJournal((prev) => prev.filter((j) => j.id !== id));
  }

  function updateJournal(id: string, field: keyof JournalEntry, value: string) {
    setJournal((prev) =>
      prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  }

  const topElite = ranked[0];
  const topFormation = formation[0];
  const topVolume = [...stocks].sort(
    (a, b) => b.volumeAccelerationScore - a.volumeAccelerationScore
  )[0];
  const topFloat = [...stocks].sort((a, b) => b.floatScore - a.floatScore)[0];
  const topRisk = rejected[0];

  return (
    <main className="terminal">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">P/S</div>
          <div>
            <strong>PROOF OF STRUCTURE™ ELITE</strong>
            <span>Evidence Before Entry</span>
          </div>
        </div>

        <nav>
          {[
            ["dashboard", "Dashboard"],
            ["scanner", "Scanner"],
            ["formation", "Formation Engine"],
            ["lifecycle", "Runner Lifecycle"],
            ["structure", "Structure Analysis"],
            ["watchlist", "Watchlist"],
            ["journal", "Journal"],
            ["settings", "Settings"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPage(key as Page)}
              className={page === key ? "active" : ""}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="side">
          <Label label="API" value={apiStatus} tone={apiStatus === "CONNECTED" ? "good" : "warn"} />
          <Label label="Source" value={source} />
          <Label label="Last" value={lastUpdate} />
        </div>

        <div className="side">
          <Label label="Market Environment" value="UNAVAILABLE" tone="warn" />
          <Label label="Environment Score" value="50" />
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{title(page)}</h1>
            <p>Institutional grey terminal · blue-letter market intelligence · live API only</p>
          </div>
          <div className="topActions">
            <button onClick={loadScanner}>SCAN NOW</button>
            <button onClick={() => setAutoRefresh((x) => !x)}>
              AUTO {autoRefresh ? "ON" : "OFF"}
            </button>
          </div>
        </header>

        <section className="layout">
          <section className="mainPanel">
            {page === "dashboard" && (
              <>
                <div className="cards">
                  <Metric title="Top Elite Candidate" value={topElite?.ticker || "NONE"} sub={topElite ? `Elite ${topElite.eliteScore}` : "No live symbols"} />
                  <Metric title="Top Formation" value={topFormation?.ticker || "NONE"} sub={topFormation ? `Formation ${topFormation.formationScore}` : "No formation candidates"} />
                  <Metric title="Volume Acceleration" value={topVolume?.ticker || "NONE"} sub={topVolume ? `${topVolume.volumeAccelerationScore}` : "No live symbols"} />
                  <Metric title="Risk Warning" value={topRisk?.ticker || "NONE"} sub={topRisk ? topRisk.lifecycle : "No risk warnings"} danger={!!topRisk} />
                </div>

                <Panel title="Command Center">
                  <div className="grid">
                    <Label label="API Status" value={apiStatus} />
                    <Label label="Last Update" value={lastUpdate} />
                    <Label label="Data Source" value={source} />
                    <Label label="Total Symbols" value={stocks.length} />
                    <Label label="Passing Symbols" value={ranked.filter((s) => s.verdict !== "NO").length} />
                    <Label label="Rejected Symbols" value={rejected.length} />
                    <Label label="Top Lifecycle" value={topElite?.lifecycle || "NONE"} />
                    <Label label="Market Environment" value="UNAVAILABLE" tone="warn" />
                  </div>
                </Panel>

                <ScannerTable rows={ranked.slice(0, 12)} onWatch={addWatch} onWhy={why} onStructure={openStructure} onJournal={addJournal} />
              </>
            )}

            {page === "scanner" && (
              <ScannerTable rows={ranked} onWatch={addWatch} onWhy={why} onStructure={openStructure} onJournal={addJournal} />
            )}

            {page === "formation" && (
              <Panel title="Formation Engine">
                <p className="sectionText">
                  Ranks live symbols by formation quality. Preferred zone: 5%–50% gain with spread quality,
                  speed, volume acceleration, float profile, and support integrity.
                </p>
                <ScannerTable rows={formation} onWatch={addWatch} onWhy={why} onStructure={openStructure} onJournal={addJournal} />
              </Panel>
            )}

            {page === "lifecycle" && (
              <Panel title="Runner Lifecycle">
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>First Seen</th>
                        <th>Gain Now</th>
                        <th>Gain Change</th>
                        <th>Volume Change</th>
                        <th>Lifecycle</th>
                        <th>Journey Δ</th>
                        <th>Elite Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lifecycleRows.length === 0 ? (
                        <tr><td colSpan={8}>NO LIFECYCLE DATA YET</td></tr>
                      ) : (
                        lifecycleRows.map((r) => (
                          <tr key={r.ticker}>
                            <td>{r.ticker}</td>
                            <td>{r.firstSeen}</td>
                            <td>{pct(r.gainNow)}</td>
                            <td>{pct(r.gainChange)}</td>
                            <td>{volume(r.volumeChange)}</td>
                            <td><Badge value={r.lifecycle} /></td>
                            <td>{r.journeyChange}</td>
                            <td>{r.eliteChange}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {page === "structure" && (
              <Panel title="Structure Analysis">
                <div className="formGrid">
                  <Field label="Ticker" value={structure.ticker} onChange={(v) => setStructure({ ...structure, ticker: v.toUpperCase() })} />
                  <Field label="Current Price" value={structure.price} number onChange={(v) => setStructure({ ...structure, price: num(v) })} />
                  <Field label="Support" value={structure.support} number onChange={(v) => setStructure({ ...structure, support: num(v) })} />
                  <Field label="Resistance" value={structure.resistance} number onChange={(v) => setStructure({ ...structure, resistance: num(v) })} />
                </div>

                <div className="grid">
                  <Label label="Range Position" value={`${clamp(((structure.price - structure.support) / Math.max(0.0001, structure.resistance - structure.support)) * 100).toFixed(0)}%`} />
                  <Label label="Formation Entry" value={money(formationEntry(structure))} />
                  <Label label="Aggressive Entry" value={money(aggressiveEntry(structure))} />
                  <Label label="Confirmation Entry" value={money(confirmationEntry(structure))} />
                  <Label label="Proof Entry" value={money(proofEntry(structure))} />
                  <Label label="Stop" value={money(structure.support)} />
                  <Label label="Target 1" value={money(target(structure, 1))} />
                  <Label label="Target 2" value={money(target(structure, 2))} />
                  <Label label="Target 3" value={money(target(structure, 3))} />
                  <Label label="Risk Reward" value={((target(structure, 1) - proofEntry(structure)) / Math.max(0.0001, proofEntry(structure) - structure.support)).toFixed(2)} />
                </div>
              </Panel>
            )}

            {page === "watchlist" && (
              <Panel title="Watchlist">
                <div className="stack">
                  {watchlist.length === 0 ? <p className="sectionText">No saved tickers yet.</p> : null}
                  {watchlist.map((w) => {
                    const live = stocks.find((s) => s.ticker === w.ticker);
                    return (
                      <div className="watchRow" key={w.ticker}>
                        <div>
                          <strong>{w.ticker}</strong>
                          <span>{live ? `${live.lifecycle} · Elite ${live.eliteScore}` : "Not in current scan"}</span>
                        </div>
                        <textarea value={w.notes} onChange={(e) => updateWatchNote(w.ticker, e.target.value)} placeholder="Notes" />
                        <button onClick={() => live && openStructure(live)}>STRUCTURE</button>
                        <button onClick={() => live && addJournal(live)}>JOURNAL</button>
                        <button onClick={() => removeWatch(w.ticker)}>REMOVE</button>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {page === "journal" && (
              <Panel title="Journal">
                <div className="stack">
                  {journal.length === 0 ? <p className="sectionText">No journal entries yet.</p> : null}
                  {journal.map((j) => (
                    <div className="journalRow" key={j.id}>
                      <div className="journalHead">
                        <strong>{j.ticker}</strong>
                        <span>{j.date} {j.time} · {money(j.price)} · Elite {j.eliteScore}</span>
                        <button onClick={() => deleteJournal(j.id)}>DELETE</button>
                      </div>
                      <textarea value={j.reason} onChange={(e) => updateJournal(j.id, "reason", e.target.value)} placeholder="Reason" />
                      <textarea value={j.evidence} onChange={(e) => updateJournal(j.id, "evidence", e.target.value)} placeholder="Evidence" />
                      <textarea value={j.mistake} onChange={(e) => updateJournal(j.id, "mistake", e.target.value)} placeholder="Mistake" />
                      <textarea value={j.lesson} onChange={(e) => updateJournal(j.id, "lesson", e.target.value)} placeholder="Lesson" />
                      <textarea value={j.outcome} onChange={(e) => updateJournal(j.id, "outcome", e.target.value)} placeholder="Outcome" />
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {page === "settings" && (
              <Panel title="Settings">
                <div className="grid">
                  <Label label="Version" value="New Project · v1.0" />
                  <Label label="API Endpoint" value={API} />
                  <Label label="API Status" value={apiStatus} />
                  <Label label="Data Source" value={source} />
                  <Label label="Premarket" value={premarket ? "ON" : "OFF"} />
                  <Label label="Regular" value={regular ? "ON" : "OFF"} />
                </div>

                <div className="formGrid">
                  <label>
                    Refresh Rate
                    <input type="number" value={refreshRate} onChange={(e) => setRefreshRate(num(e.target.value))} />
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={premarket} onChange={() => setPremarket((x) => !x)} />
                    Premarket
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={regular} onChange={() => setRegular((x) => !x)} />
                    Regular Market
                  </label>
                </div>
              </Panel>
            )}
          </section>

          <aside className="rightPanel">
            <SelectedPanel stock={selected} />
          </aside>
        </section>
      </section>

      <style jsx global>{`
        .terminal{min-height:100vh;display:grid;grid-template-columns:250px minmax(0,1fr);background:#20242b;color:#e6eaf0}
        .sidebar{background:#1b2027;border-right:1px solid #3a404c;padding:16px;display:flex;flex-direction:column;gap:16px}
        .brand{display:flex;gap:12px;align-items:center;padding-bottom:12px;border-bottom:1px solid #3a404c}
        .mark{width:42px;height:42px;display:grid;place-items:center;border:1px solid #4da3ff;color:#4da3ff;font-weight:900}
        .brand strong{display:block;font-size:12px;letter-spacing:.08em}
        .brand span{display:block;color:#9aa4b2;font-size:12px;margin-top:4px}
        nav{display:grid;gap:8px}
        button{border:1px solid #3a404c;background:#2a2f38;color:#e6eaf0;padding:8px 10px;border-radius:8px}
        button:hover,button.active{border-color:#4da3ff;color:#4da3ff;background:#1b2027}
        .side,.panel,.metric{background:#2a2f38;border:1px solid #3a404c;border-radius:12px;padding:12px}
        .workspace{min-width:0;padding:16px}
        .topbar{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:16px}
        h1{margin:0;color:#4da3ff;font-size:26px;letter-spacing:.03em}
        .topbar p,.sectionText{color:#9aa4b2;margin:6px 0 0}
        .topActions{display:flex;gap:8px}
        .layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
        .mainPanel{min-width:0;display:grid;gap:16px}
        .rightPanel{position:sticky;top:16px}
        .panelTitle{color:#4da3ff;letter-spacing:.12em;font-size:12px;font-weight:900;margin-bottom:12px;text-transform:uppercase}
        .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .metric span{color:#9aa4b2;font-size:12px;text-transform:uppercase;letter-spacing:.1em}
        .metric strong{display:block;margin-top:10px;font-size:22px}
        .metric small{color:#4da3ff}
        .metric.danger small{color:#ff5c5c}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px}
        .label{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #3a404c;padding:8px 0;color:#9aa4b2}
        .label b{color:#e6eaf0;text-align:right}
        .good{color:#00d084!important}.warn{color:#ffb547!important}.bad{color:#ff5c5c!important}
        .tableWrap{overflow:auto;border:1px solid #3a404c;border-radius:10px}
        table{width:100%;min-width:1500px;border-collapse:collapse}
        th{background:#1b2027;color:#4da3ff;text-align:left;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:9px;border-bottom:1px solid #3a404c;white-space:nowrap}
        td{padding:8px 9px;border-bottom:1px solid #3a404c;white-space:nowrap;font-size:13px}
        tr:hover td{background:#262d36}
        .actions{display:flex;gap:6px}
        .actions button{padding:5px 8px;font-size:11px}
        .badge{padding:3px 7px;border-radius:999px;border:1px solid #3a404c;font-size:11px}
        .badge.green{border-color:#00d084;color:#00d084}
        .badge.yellow{border-color:#ffb547;color:#ffb547}
        .badge.red{border-color:#ff5c5c;color:#ff5c5c}
        .stack{display:grid;gap:10px}
        .watchRow,.journalRow{border:1px solid #3a404c;background:#1b2027;border-radius:10px;padding:10px;display:grid;gap:8px}
        .watchRow div:first-child,.journalHead{display:flex;justify-content:space-between;gap:12px;align-items:center}
        .watchRow span,.journalHead span{color:#9aa4b2}
        textarea,input{width:100%;border:1px solid #3a404c;background:#1b2027;color:#e6eaf0;border-radius:8px;padding:8px}
        textarea{min-height:64px;resize:vertical}
        .formGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
        label{color:#9aa4b2;display:grid;gap:6px;font-size:13px}
        .check{display:flex;align-items:center;gap:8px}
        .check input{width:auto}
        .evidenceList{margin:0;padding-left:18px}
        .evidenceList li{margin:6px 0}
        @media(max-width:1200px){
          .terminal{grid-template-columns:1fr}
          .layout{grid-template-columns:1fr}
          .rightPanel{position:relative;top:auto}
          .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
          .formGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
      `}</style>
    </main>
  );
}

function title(page: Page): string {
  const map: Record<Page, string> = {
    dashboard: "Command Center",
    scanner: "Scanner",
    formation: "Formation Engine",
    lifecycle: "Runner Lifecycle",
    structure: "Structure Analysis",
    watchlist: "Watchlist",
    journal: "Journal",
    settings: "Settings",
  };
  return map[page];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panelTitle">{title}</div>
      {children}
    </section>
  );
}

function Metric({
  title,
  value,
  sub,
  danger = false,
}: {
  title: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className={`metric ${danger ? "danger" : ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function Label({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="label">
      <span>{label}</span>
      <b className={tone || ""}>{value}</b>
    </div>
  );
}

function Badge({ value }: { value: Lifecycle | Verdict }) {
  const red = value === "EXTENDED" || value === "FAILING" || value === "NO";
  const green =
    value === "FORMING" ||
    value === "IGNITING" ||
    value === "RUNNING" ||
    value === "YES";

  return <span className={`badge ${red ? "red" : green ? "green" : "yellow"}`}>{value}</span>;
}

function ScannerTable({
  rows,
  onWatch,
  onWhy,
  onStructure,
  onJournal,
}: {
  rows: Stock[];
  onWatch: (s: Stock) => void;
  onWhy: (s: Stock) => void;
  onStructure: (s: Stock) => void;
  onJournal: (s: Stock) => void;
}) {
  return (
    <Panel title="Live Intelligence Grid">
      <div className="tableWrap">
        <table>
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
              <th>Proof</th>
              <th>Catalyst</th>
              <th>Environment</th>
              <th>Elite</th>
              <th>Verdict</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={18}>NO LIVE DATA</td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={`${s.ticker}-${s.price}-${s.volume}`}>
                  <td>{s.ticker}</td>
                  <td>{money(s.price)}</td>
                  <td className={s.gain >= 75 ? "bad" : "good"}>{pct(s.gain)}</td>
                  <td>{s.spread ? money(s.spread) : "N/A"}</td>
                  <td>{s.speedScore}</td>
                  <td>{s.volumeAccelerationScore}</td>
                  <td>{volume(s.float)}</td>
                  <td>{money(s.support)}</td>
                  <td>{money(s.resistance)}</td>
                  <td><Badge value={s.lifecycle} /></td>
                  <td>{s.formationScore}</td>
                  <td>{s.journeyScore}</td>
                  <td>{s.proofScore}</td>
                  <td>{s.catalystScore}</td>
                  <td>{s.environmentScore}</td>
                  <td><strong className={s.eliteScore >= 80 ? "good" : s.eliteScore >= 55 ? "warn" : "bad"}>{s.eliteScore}</strong></td>
                  <td><Badge value={s.verdict} /></td>
                  <td>
                    <div className="actions">
                      <button onClick={() => onWatch(s)}>WATCH</button>
                      <button onClick={() => onWhy(s)}>WHY</button>
                      <button onClick={() => onStructure(s)}>STRUCTURE</button>
                      <button onClick={() => onJournal(s)}>JOURNAL</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SelectedPanel({ stock }: { stock: Stock | null }) {
  if (!stock) {
    return (
      <Panel title="Selected Ticker Intelligence">
        <p className="sectionText">No symbol selected. Scanner is waiting for live API data.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Selected Ticker Intelligence">
      <Label label="Ticker" value={stock.ticker} />
      <Label label="Lifecycle" value={<Badge value={stock.lifecycle} />} />
      <Label label="Elite Score" value={stock.eliteScore} />
      <Label label="Verdict" value={<Badge value={stock.verdict} />} />
      <Label label="Support" value={money(stock.support)} />
      <Label label="Resistance" value={money(stock.resistance)} />
      <Label label="Spread Score" value={stock.spreadScore} />
      <Label label="Speed Score" value={stock.speedScore} />
      <Label label="Volume Accel" value={stock.volumeAccelerationScore} />

      <div className="panelTitle" style={{ marginTop: 14 }}>
        Positive Evidence
      </div>
      <ul className="evidenceList">
        {stock.positiveEvidence.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <div className="panelTitle" style={{ marginTop: 14 }}>
        Negative Evidence
      </div>
      <ul className="evidenceList">
        {stock.negativeEvidence.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <div className="panelTitle" style={{ marginTop: 14 }}>
        Thesis Test
      </div>
      <Label label="Correct Proof" value="Spread tightens, speed rises, volume accelerates, support holds." />
      <Label label="Invalidation" value={stock.invalidation} />
    </Panel>
  );
}

function Field({
  label,
  value,
  onChange,
  number,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  number?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type={number ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
