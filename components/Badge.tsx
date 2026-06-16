"use client";

interface BadgeProps {
  text: string;
  type: "success" | "warning" | "danger" | "primary" | "neutral";
}

export function Badge({ text, type }: BadgeProps) {
  const colors = {
    success: { bg: "rgba(0, 208, 132, 0.15)", fg: "var(--success)" },
    warning: { bg: "rgba(255, 181, 71, 0.15)", fg: "var(--warning)" },
    danger: { bg: "rgba(255, 92, 92, 0.15)", fg: "var(--danger)" },
    primary: { bg: "rgba(77, 163, 255, 0.15)", fg: "var(--accent-blue)" },
    neutral: { bg: "rgba(154, 164, 178, 0.15)", fg: "var(--text-secondary)" },
  };

  const color = colors[type];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        background: color.bg,
        color: color.fg,
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {text}
    </span>
  );
}
