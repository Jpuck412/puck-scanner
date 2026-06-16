"use client";

import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export function Header() {
  const [time, setTime] = useState("");
  const { environment, lastScanTime, apiStatus } = useAppStore();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getApiStatusColor = () => {
    if (apiStatus === "connected") return "var(--success)";
    if (apiStatus === "error") return "var(--danger)";
    return "var(--warning)";
  };

  const getEnvironmentSignal = () => {
    if (!environment) return "--";
    if (environment.signal === "GREEN") return "🟢";
    if (environment.signal === "RED") return "🔴";
    return "🟡";
  };

  return (
    <header className="header">
      <div>
        <h4>PROOF OF STRUCTURE™ ELITE</h4>
        <small>MISSION CONTROL | Evidence Before Entry</small>
      </div>

      <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px", fontWeight: "700" }}>{time}</div>
          <small>ET</small>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14px" }}>ENV: {getEnvironmentSignal()}</div>
          <small>{environment?.signal || "LOADING"}</small>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14px" }}>API:</div>
          <small style={{ color: getApiStatusColor() }}>{apiStatus.toUpperCase()}</small>
        </div>

        <div style={{ textAlign: "right" }}>
          <small>LAST SCAN</small>
          <div style={{ fontSize: "12px" }}>
            {lastScanTime ? new Date(lastScanTime).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </div>
        </div>
      </div>
    </header>
  );
}
