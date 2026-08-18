"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Search, Calendar, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulatedTrade } from "@/types/database";
import { calculateSimStats } from "@/lib/calculations/trade-stats";

interface Props {
  trades: SimulatedTrade[];
  currency: string;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function ResultPill({ result }: { result: SimulatedTrade["result"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
      result === "win" && "bg-profit/15 text-profit",
      result === "loss" && "bg-loss/15 text-loss",
      result === "breakeven" && "bg-muted text-muted-foreground",
      result === "pending" && "bg-primary/10 text-primary",
    )}>
      {result === "win" && <TrendingUp className="h-2.5 w-2.5" />}
      {result === "loss" && <TrendingDown className="h-2.5 w-2.5" />}
      {result === "breakeven" && <Minus className="h-2.5 w-2.5" />}
      {result}
    </span>
  );
}

export function JournalView({ trades, currency }: Props) {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "win" | "loss" | "breakeven" | "pending">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "backtest">("all");

  const filtered = trades.filter((t) => {
    if (search && !t.instrument.toLowerCase().includes(search.toLowerCase())) return false;
    if (resultFilter !== "all" && t.result !== resultFilter) return false;
    if (typeFilter === "live" && t.is_backtest) return false;
    if (typeFilter === "backtest" && !t.is_backtest) return false;
    return true;
  });

  const closed = trades.filter((t) => t.result !== "pending" && !t.is_backtest);
  const stats = calculateSimStats(closed);

  // Group by date
  const byDate: Record<string, SimulatedTrade[]> = {};
  for (const t of filtered) {
    if (!byDate[t.trade_date]) byDate[t.trade_date] = [];
    byDate[t.trade_date].push(t);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {closed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Trades", value: stats.totalTrades },
            { label: "Win Rate", value: `${fmt(stats.winRate, 1)}%`, good: stats.winRate >= 50 },
            { label: "Profit Factor", value: stats.profitFactor > 0 ? fmt(stats.profitFactor) : "—", good: stats.profitFactor >= 1.5 },
            {
              label: "All-Time P/L",
              value: `${stats.totalPnL >= 0 ? "+" : ""}${currency === "USD" ? "$" : ""}${fmt(Math.abs(stats.totalPnL))}`,
              good: stats.totalPnL >= 0,
              isPN: true,
            },
          ].map(({ label, value, good, isPN }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-base font-bold tabular-nums mt-0.5", isPN && (good ? "text-profit" : "text-loss"))}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40 max-w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by symbol…"
            className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all","win","loss","breakeven","pending"] as const).map((r) => (
            <button key={r} onClick={() => setResultFilter(r)}
              className={cn("px-2 py-1 rounded text-xs capitalize transition-colors",
                resultFilter === r ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
              )}>{r}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all","live","backtest"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn("px-2 py-1 rounded text-xs capitalize transition-colors",
                typeFilter === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
              )}>{t}</button>
          ))}
        </div>
      </div>

      {/* Trade list by date */}
      {sortedDates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No trades in journal</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to <Link href="/trading/simulator" className="underline underline-offset-2 text-primary">Trade Simulator</Link> to log your first trade.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dayTrades = byDate[date];
            const dayPnL = dayTrades.filter(t => t.result !== "pending").reduce((s, t) => s + (t.pnl ?? 0), 0);
            const today = new Date().toISOString().split("T")[0];
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {date === today ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">({dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""})</span>
                  </div>
                  {dayPnL !== 0 && (
                    <span className={cn("text-xs font-bold tabular-nums", dayPnL >= 0 ? "text-profit" : "text-loss")}>
                      {dayPnL >= 0 ? "+" : ""}${fmt(Math.abs(dayPnL))}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {dayTrades.map((t) => (
                    <Link key={t.id} href={`/journal/${t.id}`}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-accent transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold flex-shrink-0",
                          t.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                        )}>
                          {t.direction === "long" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors">{t.instrument}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.timeframe ?? ""}{t.session ? ` · ${t.session}` : ""}{t.is_backtest ? " · Backtest" : " · Live"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {t.pnl != null && (
                          <span className={cn("text-sm font-bold tabular-nums", t.pnl >= 0 ? "text-profit" : "text-loss")}>
                            {t.pnl >= 0 ? "+" : ""}${fmt(Math.abs(t.pnl))}
                          </span>
                        )}
                        {t.r_multiple != null && (
                          <span className="text-xs text-muted-foreground tabular-nums">{t.r_multiple >= 0 ? "+" : ""}{fmt(t.r_multiple)}R</span>
                        )}
                        <ResultPill result={t.result} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


