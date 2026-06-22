// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type NewsFreshness =
  | "FRESH_CATALYST"
  | "RECENT_CATALYST"
  | "BACKGROUND_NEWS"
  | "STALE_NEWS"
  | "UNKNOWN_NEWS_AGE";

type RankStatus =
  | "NEW"
  | "RANK_CLIMBER"
  | "RANK_FADE"
  | "HOLDING"
  | "CONSISTENT_TOP_5";

type ActionLabel =
  | "NEW"
  | "CLIMBING"
  | "RUNNING"
  | "SPRINTING"
  | "HOLDING"
  | "FADING"
  | "WATCHING";

type AlgoItem = {
  rank?: number;
  currentRank?: number;
  previousRank?: number | null;
  rankChange?: number | null;
  bestRank?: number;
  topFiveHits?: number;
  seenCount?: number;
  rankStatus?: RankStatus;

  ticker?: string;
  symbol?: string;
  price?: number;
  previousClose?: number;

  gainPct?: number;
  priorGainPct?: number | null;
  gainChange?: number;

  volume?: number;
  averageVolume?: number;
  relativeVolume?: number;
  dollarVolume?: number;

  algoPercent?: number;
  action?: ActionLabel;
  status?: string;
  observations?: string[];

  newsCategory?: string;
  newsHeadline?: string;
  newsAgeMinutes?: number | null;
  newsFreshness?: NewsFreshness;
  isFreshCatalyst?: boolean;
  newsObservation?: string;
  newsUrl?: string;
  newsPublisher?: string;
  newsTime?: string;
};

type ApiResponse = {
  ok?: boolean;
  source?: string;
  mode?: string;
  marketMode?: string;
  message?: string;
  rawCount?: number;
  showing?: number;
  topTicker?: string | null;
  topAlgoPercent?: number;
  runnerHunter?: AlgoItem[];
  leaderHunter?: AlgoItem[];
  data?: {
    runnerHunter?: AlgoItem[];
    leaderHunter?: AlgoItem[];
  };
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function normalizeRunnerList(json: ApiResponse): AlgoItem[] {
  if (Array.isArray(json.runnerHunter)) return json.runnerHunter;
  if (Array.isArray(json.data?.runnerHunter)) return json.data?.runnerHunter ?? [];
  return [];
}

function normalizeLeaderList(json: ApiResponse): AlgoItem[] {
  if (Array.isArray(json.leaderHunter)) return json.leaderHunter;
  if (Array.isArray(json.data?.leaderHunter)) return json.data?.leaderHunter ?? [];
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

function formatNullablePct(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${num(value).toFixed(2)}%`;
}

function formatVolume(value: unknown): string {
  const n = num(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatRank(value: number | null | undefined): string {
  if (!value) return "—";
  return `#${value}`;
}

function formatRankChange(value: number | null | undefined): string {
  if (value === null || value === undefined) return "NEW";
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatFreshness(item: AlgoItem): string {
  const freshness = str(item.newsFreshness || "UNKNOWN_NEWS_AGE");
  const age = item.newsAgeMinutes;

  if (typeof age === "number" && Number.isFinite(age)) {
    return `${freshness} • ${age}m`;
  }

  return freshness;
}

function pillClass(text?: string): string {
  const t = str(text).toUpperCase();

  if (
    t.includes("SPRINTING") ||
    t.includes("RUNNING") ||
    t.includes("CLIMBING") ||
    t.includes("FRESH_CATALYST") ||
    t.includes("RECENT_CATALYST") ||
    t.includes("CONSISTENT_TOP_5")
  ) {
    return "good";
  }

  if (
    t.includes("FADING") ||
    t.includes("PUMP LOSING CONTROL") ||
    t.includes("RANK_FADE") ||
    t.includes("BACKGROUND_NEWS") ||
    t.includes("STALE_NEWS")
  ) {
    return "bad";
  }

  if (
    t.includes("NEW") ||
    t.includes("HOLDING") ||
    t.includes("WATCHING") ||
    t.includes("UNKNOWN") ||
    t.includes("PRESS") ||
    t.includes("FILING")
  ) {
    return "watch";
  }

  return "neutral";
}

export default function HomePage() {
  const [runners, setRunners] = useState<AlgoItem[]>([]);
  const [leaders, setLeaders] = useState<AlgoItem[]>([]);

  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [topAlgoPercent, setTopAlgoPercent] = useState(0);
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("ALGO_RUNNER_HUNTER");
  const [marketMode, setMarketMode] = useState("waiting");
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState("Never");
  const [loading, setLoading] = useState(false);

  const [minPrice, setMinPrice] = useState("0.10");
  const [maxPrice, setMaxPrice] = useState("10");
  const [minGain, setMinGain] = useState("0");
  const [maxGain, setMaxGain] = useState("120");
  const [minVolume, setMinVolume] = useState("0");
  const [runnerMaxRank, setRunnerMaxRank] = useState("30");
  const [runnerLimit, setRunnerLimit] = useState("15");
  const [removeJunk, setRemoveJunk] = useState(true);

  const fetchHunter = useCallback(
    async (resetMemory = false) => {
      setLoading(true);
      setMessage("");

      try {
        const params = new URLSearchParams({
          minPrice,
          maxPrice,
          minGain,
          maxGain,
          minVolume,
          runnerMaxRank,
          runnerLimit,
          removeJunk: String(removeJunk),
          resetMemory: String(resetMemory),
        });

        const res = await fetch(`/api/gainers?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json()) as ApiResponse;
        const nextRunners = normalizeRunnerList(json);
        const nextLeaders = normalizeLeaderList(json);

        setRunners(nextRunners);
        setLeaders(nextLeaders);
        setRawCount(num(json.rawCount));
        setShowing(num(json.showing) || nextRunners.length + nextLeaders.length);
        setTopTicker(
          json.topTicker || cleanTicker(nextRunners[0]?.ticker || nextLeaders[0]?.ticker) || null
        );
        setTopAlgoPercent(num(json.topAlgoPercent) || num(nextRunners[0]?.algoPercent));
        setSource(str(json.source || "unknown"));
        setMode(str(json.mode || "ALGO_RUNNER_HUNTER"));
        setMarketMode(str(json.marketMode || "unknown"));
        setMessage(str(json.message || ""));
        setLastScan(new Date().toLocaleTimeString());
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown page error.";
        setMessage(text);
        setRunners([]);
        setLeaders([]);
        setRawCount(0);
        setShowing(0);
        setTopTicker(null);
        setTopAlgoPercent(0);
      } finally {
        setLoading(false);
      }
    },
    [minPrice, maxPrice, minGain, maxGain, minVolume, runnerMaxRank, runnerLimit, removeJunk]
  );

  useEffect(() => {
    void fetchHunter();
  }, [fetchHunter]);

  return (
    <main className="shell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255,199,44,.14), transparent 35%),
            linear-gradient(135deg, #030303, #111, #050505);
          color: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          padding: 22px;
        }

        .hero, .panel {
          border: 1px solid rgba(255,199,44,.22);
          background: rgba(0,0,0,.72);
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
          font-size: clamp(34px, 6vw, 66px);
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
          max-width: 980px;
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
          grid-template-columns: repeat(5, minmax(0,1fr));
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
          font-size: 26px;
          font-weight: 950;
          margin-top: 5px;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(8, minmax(0,1fr));
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

        .meta {
          color: #aaa;
          font-size: 12px;
          line-height: 1.45;
          margin-top: 14px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1.35fr .95fr;
          gap: 16px;
          margin-top: 16px;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
        }

        table {
          width: 100%;
          min-width: 1280px;
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
          white-space: nowrap;
        }

        td {
          padding: 11px;
          border-top: 1px solid rgba(255,255,255,.08);
          font-weight: 850;
          vertical-align: top;
        }

        .ticker {
          color: #ffc72c;
          font-size: 18px;
          font-weight: 950;
        }

        .headline {
          margin-top: 6px;
          color: #cfcfcf;
          font-size: 12px;
          line-height: 1.35;
          max-width: 340px;
        }

        .muted {
          color: #aaa;
          font-size: 12px;
          line-height: 1.35;
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
          text-decoration: none;
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

        .pill-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .guide {
          display: grid;
          gap: 10px;
        }

        .guide-item {
          border-radius: 14px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.08);
          padding: 12px;
          line-height: 1.45;
          color: #ddd;
          font-size: 13px;
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

        @media (max-width: 1200px) {
          .stats, .filters, .layout {
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
            <div className="eyebrow">Algo Runner Hunter</div>
            <h1>Runner Hunter</h1>
            <div className="sub">
              Runner Hunter surfaces names under the top 5 that are climbing hardest into the gain
              list. Leader Hunter keeps the current top 5 in view. News is always attached, but only
              fresh or recent news is treated as a possible live catalyst.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gold" onClick={() => void fetchHunter()} disabled={loading}>
              {loading ? "Scanning..." : "New Scan"}
            </button>

            <button className="dark" onClick={() => void fetchHunter(true)} disabled={loading}>
              Clear Memory
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="label">Top Runner</div>
            <div className="value">{topTicker || "—"}</div>
          </div>

          <div className="stat">
            <div className="label">Top Algo %</div>
            <div className="value">{topAlgoPercent.toFixed(2)}</div>
          </div>

          <div className="stat">
            <div className="label">Market Mode</div>
            <div className="value">{marketMode}</div>
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
            <label className="label">Runner Max Rank</label>
            <input value={runnerMaxRank} onChange={(e) => setRunnerMaxRank(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Runner Limit</label>
            <input value={runnerLimit} onChange={(e) => setRunnerLimit(e.target.value)} />
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

        <div className="meta">
          Last scan: <b>{lastScan}</b>
          {" | "}
          Mode: <b>{mode}</b>
          {" | "}
          Source: <b>{source}</b>
        </div>

        {message ? <div className="error">{message}</div> : null}
      </section>

      <section className="layout">
        <div className="panel">
          <h2>Runner Hunter</h2>

          {runners.length === 0 ? (
            <div className="empty">
              No runner candidates yet. These are the names below top 5 that are trying to come up
              the middle.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Gain Rank</th>
                    <th>Prev Rank</th>
                    <th>Rank Change</th>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Gain</th>
                    <th>Prior Gain</th>
                    <th>Gain Change</th>
                    <th>Volume</th>
                    <th>Algo %</th>
                    <th>Action</th>
                    <th>News</th>
                  </tr>
                </thead>

                <tbody>
                  {runners.map((item, index) => {
                    const ticker = cleanTicker(item.ticker || item.symbol);

                    return (
                      <tr key={`${ticker}-${index}`}>
                        <td>{formatRank(item.currentRank || item.rank)}</td>
                        <td>{formatRank(item.previousRank)}</td>
                        <td>{formatRankChange(item.rankChange)}</td>

                        <td>
                          <div className="ticker">{ticker || "—"}</div>
                          <div className="pill-row" style={{ marginTop: 6 }}>
                            <span className={`pill ${pillClass(item.action)}`}>
                              {item.action || "WATCHING"}
                            </span>
                            <span className={`pill ${pillClass(item.rankStatus)}`}>
                              {item.rankStatus || "HOLDING"}
                            </span>
                          </div>
                        </td>

                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPct(item.gainPct)}</td>
                        <td>{formatNullablePct(item.priorGainPct)}</td>
                        <td>{formatPct(item.gainChange)}</td>
                        <td>{formatVolume(item.volume)}</td>
                        <td>{formatPct(item.algoPercent)}</td>

                        <td>
                          <div>{item.status || "HOLDING"}</div>
                          {item.observations?.[0] ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                              {item.observations[0]}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          {item.newsHeadline ? (
                            <>
                              <div className="pill-row">
                                {item.newsUrl ? (
                                  <a
                                    className={`pill ${pillClass(item.newsFreshness)}`}
                                    href={item.newsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {formatFreshness(item)}
                                  </a>
                                ) : (
                                  <span className={`pill ${pillClass(item.newsFreshness)}`}>
                                    {formatFreshness(item)}
                                  </span>
                                )}
                              </div>

                              <div className="headline">{item.newsHeadline}</div>
                              <div className="muted" style={{ marginTop: 6 }}>
                                {item.isFreshCatalyst
                                  ? "Possible live catalyst."
                                  : "Background news only — not confirmed as current move catalyst."}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Leader Hunter</h2>

            {leaders.length === 0 ? (
              <div className="empty">No current leaders.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Gain Rank</th>
                      <th>Ticker</th>
                      <th>Gain</th>
                      <th>Gain Change</th>
                      <th>Algo %</th>
                      <th>Action</th>
                      <th>News</th>
                    </tr>
                  </thead>

                  <tbody>
                    {leaders.map((item, index) => {
                      const ticker = cleanTicker(item.ticker || item.symbol);

                      return (
                        <tr key={`${ticker}-${index}`}>
                          <td>{formatRank(item.currentRank || item.rank)}</td>

                          <td>
                            <div className="ticker">{ticker || "—"}</div>
                            <div className="pill-row" style={{ marginTop: 6 }}>
                              <span className={`pill ${pillClass(item.action)}`}>
                                {item.action || "WATCHING"}
                              </span>
                              <span className={`pill ${pillClass(item.rankStatus)}`}>
                                {item.rankStatus || "HOLDING"}
                              </span>
                            </div>
                          </td>

                          <td>{formatPct(item.gainPct)}</td>
                          <td>{formatPct(item.gainChange)}</td>
                          <td>{formatPct(item.algoPercent)}</td>
                          <td>{item.status || "HOLDING"}</td>

                          <td>
                            {item.newsHeadline ? (
                              <>
                                <div className="pill-row">
                                  {item.newsUrl ? (
                                    <a
                                      className={`pill ${pillClass(item.newsFreshness)}`}
                                      href={item.newsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {formatFreshness(item)}
                                    </a>
                                  ) : (
                                    <span className={`pill ${pillClass(item.newsFreshness)}`}>
                                      {formatFreshness(item)}
                                    </span>
                                  )}
                                </div>
                                <div className="headline">{item.newsHeadline}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>How To Read It</h2>

            <div className="guide">
              <div className="guide-item">
                <b>Runner Hunter</b> is the list to watch before top 5. These are names ranked under
                the leaders but pushing hard by gain acceleration, volume expansion, and rank climb.
              </div>

              <div className="guide-item">
                <b>Leader Hunter</b> is the current top 5 gain list. It is there so you can compare
                what is already leading versus what is trying to join it.
              </div>

              <div className="guide-item">
                <b>Algo %</b> is the blend:
                <br />
                Gain % + (2 × Gain Change) + (1.5 × Relative Volume)
              </div>

              <div className="guide-item">
                <b>Labels:</b>
                <br />
                CLIMBING = improving
                <br />
                RUNNING = improving faster
                <br />
                SPRINTING = hard push
                <br />
                HOLDING = staying steady
                <br />
                FADING = losing push
              </div>

              <div className="guide-item">
                <b>News:</b> every listed ticker gets a clickable headline when available. Only
                FRESH or RECENT news is treated as a possible live catalyst.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
