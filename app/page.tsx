// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SuperScannerItem = {
  ticker?: string;
  symbol?: string;

  finalLight?: string;
  runnerLight?: string;
  dayBias?: string;

  latestHeadline?: string;
  newsUrl?: string;
  newsPublisher?: string;
  newsCategory?: string;
  newsFreshness?: string;
  newsAgeMinutes?: number | string | null;

  price?: number | string;
  previousClose?: number | string;
  gainPct?: number | string;
  speedPct?: number | string;
  momentumPct?: number | string;
  volume?: number | string;
  volumeSpeedPct?: number | string;
  dollarVolume?: number | string;
  vwap?: number | string;
  vwapDistancePct?: number | string;
  bid?: number | string;
  ask?: number | string;
  spreadPct?: number | string | null;
  quoteAgeMinutes?: number | string | null;

  hunterStatus?: string;
  hunterPhase?: string;
  hunterScore?: number | string;
  hunterReason?: string;

  establishedLight?: string;
  establishedScore?: number | string;
  establishedReason?: string;

  superScore?: number | string;
  climbPercent?: number | string;
  dayBiasScore?: number | string;
  headlineScore?: number | string;
  liveCatalystScore?: number | string;

  componentScores?: Record<string, number>;
};

type ApiResponse = {
  ok?: boolean;
  source?: string;
  mode?: string;
  marketMode?: string;
  message?: string;
  rawCount?: number;
  filteredCount?: number;
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

type Settings = {
  minPrice: string;
  maxPrice: string;
  minGainPct: string;
  maxGainPct: string;
  minVolume: string;
  minDollarVolume: string;
  maxSpreadPct: string;
  maxQuoteAgeMinutes: string;
  preCandidateCount: string;
  finalLimit: string;

  greenThreshold: string;
  yellowThreshold: string;

  useCatalyst: boolean;
  useHunter: boolean;
  useEstablished: boolean;
  useVwap: boolean;
  useSpread: boolean;
  useVolumeSpeed: boolean;

  pctWeight: string;
  speedWeight: string;
  accelWeight: string;
  volumeWeight: string;
  volumeSpeedWeight: string;
  vwapWeight: string;
  spreadWeight: string;
  catalystWeight: string;
  hunterWeight: string;
  establishedWeight: string;
  dayBiasWeight: string;
};

const DEFAULT_SETTINGS: Settings = {
  minPrice: "0.10",
  maxPrice: "20",
  minGainPct: "0",
  maxGainPct: "0",
  minVolume: "0",
  minDollarVolume: "0",
  maxSpreadPct: "0",
  maxQuoteAgeMinutes: "15",
  preCandidateCount: "50",
  finalLimit: "20",

  greenThreshold: "80",
  yellowThreshold: "45",

  useCatalyst: true,
  useHunter: true,
  useEstablished: true,
  useVwap: true,
  useSpread: true,
  useVolumeSpeed: true,

  pctWeight: "1",
  speedWeight: "1.25",
  accelWeight: "0.75",
  volumeWeight: "0.35",
  volumeSpeedWeight: "1",
  vwapWeight: "0.75",
  spreadWeight: "0.8",
  catalystWeight: "1.25",
  hunterWeight: "0.9",
  establishedWeight: "0.7",
  dayBiasWeight: "1",
};

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanTicker(value: unknown): string {
  return str(value).toUpperCase();
}

function label(value: unknown): string {
  return str(value || "—").replaceAll("_", " ");
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

function compact(value: unknown): string {
  const n = num(value);

  if (!n) return "—";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function minutes(value: unknown): string {
  const n = num(value);

  if (!n) return "—";

  return `${n}m`;
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

function lightClass(value?: string): string {
  const text = str(value).toUpperCase();

  if (
    text.includes("GREEN") ||
    text === "CLIMBING" ||
    text === "POSITIVE_DAY" ||
    text === "FRESH_CATALYST" ||
    text === "ESTABLISHED"
  ) {
    return "green";
  }

  if (
    text.includes("YELLOW") ||
    text === "FLAT" ||
    text === "CLIMBER" ||
    text === "RECENT_CATALYST"
  ) {
    return "yellow";
  }

  if (
    text.includes("RED") ||
    text === "FADING" ||
    text === "NEGATIVE_DAY" ||
    text === "EXTENDED_HOT" ||
    text === "STALE_NEWS"
  ) {
    return "red";
  }

  return "grey";
}

function buildParams(settings: Settings, resetMemory: boolean): URLSearchParams {
  const params = new URLSearchParams();

  params.set("resetMemory", String(resetMemory));

  for (const [key, value] of Object.entries(settings)) {
    params.set(key, String(value));
  }

  return params;
}

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<SuperScannerItem[]>([]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("waiting");
  const [mode, setMode] = useState("CONFIGURABLE_SCANNER_ENGINE");
  const [marketMode, setMarketMode] = useState("waiting");
  const [lastScan, setLastScan] = useState("Never");
  const [topTicker, setTopTicker] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [showing, setShowing] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(true);

  const visibleItems = useMemo(() => {
    const limit = Math.max(1, Math.min(100, Math.round(num(settings.finalLimit) || 20)));
    return items.slice(0, limit);
  }, [items, settings.finalLimit]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const fetchScan = useCallback(
    async (resetMemory = false) => {
      setLoading(true);
      setMessage("");

      try {
        const params = buildParams(settings, resetMemory);

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
        setMode(str(json.mode || "CONFIGURABLE_SCANNER_ENGINE"));
        setMarketMode(str(json.marketMode || "unknown"));
        setMessage(str(json.message || ""));
        setTopTicker(apiTopTicker || firstTicker || null);
        setRawCount(num(json.rawCount));
        setFilteredCount(num(json.filteredCount));
        setShowing(num(json.showing) || list.length);
        setLastScan(new Date().toLocaleTimeString());
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown page error.";

        setMessage(text);
        setItems([]);
        setTopTicker(null);
        setRawCount(0);
        setFilteredCount(0);
        setShowing(0);
        setSource("error");
        setMarketMode("error");
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

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
        * { box-sizing: border-box; }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at top left, rgba(255, 205, 85, 0.18), transparent 30%),
            radial-gradient(circle at top right, rgba(60, 130, 255, 0.16), transparent 28%),
            linear-gradient(135deg, #07090d, #121821 48%, #080b10);
          color: #f5f8ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        body { overflow-x: hidden; }

        .shell {
          min-height: 100vh;
          padding: 22px;
        }

        .hero,
        .panel {
          border: 1px solid rgba(255, 213, 104, 0.22);
          background: linear-gradient(145deg, rgba(20, 26, 35, 0.94), rgba(8, 11, 16, 0.96));
          border-radius: 28px;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255,255,255,.06);
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ffd568;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: clamp(34px, 6vw, 68px);
          line-height: .94;
          letter-spacing: -.06em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .sub {
          color: #a9c7ef;
          max-width: 980px;
          line-height: 1.5;
          margin-top: 12px;
          font-size: 14px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 19px;
          text-transform: uppercase;
          letter-spacing: -.03em;
        }

        h3 {
          margin: 0 0 10px;
          color: #ffd568;
          font-size: 13px;
          letter-spacing: .12em;
          text-transform: uppercase;
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

        button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .gold-button {
          background: linear-gradient(135deg, #ffe08a, #c4912b);
          color: #111820;
        }

        .dark-button {
          background: rgba(255,255,255,.08);
          color: #e7f2ff;
          border: 1px solid rgba(255,255,255,.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.045);
          min-width: 0;
        }

        .label {
          color: #9eb7d8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 950;
        }

        .value {
          font-size: 25px;
          font-weight: 950;
          margin-top: 5px;
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
          grid-template-columns: 360px 1fr;
          gap: 16px;
          margin-top: 16px;
          align-items: start;
        }

        .control-grid {
          display: grid;
          gap: 12px;
        }

        .control-section {
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 18px;
          padding: 12px;
          background: rgba(0,0,0,.16);
        }

        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .field {
          display: grid;
          gap: 5px;
        }

        .field label {
          color: #9eb7d8;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        input {
          width: 100%;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 12px;
          background: rgba(255,255,255,.07);
          color: #ffffff;
          padding: 10px;
          font-weight: 850;
          outline: none;
        }

        .check-row {
          display: grid;
          gap: 8px;
        }

        .check {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #d9e9ff;
          font-size: 12px;
          font-weight: 850;
        }

        .check input {
          width: auto;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .card {
          border: 1px solid rgba(255,255,255,.09);
          background: linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.022));
          border-radius: 22px;
          padding: 15px;
        }

        .card-top {
          display: grid;
          grid-template-columns: 1.1fr auto auto auto;
          gap: 10px;
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
          letter-spacing: .04em;
          color: #ffffff;
          text-decoration: none;
        }

        .headline {
          color: #a9c7ef;
          font-size: 12px;
          line-height: 1.4;
          margin-top: 8px;
          max-width: 800px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .metric {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          padding: 9px;
          background: rgba(0,0,0,.18);
          min-width: 0;
        }

        .metric-name {
          color: #8daed4;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .metric-value {
          color: #ffffff;
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
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 18px;
          padding: 12px;
          background: rgba(0,0,0,.18);
        }

        .engine-title {
          color: #ffd568;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .12em;
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
          min-width: 112px;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .06em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,.12);
          white-space: nowrap;
        }

        .green {
          color: #dcffeb;
          background: rgba(41,165,92,.22);
          border-color: rgba(41,165,92,.48);
        }

        .yellow {
          color: #fff0a6;
          background: rgba(204,165,36,.20);
          border-color: rgba(204,165,36,.44);
        }

        .red {
          color: #ffdcdc;
          background: rgba(255,90,90,.18);
          border-color: rgba(255,90,90,.34);
        }

        .grey {
          color: #d9e6f3;
          background: rgba(150,160,170,.18);
          border-color: rgba(150,160,170,.38);
        }

        .empty,
        .error {
          border-radius: 18px;
          padding: 18px;
          color: #9fbce0;
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

        .footer-note {
          margin-top: 14px;
          color: #8daed4;
          font-size: 11px;
          line-height: 1.45;
        }

        @media (max-width: 1250px) {
          .layout {
            grid-template-columns: 1fr;
          }

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

          .stats,
          .input-grid,
          .metric-grid {
            grid-template-columns: 1fr;
          }

          .button-row,
          button,
          .pill {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div className="top">
          <div>
            <div className="eyebrow">Configurable Scanner Engine</div>
            <h1>Mission Control</h1>
            <div className="sub">
              Every major scanner input is now adjustable: price, gain, volume, spread, VWAP,
              percent-change speed, volume speed, catalyst weight, Hunter Engine weight, and
              Established Engine weight. Scanner only. No proof = no trade.
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

            <button className="dark-button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
              Reset Filters
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
            <div className="label">Raw</div>
            <div className="value">{compact(rawCount)}</div>
          </div>

          <div className="stat">
            <div className="label">Filtered</div>
            <div className="value">{compact(filteredCount)}</div>
          </div>

          <div className="stat">
            <div className="label">Showing</div>
            <div className="value">{showing}</div>
          </div>
        </div>

        <div className="meta">
          Last scan: <b>{lastScan}</b>
          {" | "}
          Mode: <b>{mode}</b>
          {" | "}
          Source: <b>{source}</b>
          {" | "}
          Auto: <b>{autoScan ? "ON" : "OFF"}</b>
        </div>

        {message ? <div className="error">{message}</div> : null}
      </section>

      <section className="layout">
        <aside className="panel">
          <h2>Filter Scanner Section</h2>

          <div className="control-grid">
            <div className="control-section">
              <h3>Hard Filters</h3>

              <div className="input-grid">
                <div className="field">
                  <label>Min Price</label>
                  <input value={settings.minPrice} onChange={(e) => updateSetting("minPrice", e.target.value)} />
                </div>

                <div className="field">
                  <label>Max Price</label>
                  <input value={settings.maxPrice} onChange={(e) => updateSetting("maxPrice", e.target.value)} />
                </div>

                <div className="field">
                  <label>Min Gain %</label>
                  <input value={settings.minGainPct} onChange={(e) => updateSetting("minGainPct", e.target.value)} />
                </div>

                <div className="field">
                  <label>Max Gain % / 0 Off</label>
                  <input value={settings.maxGainPct} onChange={(e) => updateSetting("maxGainPct", e.target.value)} />
                </div>

                <div className="field">
                  <label>Min Volume</label>
                  <input value={settings.minVolume} onChange={(e) => updateSetting("minVolume", e.target.value)} />
                </div>

                <div className="field">
                  <label>Min Dollar Vol</label>
                  <input value={settings.minDollarVolume} onChange={(e) => updateSetting("minDollarVolume", e.target.value)} />
                </div>

                <div className="field">
                  <label>Max Spread % / 0 Off</label>
                  <input value={settings.maxSpreadPct} onChange={(e) => updateSetting("maxSpreadPct", e.target.value)} />
                </div>

                <div className="field">
                  <label>Max Trade Age Min</label>
                  <input value={settings.maxQuoteAgeMinutes} onChange={(e) => updateSetting("maxQuoteAgeMinutes", e.target.value)} />
                </div>

                <div className="field">
                  <label>Pre Candidates</label>
                  <input value={settings.preCandidateCount} onChange={(e) => updateSetting("preCandidateCount", e.target.value)} />
                </div>

                <div className="field">
                  <label>Final Limit</label>
                  <input value={settings.finalLimit} onChange={(e) => updateSetting("finalLimit", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="control-section">
              <h3>Light Thresholds</h3>

              <div className="input-grid">
                <div className="field">
                  <label>Green Score</label>
                  <input value={settings.greenThreshold} onChange={(e) => updateSetting("greenThreshold", e.target.value)} />
                </div>

                <div className="field">
                  <label>Yellow Score</label>
                  <input value={settings.yellowThreshold} onChange={(e) => updateSetting("yellowThreshold", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="control-section">
              <h3>Engine Toggles</h3>

              <div className="check-row">
                {[
                  ["useCatalyst", "Use Catalyst Engine"],
                  ["useHunter", "Use Hunter Engine"],
                  ["useEstablished", "Use Established Engine"],
                  ["useVwap", "Use VWAP Score"],
                  ["useSpread", "Use Spread Score"],
                  ["useVolumeSpeed", "Use Volume Speed"],
                ].map(([key, text]) => (
                  <label className="check" key={key}>
                    <span>{text}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[key as keyof Settings])}
                      onChange={(e) =>
                        updateSetting(key as keyof Settings, e.target.checked as never)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="control-section">
              <h3>Score Weights</h3>

              <div className="input-grid">
                {[
                  ["pctWeight", "Percent Change"],
                  ["speedWeight", "Price Speed"],
                  ["accelWeight", "Acceleration"],
                  ["volumeWeight", "Volume"],
                  ["volumeSpeedWeight", "Volume Speed"],
                  ["vwapWeight", "VWAP"],
                  ["spreadWeight", "Spread"],
                  ["catalystWeight", "Catalyst"],
                  ["hunterWeight", "Hunter"],
                  ["establishedWeight", "Established"],
                  ["dayBiasWeight", "Day Bias"],
                ].map(([key, text]) => (
                  <div className="field" key={key}>
                    <label>{text}</label>
                    <input
                      value={String(settings[key as keyof Settings])}
                      onChange={(e) =>
                        updateSetting(key as keyof Settings, e.target.value as never)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="panel">
          <h2>Ranked Scanner Candidates</h2>

          {visibleItems.length === 0 ? (
            <div className="empty">No live candidates right now.</div>
          ) : (
            <div className="list">
              {visibleItems.map((item, index) => {
                const ticker = cleanTicker(item.ticker || item.symbol);

                return (
                  <div className="card" key={`${ticker || "UNKNOWN"}-${index}`}>
                    <div className="card-top">
                      <div>
                        <div className="ticker-line">
                          <span className="rank">#{index + 1}</span>

                          {item.newsUrl ? (
                            <a className="ticker" href={item.newsUrl} target="_blank" rel="noreferrer">
                              {ticker || "—"}
                            </a>
                          ) : (
                            <div className="ticker">{ticker || "—"}</div>
                          )}
                        </div>

                        <div className="headline">
                          {item.latestHeadline || "No fresh headline attached."}
                        </div>
                      </div>

                      <span className={`pill ${lightClass(item.finalLight)}`}>
                        {label(item.finalLight || "SUPER_RED")}
                      </span>

                      <span className={`pill ${lightClass(item.runnerLight)}`}>
                        {label(item.runnerLight || "LIGHT_GREY")}
                      </span>

                      <span className={`pill ${lightClass(item.dayBias)}`}>
                        {label(item.dayBias || "NO_DAY_SIGNAL")}
                      </span>
                    </div>

                    <div className="metric-grid">
                      <div className="metric">
                        <div className="metric-name">Super Score</div>
                        <div className="metric-value">{score(item.superScore)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Price</div>
                        <div className="metric-value">{money(item.price)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Gain</div>
                        <div className="metric-value">{pct(item.gainPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Price Speed</div>
                        <div className="metric-value">{signedPct(item.speedPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Acceleration</div>
                        <div className="metric-value">{signedPct(item.momentumPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Volume Speed</div>
                        <div className="metric-value">{signedPct(item.volumeSpeedPct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Volume</div>
                        <div className="metric-value">{compact(item.volume)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Dollar Volume</div>
                        <div className="metric-value">{compact(item.dollarVolume)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">VWAP</div>
                        <div className="metric-value">{money(item.vwap)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">VWAP Dist</div>
                        <div className="metric-value">{signedPct(item.vwapDistancePct)}</div>
                      </div>

                      <div className="metric">
                        <div className="metric-name">Spread</div>
                        <div className="metric-value">{pct(item.spreadPct)}</div>
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
                          <span className={`pill ${lightClass(item.hunterStatus)}`}>
                            {label(item.hunterStatus || "FADING")}
                          </span>

                          <span className={`pill ${lightClass(item.hunterPhase)}`}>
                            {label(item.hunterPhase || "BELOW_RADAR")}
                          </span>

                          <span className="pill grey">Score {score(item.hunterScore)}</span>
                        </div>

                        <div className="engine-text">
                          {item.hunterReason || "Hunter read unavailable."}
                        </div>
                      </div>

                      <div className="engine">
                        <div className="engine-title">Established Engine</div>
                        <div className="pill-row">
                          <span className={`pill ${lightClass(item.establishedLight)}`}>
                            {label(item.establishedLight || "NOT_ESTABLISHED")}
                          </span>

                          <span className="pill grey">Score {score(item.establishedScore)}</span>
                        </div>

                        <div className="engine-text">
                          {item.establishedReason || "Established read unavailable."}
                        </div>
                      </div>

                      <div className="engine">
                        <div className="engine-title">Catalyst Engine</div>
                        <div className="pill-row">
                          <span className={`pill ${lightClass(item.newsFreshness)}`}>
                            {label(item.newsFreshness || "UNKNOWN_NEWS_AGE")}
                          </span>

                          <span className="pill grey">News {score(item.headlineScore)}</span>
                          <span className="pill grey">Live {score(item.liveCatalystScore)}</span>
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
        </section>
      </section>
    </main>
  );
}
