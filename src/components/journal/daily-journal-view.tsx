"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, ArrowRight, TrendingUp, TrendingDown,
  Shield, LineChart, Newspaper, BookOpen, CheckCircle2, XCircle,
  Clock, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalDayEntry } from "@/lib/data/journal-queries";
import type { TradeResult } from "@/types/trading-os";

const RESULT_COLORS: Record<TradeResult, string> = {
  open: "text-blue-400 bg-blue-400/10",
  win: "text-profit bg-profit/10",
  loss: "text-loss bg-loss/10",
  breakeven: "text-muted-foreground bg-muted",
  cancelled: "text-muted-foreground/50 bg-muted/50",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    full: d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
    short: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
  };
}

interface Props {
  entries: JournalDayEntry[];
}

export function DailyJournalView({ entries }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set([entries[0]?.day.id]));

  function toggleDay(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No journal entries yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Start your first session to see entries here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(({ day, pre_market, market_analysis, news_events, trades, eod_review }) => {
        const isOpen = expanded.has(day.id);
        const dateInfo = fmtDate(day.trade_date);
        const closed = trades.filter(t => t.result !== "open" && t.result !== "cancelled");
        const wins = closed.filter(t => t.result === "win").length;
        const hasPreMarket = !!pre_market;
        const hasAnalysis = market_analysis.length > 0;
        const hasNews = news_events.length > 0;
        const hasTrades = trades.length > 0;
        const hasEod = !!eod_review;

        return (
          <div key={day.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Day Header — always visible */}
            <button
              onClick={() => toggleDay(day.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              }

              {/* Date */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold">{dateInfo.full}</span>
                  {day.no_trade_blocked && (
                    <span className="rounded-full bg-loss/10 text-loss text-[10px] px-2 py-0.5 font-bold">NO TRADE</span>
                  )}
                  {hasEod && (
                    <span className="rounded-full bg-profit/10 text-profit text-[10px] px-2 py-0.5 font-bold">COMPLETE</span>
                  )}
                </div>
                {/* Section indicators */}
                <div className="flex items-center gap-2 mt-0.5">
                  {[
                    { label: "Pre-Market", has: hasPreMarket, icon: Shield },
                    { label: "Analysis", has: hasAnalysis, icon: LineChart },
                    { label: "News", has: hasNews, icon: Newspaper },
                    { label: "Trades", has: hasTrades, icon: Clock },
                    { label: "EOD", has: hasEod, icon: BookOpen },
                  ].map(({ label, has, icon: Icon }) => (
                    <span key={label} className={cn(
                      "flex items-center gap-1 text-[10px] font-medium",
                      has ? "text-profit" : "text-muted-foreground/40"
                    )}>
                      <Icon className="h-2.5 w-2.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {hasTrades && (
                  <span className="text-xs text-muted-foreground">
                    {closed.length} trade{closed.length !== 1 ? "s" : ""} · {wins}W/{closed.length - wins}L
                  </span>
                )}
                {day.total_pnl !== 0 && (
                  <span className={cn("text-sm font-bold tabular-nums", day.total_pnl > 0 ? "text-profit" : "text-loss")}>
                    {day.total_pnl > 0 ? "+" : ""}${fmt(Math.abs(day.total_pnl))}
                  </span>
                )}
                {day.total_r !== 0 && (
                  <span className={cn("text-xs tabular-nums", day.total_r > 0 ? "text-profit" : "text-loss")}>
                    {day.total_r > 0 ? "+" : ""}{day.total_r.toFixed(2)}R
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/day/${day.trade_date}`); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
              <div className="border-t border-border divide-y divide-border/50">

                {/* PRE-MARKET REVIEW */}
                {hasPreMarket && (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Pre-Market Review</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "HTF Bias", value: pre_market!.htf_bias },
                        { label: "Daily Structure", value: pre_market!.daily_structure },
                        { label: "H4 Structure", value: pre_market!.h4_structure },
                        { label: "H1 Structure", value: pre_market!.h1_structure },
                        { label: "Market Condition", value: pre_market!.market_condition },
                      ].filter(f => f.value).map(field => (
                        <div key={field.label} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">{field.label}</p>
                          <p className="text-xs font-semibold capitalize mt-0.5">{field.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Liquidity levels */}
                    {pre_market!.liquidity_levels?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">Liquidity Levels</p>
                        <div className="flex flex-wrap gap-2">
                          {pre_market!.liquidity_levels.map((lv, i) => (
                            <span key={i} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs">
                              <strong>{lv.label}</strong> @ {lv.price}
                              {lv.notes && <span className="text-muted-foreground"> — {lv.notes}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Scenarios */}
                    {pre_market!.scenarios?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">Scenarios</p>
                        <div className="space-y-2">
                          {pre_market!.scenarios.map((s, i) => (
                            <div key={i} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs">
                              <p className="text-muted-foreground"><strong className="text-foreground">IF: </strong>{s.conditions.join(", ")}</p>
                              <p className="text-muted-foreground mt-0.5"><strong className="text-foreground">THEN: </strong>{s.actions.join(", ")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pre_market!.notes && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">{pre_market!.notes}</p>
                    )}
                  </div>
                )}

                {/* MARKET ANALYSIS SCREENSHOTS */}
                {hasAnalysis && market_analysis.some(a => a.screenshot_path || a.bias || a.notes) && (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-3.5 w-3.5 text-blue-400" />
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Market Analysis</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {market_analysis.filter(a => a.bias || a.notes || a.screenshot_path).map(a => (
                        <div key={a.id} className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold",
                              a.timeframe_group === "higher" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"
                            )}>{a.timeframe}</span>
                            {a.bias && (
                              <span className={cn("text-[10px] font-bold capitalize",
                                a.bias === "bullish" ? "text-profit" : a.bias === "bearish" ? "text-loss" : "text-muted-foreground"
                              )}>{a.bias}</span>
                            )}
                          </div>
                          {a.structure && <p className="text-[10px] text-muted-foreground">Structure: <span className="text-foreground">{a.structure}</span></p>}
                          {a.liquidity && <p className="text-[10px] text-muted-foreground">Liquidity: <span className="text-foreground">{a.liquidity}</span></p>}
                          {a.notes && <p className="text-[10px] text-muted-foreground italic">{a.notes}</p>}
                          {a.screenshot_path && (
                            <a href={a.screenshot_path} target="_blank" rel="noopener noreferrer">
                              <img src={a.screenshot_path} alt={`${a.timeframe} chart`} className="w-full rounded border border-border object-cover max-h-32 hover:opacity-90 transition-opacity" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEWS EVENTS */}
                {hasNews && (
                  <div className="px-4 py-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-3.5 w-3.5 text-amber-400" />
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">News Events</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {news_events.map(n => (
                        <div key={n.id} className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs",
                          n.impact === "high" ? "border-loss/30 bg-loss/5" : n.impact === "medium" ? "border-amber-400/30 bg-amber-400/5" : "border-border bg-background"
                        )}>
                          <span className="font-bold">{n.event_time}</span>
                          <span className="text-muted-foreground"> · {n.currency} · </span>
                          <span>{n.event_name}</span>
                          <span className={cn("ml-1 font-bold uppercase text-[10px]",
                            n.impact === "high" ? "text-loss" : n.impact === "medium" ? "text-amber-400" : "text-muted-foreground"
                          )}>{n.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TRADES */}
                {hasTrades && (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Trades</p>
                    </div>
                    <div className="space-y-2">
                      {trades.map(trade => (
                        <div key={trade.id} className="rounded-lg border border-border bg-background/50 p-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold text-muted-foreground">#{trade.trade_number}</span>
                            <span className="text-sm font-bold">{trade.pair}</span>
                            <span className={cn("flex items-center gap-0.5 text-xs font-bold",
                              trade.direction === "buy" ? "text-profit" : "text-loss"
                            )}>
                              {trade.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {trade.direction.toUpperCase()}
                            </span>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", RESULT_COLORS[trade.result])}>
                              {trade.result}
                            </span>
                            {trade.entry_model && <span className="text-[10px] text-muted-foreground">{trade.entry_model}</span>}
                            {trade.session && <span className="text-[10px] text-muted-foreground">{trade.session}</span>}
                            {trade.pnl != null && (
                              <span className={cn("text-sm font-bold tabular-nums ml-auto", trade.pnl >= 0 ? "text-profit" : "text-loss")}>
                                {trade.pnl >= 0 ? "+" : ""}${fmt(Math.abs(trade.pnl))}
                              </span>
                            )}
                            {trade.r_multiple != null && (
                              <span className={cn("text-xs tabular-nums", trade.r_multiple >= 0 ? "text-profit" : "text-loss")}>
                                {trade.r_multiple >= 0 ? "+" : ""}{trade.r_multiple.toFixed(2)}R
                              </span>
                            )}
                          </div>
                          {/* Prices */}
                          {(trade.entry_price || trade.stop_loss || trade.take_profit) && (
                            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                              {trade.entry_price && <span>Entry: <strong className="text-foreground">{trade.entry_price}</strong></span>}
                              {trade.stop_loss && <span>SL: <strong className="text-loss">{trade.stop_loss}</strong></span>}
                              {trade.take_profit && <span>TP: <strong className="text-profit">{trade.take_profit}</strong></span>}
                              {trade.rr_ratio && <span>RR: <strong className="text-foreground">1:{trade.rr_ratio}</strong></span>}
                            </div>
                          )}
                          {/* Psychology */}
                          {trade.psychology_before?.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {trade.psychology_before.map((p, i) => (
                                <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{p}</span>
                              ))}
                            </div>
                          )}
                          {/* Notes */}
                          {trade.notes && <p className="text-[10px] text-muted-foreground italic mt-2 border-l-2 border-border pl-2">{trade.notes}</p>}
                          {/* Screenshot */}
                          {trade.screenshot_path && (
                            <a href={trade.screenshot_path} target="_blank" rel="noopener noreferrer" className="block mt-2">
                              <img src={trade.screenshot_path} alt="Trade screenshot" className="rounded border border-border max-h-40 object-contain hover:opacity-90 transition-opacity" />
                            </a>
                          )}
                          {/* Post-trade review flags */}
                          {(trade.followed_setup !== null || trade.trade_category) && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {trade.followed_setup !== null && (
                                <span className={cn("flex items-center gap-0.5 text-[10px] font-medium",
                                  trade.followed_setup ? "text-profit" : "text-loss"
                                )}>
                                  {trade.followed_setup
                                    ? <CheckCircle2 className="h-2.5 w-2.5" />
                                    : <XCircle className="h-2.5 w-2.5" />
                                  }
                                  {trade.followed_setup ? "Followed setup" : "Didn't follow setup"}
                                </span>
                              )}
                              {trade.trade_category && (
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                                  trade.trade_category.includes("bad") ? "bg-loss/10 text-loss" : "bg-profit/10 text-profit"
                                )}>{trade.trade_category.replace(/_/g, " ")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EOD REVIEW */}
                {hasEod && (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-profit" />
                      <p className="text-xs font-semibold text-profit uppercase tracking-wider">End-of-Day Review</p>
                      {eod_review!.followed_trade_os && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold ml-auto",
                          eod_review!.followed_trade_os === "yes" ? "bg-profit/10 text-profit"
                          : eod_review!.followed_trade_os === "partially" ? "bg-amber-400/10 text-amber-400"
                          : "bg-loss/10 text-loss"
                        )}>
                          Followed Trade OS: {eod_review!.followed_trade_os}
                        </span>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      {eod_review!.what_went_well && (
                        <div className="rounded-lg border border-profit/20 bg-profit/5 px-3 py-2">
                          <p className="text-[10px] text-profit font-semibold mb-1">✓ What went well</p>
                          <p className="text-muted-foreground">{eod_review!.what_went_well}</p>
                        </div>
                      )}
                      {eod_review!.what_went_badly && (
                        <div className="rounded-lg border border-loss/20 bg-loss/5 px-3 py-2">
                          <p className="text-[10px] text-loss font-semibold mb-1">✗ What went badly</p>
                          <p className="text-muted-foreground">{eod_review!.what_went_badly}</p>
                        </div>
                      )}
                      {eod_review!.lessons_learned && (
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[10px] text-muted-foreground font-semibold mb-1">Lessons learned</p>
                          <p className="text-muted-foreground">{eod_review!.lessons_learned}</p>
                        </div>
                      )}
                      {eod_review!.improvements_tomorrow && (
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[10px] text-muted-foreground font-semibold mb-1">Tomorrow: improve</p>
                          <p className="text-muted-foreground">{eod_review!.improvements_tomorrow}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
