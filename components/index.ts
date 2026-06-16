import React from "react";

export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panelTitle">{title}</div>
      {children}
    </section>
  );
}

export function Stat({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

export function Badge({ value }: { value: string }) {
  const red = value === "EXTENDED" || value === "FAILING" || value === "NO";
  const green =
    value === "FORMING" ||
    value === "IGNITING" ||
    value === "RUNNING" ||
    value === "YES" ||
    value === "CONNECTED";

  return <span className={`badge ${red ? "red" : green ? "green" : "yellow"}`}>{value}</span>;
}

export function Table({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tableWrap">
      <table>{children}</table>
    </div>
  );
}
