"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AnyObj = Record<string, unknown>;

type HunterItem = {
  rank?: number;
  ticker?: string;
  symbol?: string;

  price?: number;
  previousClose?: number;
  gainPct?: number;

  premarketVolume?: number;
  averagePremarketVolume?: number;
  relativePremarketVolume?: number;

  bid?: number;
  ask?: number;
  spread?: number;
  spreadPct?: number;
  spreadStatus?: string;

  hunterScore?: number;
  rawHunterScore?: number;
  hunterStatus?: string;
  hunterPhase?: string;

  isInPreferredGainZone?: boolean;
  isExtended?: boolean;
  isTradeableSpread?: boolean;

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

function isObj(value: unknown): value is AnyObj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return String(value || "").trim();
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
  const n = num(value);
  return `${n.toFixed(2)}%`;
}

function formatVolume(value: unknown): string {
  const n = num(value);

  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;

  return String(Math.round(n));
}

function statusClass(status?: string): string {
  const s = String(status || "").toUpperCase();

  if (s.includes("CLIMBING")) return "good";
  if (s.includes("FADING")) return "bad";
  if (s.includes("TIGHT")) return "good";
  if (s.includes("WIDE")) return "bad";
  if (s.includes("OK")) return "watch";

  return "neutral";
}

export default function HomePage() {
  const [items, setItems] = useState<HunterItem[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [topScore, setTopScore] = useState(0);
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("RAW_HUNTER_GATHERER");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<string>("Never");

  const [minPrice, setMinPrice] = useState("0.10");
  const [maxPrice, setMaxPrice] = useState("10");
  const [minGain, setMinGain] = useState("0");
  const [maxGain, setMaxGain] = useState("120");
  const [minVolume, setMinVolume] = useState("0");
  const [limit, setLimit] = useState("10");
  const [removeJunk, setRemoveJunk] = useState(true);

  const [manualInput, setManualInput] = useState("");
  const [manualTickers, setManualTickers] = useState<string[]>([]);

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

      const jsonUnknown = await res.json();

      if (!isObj(jsonUnknown)) {
        throw new Error("Bad API response.");
      }

      const json = jsonUnknown as ApiResponse;
      const list = normalizeList(json);

      setItems(list);
      setRawCount(num(json.rawCount));
      setShowing(num(json.showing) || list.length);
      setTopTicker(json.topTicker || list[0]?.ticker || list[0]?.symbol || null);
      setTopScore(num(json.topScore) || num(list[0]?.hunterScore));
      setSource(str(json.source) || "unknown");
      setMode(str(json.mode) || "RAW_HUNTER_GATHERER");
      setMessage(str(json.message));
      setLastScan(new Date().toLocaleTimeString());
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

  const addManualTickers = useCallback(() => {
    const next = manualInput
      .split(/[,\s]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((x) => /^[A-Z]{1,5}$/.test(x));

    setManualTickers((old) => Array.from(new Set([...old, ...next])));
    setManualInput("");
  }, [manualInput]);

  const manualMatches = useMemo(() => {
    const lookup = new Map<string, HunterItem>();

    for (const item of items) {
      const ticker = String(item.ticker || item.symbol || "").toUpperCase();
      if (ticker) lookup.set(ticker, item);
    }

    return manualTickers.map((ticker) => ({
      ticker,
      item: lookup.get(ticker) || null,
    }));
  }, [items, manualTickers]);

  const best = items[0];

  return (
    <main className="page-shell">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255, 199, 44, 0.18), transparent 32%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 28%),
            linear-gradient(135deg, #030303 0%, #111111 44%, #050505 100%);
          color: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page-shell {
          min-height: 100vh;
          padding: 24px;
        }

        .hero {
          border: 1px solid rgba(255, 199, 44, 0.35);
          background:
            linear-gradient(135deg, rgba(255, 199, 44, 0.16), rgba(255, 255, 255, 0.03)),
            rgba(0, 0, 0, 0.72);
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
        }

        .hero-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ffc72c;
          font-weight: 900;
          letter-spacing: 0.16em;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(32px, 6vw, 74px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          text-transform: uppercase;
        }

        .subtitle {
          max-width: 980px;
          color: #cfcfcf;
          font-size: 15px;
          line-height: 1.6;
          margin-top: 14px;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          border: 0;
          cursor: pointer;
          border-radius: 16px;
          padding: 13px 16px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .gold-button {
          background: linear-gradient(135deg, #ffc72c, #d89b00);
          color: #050505;
          box-shadow: 0 10px 30px rgba(255, 199, 44, 0.2);
        }

        .dark-button {
          background: rgba(255, 255, 255, 0.08);
          color: #f5f5f5;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.055);
          border-radius: 22px;
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .label {
          color: #9f9f9f;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 900;
        }

        .big-value {
          font-size: 30px;
          font-weight: 950;
          margin-top: 6px;
          letter-spacing: -0.04em;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #bdbdbd;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 900;
        }

        input {
          width: 100%;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
          border-radius: 14px;
          padding: 12px;
          outline: none;
          font-weight: 800;
        }

        input:focus {
          border-color: rgba(255, 199, 44, 0.75);
          box-shadow: 0 0 0 3px rgba(255, 199, 44, 0.1);
        }

        .check-line {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 100%;
          padding-top: 19px;
          color: #d8d8d8;
          font-size: 13px;
          font-weight: 800;
        }

        .check-line input {
          width: auto;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 18px;
          margin-top: 18px;
        }

        .panel {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.56);
          border-radius: 26px;
          padding: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
        }

        .panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .panel-title h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(255,255,255,0.08);
          color: #d7d7d7;
          border: 1px solid rgba(255,255,255,0.1);
          white-space: nowrap;
        }

        .pill.good {
          color: #72ff9d;
          background: rgba(114, 255, 157, 0.09);
          border-color: rgba(114, 255, 157, 0.25);
        }

        .pill.watch {
          color: #ffc72c;
          background: rgba(255, 199, 44, 0.09);
          border-color: rgba(255, 199, 44, 0.25);
        }

        .pill.bad {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.09);
          border-color: rgba(255, 107, 107, 0.25);
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }

        th {
          text-align: left;
          color: #999;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 12px;
          background: rgba(255,255,255,0.05);
        }

        td {
          padding: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
          vertical-align: middle;
          font-weight: 800;
        }

        .ticker {
          font-size: 18px;
          font-weight: 950;
          color: #ffc72c;
          letter-spacing: 0.02em;
        }

        .score {
          font-size: 22px;
          font-weight: 950;
        }

        .muted {
          color: #9f9f9f;
        }

        .reason-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .reason {
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          color: #d9d9d9;
          font-size: 13px;
          line-height: 1.35;
        }

        .manual-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin-bottom: 12px;
        }

        .watch-item {
          display: grid;
          grid-template-columns: 0.8fr 1fr 1fr 1fr;
          gap: 8px;
          align-items: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 12px 0;
        }

        .remove {
          background: rgba(255, 107, 107, 0.12);
          color: #ff8a8a;
          border: 1px solid rgba(255, 107, 107, 0.24);
          padding: 8px 10px;
          border-radius: 12px;
        }

        .empty {
          border: 1px dashed rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          padding: 24px;
          color: #a9a9a9;
          line-height: 1.5;
          text-align: center;
        }

        .error {
          margin-top: 14px;
          border: 1px solid rgba(255, 107, 107, 0.35);
          background: rgba(255, 107, 107, 0.08);
          color: #ffd1d1;
          border-radius: 16px;
          padding: 12px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .grid,
          .filters,
          .content-grid {
            grid-template-columns: 1fr;
          }

          .hero-top {
            flex-direction: column;
          }

          .button-row {
            width: 100%;
          }

          button {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">Proof Of Structure™</div>
            <h1>Raw Hunter Gatherer</h1>
            <p className="subtitle">
              Discovery only. This page reads <b>/api/gainers</b>, ranks the 4AM-style runners, and shows evidence without pretending it is a buy signal.
            </p>
          </div>

          <div className="button-row">
            <button className="gold-button" onClick={fetchHunter} disabled={loading}>
              {loading ? "Scanning..." : "New Scan"}
            </button>
            <button
              className="dark-button"
              onClick={() => {
                setMinPrice("0.10");
                setMaxPrice("10");
                setMinGain("0");
                setMaxGain("120");
                setMinVolume("0");
                setLimit("10");
                setRemoveJunk(true);
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="label">Top Ticker</div>
            <div className="big-value">{topTicker || "—"}</div>
          </div>

          <div className="card">
            <div className="label">Top Score</div>
            <div className="big-value">{topScore.toFixed(0)}</div>
          </div>

          <div className="card">
            <div className="label">Raw Count</div>
            <div className="big-value">{rawCount}</div>
          </div>

          <div className="card">
            <div className="label">Showing</div>
            <div className="big-value">{showing}</div>
          </div>
        </div>

        <div className="filters">
          <div className="field">
            <label>Min Price</label>
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>

          <div className="field">
            <label>Max Price</label>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          <div className="field">
            <label>Min Gain %</label>
            <input value={minGain} onChange={(e) => setMinGain(e.target.value)} />
          </div>

          <div className="field">
            <label>Max Gain %</label>
            <input value={maxGain} onChange={(e) => setMaxGain(e.target.value)} />
          </div>

          <div className="field">
            <label>Min Volume</label>
            <input value={minVolume} onChange={(e) => setMinVolume(e.target.value)} />
          </div>

          <div className="field">
            <label>Limit</label>
            <input value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>

          <label className="check-line">
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

      <section className="content-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>Hunter Top List</h2>
            <span className="pill watch">Last Scan: {lastScan}</span>
          </div>

          {items.length === 0 ? (
            <div className="empty">
              No Hunter results showing. Check API key, route build, market data, or filters.
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
                    <th>RVOL</th>
                    <th>Spread</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Phase</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const ticker = String(item.ticker || item.symbol || "—").toUpperCase();

                    return (
                      <tr key={`${ticker}-${index}`}>
                        <td>{item.rank || index + 1}</td>
                        <td className="ticker">{ticker}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPct(item.gainPct)}</td>
                        <td>{formatVolume(item.premarketVolume)}</td>
                        <td>{num(item.relativePremarketVolume).toFixed(2)}</td>
                        <td>
                          {formatPct(item.spreadPct)}{" "}
                          <span className={`pill ${statusClass(item.spreadStatus)}`}>
                            {item.spreadStatus || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="score">{num(item.hunterScore).toFixed(0)}</td>
                        <td>
                          <span className={`pill ${statusClass(item.hunterStatus)}`}>
                            {item.hunterStatus || "FLAT"}
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
          <div className="panel-title">
            <h2>Mission Control</h2>
            <span className="pill">{mode}</span>
          </div>

          <div className="card">
            <div className="label">Source</div>
            <div className="big-value" style={{ fontSize: 18 }}>{source}</div>
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <div className="label">Best Read</div>
            <div className="big-value">{best?.ticker || best?.symbol || "—"}</div>
            <div className="reason-list">
              {(best?.reasons || []).slice(0, 5).map((reason, index) => (
                <div className="reason" key={`reason-${index}`}>
                  ✅ {reason}
                </div>
              ))}

              {(best?.warnings || []).slice(0, 5).map((warning, index) => (
                <div className="reason" key={`warning-${index}`}>
                  ⚠️ {warning}
                </div>
              ))}

              {!best ? (
                <div className="reason">No top ticker yet.</div>
              ) : null}
            </div>
          </div>

          <div style={{ height: 18 }} />

          <div className="panel-title">
            <h2>Manual Watch</h2>
            <span className="pill watch">Local</span>
          </div>

          <div className="manual-row">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addManualTickers();
              }}
              placeholder="AZTR, IONZ, ONCY"
            />
            <button className="gold-button" onClick={addManualTickers}>
              Add
            </button>
          </div>

          {manualMatches.length === 0 ? (
            <div className="empty">
              Type tickers here. If the Hunter API returns them, this panel shows their score.
            </div>
          ) : (
            manualMatches.map(({ ticker, item }) => (
              <div className="watch-item" key={ticker}>
                <div className="ticker">{ticker}</div>

                <div>
                  <div className="label">Score</div>
                  <div>{item ? num(item.hunterScore).toFixed(0) : "Not found"}</div>
                </div>

                <div>
                  <div className="label">Gain</div>
                  <div>{item ? formatPct(item.gainPct) : "—"}</div>
                </div>

                <button
                  className="remove"
                  onClick={() => {
                    setManualTickers((old) => old.filter((x) => x !== ticker));
                  }}
                >
                  X
                </button>
              </div>
            ))
          )}
        </aside>
      </section>
    </main>
  );
}
