// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type NewsFreshness =
  | "FRESH_CATALYST"
  | "RECENT_CATALYST"
  | "BACKGROUND_NEWS"
  | "STALE_NEWS"
  | "UNKNOWN_NEWS_AGE";

type DollarBand = "APPROACHING_1" | "AT_1" | "ABOVE_1";

type RubiconItem = {
  ticker?: string;
  symbol?: string;
  price?: number;
  previousClose?: number;
  gainPct?: number;
  volume?: number;
  averageVolume?: number;
  relativeVolume?: number;
  dollarVolume?: number;
  dollarBand?: DollarBand;
  dollarDistance?: number;
  rubiconScore?: number;
  quoteAgeMinutes?: number | null;

  newsHeadline?: string;
  newsUrl?: string;
  newsPublisher?: string;
  newsCategory?: string;
  newsFreshness?: NewsFreshness;
  newsAgeMinutes?: number | null;

  catalystScore?: number;
  catalystLabel?: string;
  catalystNote?: string;
  isStrongPositiveCatalyst?: boolean;
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
  candidates?: RubiconItem[];
  tickers?: RubiconItem[];
  results?: RubiconItem[];
  data?: {
    candidates?: RubiconItem[];
    tickers?: RubiconItem[];
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

function normalizeList(json: ApiResponse): RubiconItem[] {
  if (Array.isArray(json.candidates)) return json.candidates;
  if (Array.isArray(json.tickers)) return json.tickers;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.data?.candidates)) return json.data.candidates ?? [];
  if (Array.isArray(json.data?.tickers)) return json.data.tickers ?? [];
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

function formatVolume(value: unknown): string {
  const n = num(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatFreshness(item: RubiconItem): string {
  const freshness = str(item.newsFreshness || "UNKNOWN_NEWS_AGE");
  const age = item.newsAgeMinutes;

  if (typeof age === "number" && Number.isFinite(age)) {
    return `${freshness} • ${age}m`;
  }

  return freshness;
}

function formatQuoteAge(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.max(0, Math.round(value))}m`;
}

function pillClass(text?: string): string {
  const t = str(text).toUpperCase();

  if (
    t.includes("STRONG") ||
    t.includes("FRESH") ||
    t.includes("RECENT") ||
    t.includes("AT_1")
  ) {
    return "good";
  }

  if (
    t.includes("STALE") ||
    t.includes("BACKGROUND") ||
    t.includes("WEAK")
  ) {
    return "bad";
  }

  if (
    t.includes("APPROACHING") ||
    t.includes("ABOVE") ||
    t.includes("UNKNOWN")
  ) {
    return "watch";
  }

  return "neutral";
}

export default function HomePage() {
  const [items, setItems] = useState<RubiconItem[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("RUBICON_HUNTER");
  const [marketMode, setMarketMode] = useState("waiting");
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState("Never");
  const [loading, setLoading] = useState(false);

  const [minPrice, setMinPrice] = useState("0.95");
  const [maxPrice, setMaxPrice] = useState("1.05");
  const [minVolume, setMinVolume] = useState("1000000");
  const [limit, setLimit] = useState("25");
  const [removeJunk, setRemoveJunk] = useState(true);
  const [requireStrongCatalyst, setRequireStrongCatalyst] = useState(true);

  const fetchHunter = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        minPrice,
        maxPrice,
        minVolume,
        limit,
        removeJunk: String(removeJunk),
        requireStrongCatalyst: String(requireStrongCatalyst),
      });

      const res = await fetch(`/api/gainers?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse;
      const list = normalizeList(json);

      setItems(list);
      setRawCount(num(json.rawCount));
      setShowing(num(json.showing) || list.length);
      setTopTicker(json.topTicker || cleanTicker(list[0]?.ticker || list[0]?.symbol) || null);
      setSource(str(json.source || "unknown"));
      setMode(str(json.mode || "RUBICON_HUNTER"));
      setMarketMode(str(json.marketMode || "unknown"));
      setMessage(str(json.message || ""));
      setLastScan(new Date().toLocaleTimeString());
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown page error.";
      setMessage(text);
      setItems([]);
      setRawCount(0);
      setShowing(0);
      setTopTicker(null);
    } finally {
      setLoading(false);
    }
  }, [minPrice, maxPrice, minVolume, limit, removeJunk, requireStrongCatalyst]);

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
          font-size: clamp(34px, 6vw, 64px);
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
          font-size: 26px;
          font-weight: 950;
          margin-top: 5px;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(6, minmax(0,1fr));
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
          grid-template-columns: 1.35fr .75fr;
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
          min-width: 1220px;
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
          max-width: 360px;
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
            <div className="eyebrow">Rubicon Hunter</div>
            <h1>Dollar Catalyst List</h1>
            <div className="sub">
              Whole market search for stocks sitting near $1 with real volume and a strong positive
              catalyst. This is built to catch the Rubicon move at the dollar line.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gold" onClick={() => void fetchHunter()} disabled={loading}>
              {loading ? "Scanning..." : "New Scan"}
            </button>

            <button
              className="dark"
              onClick={() => {
                setMinPrice("0.95");
                setMaxPrice("1.05");
                setMinVolume("1000000");
                setLimit("25");
                setRemoveJunk(true);
                setRequireStrongCatalyst(true);
              }}
              disabled={loading}
            >
              Reset
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

          <label className="check">
            <input
              type="checkbox"
              checked={requireStrongCatalyst}
              onChange={(e) => setRequireStrongCatalyst(e.target.checked)}
            />
            Strong Catalyst Only
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
          <h2>Rubicon List</h2>

          {items.length === 0 ? (
            <div className="empty">
              No names matched the current price band, volume, and catalyst rules.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Band</th>
                    <th>Gain</th>
                    <th>Volume</th>
                    <th>RVOL</th>
                    <th>Quote Age</th>
                    <th>Catalyst</th>
                    <th>Freshness</th>
                    <th>Headline</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const ticker = cleanTicker(item.ticker || item.symbol);

                    return (
                      <tr key={`${ticker}-${index}`}>
                        <td>
                          <div className="ticker">{ticker || "—"}</div>
                        </td>

                        <td>{formatPrice(item.price)}</td>

                        <td>
                          <span className={`pill ${pillClass(item.dollarBand)}`}>
                            {item.dollarBand || "—"}
                          </span>
                        </td>

                        <td>{formatPct(item.gainPct)}</td>
                        <td>{formatVolume(item.volume)}</td>
                        <td>{num(item.relativeVolume).toFixed(2)}</td>
                        <td>{formatQuoteAge(item.quoteAgeMinutes)}</td>

                        <td>
                          <div className="pill-row">
                            <span className={`pill ${pillClass(item.catalystLabel)}`}>
                              {item.catalystLabel || "NO CATALYST"}
                            </span>
                            <span className="pill">
                              SCORE {num(item.catalystScore).toFixed(0)}
                            </span>
                          </div>

                          {item.catalystNote ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                              {item.catalystNote}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <span className={`pill ${pillClass(item.newsFreshness)}`}>
                            {formatFreshness(item)}
                          </span>
                        </td>

                        <td>
                          {item.newsHeadline ? (
                            <>
                              {item.newsUrl ? (
                                <a
                                  href={item.newsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="headline"
                                  style={{ display: "block", textDecoration: "none" }}
                                >
                                  {item.newsHeadline}
                                </a>
                              ) : (
                                <div className="headline">{item.newsHeadline}</div>
                              )}

                              {item.newsPublisher ? (
                                <div className="muted" style={{ marginTop: 6 }}>
                                  {item.newsPublisher}
                                </div>
                              ) : null}
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
              <b>APPROACHING_1</b> means the stock is still under $1 and getting close.
            </div>

            <div className="guide-item">
              <b>AT_1</b> means it is sitting right on the dollar line.
            </div>

            <div className="guide-item">
              <b>ABOVE_1</b> means it already crossed and is still near that level.
            </div>

            <div className="guide-item">
              <b>Quote Age</b> tells you how stale the trade is. Lower is better.
            </div>

            <div className="guide-item">
              <b>Strong Catalyst</b> means the latest headline scored positive and fresh enough to matter.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
