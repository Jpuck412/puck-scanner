// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FinalLight = "SUPER_GREEN" | "SUPER_YELLOW" | "SUPER_RED";
type RunnerLight = "LIGHT_GREEN" | "LIGHT_YELLOW" | "LIGHT_GREY";
type DayBias = "POSITIVE_DAY" | "NEGATIVE_DAY" | "NO_DAY_SIGNAL";

type HunterStatus = "CLIMBING" | "FLAT" | "FADING";
type HunterPhase = "BELOW_RADAR" | "CLIMBER" | "ESTABLISHED" | "EXTENDED_HOT";

type EstablishedLight =
  | "ESTABLISHED_GREEN"
  | "ESTABLISHED_YELLOW"
  | "NOT_ESTABLISHED";

type NewsFreshness =
  | "FRESH_CATALYST"
  | "RECENT_CATALYST"
  | "BACKGROUND_NEWS"
  | "STALE_NEWS"
  | "UNKNOWN_NEWS_AGE";

type NewsCategory = "NO_NEWS" | "NEWS" | "PRESS_RELEASE" | "FILING_LIKE_NEWS";

type SuperScannerItem = {
  ticker?: string;
  symbol?: string;

  finalLight?: FinalLight | string;
  runnerLight?: RunnerLight | string;
  dayBias?: DayBias | string;

  latestHeadline?: string;
  newsUrl?: string;
  newsPublisher?: string;
  newsCategory?: NewsCategory | string;
  newsFreshness?: NewsFreshness | string;
  newsAgeMinutes?: number | string | null;

  price?: number | string;
  previousClose?: number | string;
  gainPct?: number | string;
  speedPct?: number | string;
  momentumPct?: number | string;
  quoteAgeMinutes?: number | string | null;

  hunterStatus?: HunterStatus | string;
  hunterPhase?: HunterPhase | string;
  hunterScore?: number | string;
  hunterReason?: string;

  establishedLight?: EstablishedLight | string;
  establishedScore?: number | string;
  establishedReason?: string;

  superScore?: number | string;
  climbPercent?: number | string;
  dayBiasScore?: number | string;
  headlineScore?: number | string;
  liveCatalystScore?: number | string;
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

  candidates?: SuperScannerItem[];
  tickers?: SuperScannerItem[];
  results?: SuperScannerItem[];

  data?: {
    candidates?: SuperScannerItem[];
    tickers?: SuperScannerItem[];
    results?: SuperScannerItem[];
  };
};

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeList(json: ApiResponse): SuperScannerItem[] {
  if (Array.isArray(json.candidates)) return json.candidates;
  if (Array.isArray(json.tickers)) return json.tickers;
  if (Array.isArray(json.results)) return json.results;

  if (Array.isArray(json.data?.candidates)) return json.data.candidates;
  if (Array.isArray(json.data?.tickers)) return json.data.tickers;
  if (Array.isArray(json.data?.results)) return json.data.results;

  return [];
}

function label(value: unknown): string {
  const text = str(value || "—");
  return text.replaceAll("_", " ");
}

function money(value: unknown): string {
  const n = num(value);

  if (!n) return "—";
  if (n < 1) return `$${n.toFixed(4)}`;
  if (n < 10) return `$${n.toFixed(3)}`;

  return `$${n.toFixed(2)}`;
}

function pct(value: unknown): string {
  const n = num(value);

  if (!n) return "—";

  return `${n.toFixed(2)}%`;
}

function signedPct(value: unknown): string {
  const n = num(value);

  if (!n) return "0.00%";

  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function score(value: unknown): string {
  const n = num(value);

  if (!n) return "0";

  return n.toFixed(0);
}

function minutes(value: unknown): string {
  const n = num(value);

  if (!n) return "—";

  return `${n}m`;
}

function compactNumber(value: unknown): string {
  const n = num(value);

  if (!n) return "—";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function finalLightClass(light?: string): string {
  const value = str(light).toUpperCase();

  if (value === "SUPER_GREEN") return "green";
  if (value === "SUPER_YELLOW") return "yellow";

  return "red";
}

function runnerLightClass(light?: string): string {
  const value = str(light).toUpperCase();

  if (value === "LIGHT_GREEN") return "green";
  if (value === "LIGHT_YELLOW") return "yellow";

  return "grey";
}

function dayBiasClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (text === "POSITIVE_DAY") return "green";
  if (text === "NEGATIVE_DAY") return "red";

  return "grey";
}

function hunterStatusClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (text === "CLIMBING") return "green";
  if (text === "FLAT") return "yellow";

  return "red";
}

function hunterPhaseClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (text === "EXTENDED_HOT") return "red";
  if (text === "ESTABLISHED") return "green";
  if (text === "CLIMBER") return "yellow";

  return "grey";
}

function establishedClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (text === "ESTABLISHED_GREEN") return "green";
  if (text === "ESTABLISHED_YELLOW") return "yellow";

  return "grey";
}

function newsFreshnessClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (text === "FRESH_CATALYST") return "green";
  if (text === "RECENT_CATALYST") return "yellow";
  if (text === "STALE_NEWS") return "red";

  return "grey";
}

function getTicker(item: SuperScannerItem): string {
  return cleanTicker(item.ticker || item.symbol);
}

export default function HomePage() {
  const [items, setItems] = useState<SuperScannerItem[]>([]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("SUPER_RUNNER_HUNTER_ESTABLISHED");
  const [marketMode, setMarketMode] = useState("waiting");
  const [lastScan, setLastScan] = useState("Never");
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(true);

  const visibleItems = useMemo(() => {
    return items.slice(0, 10);
  }, [items]);

  const fetchScan = useCallback(async (resetMemory = false) => {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        resetMemory: String(resetMemory),
      });

      const res = await fetch(`/api/gainers?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        throw new Error(str(json.message) || `Scanner request failed: ${res.status}`);
      }

      const list = normalizeList(json);
      const firstTicker = cleanTicker(list[0]?.ticker || list[0]?.symbol);
      const apiTopTicker = cleanTicker(json.topTicker);

      setItems(list);
      setSource(str(json.source || "unknown"));
      setMode(str(json.mode || "SUPER_RUNNER_HUNTER_ESTABLISHED"));
      setMarketMode(str(json.marketMode || "unknown"));
      setMessage(str(json.message || ""));
      setTopTicker(apiTopTicker || firstTicker || null);
      setRawCount(num(json.rawCount));
      setShowing(num(json.showing) || list.length);
      setLastScan(new Date().toLocaleTimeString());
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown page error.";

      setMessage(text);
      setItems([]);
      setTopTicker(null);
      setRawCount(0);
      setShowing(0);
      setSource("error");
      setMarketMode("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScan(false);
  }, [fetchScan]);

  useEffect(() => {
    if (!autoScan) return;

    const id = window.setInterval(() => {
      void fetchScan(false);
    }, 3000);

    return () => window.clearInterval(id);
  }, [autoScan, fetchScan]);

  return (
    <main className="shell">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at top left, rgba(255, 205, 85, 0.18), transparent 32%),
            radial-gradient(circle at top right, rgba(74, 144, 255, 0.16), transparent 30%),
            linear-gradient(135deg, #090b0f, #161b22 45%, #0d1117);
          color: #f2f7ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          overflow-x: hidden;
        }

        .shell {
          min-height: 100vh;
          padding: 24px;
        }

        .hero,
        .panel {
          border: 1px solid rgba(255, 211, 106, 0.22);
          background:
            linear-gradient(145deg, rgba(22, 27, 34, 0.94), rgba(9, 11, 15, 0.96));
          border-radius: 28px;
          padding: 18px;
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ffd36a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 66px);
          line-height: 0.94;
          letter-spacing: -0.06em;
          text-transform: uppercase;
          color: #f7fbff;
          text-shadow: 0 10px 34px rgba(255, 211, 106, 0.14);
        }

        .sub {
          color: #9fc6f5;
          max-width: 950px;
          line-height: 1.5;
          margin-top: 12px;
          font-size: 14px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          color: #f7fbff;
        }

        button {
          border: 0;
          border-radius: 15px;
          padding: 12px 15px;
          font-weight: 950;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            box-shadow 160ms ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .gold-button {
          background: linear-gradient(135deg, #ffe08a, #c4912b);
          color: #111820;
          box-shadow: 0 12px 28px rgba(255, 211, 106, 0.18);
        }

        .dark-button {
          background: rgba(255, 255, 255, 0.08);
          color: #e7f2ff;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 18px;
          padding: 14px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025));
          min-width: 0;
        }

        .label {
          color: #94b5dd;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 950;
        }

        .value {
          font-size: 26px;
          font-weight: 950;
          margin-top: 5px;
          color: #f7fbff;
          overflow-wrap: anywhere;
        }

        .meta {
          color: #9fbce0;
          font-size: 12px;
          line-height: 1.45;
          margin-top: 14px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-top: 16px;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .card {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.022));
          border-radius: 22px;
          padding: 15px;
        }

        .card-top {
          display: grid;
          grid-template-columns: 1.15fr auto auto auto;
          gap: 12px;
          align-items: start;
        }

        .ticker-line {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          border-radius: 999px;
          color: #111820;
          background: linear-gradient(135deg, #ffe08a, #b88724);
          font-size: 13px;
          font-weight: 950;
        }

        .ticker {
          font-size: 28px;
          font-weight: 950;
          letter-spacing: 0.04em;
          color: #f7fbff;
          text-decoration: none;
        }

        .ticker:hover {
          text-decoration: underline;
        }

        .headline {
          color: #9fc6f5;
          font-size: 12px;
          line-height: 1.4;
          margin-top: 8px;
          max-width: 760px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .metric {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 9px;
          background: rgba(0, 0, 0, 0.18);
          min-width: 0;
        }

        .metric-name {
          color: #8daed4;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .metric-value {
          color: #f7fbff;
          font-size: 14px;
          font-weight: 950;
          margin-top: 4px;
          overflow-wrap: anywhere;
        }

        .engine-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .engine {
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 18px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.18);
        }

        .engine-title {
          color: #ffd36a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .engine-text {
          color: #9fbce0;
          font-size: 11px;
          line-height: 1.35;
          margin-top: 8px;
        }

        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 118px;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.12);
          text-align: center;
          white-space: nowrap;
        }

        .pill.green {
          color: #dcffeb;
          background: rgba(41, 165, 92, 0.22);
          border-color: rgba(41, 165, 92, 0.48);
          box-shadow: 0 0 24px rgba(41, 165, 92, 0.10);
        }

        .pill.yellow {
          color: #fff0a6;
          background: rgba(204, 165, 36, 0.20);
          border-color: rgba(204, 165, 36, 0.44);
          box-shadow: 0 0 24px rgba(204, 165, 36, 0.08);
        }

        .pill.red {
          color: #ffdcdc;
          background: rgba(255, 90, 90, 0.18);
          border-color: rgba(255, 90, 90, 0.34);
        }

        .pill.grey {
          color: #d9e6f3;
          background: rgba(150, 160, 170, 0.18);
          border-color: rgba(150, 160, 170, 0.38);
        }

        .empty,
        .error {
          border-radius: 18px;
          padding: 18px;
          color: #9fbce0;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          text-align: center;
          line-height: 1.45;
        }

        .error {
          margin-top: 12px;
          border-style: solid;
          color: #ffdcdc;
          background: rgba(255, 90, 90, 0.08);
          border-color: rgba(255, 90, 90, 0.25);
          font-weight: 850;
        }

        .footer-note {
          margin-top: 14px;
          color: #8daed4;
          font-size: 11px;
          line-height: 1.45;
        }

        @media (max-width: 1250px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .card-top {
            grid-template-columns: 1fr;
          }

          .metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .engine-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .shell {
            padding: 14px;
          }

          .hero,
          .panel {
            border-radius: 22px;
            padding: 14px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .button-row,
          button {
            width: 100%;
          }

          .metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pill {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Catalyst + Hunter + Established Engine</div>
            <h1>Mission Control</h1>
            <div className="sub">
              Catalyst scanner upgraded with Hunter Engine and Established Engine. This finds
              active climbers, proven movers, fresh catalyst pressure, and final traffic-light
              alignment. Scanner only. Evidence must prove the trade.
            </div>
          </div>

          <div className="button-row">
            <button className="gold-button" onClick={() => void fetchScan(false)} disabled={loading}>
              {loading ? "Scanning..." : "Scan Now"}
            </button>

            <button className="dark-button" onClick={() => setAutoScan((value) => !value)}>
              {autoScan ? "Auto: On" : "Auto: Off"}
            </button>

            <button className="dark-button" onClick={() => void fetchScan(true)} disabled={loading}>
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
            <div className="label">Market Mode</div>
            <div className="value">{marketMode || "—"}</div>
          </div>

          <div className="stat">
            <div className="label">Raw Count</div>
            <div className="value">{compactNumber(rawCount)}</div>
          </div>

          <div className="stat">
            <div className="label">Showing</div>
            <div className="value">{showing}</div>
          </div>

          <div className="stat">
            <div className="label">Scan Mode</div>
            <div className="value">{autoScan ? "AUTO" : "MANUAL"}</div>
          </div>
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
          <h2>Top 10 Scanner Candidates</h2>

          {visibleItems.length === 0 ? (
            <div className="empty">No live candidates right now.</div>
          ) : (
            <div className="list">
              {visibleItems.map((item, index) => {
                const ticker = getTicker(item);

                return (
                  <div className="card" key={`${ticker || "UNKNOWN"}-${index}`}>
                    <div className="card-top">
                      <div>
                        <div className="ticker-line">
                          <span className="rank">#{index + 1}</span>

                          {item.newsUrl ? (
                            <a
                              className="ticker"
                              href={item.newsUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {ticker || "—"}
                            </a>
                          ) : (
                            <div className="ticker">{ticker || "—"}</div>
                          )}
                        </div>

                        {item.latestHeadline ? (
                          <div className="headline">{item.latestHeadline}</div>
                        ) : (
                          <div className="headline">No fresh headline attached.</div>
                        )}
                      </div>

                      <span className={`pill ${finalLightClass(item.finalLight)}`}>
                        {label(item.finalLight || "SUPER_RED")}
                      </span>

                      <span className={`pill ${runnerLightClass(item.runnerLight)}`}>
                        {label(item.runnerLight || "LIGHT_GREY")}
                      </span>

                      <span className={`pill ${dayBiasClass(item.dayBias)}`}>
                        {label(item.dayBias || "NO_DAY_SIGNAL")}
                      </span>
                    </div>

                    <div className="metric-grid">
                      <div className="metric">
                        <div className="metric-name">Price</div>
                        <div className="metric-value">{money(item.price)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Gain</div>
                        <div className="metric-value">{pct(item.gainPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Speed</div>
                        <div className="metric-value">{signedPct(item.speedPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Momentum</div>
                        <div className="metric-value">{signedPct(item.momentumPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Super Score</div>
                        <div className="metric-value">{score(item.superScore)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Trade Age</div>
                        <div className="metric-value">{minutes(item.quoteAgeMinutes)}</div>
                      </div>
                    </div>

                    <div className="engine-grid">
                      <div className="engine">
                        <div className="engine-title">Hunter Engine</div>
                        <div className="pill-row">
                          <span className={`pill ${hunterStatusClass(item.hunterStatus)}`}>
                            {label(item.hunterStatus || "FADING")}
                          </span>

                          <span className={`pill ${hunterPhaseClass(item.hunterPhase)}`}>
                            {label(item.hunterPhase || "BELOW_RADAR")}
                          </span>

                          <span className="pill grey">
                            Score {score(item.hunterScore)}
                          </span>
                        </div>

                        <div className="engine-text">
                          {item.hunterReason || "Hunter read unavailable."}
                        </div>
                      </div>

                      <div className="engine">
                        <div className="engine-title">Established Engine</div>
                        <div className="pill-row">
                          <span className={`pill ${establishedClass(item.establishedLight)}`}>
                            {label(item.establishedLight || "NOT_ESTABLISHED")}
                          </span>

                          <span className="pill grey">
                            Score {score(item.establishedScore)}
                          </span>
                        </div>

                        <div className="engine-text">
                          {item.establishedReason || "Established read unavailable."}
                        </div>
                      </div>

                      <div className="engine">
                        <div className="engine-title">Catalyst Engine</div>
                        <div className="pill-row">
                          <span className={`pill ${newsFreshnessClass(item.newsFreshness)}`}>
                            {label(item.newsFreshness || "UNKNOWN_NEWS_AGE")}
                          </span>

                          <span className="pill grey">
                            News {score(item.headlineScore)}
                          </span>

                          <span className="pill grey">
                            Live {score(item.liveCatalystScore)}
                          </span>
                        </div>

                        <div className="engine-text">
                          Category: <b>{label(item.newsCategory || "NO_NEWS")}</b>
                          {" | "}
                          Publisher: <b>{item.newsPublisher || "—"}</b>
                          {" | "}
                          Age: <b>{minutes(item.newsAgeMinutes)}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="footer-note">
            Final test: speed up, volume up, spread stable or tighter, buyers control tape, support
            identified, risk defined. What proves I am right? No proof = no trade.
          </div>
        </div>
      </section>
    </main>
  );
}
