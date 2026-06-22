"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type HunterItem = {
  rank?: number;
  ticker?: string;
  symbol?: string;
  price?: number;
  gainPct?: number;
  premarketVolume?: number;
  relativePremarketVolume?: number;
  spreadPct?: number;
  spreadStatus?: string;
  hunterScore?: number;
  hunterStatus?: string;
  hunterPhase?: string;
  reasons?: string[];
  warnings?: string[];
};

type ApiResponse = {
  ok?: boolean;
  source?: string;
  mode?: string;
  message?: string;
  rawCount?: number;
  showing?: number;
  topTicker?: string | null;
  topScore?: number;
  results?: HunterItem[];
  gainers?: HunterItem[];
  tickers?: HunterItem[];
  data?: HunterItem[];
};

type Observation = {
  ticker: string;
  currentRank: number;
  previousRank: number | null;
  bestRank: number;
  appearances: number;
  top5Hits: number;
  consecutiveTop5: number;
  firstSeenAt: string;
  lastSeenAt: string;

  currentGainPct: number;
  previousGainPct: number | null;

  currentSpreadPct: number;
  previousSpreadPct: number | null;

  currentVolume: number;
  previousVolume: number | null;

  tag: string;
  notes: string[];
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanTicker(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeList(json: ApiResponse): HunterItem[] {
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.gainers)) return json.gainers;
  if (Array.isArray(json.tickers)) return json.tickers;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

function formatPrice(value: unknown): string {
  const n = num(value);
  if (n <= 0) return "—";
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatPct(value: unknown): string {
  return `${num(value).toFixed(2)}%`;
}

function formatVol(value: unknown): string {
  const n = num(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function pillClass(text?: string): string {
  const t = String(text || "").toUpperCase();

  if (
    t.includes("GHOST") ||
    t.includes("CLIMBER") ||
    t.includes("CONSISTENT") ||
    t.includes("TIGHT") ||
    t.includes("CLIMBING")
  ) {
    return "good";
  }

  if (
    t.includes("FADING") ||
    t.includes("LOOSENING") ||
    t.includes("SLOWING") ||
    t.includes("VANISHED") ||
    t.includes("WIDE") ||
    t.includes("PUMP")
  ) {
    return "bad";
  }

  if (t.includes("WATCH") || t.includes("OK") || t.includes("NEW")) {
    return "watch";
  }

  return "neutral";
}

function makeObservation(
  item: HunterItem,
  index: number,
  previous: Observation | undefined,
  scanTime: string
): Observation {
  const ticker = cleanTicker(item.ticker || item.symbol);
  const currentRank = num(item.rank) || index + 1;

  const currentGainPct = num(item.gainPct);
  const currentSpreadPct = num(item.spreadPct);
  const currentVolume = num(item.premarketVolume);

  const previousRank = previous?.currentRank ?? null;
  const previousGainPct = previous?.currentGainPct ?? null;
  const previousSpreadPct = previous?.currentSpreadPct ?? null;
  const previousVolume = previous?.currentVolume ?? null;

  const appearances = (previous?.appearances || 0) + 1;
  const bestRank = previous ? Math.min(previous.bestRank, currentRank) : currentRank;

  const isTop5 = currentRank <= 5;
  const top5Hits = (previous?.top5Hits || 0) + (isTop5 ? 1 : 0);
  const consecutiveTop5 = isTop5 ? (previous?.consecutiveTop5 || 0) + 1 : 0;

  const rankImproving = previousRank !== null && currentRank < previousRank;
  const rankFading = previousRank !== null && currentRank > previousRank + 2;

  const gainRising = previousGainPct !== null && currentGainPct > previousGainPct;
  const speedSlowing = previousGainPct !== null && currentGainPct <= previousGainPct;

  const spreadLoosening =
    previousSpreadPct !== null &&
    previousSpreadPct > 0 &&
    currentSpreadPct > previousSpreadPct * 1.35;

  const volumeFading =
    previousVolume !== null &&
    previousVolume > 0 &&
    currentVolume < previousVolume * 0.7;

  const newGhost = !previous && currentRank <= 5;
  const consistentTop5 = consecutiveTop5 >= 2;

  const notes: string[] = [];

  if (newGhost) notes.push("Appeared in top 5 from nowhere.");
  if (consistentTop5) notes.push("Holding top 5 across scans.");
  if (rankImproving) notes.push(`Rank improved from #${previousRank} to #${currentRank}.`);
  if (rankFading) notes.push(`Rank faded from #${previousRank} to #${currentRank}.`);
  if (gainRising) notes.push("Gain percent still rising.");
  if (speedSlowing) notes.push("Gain percent stopped rising.");
  if (spreadLoosening) notes.push("Spread loosened since last scan.");
  if (volumeFading) notes.push("Volume faded since last scan.");
  if (notes.length === 0) notes.push("Still observing. No major change yet.");

  let tag = "OBSERVING";

  if (newGhost) tag = "GHOST IGNITION";
  else if (consistentTop5) tag = "CONSISTENT TOP 5";
  else if (rankImproving) tag = "RANK CLIMBER";
  else if (rankFading || spreadLoosening || volumeFading) tag = "PUMP LOSING CONTROL";
  else if (speedSlowing) tag = "SPEED SLOWING";
  else if (isTop5) tag = "TOP 5 WATCH";

  return {
    ticker,
    currentRank,
    previousRank,
    bestRank,
    appearances,
    top5Hits,
    consecutiveTop5,
    firstSeenAt: previous?.firstSeenAt || scanTime,
    lastSeenAt: scanTime,

    currentGainPct,
    previousGainPct,

    currentSpreadPct,
    previousSpreadPct,

    currentVolume,
    previousVolume,

    tag,
    notes,
  };
}

export default function HomePage() {
  const [items, setItems] = useState<HunterItem[]>([]);
  const [observations, setObservations] = useState<Record<string, Observation>>({});

  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [topScore, setTopScore] = useState(0);
  const [source, setSource] = useState("waiting");
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState("Never");
  const [loading, setLoading] = useState(false);

  const [minPrice, setMinPrice] = useState("0.10");
  const [maxPrice, setMaxPrice] = useState("10");
  const [minGain, setMinGain] = useState("10");
  const [maxGain, setMaxGain] = useState("65");
  const [minVolume, setMinVolume] = useState("0");
  const [limit, setLimit] = useState("10");
  const [removeJunk, setRemoveJunk] = useState(true);

  const fetchHunter = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        minPrice,
        maxPrice,
        minGain,
        maxGain,
        minVolume,
        limit,
        removeJunk: String(removeJunk),
      });

      const res = await fetch(`/api/gainers?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse;
      const list = normalizeList(json);

      const scanTime = new Date().toLocaleTimeString();

      setItems(list);
      setRawCount(num(json.rawCount));
      setShowing(num(json.showing) || list.length);
      setTopTicker(json.topTicker || cleanTicker(list[0]?.ticker || list[0]?.symbol) || null);
      setTopScore(num(json.topScore) || num(list[0]?.hunterScore));
      setSource(String(json.source || "unknown"));
      setMessage(String(json.message || ""));
      setLastScan(scanTime);

      setObservations((previous) => {
        const next: Record<string, Observation> = { ...previous };

        list.forEach((item, index) => {
          const ticker = cleanTicker(item.ticker || item.symbol);
          if (!ticker) return;

          next[ticker] = makeObservation(item, index, previous[ticker], scanTime);
        });

        return next;
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown page error.";
      setMessage(text);
      setItems([]);
      setRawCount(0);
      setShowing(0);
      setTopTicker(null);
      setTopScore(0);
    } finally {
      setLoading(false);
    }
  }, [minPrice, maxPrice, minGain, maxGain, minVolume, limit, removeJunk]);

  useEffect(() => {
    fetchHunter();
  }, [fetchHunter]);

  const observationList = useMemo(() => {
    return Object.values(observations)
      .sort((a, b) => {
        if (b.consecutiveTop5 !== a.consecutiveTop5) {
          return b.consecutiveTop5 - a.consecutiveTop5;
        }

        if (a.currentRank !== b.currentRank) {
          return a.currentRank - b.currentRank;
        }

        return b.appearances - a.appearances;
      })
      .slice(0, 12);
  }, [observations]);

  return (
    <main className="shell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255,199,44,.18), transparent 34%),
            linear-gradient(135deg, #030303, #111, #050505);
          color: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          padding: 22px;
        }

        .hero, .panel {
          border: 1px solid rgba(255,199,44,.26);
          background: rgba(0,0,0,.68);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ffc72c;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 68px);
          line-height: .95;
          letter-spacing: -.06em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -.03em;
        }

        .sub {
          color: #cfcfcf;
          max-width: 900px;
          line-height: 1.5;
          margin-top: 12px;
          font-size: 14px;
        }

        button {
          border: 0;
          border-radius: 15px;
          padding: 12px 15px;
          font-weight: 950;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .gold {
          background: linear-gradient(135deg, #ffc72c, #c99000);
          color: #030303;
        }

        .dark {
          background: rgba(255,255,255,.08);
          color: #fff;
          border: 1px solid rgba(255,255,255,.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.055);
        }

        .label {
          color: #9f9f9f;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 950;
        }

        .value {
          font-size: 28px;
          font-weight: 950;
          margin-top: 5px;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        input {
          background: rgba(0,0,0,.55);
          border: 1px solid rgba(255,255,255,.14);
          color: #fff;
          border-radius: 13px;
          padding: 11px;
          font-weight: 850;
          outline: none;
          width: 100%;
        }

        input:focus {
          border-color: rgba(255,199,44,.75);
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 20px;
          font-weight: 850;
          color: #d8d8d8;
        }

        .check input {
          width: auto;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 16px;
          margin-top: 16px;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
        }

        table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          color: #aaa;
          background: rgba(255,255,255,.055);
          padding: 11px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        td {
          padding: 11px;
          border-top: 1px solid rgba(255,255,255,.08);
          font-weight: 850;
        }

        .ticker {
          color: #ffc72c;
          font-size: 18px;
          font-weight: 950;
        }

        .pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .05em;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.08);
          color: #ddd;
          white-space: nowrap;
        }

        .pill.good {
          color: #76ff9f;
          background: rgba(118,255,159,.09);
          border-color: rgba(118,255,159,.25);
        }

        .pill.watch {
          color: #ffc72c;
          background: rgba(255,199,44,.09);
          border-color: rgba(255,199,44,.25);
        }

        .pill.bad {
          color: #ff7b7b;
          background: rgba(255,123,123,.09);
          border-color: rgba(255,123,123,.25);
        }

        .obs {
          border-top: 1px solid rgba(255,255,255,.08);
          padding: 12px 0;
        }

        .obs-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
        }

        .obs-meta {
          color: #aaa;
          font-size: 12px;
          line-height: 1.45;
        }

        .notes {
          margin-top: 7px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .note {
          color: #d7d7d7;
          background: rgba(255,255,255,.06);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.35;
        }

        .empty, .error {
          border-radius: 18px;
          padding: 18px;
          color: #aaa;
          border: 1px dashed rgba(255,255,255,.18);
          text-align: center;
          line-height: 1.45;
        }

        .error {
          margin-top: 12px;
          border-style: solid;
          color: #ffd1d1;
          background: rgba(255,90,90,.08);
          border-color: rgba(255,90,90,.25);
          font-weight: 850;
        }

        @media (max-width: 1100px) {
          .stats, .filters, .grid {
            grid-template-columns: 1fr;
          }

          button {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Proof Of Structure™</div>
            <h1>Raw Hunter</h1>
            <div className="sub">
              Light observation tracker. It watches who stays, who climbs, who appears from nowhere, and who starts failing.
              This is not permission. It is pattern memory.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gold" onClick={fetchHunter} disabled={loading}>
              {loading ? "Scanning..." : "New Scan"}
            </button>

            <button className="dark" onClick={() => setObservations({})}>
              Clear Memory
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="label">Top Ticker</div>
            <div className="value">{topTicker || "—"}</div>
          </div>

          <div className="stat">
            <div className="label">Top Score</div>
            <div className="value">{topScore.toFixed(0)}</div>
          </div>

          <div className="stat">
            <div className="label">Raw Count</div>
            <div className="value">{rawCount}</div>
          </div>

          <div className="stat">
            <div className="label">Showing</div>
            <div className="value">{showing}</div>
          </div>
        </div>

        <div className="filters">
          <div className="field">
            <label className="label">Min Price</label>
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Max Price</label>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Min Gain %</label>
            <input value={minGain} onChange={(e) => setMinGain(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Max Gain %</label>
            <input value={maxGain} onChange={(e) => setMaxGain(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Min Volume</label>
            <input value={minVolume} onChange={(e) => setMinVolume(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Limit</label>
            <input value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={removeJunk}
              onChange={(e) => setRemoveJunk(e.target.checked)}
            />
            Remove Junk
          </label>
        </div>

        {message ? <div className="error">{message}</div> : null}
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Current Hunter List</h2>

          {items.length === 0 ? (
            <div className="empty">
              No live movers showing. If raw count is high and showing is 0, the scanner is connected but no object is moving.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Gain</th>
                    <th>Volume</th>
                    <th>Spread</th>
                    <th>Status</th>
                    <th>Phase</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const ticker = cleanTicker(item.ticker || item.symbol);
                    return (
                      <tr key={`${ticker}-${index}`}>
                        <td>#{item.rank || index + 1}</td>
                        <td className="ticker">{ticker || "—"}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPct(item.gainPct)}</td>
                        <td>{formatVol(item.premarketVolume)}</td>
                        <td>
                          {formatPct(item.spreadPct)}{" "}
                          <span className={`pill ${pillClass(item.spreadStatus)}`}>
                            {item.spreadStatus || "UNKNOWN"}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${pillClass(item.hunterStatus)}`}>
                            {item.hunterStatus || "OBSERVE"}
                          </span>
                        </td>
                        <td>
                          <span className="pill">{item.hunterPhase || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="panel">
          <h2>Hunter Observations</h2>

          <div className="obs-meta" style={{ marginBottom: 12 }}>
            Last scan: <b>{lastScan}</b>
            <br />
            Source: <b>{source}</b>
          </div>

          {observationList.length === 0 ? (
            <div className="empty">
              Hit New Scan a few times. This panel starts learning who stays, who climbs, and who ghosts in.
            </div>
          ) : (
            observationList.map((obs) => (
              <div className="obs" key={obs.ticker}>
                <div className="obs-top">
                  <div className="ticker">{obs.ticker}</div>
                  <span className={`pill ${pillClass(obs.tag)}`}>{obs.tag}</span>
                </div>

                <div className="obs-meta">
                  Now: #{obs.currentRank}
                  {obs.previousRank ? ` | Prev: #${obs.previousRank}` : " | Prev: new"}
                  {" | "}
                  Best: #{obs.bestRank}
                  {" | "}
                  Top 5 hits: {obs.top5Hits}
                  {" | "}
                  Seen: {obs.appearances}x
                </div>

                <div className="notes">
                  {obs.notes.slice(0, 3).map((note, index) => (
                    <div className="note" key={`${obs.ticker}-note-${index}`}>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </aside>
      </section>
    </main>
  );
}
