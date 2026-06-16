import { create } from "zustand";
import { Symbol, MarketEnvironment, WatchlistItem, JournalEntry, Page, ScannerSettings, AppSettings } from "./types";

interface AppStore {
  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // Live Data
  symbols: Symbol[];
  setSymbols: (symbols: Symbol[]) => void;
  updateSymbol: (ticker: string, updates: Partial<Symbol>) => void;

  // Market Environment
  environment: MarketEnvironment | null;
  setEnvironment: (env: MarketEnvironment) => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (ticker: string) => void;
  updateWatchlistItem: (ticker: string, updates: Partial<WatchlistItem>) => void;

  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  // Scanner
  scannerSettings: ScannerSettings;
  updateScannerSettings: (updates: Partial<ScannerSettings>) => void;
  lastScanTime: number;
  setLastScanTime: (time: number) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;

  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;

  // UI State
  selectedTicker: string | null;
  setSelectedTicker: (ticker: string | null) => void;
  apiStatus: "connected" | "disconnected" | "error";
  setApiStatus: (status: "connected" | "disconnected" | "error") => void;
}

const defaultScannerSettings: ScannerSettings = {
  autoScan: true,
  refreshSec: 15,
  sortBy: "elite",
  filters: {
    minPrice: 0.1,
    maxPrice: 50,
    minGain: 0,
    maxGain: 999,
    minVolume: 100000,
    minSpread: 0,
    minFloat: 0,
  },
};

const defaultAppSettings: AppSettings = {
  theme: "dark",
  refreshRate: 15000,
  marketHours: "regular",
  autoScroll: true,
  saveLayout: true,
  showRejected: false,
};

export const useAppStore = create<AppStore>((set) => ({
  // Navigation
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),

  // Live Data
  symbols: [],
  setSymbols: (symbols) => set({ symbols }),
  updateSymbol: (ticker, updates) =>
    set((state) => ({
      symbols: state.symbols.map((s) => (s.ticker === ticker ? { ...s, ...updates } : s)),
    })),

  // Market Environment
  environment: null,
  setEnvironment: (env) => set({ environment: env }),

  // Watchlist
  watchlist: [],
  addToWatchlist: (item) =>
    set((state) => ({
      watchlist: state.watchlist.some((w) => w.ticker === item.ticker)
        ? state.watchlist
        : [item, ...state.watchlist],
    })),
  removeFromWatchlist: (ticker) =>
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.ticker !== ticker),
    })),
  updateWatchlistItem: (ticker, updates) =>
    set((state) => ({
      watchlist: state.watchlist.map((w) => (w.ticker === ticker ? { ...w, ...updates } : w)),
    })),

  // Journal
  journalEntries: [],
  addJournalEntry: (entry) =>
    set((state) => ({
      journalEntries: [entry, ...state.journalEntries],
    })),
  updateJournalEntry: (id, updates) =>
    set((state) => ({
      journalEntries: state.journalEntries.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),
  deleteJournalEntry: (id) =>
    set((state) => ({
      journalEntries: state.journalEntries.filter((j) => j.id !== id),
    })),

  // Scanner
  scannerSettings: defaultScannerSettings,
  updateScannerSettings: (updates) =>
    set((state) => ({
      scannerSettings: { ...state.scannerSettings, ...updates },
    })),
  lastScanTime: 0,
  setLastScanTime: (time) => set({ lastScanTime: time }),
  isScanning: false,
  setIsScanning: (scanning) => set({ isScanning: scanning }),

  // App Settings
  appSettings: defaultAppSettings,
  updateAppSettings: (updates) =>
    set((state) => ({
      appSettings: { ...state.appSettings, ...updates },
    })),

  // UI State
  selectedTicker: null,
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  apiStatus: "disconnected",
  setApiStatus: (status) => set({ apiStatus: status }),
}));
