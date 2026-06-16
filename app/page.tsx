"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  ticker: string;
  price: number;
  gain: number;
  volume: number;
  spread: number;
  support: number;
  resistance: number;
  spreadScore: number;
  speedScore: number;
  volumeScore: number;
  supportScore: number;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  eliteScore: number;
  lifecycle: string;
  verdict: string;
  positiveEvidence: string[];
  negativeEvidence: string[];
  invalidation: string;
};

type WatchItem = {
  ticker: string;
  notes: string;
};

type JournalEntry = {
  id: string;
  ticker: string;
  time: string;
  reason: string;
  evidence: string;
  outcome: string;
};

const API = "/api/elite-scanner";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function money(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return "$" + value.toFixed(value < 1 ? 4 : 2);
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function vol(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return Math.round(value).toString();
}

function readTickers(json: any): any[] {
  if (Array.isArray(json?.data?.tickers)) return json.data.tickers;
  if (Array.isArray(json?.tickers)) return json.tickers;
  if (Array.isArray(json?.results)) return json.results;
  return [];
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
      raw?.c
  );

  const gain = num(
    raw?.gain ??
      raw?.todaysChangePerc ??
      raw?.percentChange ??
      raw?.changePercent
  );

  const volume = num(raw?.volume ?? raw?.day?.v ?? raw?.min?.v ?? raw?.v);

  const high = num(raw?.high ?? raw?.day?.h ?? raw?.h ?? price * 1.08);
  const low = num(raw?.low ?? raw?.day?.l ?? raw?.l ?? price * 0.94);

  const bid = num(raw?.bid ?? raw?.lastQuote?.bp);
  const ask = num(raw?.ask ?? raw?.lastQuote?.ap);
  const spread = num(raw?.spread ?? (ask > bid && bid > 0 ? ask - bid : 0));

  const support = low || price;
  const resistance = high || price;
  const range = Math.max(0.0001, resistance - support);
  const rangePosition = clamp(((price - support) / range) * 100);

  const spreadPct = price > 0 && spread > 0 ? (spread / price) * 100 : 0;

  const spreadScore =
    !spread || !price
      ? 50
      : spreadPct <= 0.5
      ? 100
      : spreadPct <= 1
      ? 90
      : spreadPct <= 2
      ? 75
      : spreadPct <= 4
      ? 52
      : spreadPct <= 7
      ? 30
      : 12;

  const speedScore = clamp(
    num(raw?.speed ?? raw?.speedScore ?? Math.max(0, gain) * 0.85 + Math.max(0, 100 - index * 2) * 0.05)
  );

  const volumeScore = clamp(
    num(raw?.volumeAcceleration ?? raw?.relativeVolume ?? raw?.rvol ?? (volume > 0 ? volume / 100000 : 0)) * 8
  );

  const supportScore =
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

  const catalystScore = 50;
  const environmentScore = 50;

  const formationScore = Math.round(
    clamp(
      spreadScore * 0.25 +
        speedScore * 0.25 +
        volumeScore * 0.25 +
        supportScore * 0.25 +
        (gain >= 5 && gain <= 50 ? 8 : gain >= 75 ? -18 : 0)
    )
  );

  const journeyScore = Math.round(
    clamp(
      formationScore * 0.5 +
        speedScore * 0.25 +
        volumeScore * 0.25 +
        (gain >= 5 && gain <= 50 ? 10 : gain >= 75 ? -18 : 0)
    )
  );

  const proofScore = Math.round(
    clamp(
      supportScore * 0.3 +
        spreadScore * 0.25 +
        speedScore * 0.2 +
        volumeScore * 0.15 +
        catalystScore * 0.1
    )
  );

  const eliteScore = Math.round(
    clamp(
      spreadScore * 0.2 +
        speedScore * 0.2 +
        volumeScore * 0.2 +
        supportScore * 0.15 +
        catalystScore * 0.1 +
        environmentScore * 0.1 +
        journeyScore * 0.05
    )
  );

  const lifecycle =
    price > 0 && support > 0 && price < support
      ? "FAILING"
      : gain >= 75
      ? "EXTENDED"
      : eliteScore >= 85
      ? "RUNNING"
      : eliteScore >= 75
      ? "IGNITING"
      : formationScore >= 62 && gain >= 5 && gain <= 50
      ? "FORMING"
      : speedScore >= 45 || volumeScore >= 45
      ? "WAKING"
      : "SLEEPING";

  const verdict =
    lifecycle === "FAILING" || lifecycle === "EXTENDED"
      ? "WAIT"
      : eliteScore >= 80 && proofScore >= 68
      ? "YES"
      : eliteScore >= 55 || formationScore >= 58
      ? "WAIT"
      : "NO";

  const positiveEvidence: string[] = [];
  const negativeEvidence: string[] = [];

  if (spreadScore >= 75) positiveEvidence.push("Spread quality supports controlled execution.");
  else negativeEvidence.push("Spread is weak, wide, or unavailable.");

  if (speedScore >= 60) positiveEvidence.push("Speed is increasing.");
  else negativeEvidence.push("Speed is not yet strong.");

  if (volumeScore >= 60) positiveEvidence.push("Volume acceleration is active.");
  else negativeEvidence.push("Volume acceleration is limited.");

  if (supportScore >= 70) positiveEvidence.push("Support structure is holding.");
  else negativeEvidence.push("Support quality is weak or failing.");

  if (gain >= 5 && gain <= 50) positiveEvidence.push("Gain is inside preferred formation zone.");
  if (gain >= 75) negativeEvidence.push("Move is extended and carries chase risk.");

  return {
    ticker,
    price,
    gain,
    volume,
    spread,
    support,
    resistance,
    spreadScore,
    speedScore,
    volumeScore,
    supportScore,
    formationScore,
    journeyScore,
    proofScore,
    eliteScore,
    lifecycle,
    verdict,
    positiveEvidence,
    negativeEvidence,
    invalidation:
      support > 0
        ? `Support failure below ${money(support)}, spread widening, speed collapse, or volume fading.`
        : "Support failure, spread widening, speed collapse, or volume fading.",
  };
}

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [source, setSource] = useState("POLYGON");
  const [lastUpdate, setLastUpdate] = useState("NEVER");
  const [selected, setSelected] = useState<Stock | null>(null);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [page, setPage] = useState("dashboard");

  async function scan() {
    setStatus("CONNECTING");

    try {
      const res = await fetch(API, { cache: "no-store" });
      const json = await res.json();
      const list = readTickers(json);

      setSource(String(json?.source || "POLYGON"));
      setLastUpdate(new Date().toLocaleTimeString());

      if (!list.length) {
        setStocks([]);
        setStatus("NO LIVE DATA");
        return;
      }

      const normalized = list
        .map((item, index) => normalize(item, index))
        .filter((s) => s.ticker)
        .sort((a, b) => b.eliteScore - a.eliteScore);

      setStocks(normalized);
      setSelected(normalized[0] || null);
      setStatus("CONNECTED");
    } catch {
      setStocks([]);
      setStatus("DISCONNECTED");
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    scan();
  }, []);

  const formation = useMemo(
    () =>
      stocks
        .filter((s) => s.gain >= 5 && s.gain <= 50 && s.lifecycle !== "FAILING")
        .sort((a, b) => b.formationScore - a.formationScore),
    [stocks]
  );

  const visibleRows = page === "formation" ? formation : stocks;

  function addWatch(stock: Stock) {
    setWatchlist((prev) => {
      if (prev.some((item) => item.ticker === stock.ticker)) return prev;
      return [...prev, { ticker: stock.ticker, notes: "" }];
    });
  }

  function addJournal(stock: Stock) {
    setJournal((prev) => [
      {
        id: crypto.randomUUID(),
        ticker: stock.ticker,
        time: new Date().toLocaleString(),
        reason: "Scanner action",
        evidence: stock.positiveEvidence.join(" | "),
        outcome: "",
      },
      ...prev,
    ]);
  }

  return (
    <main className="terminal">
      <aside className="sidebar">
        <div className="brand">
          <strong>PROOF OF STRUCTURE™ ELITE</strong>
          <span>Evidence Before Entry</span>
        </div>

        {["dashboard", "scanner", "formation", "watchlist", "journal", "settings"].map((item) => (
          <button
            key={item}
            className={page === item ? "active" : ""}
            onClick={() => setPage(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}

        <div className="box">
          <p>API: {status}</p>
          <p>Source: {source}</p>
          <p>Last: {lastUpdate}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{page.toUpperCase()}</h1>
            <p>Institutional scanner · live data only · rank by Elite Score</p>
          </div>
          <button onClick={scan}>SCAN NOW</button>
        </header>

        {page === "watchlist" ? (
          <Panel title="Watchlist">
            {watchlist.length === 0 ? <p>No saved tickers yet.</p> : null}
            {watchlist.map((item) => (
              <div className="rowBox" key={item.ticker}>
                <strong>{item.ticker}</strong>
                <textarea
                  value={item.notes}
                  onChange={(e) =>
                    setWatchlist((prev) =>
                      prev.map((w) =>
                        w.ticker === item.ticker ? { ...w, notes: e.target.value } : w
                      )
                    )
                  }
                  placeholder="Notes"
                />
              </div>
            ))}
          </Panel>
        ) : page === "journal" ? (
          <Panel title="Journal">
            {journal.length === 0 ? <p>No journal entries yet.</p> : null}
            {journal.map((entry) => (
              <div className="rowBox" key={entry.id}>
                <strong>{entry.ticker}</strong>
                <small>{entry.time}</small>
                <textarea value={entry.reason} readOnly />
                <textarea value={entry.evidence} readOnly />
              </div>
            ))}
          </Panel>
        ) : page === "settings" ? (
          <Panel title="Settings">
            <p>Version: Scratch Build v1</p>
            <p>API Endpoint: {API}</p>
            <p>API Status: {status}</p>
            <p>Market Environment: Unavailable until index API exists.</p>
          </Panel>
        ) : (
          <>
            <div className="stats">
              <Stat title="API Status" value={status} />
              <Stat title="Total Symbols" value={stocks.length} />
              <Stat title="Top Elite" value={stocks[0]?.ticker || "NONE"} />
              <Stat title="Top Formation" value={formation[0]?.ticker || "NONE"} />
            </div>

            <Panel title="Live Intelligence Grid">
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Gain</th>
                      <th>Volume</th>
                      <th>Spread</th>
                      <th>Support</th>
                      <th>Resistance</th>
                      <th>Lifecycle</th>
                      <th>Formation</th>
                      <th>Journey</th>
                      <th>Proof</th>
                      <th>Elite</th>
                      <th>Verdict</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={14}>NO LIVE DATA</td>
                      </tr>
                    ) : (
                      visibleRows.map((stock) => (
                        <tr key={`${stock.ticker}-${stock.price}-${stock.volume}`}>
                          <td>{stock.ticker}</td>
                          <td>{money(stock.price)}</td>
                          <td>{pct(stock.gain)}</td>
                          <td>{vol(stock.volume)}</td>
                          <td>{stock.spread ? money(stock.spread) : "N/A"}</td>
                          <td>{money(stock.support)}</td>
                          <td>{money(stock.resistance)}</td>
                          <td>
                            <Badge value={stock.lifecycle} />
                          </td>
                          <td>{stock.formationScore}</td>
                          <td>{stock.journeyScore}</td>
                          <td>{stock.proofScore}</td>
                          <td>{stock.eliteScore}</td>
                          <td>
                            <Badge value={stock.verdict} />
                          </td>
                          <td>
                            <div className="actions">
                              <button onClick={() => addWatch(stock)}>WATCH</button>
                              <button onClick={() => setSelected(stock)}>WHY</button>
                              <button onClick={() => addJournal(stock)}>JOURNAL</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Selected Ticker Intelligence">
              {!selected ? (
                <p>No selected ticker.</p>
              ) : (
                <div>
                  <h2>{selected.ticker}</h2>
                  <p>{selected.invalidation}</p>

                  <h3>Positive Evidence</h3>
                  <ul>
                    {selected.positiveEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <h3>Negative Evidence</h3>
                  <ul>
                    {selected.negativeEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </>
        )}
      </section>

      <style jsx global>{`
        .terminal {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background: #20242b;
          color: #e6eaf0;
        }

        .sidebar {
          background: #1b2027;
          border-right: 1px solid #3a404c;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .brand {
          border-bottom: 1px solid #3a404c;
          padding-bottom: 16px;
          margin-bottom: 8px;
        }

        .brand strong {
          color: #4da3ff;
          display: block;
          font-size: 14px;
          letter-spacing: 0.08em;
        }

        .brand span {
          color: #9aa4b2;
          font-size: 12px;
        }

        button {
          background: #2a2f38;
          color: #e6eaf0;
          border: 1px solid #3a404c;
          border-radius: 8px;
          padding: 8px 10px;
        }

        button:hover,
        button.active {
          color: #4da3ff;
          border-color: #4da3ff;
        }

        .workspace {
          padding: 16px;
          min-width: 0;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        h1 {
          color: #4da3ff;
          margin: 0;
        }

        p,
        small {
          color: #9aa4b2;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat,
        .panel,
        .box,
        .rowBox {
          background: #2a2f38;
          border: 1px solid #3a404c;
          border-radius: 12px;
          padding: 12px;
        }

        .stat span,
        .panelTitle {
          color: #9aa4b2;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.08em;
        }

        .stat strong {
          display: block;
          color: #e6eaf0;
          font-size: 22px;
          margin-top: 8px;
        }

        .panel {
          margin-bottom: 16px;
        }

        .panelTitle {
          color: #4da3ff;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .tableWrap {
          overflow-x: auto;
          border: 1px solid #3a404c;
          border-radius: 10px;
        }

        table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
        }

        th {
          background: #1b2027;
          color: #4da3ff;
          text-align: left;
          padding: 9px;
          font-size: 12px;
          text-transform: uppercase;
          border-bottom: 1px solid #3a404c;
        }

        td {
          padding: 8px 9px;
          border-bottom: 1px solid #3a404c;
          white-space: nowrap;
          font-size: 13px;
        }

        .badge {
          border: 1px solid #ffb547;
          color: #ffb547;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 11px;
        }

        .badge.green {
          border-color: #00d084;
          color: #00d084;
        }

        .badge.red {
          border-color: #ff5c5c;
          color: #ff5c5c;
        }

        .actions {
          display: flex;
          gap: 6px;
        }

        .actions button {
          font-size: 11px;
          padding: 5px 7px;
        }

        textarea {
          width: 100%;
          min-height: 70px;
          background: #1b2027;
          color: #e6eaf0;
          border: 1px solid #3a404c;
          border-radius: 8px;
          padding: 8px;
          margin-top: 8px;
        }

        .rowBox {
          margin-bottom: 10px;
        }

        @media (max-width: 900px) {
          .terminal {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panelTitle">{title}</div>
      {children}
    </section>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const green =
    value === "YES" ||
    value === "FORMING" ||
    value === "IGNITING" ||
    value === "RUNNING";

  const red = value === "NO" || value === "FAILING" || value === "EXTENDED";

  return <span className={`badge ${green ? "green" : red ? "red" : ""}`}>{value}</span>;
}
