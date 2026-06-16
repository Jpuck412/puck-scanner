"use client";

import { useAppStore } from "@/lib/store";
import type { Page } from "@/lib/types";

const pages: { key: Page; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "scanner", label: "Scanner" },
  { key: "formation", label: "Formation Engine" },
  { key: "lifecycle", label: "Runner Lifecycle" },
  { key: "intelligence", label: "Market Intelligence" },
  { key: "structure", label: "Structure Analysis" },
  { key: "watchlist", label: "Watchlist" },
  { key: "journal", label: "Journal" },
  { key: "settings", label: "Settings" },
];

export function Sidebar() {
  const { currentPage, setPage } = useAppStore();

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ marginBottom: "4px" }}>PROOF OF STRUCTURE™</h4>
        <h3 style={{ fontSize: "24px", color: "var(--accent-blue)", marginBottom: "8px" }}>ELITE</h3>
        <small>INSTITUTIONAL TERMINAL</small>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {pages.map((page) => (
          <button
            key={page.key}
            onClick={() => setPage(page.key)}
            style={{
              background: currentPage === page.key ? "var(--accent-blue)" : "transparent",
              color: currentPage === page.key ? "white" : "var(--text-primary)",
              border: currentPage === page.key ? "1px solid var(--accent-blue)" : "1px solid transparent",
              justifyContent: "flex-start",
              padding: "12px 16px",
            }}
          >
            {page.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
