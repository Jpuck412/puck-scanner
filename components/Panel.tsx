"use client";

import React from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function Panel({ title, subtitle, children, loading }: PanelProps) {
  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h4>{title}</h4>
        {subtitle && <small style={{ display: "block", marginTop: "4px" }}>{subtitle}</small>}
      </div>

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
      ) : (
        children
      )}
    </div>
  );
}
