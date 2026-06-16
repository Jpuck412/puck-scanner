"use client";

import { useAppStore } from ../lib/store";
import { Panel, Table, Badge, Modal } from ../components";
import { useState } from "react";

export function Scanner() {
  const { symbols, scannerSettings, updateScannerSettings, setPage, setSelectedTicker, watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();
  const [whyModal, setWhyModal] = useState<string | null>(null);

  const sorted = [...symbols].sort((a, b) => {
    if (scannerSettings.sortBy === "elite") return b.scores.eliteScore - a.scores.eliteScore;
    if (scannerSettings.sortBy === "formation") return b.scores.formationScore - a.scores.formationScore;
    if (scannerSettings.sortBy === "journey") return b.scores.journeyScore - a.scores.journeyScore;
    if (scannerSettings.sortBy === "proof") return b.scores.proofScore - a.scores.proofScore;
    if (scannerSettings.sortBy === "catalyst") return b.scores.catalystScore - a.scores.catalystScore;
    return b.scores.environmentScore - a.scores.environmentScore;
  });

  const filtered = sorted.slice(0, 50);

  const rows = filtered.map((symbol) => [
    <strong>{symbol.ticker}</strong>,
    `$${symbol.marketData.quote.price.toFixed(2)}`,
    <span style={{ color: symbol.marketData.quote.price >= symbol.marketData.day.open ? "var(--success)" : "var(--danger)" }}>
      {((symbol.marketData.quote.price - symbol.marketData.day.open) / symbol.marketData.day.open * 100).toFixed(1)}%
    </span>,
    <Badge text={symbol.marketData.quote.bidSize > 0 && symbol.marketData.quote.askSize > 0 ? "TIGHT" : "WIDE"} type={symbol.marketData.quote.bidSize > 0 && symbol.marketData.quote.askSize > 0 ? "success" : "warning"} />,
    symbol.scores.speedScore.toFixed(1),
    symbol.scores.volumeAccelerationScore.toFixed(1),
    symbol.scores.floatScore.toFixed(1),
    `$${symbol.structure.support.toFixed(2)}`,
    `$${symbol.structure.resistance.toFixed(2)}`,
    <Badge text={symbol.lifecycle} type={symbol.lifecycle === "RUNNING" ? "success" : symbol.lifecycle === "FORMING" ? "primary" : "neutral"} />,
    symbol.scores.formationScore.toFixed(1),
    symbol.scores.journeyScore.toFixed(1),
    symbol.scores.proofScore.toFixed(1),
    symbol.scores.eliteScore.toFixed(1),
    <Badge text={symbol.verdict} type={symbol.verdict === "YES" ? "success" : symbol.verdict === "WAIT" ? "warning" : "danger"} />,
    <div style={{ display: "flex", gap: "4px", fontSize: "11px" }}>
      <button
        onClick={() => setWhyModal(symbol.ticker)}
        style={{ padding: "4px 8px", fontSize: "10px" }}
      >
        WHY
      </button>
      <button
        onClick={() => {
          setSelectedTicker(symbol.ticker);
          setPage("structure");
        }}
        style={{ padding: "4px 8px", fontSize: "10px" }}
      >
        STR
      </button>
      <button
        onClick={() =>
          watchlist.some((w) => w.ticker === symbol.ticker)
            ? removeFromWatchlist(symbol.ticker)
            : addToWatchlist({ ticker: symbol.ticker, notes: "", addedAt: Date.now(), alerts: {} })
        }
        style={{ padding: "4px 8px", fontSize: "10px" }}
      >
        {watchlist.some((w) => w.ticker === symbol.ticker) ? "REM" : "ADD"}
      </button>
    </div>,
  ]);

  const selectedSymbol = symbols.find((s) => s.ticker === whyModal);

  return (
    <>
      <Panel title="ELITE SCANNER" subtitle="Ranked by Formation Quality">
        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["elite", "formation", "journey", "proof", "catalyst", "environment"] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => updateScannerSettings({ sortBy: sort })}
              style={{
                padding: "8px 12px",
                background: scannerSettings.sortBy === sort ? "var(--accent-blue)" : "transparent",
                color: scannerSettings.sortBy === sort ? "white" : "var(--text-primary)",
                border: scannerSettings.sortBy === sort ? "1px solid var(--accent-blue)" : "1px solid var(--border-color)",
                fontSize: "11px",
              }}
            >
              {sort.toUpperCase()}
            </button>
          ))}
        </div>

        <Table
          columns={[
            "Ticker",
            "Price",
            "Gain",
            "Spread",
            "Speed",
            "Vol Accel",
            "Float",
            "Support",
            "Resist",
            "Life",
            "Form",
            "Journ",
            "Proof",
            "Elite",
            "Verdict",
            "Actions",
          ]}
          rows={rows}
          compact
        />
      </Panel>

      <Modal isOpen={!!whyModal} onClose={() => setWhyModal(null)} title={`WHY ${whyModal}?`}>
        {selectedSymbol && (
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <h4 style={{ marginBottom: "8px", color: "var(--success)" }}>✓ POSITIVE EVIDENCE</h4>
              <ul style={{ marginLeft: "16px", color: "var(--text-secondary)" }}>
                {selectedSymbol.evidence.positive.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "8px", color: "var(--danger)" }}>✗ NEGATIVE EVIDENCE</h4>
              <ul style={{ marginLeft: "16px", color: "var(--text-secondary)" }}>
                {selectedSymbol.evidence.negative.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: "rgba(77, 163, 255, 0.1)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <small>THESIS</small>
              <p style={{ marginTop: "4px" }}>Is {whyModal} becoming a runner? Evidence suggests: {selectedSymbol.verdict === "YES" ? "YES - Formation shows strength" : selectedSymbol.verdict === "WAIT" ? "WAIT - Evidence inconclusive" : "NO - Insufficient proof"}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
