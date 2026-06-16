"use client";

import { useAppStore } from "@/lib/store";
import { Panel, Stat, Table, Badge } from "@/components";

export function Dashboard() {
  const { symbols, environment, setPage } = useAppStore();

  const topCandidate = symbols.sort((a, b) => b.scores.eliteScore - a.scores.eliteScore)[0];
  const topFormation = symbols.sort((a, b) => b.scores.formationScore - a.scores.formationScore)[0];
  const topVolume = symbols.sort((a, b) => b.scores.volumeAccelerationScore - a.scores.volumeAccelerationScore)[0];

  const passing = symbols.filter((s) => s.verdict === "YES").length;
  const rejected = symbols.filter((s) => s.rejection).length;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <Panel title="COMMAND CENTER" subtitle="Executive Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <Stat label="TOTAL SCANNED" value={symbols.length} />
          <Stat label="PASSING VERDICT" value={passing} color="success" />
          <Stat label="REJECTED" value={rejected} color="danger" />
          <Stat label="ENV. SIGNAL" value={environment?.signal || "--"} color={environment?.signal === "GREEN" ? "success" : environment?.signal === "RED" ? "danger" : "warning"} />
        </div>
      </Panel>

      <Panel title="ENVIRONMENT ANALYSIS" subtitle="Market Regime">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
          <Stat label="SPY" value={environment ? (environment.spy.gain >= 0 ? "+" : "") + environment.spy.gain.toFixed(2) + "%" : "--"} color={environment && environment.spy.gain >= 0 ? "success" : "danger"} />
          <Stat label="QQQ" value={environment ? (environment.qqq.gain >= 0 ? "+" : "") + environment.qqq.gain.toFixed(2) + "%" : "--"} color={environment && environment.qqq.gain >= 0 ? "success" : "danger"} />
          <Stat label="IWM" value={environment ? (environment.iwm.gain >= 0 ? "+" : "") + environment.iwm.gain.toFixed(2) + "%" : "--"} color={environment && environment.iwm.gain >= 0 ? "success" : "danger"} />
          <Stat label="VIX" value={environment ? environment.vix.price.toFixed(2) : "--"} />
          <Stat label="BREADTH" value={environment ? environment.breadth.upDownRatio.toFixed(2) : "--"} />
          <Stat label="REGIME" value={environment?.marketRegime || "--"} />
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        <Panel title="TOP ELITE CANDIDATE" subtitle={topCandidate?.ticker || "None"}>
          {topCandidate ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Elite Score</span>
                <strong style={{ color: "var(--accent-blue)", fontSize: "18px" }}>{topCandidate.scores.eliteScore.toFixed(1)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Price</span>
                <strong>${topCandidate.marketData.quote.price.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Verdict</span>
                <Badge text={topCandidate.verdict} type={topCandidate.verdict === "YES" ? "success" : topCandidate.verdict === "WAIT" ? "warning" : "danger"} />
              </div>
              <button onClick={() => setPage("scanner")} style={{ width: "100%", marginTop: "12px" }}>
                VIEW SCANNER
              </button>
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>No data available</div>
          )}
        </Panel>

        <Panel title="TOP FORMATION QUALITY" subtitle={topFormation?.ticker || "None"}>
          {topFormation ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Formation Score</span>
                <strong style={{ color: "var(--success)" }}>{topFormation.scores.formationScore.toFixed(1)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Support</span>
                <strong>${topFormation.structure.support.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Resistance</span>
                <strong>${topFormation.structure.resistance.toFixed(2)}</strong>
              </div>
              <button onClick={() => setPage("formation")} style={{ width: "100%", marginTop: "12px" }}>
                ANALYZE
              </button>
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>No data available</div>
          )}
        </Panel>

        <Panel title="TOP VOLUME ACCELERATION" subtitle={topVolume?.ticker || "None"}>
          {topVolume ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Volume Score</span>
                <strong style={{ color: "var(--warning)" }}>{topVolume.scores.volumeAccelerationScore.toFixed(1)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Volume</span>
                <strong>{(topVolume.marketData.quote.volume / 1_000_000).toFixed(1)}M</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>Speed</span>
                <strong>{topVolume.scores.speedScore.toFixed(1)}</strong>
              </div>
              <button onClick={() => setPage("scanner")} style={{ width: "100%", marginTop: "12px" }}>
                VIEW
              </button>
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>No data available</div>
          )}
        </Panel>
      </div>

      <Panel title="LIFECYCLE DISTRIBUTION" subtitle="Runner Stages">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "12px" }}>
          {[
            { stage: "SLEEPING", count: symbols.filter((s) => s.lifecycle === "SLEEPING").length },
            { stage: "ACCUMULATING", count: symbols.filter((s) => s.lifecycle === "ACCUMULATING").length },
            { stage: "WAKING", count: symbols.filter((s) => s.lifecycle === "WAKING").length },
            { stage: "FORMING", count: symbols.filter((s) => s.lifecycle === "FORMING").length },
            { stage: "IGNITING", count: symbols.filter((s) => s.lifecycle === "IGNITING").length },
            { stage: "RUNNING", count: symbols.filter((s) => s.lifecycle === "RUNNING").length },
            { stage: "EXTENDED", count: symbols.filter((s) => s.lifecycle === "EXTENDED").length },
            { stage: "FAILING", count: symbols.filter((s) => s.lifecycle === "FAILING").length },
          ].map((item) => (
            <Stat key={item.stage} label={item.stage} value={item.count} size="small" />
          ))}
        </div>
      </Panel>
    </div>
  );
}
