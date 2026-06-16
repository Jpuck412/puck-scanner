"use client";

import { useEffect, useMemo, useState } from "react";

export type Lifecycle =
  | "SLEEPING"
  | "ACCUMULATING"
  | "WAKING"
  | "FORMING"
  | "IGNITING"
  | "RUNNING"
  | "EXTENDED"
  | "FAILING";

export type Verdict = "YES" | "WAIT" | "NO";

export type Stock = {
  ticker: string;
  price: number;
  gain: number;
  change: number;
  volume: number;
  spread: number;
  speed: number;
  volumeAcceleration: number;
  float: number;
  support: number;
  resistance: number;
  rangePosition: number;
  formationScore: number;
  journeyScore: number;
  proofScore: number;
  catalystScore: number;
  environmentScore: number;
  eliteScore: number;
  lifecycle: Lifecycle;
  verdict: Verdict;
  positiveEvidence: string[];
  negativeEvidence: string[];
  invalidation: string;
};

export type WatchItem = {
  ticker: string;
  notes: string;
  addedAt: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  time: string;
  ticker: string;
  price: number;
  gain: number;
  lifecycle: string;
  eliteScore: number;
  reason: string;
  evidence: string;
  mistake: string;
  lesson: string;
  outcome: string;
};

const API = "/api/elite-scanner";

function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function tickerList(json: any): any[] {
  if (Array.isArray(json?.data?.tickers)) return json.data.tickers;
  if (Array.isArray(json?.tickers)) return json.tickers;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

function scoreSpread(spread: number, price: number): number {
  if (!spread || !price) return 50;
  const p = (spread / price) * 100;
  if (p <= 0.5) return 100;
  if (p <= 1) return 90;
  if (p <= 2) return 75;
  if (p <= 4) return 52;
  if (p <= 7) return 30;
  return 12;
}

function scoreFloat(floatValue: number): number {
  if (!floatValue) return 45;
  if (floatValue <= 2_000_000) return 100;
  if (floatValue <= 5_000_000) return 90;
  if (floatValue <= 10_000_000) return 78;
  if (floatValue <= 25_000_000) return 55;
  if (floatValue <= 75_000_000) return 35;
  return 18;
}

function classify(args: {
  gain: number;
  price: number;
  support: number;
  formationScore: number;
  eliteScore: number;
  spreadScore: number;
  speedScore: number;
  volumeAccelerationScore: number;
}): Lifecycle {
  if (args.price > 0 && args.support > 0 && args.price < args.support) return "FAILING";
  if (args.gain >= 75) return "EXTENDED";
  if (args.eliteScore >= 88) return "RUNNING";
  if (args.eliteScore >= 78 && args.formationScore >= 65) return "IGNITING";
  if (args.formationScore >= 62 && args.gain >= 5 && args.gain <= 50) return "FORMING";
  if (args.spreadScore >= 55 && args.speedScore >= 50 && args.volumeAccelerationScore >= 50) return "WAKING";
  if (args.speedScore >= 35 || args.volumeAccelerationScore >= 35) return "ACCUMULATING";
  return "SLEEPING";
}

function normalize(raw: any, index: number): Stock {
  const ticker = String(raw?.ticker || raw?.T || raw?.symbol || "")
    .toUpperCase()
    .trim();

  const price = num(
    raw?.price ??
      raw?.last ??
      raw?.lastPrice ??
      raw?.day?.c ??
      raw?.min?.c ??
      raw?.c ??
      ((raw?.prevDay?.c ?? 0) + (raw?.todaysChange ?? 0))
  );

  const gain = num(raw?.gain ?? raw?.todaysChangePerc ?? raw?.percentChange ?? raw?.changePercent);
  const change = num(raw?.change ?? raw?.todaysChange ?? raw?.netChange);
  const volume = num(raw?.volume ?? raw?.day?.v ?? raw?.min?.v ?? raw?.v);

  const high = num(raw?.high ?? raw?.day?.h ?? raw?.h ?? price * 1.08);
  const low = num(raw?.low ?? raw?.day?.l ?? raw?.l ?? price * 0.94);

  const bid = num(raw?.bid ?? raw?.lastQuote?.bid ?? raw?.lastQuote?.bp);
  const ask = num(raw?.ask ?? raw?.lastQuote?.ask ?? raw?.lastQuote?.ap);
  const spread = num(raw?.spread ?? (ask > bid && bid > 0 ? ask - bid : 0));

  const float = num(raw?.float ?? raw?.sharesFloat ?? raw?.floatSize ?? raw?.share_class_shares_outstanding);

  const support = low || price;
  const resistance = high || price;
  const range = Math.max(0.0001, resistance - support);
  const rangePosition = clamp(((price - support) / range) * 100);

  const spreadScore = scoreSpread(spread, price);
  const speedScore = clamp(
    num(raw?.speed ?? raw?.speedScore ?? Math.max(0, gain) * 0.85 + Math.max(0, 100 - index * 2) * 0.07)
  );
  const volumeAccelerationScore = clamp(
    num(raw?.volumeAcceleration ?? raw?.relativeVolume ?? raw?.rvol ?? (volume > 0 ? volume / 100_000 : 0)) * 8
  );
  const floatScore = scoreFloat(float);

  const supportScore =
    price <= 0 || support <= 0
      ? 45
      : price < support
      ? 0
      : rangePosition <= 15
      ? 82
      : rangePosition <= 55
      ? 92
      : rangePosition <= 75
      ? 70
      : 48;

  const catalystScore = clamp(num(raw?.catalystScore ?? raw?.newsScore ?? 50));
  const environmentScore = 50;

  const formationScore = Math.round(
    clamp(
      spreadScore * 0.2 +
        speedScore * 0.2 +
        volumeAccelerationScore * 0.2 +
        floatScore * 0.1 +
        supportScore * 0.2 +
        (gain >= 5 && gain <= 50 ? 10 : gain >= 75 ? -18 : 2)
    )
  );

  const journeyScore = Math.round(
    clamp(
      formationScore * 0.45 +
        speedScore * 0.2 +
        volumeAccelerationScore * 0.2 +
        (gain >= 5 && gain <= 50 ? 15 : gain >= 75 ? -20 : 5)
    )
  );

  const proofScore = Math.round(
    clamp(
      supportScore * 0.24 +
        spreadScore * 0.18 +
        speedScore * 0.18 +
        volumeAccelerationScore * 0.16 +
        catalystScore * 0.1 +
        environmentScore * 0.08
    )
  );

  const eliteScore = Math.round(
    clamp(
      spreadScore * 0.2 +
        speedScore * 0.2 +
        volumeAccelerationScore * 0.2 +
        floatScore * 0.1 +
        supportScore * 0.1 +
        catalystScore * 0.1 +
        environmentScore * 0.1 +
        journeyScore * 0.1
    )
  );

  const lifecycle = classify({
    gain,
    price,
    support,
    formationScore,
    eliteScore,
    spreadScore,
    speedScore,
    volumeAccelerationScore,
  });

  const verdict: Verdict =
    lifecycle === "FAILING" || lifecycle === "EXTENDED"
      ? "WAIT"
      : eliteScore >= 80 && proofScore >= 68
      ? "YES"
      : eliteScore >= 55 || formationScore >= 58
      ? "WAIT"
      : "NO";

  const positiveEvidence: string[] = [];
  const negativeEvidence: string[] = [];

  if (spreadScore >= 75) positiveEvidence.push("Spread quality supports controlled execution.");
  else negativeEvidence.push("Spread is weak, wide, or unavailable.");

  if (speedScore >= 60) positiveEvidence.push("Speed is increasing.");
  else negativeEvidence.push("Speed is not yet strong.");

  if (volumeAccelerationScore >= 60) positiveEvidence.push("Volume acceleration is active.");
  else negativeEvidence.push("Volume acceleration is limited.");

  if (supportScore >= 70) positiveEvidence.push("Support structure is holding.");
  else negativeEvidence.push("Support quality is weak or failing.");

  if (gain >= 5 && gain <= 50) positiveEvidence.push("Gain is inside preferred formation zone.");
  if (gain >= 75) negativeEvidence.push("Move is extended and carries chase risk.");

  const invalidation =
    support > 0
      ? `Support failure below ${support.toFixed(price < 1 ? 4 : 2)}, spread widening, speed collapse, or volume acceleration fading.`
      : "Support failure, spread widening, speed collapse, or volume acceleration fading.";

  return {
    ticker,
    price,
    gain,
    change,
    volume,
    spread,
    speed: speedScore,
    volumeAcceleration: volumeAccelerationScore,
    float,
    support,
    resistance,
    rangePosition,
    formationScore,
    journeyScore,
    proofScore,
    catalystScore,
    environmentScore,
    eliteScore,
    lifecycle,
    verdict,
    positiveEvidence,
    negativeEvidence,
    invalidation,
  };
}

export function useAppStore() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [apiStatus, setApiStatus] = useState("LOADING");
  const [source, setSource] = useState("POLYGON");
  const [lastUpdate, setLastUpdate] = useState("NEVER");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  async function loadScanner() {
    setApiStatus("CONNECTING");

    try {
      const res = await fetch(API, { cache: "no-store" });
      const json = await res.json();
      const list = tickerList(json);

      setSource(String(json?.source || "POLYGON"));
      setLastUpdate(new Date().toLocaleTimeString("en-US"));

      if (!Array.isArray(list) || list.length === 0) {
        setStocks([]);
        setApiStatus("NO LIVE DATA");
        return;
      }

      const normalized = list
        .map((x, i) => normalize(x, i))
        .filter((s) => s.ticker)
        .sort((a, b) => b.eliteScore - a.eliteScore);

      setStocks(normalized);
      setApiStatus("CONNECTED");
    } catch {
      setStocks([]);
      setApiStatus("DISCONNECTED");
      setLastUpdate(new Date().toLocaleTimeString("en-US"));
    }
  }

  useEffect(() => {
    loadScanner();
  }, []);

  const ranked = useMemo(() => [...stocks].sort((a, b) => b.eliteScore - a.eliteScore), [stocks]);
  const selected = useMemo(
    () => stocks.find((s) => s.ticker === selectedTicker) || ranked[0] || null,
    [stocks, selectedTicker, ranked]
  );

  function addWatch(stock: Stock) {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === stock.ticker)) return prev;
      return [...prev, { ticker: stock.ticker, notes: "", addedAt: new Date().toLocaleString("en-US") }];
    });
  }

  function addJournal(stock: Stock) {
    setJournal((prev) => [
      {
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString("en-US"),
        time: new Date().toLocaleTimeString("en-US"),
        ticker: stock.ticker,
        price: stock.price,
        gain: stock.gain,
        lifecycle: stock.lifecycle,
        eliteScore: stock.eliteScore,
        reason: "Scanner action",
        evidence: stock.positiveEvidence.join(" | "),
        mistake: "",
        lesson: "",
        outcome: "",
      },
      ...prev,
    ]);
  }

  return {
    stocks,
    ranked,
    selected,
    selectedTicker,
    setSelectedTicker,
    apiStatus,
    source,
    lastUpdate,
    loadScanner,
    watchlist,
    setWatchlist,
    journal,
    setJournal,
    addWatch,
    addJournal,
  };
}
