import axios from "axios";
import { Symbol, MarketData, Quote, Candle, MarketEnvironment } from "./types";

// ============================================================
// API CLIENT FOR LIVE DATA
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api";
const POLYGON_KEY = process.env.NEXT_PUBLIC_POLYGON_KEY || "";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// ============================================================
// QUOTE DATA
// ============================================================

export async function fetchQuote(ticker: string): Promise<Quote> {
  try {
    const response = await client.get(`/quotes/${ticker}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error);
    throw error;
  }
}

export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  try {
    const response = await client.post(`/quotes/batch`, { tickers });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch batch quotes:", error);
    throw error;
  }
}

// ============================================================
// CANDLE DATA
// ============================================================

export async function fetchDayCandle(ticker: string): Promise<Candle> {
  try {
    const response = await client.get(`/candles/${ticker}/day`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch day candle for ${ticker}:`, error);
    throw error;
  }
}

export async function fetchPremmarketCandle(ticker: string): Promise<Candle | null> {
  try {
    const response = await client.get(`/candles/${ticker}/premarket`);
    return response.data;
  } catch (error) {
    console.warn(`Premarket data unavailable for ${ticker}:`, error);
    return null;
  }
}

export async function fetchHistoricalCandles(ticker: string, days: number = 20): Promise<Candle[]> {
  try {
    const response = await client.get(`/candles/${ticker}/history`, { params: { days } });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch historical candles for ${ticker}:`, error);
    throw error;
  }
}

// ============================================================
// MARKET MOVERS
// ============================================================

export async function fetchMarketMovers(): Promise<Symbol[]> {
  try {
    const response = await client.get(`/movers`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch market movers:", error);
    throw error;
  }
}

export async function fetchPremarketMovers(): Promise<Symbol[]> {
  try {
    const response = await client.get(`/movers/premarket`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch premarket movers:", error);
    throw error;
  }
}

// ============================================================
// MARKET ENVIRONMENT
// ============================================================

export async function fetchMarketEnvironment(): Promise<MarketEnvironment> {
  try {
    const response = await client.get(`/environment`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch market environment:", error);
    throw error;
  }
}

// ============================================================
// NEWS
// ============================================================

export async function fetchNews(ticker: string, limit: number = 10): Promise<any[]> {
  try {
    const response = await client.get(`/news/${ticker}`, { params: { limit } });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch news for ${ticker}:`, error);
    throw error;
  }
}

// ============================================================
// STRUCTURE DATA
// ============================================================

export async function fetchStructure(ticker: string): Promise<any> {
  try {
    const response = await client.get(`/structure/${ticker}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch structure for ${ticker}:`, error);
    throw error;
  }
}
