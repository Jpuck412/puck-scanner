// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type FinalLight = "SUPER_GREEN" | "SUPER_YELLOW" | "SUPER_RED";
type RunnerLight = "LIGHT_GREEN" | "LIGHT_YELLOW" | "LIGHT_GREY";
type DayBias = "POSITIVE_DAY" | "NEGATIVE_DAY" | "NO_DAY_SIGNAL";

type SuperScannerItem = {
  ticker?: string;
  symbol?: string;
  finalLight?: FinalLight;
  runnerLight?: RunnerLight;
  dayBias?: DayBias;
  newsUrl?: string;
  latestHeadline?: string;
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
  if (Array.isArray(json.data?.candidates)) return json.data.candidates ?? [];
  if (Array.isArray(json.data?.tickers)) return json.data.tickers ?? [];
  return [];
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

export default function HomePage() {
  const [items, setItems] = useState<SuperScannerItem[]>([]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("SUPER_RUNNER_HUNTER");
  const [marketMode, setMarketMode] = useState("waiting");
  const [lastScan, setLastScan] = useState("Never");
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(true);

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
      const list = normalizeList(json);

      setItems(list);
      setSource(str(json.source || "unknown"));
      setMode(str(json.mode || "SUPER_RUNNER_HUNTER"));
      setMarketMode(str(json.marketMode || "unknown"));
      setMessage(str(json.message || ""));
      setTopTicker(str(json.topTicker || cleanTicker(list[0]?.ticker || list[0]?.symbol)) || null);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScan();
  }, [fetchScan]);

  useEffect(() => {
    if (!autoScan) return;

    const id = window.setInterval(() => {
      void fetchScan();
    }, 3000);

    return () => window.clearInterval(id);
  }, [autoScan, fetchScan]);

  return (
    <main className="shell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(69, 139, 255, 0.18), transparent 32%),
            linear-gradient(135deg, #2f3338, #3a4148, #2b3137);
          color: #b7d8ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          padding: 24px;
        }

        .hero, .panel {
          border: 1px solid rgba(115, 175, 255, 0.22);
          background: rgba(43, 49, 55, 0.82);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.3);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #8ec5ff;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 60px);
          line-height: .95;
          letter-spacing: -.06em;
          text-transform: uppercase;
          color: #dceeff;
        }

        .sub {
          color: #9cc8ff;
          max-width: 860px;
          line-height: 1.5;
          margin-top: 12px;
          font-size: 14px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -.03em;
          color: #dceeff;
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

        .blue-button {
          background: linear-gradient(135deg, #86bfff, #4d8fff);
          color: #10233b;
        }

        .dark-button {
          background: rgba(255,255,255,.08);
          color: #d9ecff;
          border: 1px solid rgba(255,255,255,.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.04);
        }

        .label {
          color: #8bb6ea;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 950;
        }

        .value {
          font-size: 28px;
          font-weight: 950;
          margin-top: 5px;
          color: #dceeff;
        }

        .meta {
          color: #95bee9;
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
          gap: 10px;
        }

        .row {
          display: grid;
          grid-template-columns: 1.2fr auto auto auto;
          gap: 12px;
          align-items: center;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          border-radius: 18px;
          padding: 14px 16px;
        }

        .ticker {
          font-size: 24px;
          font-weight: 950;
          letter-spacing: .04em;
          color: #dceeff;
          text-decoration: none;
        }

        .headline {
          color: #9cc8ff;
          font-size: 12px;
          line-height: 1.35;
          margin-top: 6px;
          max-width: 520px;
        }

        .light {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,.12);
        }

        .light.green {
          color: #dceeff;
          background: rgba(41, 165, 92, 0.22);
          border-color: rgba(41, 165, 92, 0.42);
        }

        .light.yellow {
          color: #fff0a6;
          background: rgba(204, 165, 36, 0.20);
          border-color: rgba(204, 165, 36, 0.42);
        }

        .light.red {
          color: #ffdcdc;
          background: rgba(255, 90, 90, 0.18);
          border-color: rgba(255, 90, 90, 0.34);
        }

        .light.grey {
          color: #d9e6f3;
          background: rgba(150, 160, 170, 0.20);
          border-color: rgba(150, 160, 170, 0.42);
        }

        .empty, .error {
          border-radius: 18px;
          padding: 18px;
          color: #95bee9;
          border: 1px dashed rgba(255,255,255,.18);
          text-align: center;
          line-height: 1.45;
        }

        .error {
          margin-top: 12px;
          border-style: solid;
          color: #ffdcdc;
          background: rgba(255,90,90,.08);
          border-color: rgba(255,90,90,.25);
          font-weight: 850;
        }

        @media (max-width: 1100px) {
          .stats {
            grid-template-columns: 1fr;
          }

          button {
            width: 100%;
          }

          .row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Super Runner Hunter</div>
            <h1>One Scanner</h1>
            <div className="sub">
              Combines Runner Hunter speed and momentum with 5-day news bias into one final light.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="blue-button" onClick={() => void fetchScan()} disabled={loading}>
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
          <h2>Super Scanner List</h2>

          {items.length === 0 ? (
            <div className="empty">No live candidates right now.</div>
          ) : (
            <div className="list">
              {items.map((item, index) => {
                const ticker = cleanTicker(item.ticker || item.symbol);

                return (
                  <div className="row" key={`${ticker}-${index}`}>
                    <div>
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

                      {item.latestHeadline ? (
                        <div className="headline">{item.latestHeadline}</div>
                      ) : null}
                    </div>

                    <span className={`light ${finalLightClass(item.finalLight)}`}>
                      {str(item.finalLight || "SUPER_RED").replace("_", " ").replace("_", " ")}
                    </span>

                    <span className={`light ${runnerLightClass(item.runnerLight)}`}>
                      {str(item.runnerLight || "LIGHT_GREY").replace("_", " ")}
                    </span>

                    <span className={`light ${dayBiasClass(item.dayBias)}`}>
                      {str(item.dayBias || "NO_DAY_SIGNAL").replace("_", " ").replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
