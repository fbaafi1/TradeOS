"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, ArrowRight, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalTrade, TradeResult } from "@/types/trading-os";

interface Props { trades: JournalTrade[]; currency: string; }

const RESULT_COLORS: Record<TradeResult, string> = {
  open: "text-blue-400",
  win: "text-profit",
  loss: "text-loss",
  breakeven: "text-muted-foreground",
  cancelled: "text-muted-foreground/50",
};

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function JournalTable({ trades, currency }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState<TradeResult | "all">("all");
  const [filterPair, setFilterPair] = useState("all");

  const pairs = Array.from(new Set(trades.map(t => t.pair))).sort();

  const filtered = trades.filter(t => {
    if (filterResult !== "all" && t.result !== filterResult) return false;
    if (filterPair !== "all" && t.pair !== filterPair) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.pair.toLowerCase().includes(s) || t.entry_model?.toLowerCase().includes(s) || t.notes?.toLowerCase().includes(s) || t.session?.toLowerCase().includes(s);
    }
    return true;
  });

  const closed = filtered.filter(t => t.result !== "open" && t.result !== "cancelled");
  const wins = closed.filter(t => t.result === "win").length;
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR = closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades..."
            className="h-8 rounded-md border border-input bg-background pl-8 pr-3 text-xs w-44"/>
        </div>
        <select value={filterResult} onChange={e => setFilterResult(e.target.value as TradeResult | "all")}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">All results</option>
          {(["win","loss","breakeven","open","cancelled"] as TradeResult[]).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <select value={filterPair} onChange={e => setFilterPair(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">All pairs</option>
          {pairs.map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-muted-foreground self-center ml-1">{filtered.length} trades</span>
      </div>

      {/* Summary bar */}
      {closed.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card px-4 py-3 text-xs">
          <span className="text-muted-foreground">Win Rate: <strong className={cn(wins/closed.length >= 0.5 ? "text-profit" : "text-loss")}>{Math.round(wins/closed.length*100)}%</strong></span>
          <span className="text-muted-foreground">P/L: <strong className={totalPnl >= 0 ? "text-profit" : "text-loss"}>{totalPnl >= 0 ? "+" : ""}${fmt(Math.abs(totalPnl))}</strong></span>
          <span className="text-muted-foreground">Total R: <strong className={totalR >= 0 ? "text-profit" : "text-loss"}>{totalR >= 0 ? "+" : ""}{fmt(totalR)}R</strong></span>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {["Date","#","Pair","Dir","Entry","SL","TP","RR","Result","P/L","R","Model","Session","Day →"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr key={trade.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(trade.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone:"UTC" })}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold">{trade.trade_number ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-bold">{trade.pair}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("flex items-center gap-0.5 text-xs font-bold", trade.direction==="buy"?"text-profit":"text-loss")}>
                        {trade.direction==="buy"?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>}
                        {trade.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{trade.entry_price ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{trade.stop_loss ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{trade.take_profit ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{trade.rr_ratio != null ? `1:${trade.rr_ratio}` : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-xs font-bold capitalize", RESULT_COLORS[trade.result])}>{trade.result}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold tabular-nums">
                      {trade.pnl != null ? <span className={trade.pnl>=0?"text-profit":"text-loss"}>{trade.pnl>=0?"+":""}{fmt(trade.pnl)}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">
                      {trade.r_multiple != null ? <span className={trade.r_multiple>=0?"text-profit":"text-loss"}>{trade.r_multiple>=0?"+":""}{trade.r_multiple.toFixed(2)}R</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{trade.entry_model ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{trade.session ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => router.push(`/day/${trade.trade_date}`)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowRight className="h-3.5 w-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{search || filterResult !== "all" || filterPair !== "all" ? "No trades match your filters" : "No trades recorded yet"}</p>
        </div>
      )}
    </div>
  );
}
