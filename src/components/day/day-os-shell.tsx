"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle2,
  XCircle, Clock, TrendingUp, TrendingDown, Activity, ShieldAlert,
  BookOpen, BarChart3, Brain, FileText, Plus, ArrowRight,
  Shield, Newspaper, LineChart, Target, FlaskConical
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingDayFull, NoTradeCondition, TradeOsRule } from "@/types/trading-os";

import { PreMarketSection } from "./pre-market-section";
import { NoTradeFilterSection } from "./no-trade-filter-section";
import { NewsSection } from "./news-section";
import { MarketAnalysisSection } from "./market-analysis-section";
import { TradeSetupSection } from "./trade-setup-section";
import { TradeExecutionSection } from "./trade-execution-section";
import { PostTradeReviewSection } from "./post-trade-review-section";
import { EodReviewSection } from "./eod-review-section";

type Section =
  | "pre_market"
  | "no_trade_filter"
  | "news"
  | "market_analysis"
  | "trade_setup"
  | "trade_execution"
  | "post_trade"
  | "eod_review";

interface Props {
  day: TradingDayFull;
  noTradeConditions: NoTradeCondition[];
  setupRules: TradeOsRule[];
  currentLosingStreak: number;
}

const STATUS_CONFIG = {
  not_started: { label: "NOT STARTED", color: "text-muted-foreground", bg: "bg-muted/30", dot: "bg-muted-foreground" },
  pre_market: { label: "PRE-MARKET", color: "text-blue-400", bg: "bg-blue-400/10", dot: "bg-blue-400" },
  ready: { label: "READY", color: "text-profit", bg: "bg-profit/10", dot: "bg-profit animate-pulse" },
  no_trade: { label: "NO TRADE", color: "text-loss", bg: "bg-loss/10", dot: "bg-loss" },
  trading: { label: "TRADING", color: "text-amber-400", bg: "bg-amber-400/10", dot: "bg-amber-400 animate-pulse" },
  session_complete: { label: "SESSION COMPLETE", color: "text-profit", bg: "bg-profit/10", dot: "bg-profit" },
};

const SECTIONS: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "pre_market", label: "Pre-Market", icon: Shield, description: "Market environment, liquidity, key levels & scenarios" },
  { id: "no_trade_filter", label: "No-Trade Filter", icon: ShieldAlert, description: "Evaluate conditions before any trade" },
  { id: "news", label: "News", icon: Newspaper, description: "Economic events & high-impact news" },
  { id: "market_analysis", label: "Market Analysis", icon: LineChart, description: "Multi-timeframe chart analysis" },
  { id: "trade_setup", label: "Trade Setup", icon: Target, description: "A+ setup validation checklist" },
  { id: "trade_execution", label: "Trade Execution", icon: FlaskConical, description: "Log and manage trades" },
  { id: "post_trade", label: "Post-Trade Review", icon: FileText, description: "Review each trade after close" },
  { id: "eod_review", label: "End-of-Day Review", icon: BookOpen, description: "Daily journal and summary" },
];

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function navigateDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    full: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
    short: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  };
}

export function DayOsShell({ day, noTradeConditions, setupRules, currentLosingStreak }: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("pre_market");
  const dateInfo = formatDate(day.trade_date);
  const statusCfg = STATUS_CONFIG[day.status];
  const isNoTrade = day.status === "no_trade" || day.no_trade_blocked;
  const losingStreakThreshold = 3; // TODO: from settings

  const today = new Date().toISOString().split("T")[0];
  const isToday = day.trade_date === today;

  function goToDate(date: string) {
    router.push(`/day/${date}`);
  }

  const sectionProgress = useMemo(() => {
    const progress: Record<Section, "complete" | "partial" | "empty"> = {
      pre_market: day.pre_market?.is_complete ? "complete" : day.pre_market ? "partial" : "empty",
      no_trade_filter: day.no_trade_filter?.overall_pass !== null && day.no_trade_filter !== null ? "complete" : "empty",
      news: day.news_events.length > 0 ? "complete" : "empty",
      market_analysis: day.market_analysis.length > 0 ? "partial" : "empty",
      trade_setup: "empty",
      trade_execution: day.trades.length > 0 ? "complete" : "empty",
      post_trade: day.trades.some((t) => t.followed_setup !== null) ? "partial" : "empty",
      eod_review: day.eod_review ? "complete" : "empty",
    };
    return progress;
  }, [day]);

  return (
    <div className="space-y-0">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToDate(navigateDate(day.trade_date, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{dateInfo.full}</h1>
              {isToday && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{dateInfo.weekday} · GMT/UTC+0</p>
          </div>

          <button
            onClick={() => goToDate(navigateDate(day.trade_date, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => goToDate(today)}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </button>

          <input
            type="date"
            value={day.trade_date}
            onChange={(e) => e.target.value && goToDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground hidden sm:block"
          />
        </div>

        {/* Status + stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Losing streak warning */}
          {currentLosingStreak >= losingStreakThreshold && (
            <div className="flex items-center gap-1.5 rounded-md bg-loss/10 border border-loss/30 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-loss flex-shrink-0" />
              <span className="text-xs font-semibold text-loss">
                LOSING STREAK: {currentLosingStreak}
              </span>
            </div>
          )}

          {/* Status badge */}
          <div className={cn("flex items-center gap-2 rounded-md px-3 py-1.5", statusCfg.bg)}>
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", statusCfg.dot)} />
            <span className={cn("text-xs font-bold tracking-wider", statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── NO-TRADE BLOCK ALERT ── */}
      {isNoTrade && (
        <div className="mb-5 rounded-xl border-2 border-loss bg-loss/5 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-loss text-sm tracking-wide">
                NO TRADE — TRADE OS CONDITION FAILED
              </p>
              {day.no_trade_reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  Blocked by: {day.no_trade_reason}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                The correct outcome today is <strong className="text-foreground">NO TRADE</strong>.
                Do not override this unless conditions have changed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily Stats Bar ── */}
      {(day.total_trades > 0 || day.status !== "not_started") && (
        <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            {
              label: "Trades",
              value: String(day.total_trades),
              color: "text-foreground",
            },
            {
              label: "Wins",
              value: String(day.winning_trades),
              color: "text-profit",
            },
            {
              label: "Losses",
              value: String(day.losing_trades),
              color: "text-loss",
            },
            {
              label: "Daily P/L",
              value: `${day.total_pnl >= 0 ? "+" : ""}$${fmt(Math.abs(day.total_pnl))}`,
              color: day.total_pnl > 0 ? "text-profit" : day.total_pnl < 0 ? "text-loss" : "text-muted-foreground",
            },
            {
              label: "Daily R",
              value: `${day.total_r >= 0 ? "+" : ""}${fmt(day.total_r)}R`,
              color: day.total_r > 0 ? "text-profit" : day.total_r < 0 ? "text-loss" : "text-muted-foreground",
            },
            {
              label: "Violations",
              value: String(day.rule_violations),
              color: day.rule_violations > 0 ? "text-loss" : "text-muted-foreground",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card px-3 py-2 space-y-0.5"
            >
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className={cn("text-sm font-bold tabular-nums", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Section Navigation + Content ── */}
      <div className="grid lg:grid-cols-[220px_1fr] gap-5">
        {/* Sidebar nav */}
        <nav className="hidden lg:block space-y-1">
          {SECTIONS.map((sec, i) => {
            const Icon = sec.icon;
            const prog = sectionProgress[sec.id];
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {/* Step number */}
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold truncate">{sec.label}</span>
                </span>
                {/* Progress indicator */}
                {prog === "complete" && (
                  <CheckCircle2 className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-primary" : "text-profit")} />
                )}
                {prog === "partial" && (
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", isActive ? "bg-primary" : "bg-amber-400")} />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-3 mt-3 border-t border-border">
            <button
              onClick={() => router.push("/journal/calendar")}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-xs"
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar View
            </button>
            <button
              onClick={() => router.push("/analytics")}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-xs"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </button>
          </div>
        </nav>

        {/* Mobile section tabs */}
        <div className="lg:hidden overflow-x-auto">
          <div className="flex gap-1 min-w-max pb-1">
            {SECTIONS.map((sec, i) => {
              const prog = sectionProgress[sec.id];
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    activeSection === sec.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {prog === "complete" && <CheckCircle2 className="h-3 w-3" />}
                  {i + 1}. {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active section content */}
        <div className="min-w-0">
          {activeSection === "pre_market" && (
            <PreMarketSection
              day={day}
              onComplete={() => setActiveSection("no_trade_filter")}
            />
          )}
          {activeSection === "no_trade_filter" && (
            <NoTradeFilterSection
              day={day}
              conditions={noTradeConditions}
              currentLosingStreak={currentLosingStreak}
              onComplete={() => setActiveSection("news")}
            />
          )}
          {activeSection === "news" && (
            <NewsSection
              day={day}
              onNext={() => setActiveSection("market_analysis")}
            />
          )}
          {activeSection === "market_analysis" && (
            <MarketAnalysisSection
              day={day}
              onNext={() => setActiveSection("trade_setup")}
            />
          )}
          {activeSection === "trade_setup" && (
            <TradeSetupSection
              day={day}
              setupRules={setupRules}
              onNext={() => setActiveSection("trade_execution")}
            />
          )}
          {activeSection === "trade_execution" && (
            <TradeExecutionSection
              day={day}
              onNext={() => setActiveSection("post_trade")}
            />
          )}
          {activeSection === "post_trade" && (
            <PostTradeReviewSection
              day={day}
              onNext={() => setActiveSection("eod_review")}
            />
          )}
          {activeSection === "eod_review" && (
            <EodReviewSection day={day} />
          )}
        </div>
      </div>
    </div>
  );
}
