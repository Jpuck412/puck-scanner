"use client";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            padding: "8px 12px",
            whiteSpace: "nowrap",
            fontSize: "11px",
            marginBottom: "8px",
            zIndex: 100,
            color: "var(--text-secondary)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
