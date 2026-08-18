"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WatchlistSymbol {
  id: string;
  symbol: string;
  display_name: string | null;
  category: string | null;
  notes?: string | null;
}

interface Watchlist {
  id: string;
  name: string;
  is_default: boolean;
  watchlist_symbols: WatchlistSymbol[];
}

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

interface WatchlistViewProps {
  watchlists: Watchlist[];
}

function formatPrice(price: number, symbol: string): string {
  if (!price) return "—";
  if (symbol.includes("JPY") || ["US30", "SPX500", "NAS100"].includes(symbol))
    return price.toFixed(2);
  if (["BTCUSD", "ETHUSD", "SOLUSD"].includes(symbol))
    return price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return price.toFixed(5);
}

export function WatchlistView({ watchlists }: WatchlistViewProps) {
  const [activeList, setActiveList] = useState(
    watchlists.find((w) => w.is_default)?.id ?? watchlists[0]?.id ?? ""
  );
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const currentList = watchlists.find((w) => w.id === activeList);
  const symbols = currentList?.watchlist_symbols ?? [];

  const fetchPrices = useCallback(async (syms: WatchlistSymbol[]) => {
    if (!syms.length) return;
    setLoading(true);
    try {
      // Batch fetch prices in parallel (max 5 at a time to avoid rate limits)
      const chunks: WatchlistSymbol[][] = [];
      for (let i = 0; i < syms.length; i += 5) {
        chunks.push(syms.slice(i, i + 5));
      }

      const results: PriceData[] = [];
      for (const chunk of chunks) {
        const fetched = await Promise.all(
          chunk.map(async (sym) => {
            try {
              const res = await fetch(`/api/market/price?symbol=${sym.symbol}`, {
                cache: "no-store",
              });
              const json = await res.json();
              return json.price ? (json as PriceData) : null;
            } catch {
              return null;
            }
          })
        );
        results.push(...fetched.filter((r): r is PriceData => r !== null));
      }

      const map: Record<string, PriceData> = {};
      results.forEach((r) => { map[r.symbol] = r; });
      setPrices(map);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbols.length > 0) fetchPrices(symbols);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList]);

  if (!watchlists.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
        <p className="text-sm text-muted-foreground">No watchlists found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {watchlists.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveList(w.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
              activeList === w.id
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground/40"
            )}
          >
            {w.name}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({w.watchlist_symbols.length})
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/50">
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchPrices(symbols)}
            disabled={loading}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Symbol rows */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symbol</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-24">Price</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-24">Change</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-8"></span>
        </div>

        {symbols.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No symbols in this list.</p>
          </div>
        )}

        {symbols.map((sym, i) => {
          const px = prices[sym.symbol];
          const isPositive = (px?.change ?? 0) >= 0;

          return (
            <div
              key={sym.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-accent/50 transition-colors",
                i < symbols.length - 1 && "border-b border-border/50"
              )}
            >
              {/* Symbol */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{sym.symbol}</span>
                  {sym.category && (
                    <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                      {sym.category}
                    </span>
                  )}
                </div>
                {(sym.display_name || px?.name) && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {sym.display_name ?? px?.name}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="text-right w-24">
                {loading && !px ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
                ) : (
                  <span className="text-sm font-bold tabular-nums">
                    {px ? formatPrice(px.price, sym.symbol) : "—"}
                  </span>
                )}
              </div>

              {/* Change */}
              <div className="text-right w-24">
                {px && (
                  <span className={cn("text-xs tabular-nums font-medium", isPositive ? "text-profit" : "text-loss")}>
                    {isPositive ? "+" : ""}{px.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Open chart */}
              <div className="w-8 flex justify-end">
                <Link
                  href={`/analysis/chart?symbol=${sym.symbol}`}
                  className="rounded-md p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title={`Open ${sym.symbol} chart`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick chart link */}
      {symbols.length > 0 && (
        <div className="flex justify-end">
          <Link href={`/analysis/chart?symbol=${symbols[0].symbol}`}>
            <Button variant="outline" size="sm" className="text-xs">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Open first symbol in chart
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
