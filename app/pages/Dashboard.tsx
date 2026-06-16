"use client";

import { useAppStore } from "../lib/store";
import { Panel, Stat, Table, Badge } from "../components";

function money(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

function pct(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function vol(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toString();
}

export function Dashboard() {
  const {
    ranked,
    formation,
    rejected,
    selected,
    apiStatus,
    source,
    lastUpdate,
    loadScanner,
    addWatch,
    addJournal,
    setSelectedTicker,
  } = useAppStore();

  const rows = Array.isArray(ranked) ? ranked : [];
  const formationRows = Array.isArray(formation) ? formation : [];
  const rejectedRows = Array.isArray(rejected) ? rejected : [];

  const topElite = rows[0];
  const topFormation = formationRows[0];
  const topVolume = [...rows].sort(
    (a: any, b: any) =>
      Number(b?.volumeAccelerationScore || 0) -
      Number(a?.volumeAccelerationScore || 0)
  )[0];
  const topFloat = [...rows].sort(
    (a: any, b: any) =>
      Number(b?.floatScore || 0) - Number(a?.floatScore || 0)
  )[0];
  const topRisk = rejectedRows[0];

  function chooseWhy(stock: any) {
    if (stock?.ticker && typeof setSelectedTicker === "function") {
      setSelectedTicker(stock.ticker);
    }
  }

  function watch(stock: any) {
    if (stock && typeof addWatch === "function") {
      addWatch(stock);
    }
  }

  function journal(stock: any) {
    if (stock && typeof addJournal === "function") {
      addJournal(stock);
    }
  }

  return (
    <div className="dashboardPage">
      <div className="pageHeader">
        <div>
          <h1>Command Center</h1>
          <p>PROOF OF STRUCTURE™ ELITE · Evidence Before Entry</p>
        </div>

        <button onClick={loadScanner}>SCAN NOW</button>
      </div>

      <div className="statGrid">
        <Stat
          title="API Status"
          value={<Badge value={apiStatus || "UNKNOWN"} />}
          sub={lastUpdate || "NEVER"}
        />

        <Stat
          title="Data Source"
          value={source || "UNKNOWN"}
          sub="Live scanner endpoint"
        />

        <Stat
          title="Top Elite Candidate"
          value={topElite?.ticker || "NONE"}
          sub={topElite ? `Elite ${topElite.eliteScore}` : "No live symbols"}
        />

        <Stat
          title="Top Formation"
          value={topFormation?.ticker || "NONE"}
          sub={
            topFormation
              ? `Formation ${topFormation.formationScore}`
              : "No formation candidate"
          }
        />

        <Stat
          title="Volume Acceleration"
          value={topVolume?.ticker || "NONE"}
          sub={
            topVolume
              ? `Vol Accel ${topVolume.volumeAccelerationScore}`
              : "No live symbols"
          }
        />

        <Stat
          title="Float Opportunity"
          value={topFloat?.ticker || "NONE"}
          sub={topFloat ? `Float Score ${topFloat.floatScore}` : "No live symbols"}
        />

        <Stat
          title="Risk Warning"
          value={topRisk?.ticker || "NONE"}
          sub={topRisk ? topRisk.lifecycle : "No active warnings"}
        />

        <Stat
          title="Total Symbols"
          value={rows.length}
          sub={`${rejectedRows.length} rejected`}
        />
      </div>

      <Panel title="Live Intelligence Grid">
        <Table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Price</th>
              <th>Gain</th>
              <th>Spread</th>
              <th>Speed</th>
              <th>Vol Accel</th>
              <th>Float</th>
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={16}>NO LIVE DATA</td>
              </tr>
            ) : (
              rows.map((stock: any) => (
                <tr key={`${stock.ticker}-${stock.price}-${stock.volume}`}>
                  <td>{stock.ticker}</td>
                  <td>{money(stock.price)}</td>
                  <td>{pct(stock.gain)}</td>
                  <td>{stock.spread ? money(stock.spread) : "N/A"}</td>
                  <td>{stock.speedScore ?? "N/A"}</td>
                  <td>{stock.volumeAccelerationScore ?? "N/A"}</td>
                  <td>{vol(stock.float)}</td>
                  <td>{money(stock.support)}</td>
                  <td>{money(stock.resistance)}</td>
                  <td>
                    <Badge value={stock.lifecycle || "UNKNOWN"} />
                  </td>
                  <td>{stock.formationScore ?? "N/A"}</td>
                  <td>{stock.journeyScore ?? "N/A"}</td>
                  <td>{stock.proofScore ?? "N/A"}</td>
                  <td>{stock.eliteScore ?? "N/A"}</td>
                  <td>
                    <Badge value={stock.verdict || "WAIT"} />
                  </td>
                  <td>
                    <div className="actionRow">
                      <button onClick={() => watch(stock)}>WATCH</button>
                      <button onClick={() => chooseWhy(stock)}>WHY</button>
                      <button onClick={() => journal(stock)}>JOURNAL</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Panel>

      <Panel title="Selected Ticker Intelligence">
        {!selected ? (
          <p>No symbol selected. Scanner is waiting for live API data.</p>
        ) : (
          <div className="selectedGrid">
            <div>
              <strong>{selected.ticker}</strong>
              <p>{selected.invalidation || "No invalidation data available."}</p>
            </div>

            <div>
              <h3>Positive Evidence</h3>
              <ul>
                {(selected.positiveEvidence || []).map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Negative Evidence</h3>
              <ul>
                {(selected.negativeEvidence || []).map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default Dashboard;
