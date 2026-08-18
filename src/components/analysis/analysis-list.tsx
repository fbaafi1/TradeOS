"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketAnalysis } from "@/types/database";
import { Input } from "@/components/ui/input";

const BIAS_CONFIG = {
  bullish: { icon: TrendingUp, color: "text-profit", bg: "bg-profit/10 border-profit/20" },
  bearish: { icon: TrendingDown, color: "text-loss", bg: "bg-loss/10 border-loss/20" },
  neutral: { icon: Activity, color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
} as const;

interface AnalysisListProps {
  analyses: MarketAnalysis[];
}

export function AnalysisList({ analyses }: AnalysisListProps) {
  const [search, setSearch] = useState("");
  const [biasFilter, setBiasFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = analyses.filter((a) => {
    const matchSearch =
      !search ||
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.analysis_notes?.toLowerCase().includes(search.toLowerCase()) ||
      a.bias_notes?.toLowerCase().includes(search.toLowerCase());
    const matchBias = biasFilter === "all" || a.htf_bias === biasFilter;
    return matchSearch && matchBias;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, MarketAnalysis[]>>((acc, a) => {
    const key = a.analysis_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search symbol or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "bullish", "bearish", "neutral"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBiasFilter(b)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-all",
                biasFilter === b
                  ? b === "bullish" ? "bg-profit/10 border-profit/40 text-profit"
                    : b === "bearish" ? "bg-loss/10 border-loss/40 text-loss"
                    : b === "neutral" ? "bg-accent border-muted-foreground/30 text-foreground"
                    : "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/40"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {dates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/25 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No analyses yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {search
              ? "No results for your search."
              : "Click “New Analysis” to record your first market analysis."}
          </p>
        </div>
      )}

      {/* Date groups */}
      {dates.map((date) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {grouped[date].length} {grouped[date].length === 1 ? "analysis" : "analyses"}
            </span>
          </div>

          {/* Analysis cards */}
          <div className="space-y-2">
            {grouped[date].map((a) => {
              const bias = a.htf_bias ? BIAS_CONFIG[a.htf_bias] : null;
              const Icon = bias?.icon ?? Activity;
              const isOpen = expanded === a.id;

              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border bg-card transition-all",
                    isOpen ? "border-primary/30" : "border-border hover:border-border/70"
                  )}
                >
                  {/* Card header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                  >
                    {/* Bias icon */}
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border",
                        bias?.bg ?? "bg-muted/50 border-border"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", bias?.color ?? "text-muted-foreground")} />
                    </div>

                    {/* Symbol + info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{a.symbol}</span>
                        {a.timeframe && (
                          <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                            {a.timeframe}
                          </span>
                        )}
                        {a.htf_bias && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold capitalize",
                              bias?.color
                            )}
                          >
                            {a.htf_bias}
                          </span>
                        )}
                      </div>
                      {a.bias_notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {a.bias_notes}
                        </p>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div className="ml-auto flex-shrink-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border mt-0 pt-3 space-y-3">
                      {a.setup_notes && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Setup
                          </p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {a.setup_notes}
                          </p>
                        </div>
                      )}
                      {a.analysis_notes && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Analysis
                          </p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {a.analysis_notes}
                          </p>
                        </div>
                      )}
                      {a.invalidation && (
                        <div className="rounded-md border border-loss/20 bg-loss/5 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-loss/70 mb-0.5">
                            Invalidation
                          </p>
                          <p className="text-xs text-foreground/80">{a.invalidation}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/50">
                        Saved {new Date(a.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
