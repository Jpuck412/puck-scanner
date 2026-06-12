"use client";

import { useEffect, useState } from "react";

type Stock = {
  ticker: string;
  todaysChangePerc?: number;
  todaysChange?: number;
  day?: { c?: number; v?: number; o?: number; h?: number; l?: number };
};

function money(n?: number) {
  if (typeof n !== "number") return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(n?: number) {
  if (typeof n !== "number") return "N/A";
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function vol(n?: number) {
  if (typeof n !== "number") return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState("LOADING");
  const [time, setTime] = useState("");

  async function load() {
    setStatus("LOADING");

    try {
      const res = await fetch("/api/gainers", { cache: "no-store" });
      const json = await res.json();

      const list =
        json?.data?.tickers ||
        json?.tickers ||
        json?.results ||
        json?.data?.results ||
        [];

      setStocks(list.slice(0, 20));
      setStatus("CONNECTED");
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();

    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p>PROOF OF STRUCTURE™</p>
          <h1>MISSION CONTROL</h1>
          <span>The market must earn permission.</span>
        </div>

        <div className="box">
          <small>ET CLOCK</small>
          <strong>{time || "LOADING"}</strong>
          <small>API: {status}</small>
        </div>
      </section>

      <section className="notice">
        REGULAR MARKET LIVE — PREMARKET LATER
      </section>

      <section className="stats">
        <div><span>API Status</span><b>{status}</b></div>
        <div><span>Tickers Found</span><b>{stocks.length}</b></div>
        <div><span>Mode</span><b>RAW LIVE</b></div>
        <div><button onClick={load}>NEW SCAN</button></div>
      </section>

      <section className="panel">
        <p>LIVE TICKERS</p>

        {stocks.length === 0 ? (
          <h2>No tickers loaded. Check /api/gainers.</h2>
        ) : (
          <div className="cards">
            {stocks.map((s) => (
              <article className="card" key={s.ticker}>
                <h3>{s.ticker}</h3>
                <div><span>Gain</span><b>{pct(s.todaysChangePerc)}</b></div>
                <div><span>Price</span><b>{money(s.day?.c)}</b></div>
                <div><span>Change</span><b>{money(s.todaysChange)}</b></div>
                <div><span>Volume</span><b>{vol(s.day?.v)}</b></div>
                <div><span>Open</span><b>{money(s.day?.o)}</b></div>
                <div><span>High</span><b>{money(s.day?.h)}</b></div>
                <div><span>Low</span><b>{money(s.day?.l)}</b></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <p>POSITION CALCULATOR</p>

        <div className="cards">
          {stocks.slice(0, 10).map((s) => {
            const entry = s.day?.c || 0;
            const stop = s.day?.l || entry * 0.93;
            const target = s.day?.h || entry * 1.15;
            const risk = entry - stop;

            return (
              <article className="card" key={s.ticker + "calc"}>
                <h3>{s.ticker}</h3>
                <div><span>Current Price</span><b>{money(entry)}</b></div>
                <div><span>Entry Price</span><b>{money(entry)}</b></div>
                <div><span>Stop Loss</span><b>{money(stop)}</b></div>
                <div><span>Risk Per Share</span><b>{money(risk)}</b></div>
                <div><span>Target Exit</span><b>{money(target)}</b></div>
                <div><span>Order Type</span><b>LIMIT ONLY</b></div>
              </article>
            );
          })}
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #020202; }

        .page {
          min-height: 100vh;
          padding: 22px;
          color: #f5f5f5;
          font-family: Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(255,182,18,.25), transparent 30%),
            linear-gradient(135deg, #020202, #0b0b0b);
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 18px;
          padding: 28px;
          border-radius: 30px;
          border: 1px solid rgba(255,182,18,.35);
          background: linear-gradient(145deg, #111, #030303);
        }

        p {
          color: #ffb612;
          letter-spacing: 4px;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          margin: 8px 0;
          color: #ffb612;
          font-size: clamp(44px, 7vw, 82px);
        }

        .box,
        .notice,
        .panel,
        .stats div,
        .card {
          border-radius: 22px;
          border: 1px solid rgba(255,182,18,.25);
          background: linear-gradient(145deg, #121212, #050505);
          box-shadow: 0 18px 45px rgba(0,0,0,.7);
        }

        .box,
        .notice,
        .panel,
        .stats div,
        .card {
          padding: 18px;
        }

        .box strong,
        b {
          color: #ffd700;
        }

        .notice {
          margin: 18px 0;
          color: #ffd700;
          font-weight: 900;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stats span,
        .card span,
        small {
          color: #999;
        }

        button {
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,182,18,.45);
          background: #ffb612;
          color: #050505;
          font-weight: 900;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .card h3 {
          color: #ffb612;
          font-size: 30px;
          margin: 0 0 12px;
        }

        .card div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,182,18,.12);
        }

        @media (max-width: 900px) {
          .hero,
          .stats,
          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
