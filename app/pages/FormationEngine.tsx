"use client";

import { useAppStore } from ../lib/store";
import { Panel, Stat, MiniChart } from ../components";

export function FormationEngine() {
  const { symbols } = useAppStore();

  const topFormation = symbols.sort((a, b) => b.scores.formationScore - a.scores.formationScore)[0];

  if (!topFormation) {
    return <Panel title="FORMATION ENGINE" subtitle="No data available">No symbols available</Panel>;
  }

  const { scores, structure, marketData, evidence } = topFormation;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <Panel title="FORMATION ENGINE" subtitle={topFormation.ticker}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <Stat label="SPREAD SCORE" value={scores.spreadScore.toFixed(1)} color="primary" size="large" />
          <Stat label="SPEED SCORE" value={scores.speedScore.toFixed(1)} color="primary" size="large" />
          <Stat label="VOL ACCEL SCORE" value={scores.volumeAccelerationScore.toFixed(1)} color="primary" size="large" />
          <Stat label="FORMATION SCORE" value={scores.formationScore.toFixed(1)} color="success" size="large" />
        </div>
      </Panel>

      <Panel title="STRUCTURE ANALYSIS">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <Stat label="SUPPORT" value={`$${structure.support.toFixed(2)}`} />
          <Stat label="CURRENT" value={`$${marketData.quote.price.toFixed(2)}`} color="primary" />
          <Stat label="RESISTANCE" value={`$${structure.resistance.toFixed(2)}`} />
        </div>

        <div style={{ marginTop: "12px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Range Position</div>
          <div style={{ height: "24px", background: "var(--bg-primary)", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
            <div
              style={{
                height: "100%",
                background: "var(--accent-blue)",
                width: `${structure.rangePosition * 100}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </Panel>

      <Panel title="ENTRY LEVELS">
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(255, 92, 92, 0.1)", borderRadius: "6px", border: "1px solid rgba(255, 92, 92, 0.3)" }}>
            <span>AGGRESSIVE ENTRY</span>
            <strong>${structure.aggressiveEntry.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(255, 181, 71, 0.1)", borderRadius: "6px", border: "1px solid rgba(255, 181, 71, 0.3)" }}>
            <span>CONFIRMATION ENTRY</span>
            <strong>${structure.confirmationEntry.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(0, 208, 132, 0.1)", borderRadius: "6px", border: "1px solid rgba(0, 208, 132, 0.3)" }}>
            <span>PROOF ENTRY</span>
            <strong>${structure.proofEntry.toFixed(2)}</strong>
          </div>
        </div>
      </Panel>

      <Panel title="TARGETS & STOP">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <Stat label="STOP" value={`$${structure.stop.toFixed(2)}`} color="danger" />
          <Stat label="TARGET 1" value={`$${structure.target1.toFixed(2)}`} color="success" />
          <Stat label="TARGET 2" value={`$${structure.target2.toFixed(2)}`} color="success" />
          <Stat label="TARGET 3" value={`$${structure.target3.toFixed(2)}`} color="success" />
        </div>
      </Panel>

      <Panel title="RISK / REWARD ANALYSIS">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <Stat label="RISK" value={`$${structure.risk.toFixed(2)}`} color="danger" />
          <Stat label="REWARD" value={`$${structure.reward.toFixed(2)}`} color="success" />
          <Stat label="R:R RATIO" value={structure.riskReward.toFixed(2)} color={structure.riskReward >= 2 ? "success" : "warning"} />
        </div>
      </Panel>

      <Panel title="EVIDENCE SUMMARY">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <h4 style={{ color: "var(--success)", marginBottom: "8px" }}>Positive</h4>
            <ul style={{ marginLeft: "16px", color: "var(--text-secondary)" }}>
              {evidence.positive.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: "var(--danger)", marginBottom: "8px" }}>Negative</h4>
            <ul style={{ marginLeft: "16px", color: "var(--text-secondary)" }}>
              {evidence.negative.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
