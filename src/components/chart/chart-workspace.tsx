"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TradingChart, type OHLCVBar } from "./trading-chart";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  Plus,
  Check,
  BookOpen,
  Target,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createAnalysis } from "@/lib/actions/analysis";

// ── Types ─────────────────────────────────────────────────────────────────

interface WatchlistSymbol {
  id: string;
  symbol: string;
  display_name: string | null;
  category: string | null;
}

interface ChartWorkspaceProps {
  watchlistSymbols: WatchlistSymbol[];
  defaultAccountSize: number;
  maxRiskPercent: number;
}

interface PriceTicker {
  price: number;
  change: number;
  changePercent: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const DEFAULT_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD",
  "GBPJPY", "EURJPY", "EURGBP",
  "XAUUSD", "XAGUSD",
  "BTCUSD", "ETHUSD",
  "US30", "SPX500", "NAS100",
];

const PRICE_REFRESH_MS = 10_000; // 10 s — TwelveData free = 800 req/day

// ── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number | null, symbol: string): string {
  if (price === null) return "—";
  if (symbol.includes("JPY") || ["US30", "SPX500", "NAS100", "DAX40"].includes(symbol))
    return price.toFixed(2);
  if (["BTCUSD", "ETHUSD"].includes(symbol))
    return price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return price.toFixed(5);
}

function formatChange(change: number, pct: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(4)}  ${sign}${pct.toFixed(2)}%`;
}

// ── Main ─────────────────────────────────────────────────────────────────

export function ChartWorkspace({
  watchlistSymbols,
  defaultAccountSize: _defaultAccountSize,
  maxRiskPercent: _maxRiskPercent,
}: ChartWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSymbol =
    searchParams.get("symbol") ??
    watchlistSymbols[0]?.symbol ??
    "EURUSD";

  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("4H");
  const [data, setData] = useState<OHLCVBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [ticker, setTicker] = useState<PriceTicker | null>(null);

  // Symbol picker
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  // Analysis panel
  const [panelOpen, setPanelOpen] = useState(true);
  const [htfBias, setHtfBias] = useState<"bullish" | "bearish" | "neutral" | "">("");
  const [biasNotes, setBiasNotes] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSymbols = Array.from(
    new Set([
      ...DEFAULT_SYMBOLS,
      ...watchlistSymbols.map((w) => w.symbol),
    ])
  ).sort();

  const filteredSymbols = symbolSearch
    ? allSymbols.filter((s) => s.toLowerCase().includes(symbolSearch.toLowerCase()))
    : allSymbols;

  // ── Fetch OHLCV ─────────────────────────────────────────────────────────

  const loadOHLCV = useCallback(async (sym: string, tf: Timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market/ohlcv?symbol=${sym}&timeframe=${tf}&limit=150`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.bars?.length) {
        setData(json.bars);
        setIsLive(true);
      } else {
        // API error or rate limit — show error state
        console.warn("[ChartWorkspace] OHLCV error:", json.error);
        setIsLive(false);
      }
    } catch (err) {
      console.error("[ChartWorkspace] OHLCV fetch failed:", err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOHLCV(symbol, timeframe);
  }, [symbol, timeframe, loadOHLCV]);

  // ── Fetch live price (polling) ───────────────────────────────────────────

  const fetchPrice = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/market/price?symbol=${sym}`, { cache: "no-store" });
      const json = await res.json();
      if (json.price) {
        setTicker({ price: json.price, change: json.change, changePercent: json.changePercent });
      }
    } catch {
      // silently fail — ticker will just stop updating
    }
  }, []);

  // Initial price fetch
  useEffect(() => {
    fetchPrice(symbol);
  }, [symbol, fetchPrice]);

  // Polling interval
  useEffect(() => {
    const id = setInterval(() => fetchPrice(symbol), PRICE_REFRESH_MS);
    return () => clearInterval(id);
  }, [symbol, fetchPrice]);

  // ── Symbol select ────────────────────────────────────────────────────────

  function selectSymbol(sym: string) {
    setSymbol(sym);
    setTicker(null);
    setSymbolPickerOpen(false);
    setSymbolSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("symbol", sym);
    router.replace(`/analysis/chart?${params.toString()}`, { scroll: false });
  }

  // ── Save analysis ────────────────────────────────────────────────────────

  function handleSaveAnalysis() {
    if (!htfBias && !analysisNotes && !biasNotes && !setupNotes) return;
    startTransition(async () => {
      await createAnalysis({
        symbol,
        timeframe,
        htf_bias: htfBias || null,
        bias_notes: biasNotes || null,
        analysis_notes: analysisNotes || null,
        setup_notes: setupNotes || null,
        invalidation: invalidation || null,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setBiasNotes(""); setSetupNotes(""); setAnalysisNotes("");
        setInvalidation(""); setHtfBias("");
      }, 2000);
      router.refresh();
    });
  }

  const displayPrice = crosshairPrice ?? ticker?.price ?? null;
  const isPositive = (ticker?.change ?? 0) >= 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-6 -mt-6 overflow-hidden">

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0 overflow-x-auto">

        {/* Symbol picker */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setSymbolPickerOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-bold hover:border-primary/50 transition-colors min-w-[80px]"
          >
            {symbol}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </button>

          {symbolPickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSymbolPickerOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border border-border bg-popover shadow-2xl">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    placeholder="Search symbol…"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredSymbols.map((s) => (
                    <button
                      key={s}
                      onClick={() => selectSymbol(s)}
                      className={cn(
                        "w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors",
                        s === symbol ? "text-primary font-semibold bg-primary/5" : "text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Price + change */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className="text-sm font-bold tabular-nums tracking-tight">
                {formatPrice(displayPrice, symbol)}
              </span>
              {ticker && (
                <span className={cn(
                  "text-xs tabular-nums hidden sm:block",
                  isPositive ? "text-profit" : "text-loss"
                )}>
                  {formatChange(ticker.change, ticker.changePercent)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Live indicator */}
        <div className="flex-shrink-0">
          {isLive ? (
            <div className="flex items-center gap-1 text-[10px] text-profit/70">
              <div className="h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />
              LIVE
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-loss/70">
              <WifiOff className="h-3 w-3" />
              offline
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 flex-shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-all",
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => loadOHLCV(symbol, timeframe)}
          className="flex-shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Refresh chart"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>

        {/* Notes panel toggle */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
            panelOpen
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-muted-foreground/40"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Notes</span>
        </button>
      </div>

      {/* ── Chart + analysis panel ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Chart canvas */}
        <div className={cn(
          "flex-1 relative overflow-hidden bg-[#0c0e12] min-w-0 transition-all duration-200",
          loading && "opacity-60"
        )}>
          <TradingChart
            data={data}
            symbol={symbol}
            className="h-full"
            onCrosshairMove={(price) => setCrosshairPrice(price)}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/90 px-5 py-3 shadow-xl">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Loading {symbol} {timeframe}…
                </span>
              </div>
            </div>
          )}

          {/* No data / error state */}
          {!loading && data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <WifiOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No data for {symbol}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  This symbol may not be supported on your plan.
                </p>
              </div>
            </div>
          )}

          {/* Symbol watermark */}
          <div className="absolute top-3 left-3 pointer-events-none select-none">
            <span className="text-5xl font-black text-white/[0.035]">{symbol}</span>
          </div>

          {/* LIVE / Mock badge */}
          <div className="absolute bottom-3 left-3 pointer-events-none select-none">
            <span className="text-[10px] text-white/20 font-medium">TwelveData</span>
          </div>
        </div>

        {/* ── Analysis panel ─────────────────────────────────────────── */}
        {panelOpen && (
          <div className="w-64 flex-shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Analysis
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {symbol} · {timeframe} ·{" "}
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>

            <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
              {/* HTF Bias */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  HTF Bias
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {(["bullish", "bearish", "neutral"] as const).map((b) => {
                    const Icon = b === "bullish" ? TrendingUp : b === "bearish" ? TrendingDown : Activity;
                    return (
                      <button
                        key={b}
                        onClick={() => setHtfBias(htfBias === b ? "" : b)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-md border py-2 text-[10px] font-semibold capitalize transition-all",
                          htfBias === b && b === "bullish" && "bg-profit/15 border-profit text-profit",
                          htfBias === b && b === "bearish" && "bg-loss/15 border-loss text-loss",
                          htfBias === b && b === "neutral" && "bg-muted border-muted-foreground/50 text-foreground",
                          htfBias !== b && "border-border text-muted-foreground hover:border-muted-foreground/40"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bias notes */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bias Notes</p>
                <Textarea rows={2} placeholder="Structure, liquidity, key levels…" value={biasNotes} onChange={(e) => setBiasNotes(e.target.value)} className="text-xs resize-none" />
              </div>

              {/* Setup */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Setup</p>
                <Textarea rows={2} placeholder="What setup are you watching?" value={setupNotes} onChange={(e) => setSetupNotes(e.target.value)} className="text-xs resize-none" />
              </div>

              {/* Full analysis */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Analysis</p>
                <Textarea rows={3} placeholder="Detailed analysis notes…" value={analysisNotes} onChange={(e) => setAnalysisNotes(e.target.value)} className="text-xs resize-none" />
              </div>

              {/* Invalidation */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-loss/70 mb-1.5 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Invalidation
                </p>
                <Textarea rows={1} placeholder="What would invalidate this?" value={invalidation} onChange={(e) => setInvalidation(e.target.value)} className="text-xs resize-none" />
              </div>
            </div>

            {/* Save */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <Button
                onClick={handleSaveAnalysis}
                disabled={isPending || saved || (!htfBias && !analysisNotes && !biasNotes && !setupNotes)}
                className="w-full h-8 text-xs"
                size="sm"
              >
                {isPending ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Saving…</>
                ) : saved ? (
                  <><Check className="h-3 w-3 mr-1.5" />Saved!</>
                ) : (
                  <><Plus className="h-3 w-3 mr-1.5" />Save Analysis</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
                Saves to analysis log
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
