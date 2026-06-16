"use client";

import React from "react";

interface TableProps {
  columns: string[];
  rows: React.ReactNode[][];
  compact?: boolean;
}

export function Table({ columns, rows, compact = false }: TableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: compact ? "11px" : "13px",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  padding: compact ? "8px" : "12px",
                  textAlign: "left",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  fontSize: "11px",
                  letterSpacing: "0.5px",
                  color: "var(--accent-blue)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: compact ? "8px" : "12px",
                    textAlign: "left",
                    color: "var(--text-primary)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
