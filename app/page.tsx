"use client";

import { useEffect, useState } from "react";

type Stock = {
  ticker?: string;
  price?: number;
  gain?: number;
  volume?: number;
  moverDiscoveryScore?: number;
  moverLabel?: string;
  verdict?: string;
  marketMode?: string;
  pctChange?: number;
  acceleration?: number | null;
};

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: any) {
  const n = num(v);
  if (!n) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(v: any) {
  const n = num(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function vol(v: any) {
  const n = num(v);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export default function Page() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [marketMode, setMarketMode] = useState("UNKNOWN");
  const [lastScan, setLastScan] = useState("");

  async function load() {
    setStatus("SCANNING");

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();

      const list = json?.data?.tickers || json?.tickers || [];

      setStocks(Array.isArray(list) ? list : []);
      setMarketMode(json?.marketMode || "UNKNOWN");
      setLastScan(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }));
      setStatus(json?.ok ? "CONNECTED" : "API ERROR");
    } catch (error) {
      setStatus("PAGE ERROR");
      setStocks([]);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p>PROOF OF STRUCTURE™</p>
          <h1>ELITE DEV 4</h1>
          <span>Mover Discovery Test Dashboard</span>
        </div>

        <div className="statusBox">
          <strong>{status}</strong>
          <span>Mode: {marketMode}</span>
          <span>Last Scan: {lastScan || "N/A"}</span>
          <button onClick={load}>NEW SCAN</button>
        </div>
      </section>

      {marketMode === "BACKUP_CLOSED_MARKET" && (
        <section className="warning">
          MARKET CLOSED / BACKUP MODE — do not judge mover math from 0% gain backup names.
        </section>
      )}

      <section className="cards">
        <div className="card">
          <small>Raw Count</small>
          <strong>{stocks.length}</strong>
        </div>

        <div className="card">
          <small>Top Mover</small>
          <strong>{stocks[0]?.ticker || "NONE"}</strong>
        </div>

        <div className="card">
          <small>Top Score</small>
          <strong>{stocks[0]?.moverDiscoveryScore ?? 0}</strong>
        </div>

        <div className="card">
          <small>Top Label</small>
          <strong>{stocks[0]?.moverLabel || "N/A"}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>Percent-Rising Mover Discovery</h2>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>Gain</th>
                <th>Score</th>
                <th>Label</th>
                <th>Acceleration</th>
                <th>Volume</th>
                <th>Verdict</th>
              </tr>
            </thead>

            <tbody>
              {stocks.map((s, i) => (
                <tr key={`${s.ticker}-${i}`}>
                  <td><b>{s.ticker || "N/A"}</b></td>
                  <td>{money(s.price)}</td>
                  <td>{pct(s.pctChange ?? s.gain)}</td>
                  <td>{num(s.moverDiscoveryScore).toFixed(2)}</td>
                  <td>{s.moverLabel || "N/A"}</td>
                  <td>{s.acceleration === null || s.acceleration === undefined ? "N/A" : num(s.acceleration).toFixed(4)}</td>
                  <td>{vol(s.volume)}</td>
                  <td>{s.verdict || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #d7d4cc;
          color: #2e2c27;
          padding: 24px;
          font-family: Arial, sans-serif;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          background: #eeeae0;
          border: 1px solid #aaa08c;
          border-radius: 24px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 12px 30px rgba(64, 58, 45, 0.14);
        }

        .hero p {
          margin: 0;
          color: #7b6741;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 4px 0;
          font-size: 42px;
        }

        .hero span {
          font-weight: 800;
        }

        .statusBox {
          display: grid;
          gap: 8px;
          min-width: 220px;
        }

        button {
          border: 1px solid #8b826f;
          background: #2f2b25;
          color: #f1ead9;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .warning {
          background: #fff4cf;
          color: #6d5218;
          border: 1px solid #a8863f;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 18px;
          font-weight: 900;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .card,
        .panel {
          background: #eeeae0;
          border: 1px solid #aaa08c;
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 12px 30px rgba(64, 58, 45, 0.12);
        }

        .card small {
          color: #7b6741;
          font-weight: 900;
        }

        .card strong {
          display: block;
          font-size: 30px;
          margin-top: 6px;
        }

        h2 {
          margin-top: 0;
          color: #7b6741;
        }

        .tableWrap {
          overflow: auto;
          border-radius: 16px;
          border: 1px solid #b7ac95;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: #f7f4ec;
        }

        th,
        td {
          padding: 10px;
          border-bottom: 1px solid #d0c7b5;
          text-align: left;
          white-space: nowrap;
        }

        th {
          background: #383229;
          color: #f3ead8;
        }

        @media (max-width: 800px) {
          .hero {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}
