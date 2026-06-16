"use client";

import { useEffect, useMemo, useState } from "react";

const API = "/api/elite-scanner";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function readTickers(json: any): any[] {
  if (Array.isArray(json?.data?.tickers)) return json.data.tickers;
  if (Array.isArray(json?.tickers)) return json.tickers;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

function normalize(raw: any, index: number) {
  const ticker = String(raw?.ticker || raw?.T || raw?.symbol || "")
    .toUpperCase()
    .trim();

  const price = num(
    raw?.price ??
      raw?.last ??
      raw?.lastPrice ??
      raw?.day?.c ??
      raw?.min?.c ??
      raw?.c
  );

  const gain = num(
    raw?.gain ??
      raw?.todaysChangePerc ??
      raw?.percentChange ??
      raw?.changePercent
  );

  const change = num(raw?.change ?? raw?.todaysChange ?? raw?.netChange);
  const volume = num(raw?.volume ?? raw?.day?.v ?? raw?.min?.v ?? raw?.v);

  const high = num(raw?.high ?? raw?.day?.h ?? raw?.h ?? price * 1.08);
  const low = num(raw?.low ?? raw?.day?.l ?? raw?.l ?? price * 0.94);

  const bid = num(raw?.bid ?? raw?.lastQuote?.bp);
  const ask = num(raw?.ask ?? raw?.lastQuote?.ap);
  const spread = num(raw?.spread ?? (ask > bid && bid > 0 ? ask - bid : 0));

  const float = num(
    raw?.float ??
      raw?.sharesFloat ??
      raw?.floatSize ??
      raw?.share_class_shares_outstanding
  );

  const support = low || price;
  const resistance = high || price;
  const range = Math.max(0.0001, resistance - support);
  const rangePosition = clamp(((price - support) / range) * 100);

  const spreadPct = price > 0 && spread > 0 ? (spread / price) * 100 : 0;

  const spreadScore =
    !spread || !price
      ? 50
      : spreadPct <= 0.5
      ? 100
      : spreadPct <= 1
      ? 90
      : spreadPct <= 2
      ? 75
      : spreadPct <= 4
      ? 52
      : spreadPct <= 7
      ? 30
      : 12;

  const speedScore = clamp(
    num(raw?.speed ?? raw?.speedScore ?? Math.max(0, gain) * 0.85 + Math.max(0, 100 - index * 2) * 0.07)
  );

  const volumeAccelerationScore = clamp(
    num(raw?.volumeAcceleration ?? raw?.relativeVolume ?? raw?.rvol ?? (volume > 0 ? volume / 100000 : 0)) * 8
  );

  const floatScore =
    !float
      ? 45
      : float <= 2000000
      ? 100
      : float <= 5000000
      ? 90
      : float <= 10000000
      ? 78
      : float <= 25000000
      ? 55
      : float <= 75000000
      ? 35
      : 18;

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

  const lifecycle =
    price > 0 && support > 0 && price < support
      ? "FAILING"
      : gain >= 75
      ? "EXTENDED"
      : eliteScore >= 88
      ? "RUNNING"
      : eliteScore >= 78 && formationScore >= 65
      ? "IGNITING"
      : formationScore >= 62 && gain >= 5 && gain <= 50
      ? "FORMING"
      : speedScore >= 50 && volumeAccelerationScore >= 50 && spreadScore >= 55
      ? "WAKING"
      : speedScore >= 35 || volumeAccelerationScore >= 35
      ? "ACCUMULATING"
      : "SLEEPING";

  const verdict =
    lifecycle === "FAILING" || lifecycle === "EXTENDED"
      ? "WAIT"
      : eliteScore >= 80 && proofScore >= 68
      ? "YES"
      : eliteScore >= 55 || formationScore >= 58
      ? "WAIT"
      : "NO";

  const positiveEvidence = [];
  const negativeEvidence = [];

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
    spreadScore,
    speedScore,
    volumeAccelerationScore,
    floatScore,
    supportScore,
    catalystScore,
    environmentScore,
    formationScore,
    journeyScore,
    proofScore,
    eliteScore,
    lifecycle,
    verdict,
    positiveEvidence,
    negativeEvidence,
    invalidation:
      support > 0
        ? `Support failure below ${support.toFixed(price < 1 ? 4 : 2)}, spread widening, speed collapse, or volume acceleration fading.`
        : "Support failure, spread widening, speed collapse, or volume acceleration fading.",
  };
}

export function useAppStore(): any {
  const [stocks, setStocks] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState("LOADING");
  const [source, setSource] = useState("POLYGON");
  const [lastUpdate, setLastUpdate] = useState("NEVER");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [structure, setStructure] = useState({
    ticker: "",
    price: 0,
    support: 0,
    resistance: 0,
  });

  async function loadScanner() {
    setApiStatus("CONNECTING");

    try {
      let res = await fetch(API, { cache: "no-store" });

      if (!res.ok) {
        res = await fetch("/api/gainers", { cache: "no-store" });
      }

      const json = await res.json();
      const list = readTickers(json);

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
  const formation = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.gain >= 5 && s.gain <= 50 && s.lifecycle !== "FAILING")
        .sort((a, b) => b.formationScore - a.formationScore),
    [stocks]
  );

  const rejected = useMemo(
    () =>
      stocks.filter(
        (s) =>
          s.lifecycle === "FAILING" ||
          s.lifecycle === "EXTENDED" ||
          s.verdict === "NO" ||
          s.eliteScore < 45
      ),
    [stocks]
  );

  const selected = useMemo(
    () => stocks.find((s) => s.ticker === selectedTicker) || ranked[0] || null,
    [stocks, selectedTicker, ranked]
  );

  function addWatch(stock: any) {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === stock.ticker)) return prev;
      return [...prev, { ticker: stock.ticker, notes: "", addedAt: new Date().toLocaleString("en-US") }];
    });
  }

  function removeWatch(ticker: string) {
    setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
  }

  function addJournal(stock: any) {
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
        evidence: stock.positiveEvidence?.join(" | ") || "",
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
    formation,
    rejected,
    selected,
    selectedTicker,
    setSelectedTicker,
    apiStatus,
    source,
    lastUpdate,
    loadScanner,
    watchlist,
    setWatchlist,
    addWatch,
    removeWatch,
    journal,
    setJournal,
    addJournal,
    structure,
    setStructure,
  };
}
