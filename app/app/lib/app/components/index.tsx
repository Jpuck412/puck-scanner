"use client";

import React from "react";

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <section className={`panel ${className}`}>
      {title ? <div className="panelTitle">{title}</div> : null}
      {children}
    </section>
  );
}

export function Stat({
  title,
  value,
  sub,
}: {
  title?: React.ReactNode;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

export function Badge({
  value,
}: {
  value?: React.ReactNode;
  [key: string]: any;
}) {
  const text = String(value || "");
  const red = text === "EXTENDED" || text === "FAILING" || text === "NO";
  const green =
    text === "FORMING" ||
    text === "IGNITING" ||
    text === "RUNNING" ||
    text === "YES" ||
    text === "CONNECTED";

  return <span className={`badge ${red ? "red" : green ? "green" : "yellow"}`}>{value}</span>;
}

export function Table({
  children,
}: {
  children?: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <div className="tableWrap">
      <table>{children}</table>
    </div>
  );
}
