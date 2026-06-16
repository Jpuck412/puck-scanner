"use client";

import React from "react";

interface ChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
}

export function MiniChart({ data, labels, height = 100, color = "#4DA3FF" }: ChartProps) {
  if (data.length === 0) return <div>No data</div>;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <svg
      width="100%"
      height={height}
      style={{ border: "1px solid var(--border-color)", borderRadius: "6px" }}
      viewBox={`0 0 ${data.length * 20} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
        <line key={i} x1="0" y1={v * height} x2="100%" y2={v * height} stroke="var(--border-color)" strokeWidth="0.5" opacity="0.5" />
      ))}

      {/* Path */}
      <polyline
        points={data.map((d, i) => `${(i / (data.length - 1)) * (data.length * 20)},${height - ((d - min) / range) * height}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}
