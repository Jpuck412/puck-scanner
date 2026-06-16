"use client";

interface StatProps {
  label: string;
  value: string | number;
  color?: "success" | "warning" | "danger" | "primary";
  size?: "small" | "medium" | "large";
}

export function Stat({ label, value, color = "primary", size = "medium" }: StatProps) {
  const colors = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    primary: "var(--accent-blue)",
  };

  const sizes = {
    small: "12px",
    medium: "16px",
    large: "24px",
  };

  return (
    <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
      <small style={{ display: "block", marginBottom: "4px" }}>{label}</small>
      <div style={{ fontSize: sizes[size], fontWeight: "700", color: colors[color] }}>{value}</div>
    </div>
  );
}
