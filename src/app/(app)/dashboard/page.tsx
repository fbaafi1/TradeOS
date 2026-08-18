import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentTradingDays, getJournalTrades, getCurrentLosingStreak } from "@/lib/data/trading-os-queries";
import { getRiskSettings } from "@/lib/data/queries";
import {
  Clock, CalendarDays, TrendingUp, TrendingDown, Activity,
  AlertTriangle, CheckCircle2, BookOpen, ArrowRight, Target, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — Trade OS" };

function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function getTodayDate() { return new Date().toISOString().split("T")[0]; }
function getLast30Days() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = getTodayDate();

  const [recentDays, trades, losingStreak, riskSettings] = await Promise.all([
    getRecentTradingDays(30),
    getJournalTrades(500),
    getCurrentLosingStreak(),
    getRiskSettings(),
  ]);

  // Compute stats
  const closed = trades.filter(t => t.result !== "open" && t.result !== "cancelled");
  const wins = closed.filter(t => t.result === "win").length;
  const losses = closed.filter(t => t.result === "loss").length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR = closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0);
  const avgR = closed.length > 0 ? totalR / closed.length : 0;

  // Today's day record
  const todayDay = recentDays.find(d => d.trade_date === today);
  const recentWithTrades = recentDays.filter(d => d.total_trades > 0).slice(0, 10);

  const losingStreakThreshold = 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">Trade OS</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })} · GMT/UTC+0
          </p>
        </div>
        <Link href={`/day/${today}`}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 h-11 text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Clock className="h-4 w-4" />
          Open Today's Session
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Losing Streak Warning */}
      {losingStreak >= losingStreakThreshold && (
        <div className="rounded-xl border-2 border-loss bg-loss/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-loss flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-loss">ACTIVE LOSING STREAK: {losingStreak} IN A ROW</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your No-Trade Filter will flag this. Consider taking a break and reviewing your recent trades.
            </p>
          </div>
        </div>
      )}

      {/* Today's status card */}
      <div className={cn(
        "rounded-xl border-2 p-5",
        todayDay?.status === "session_complete" ? "border-profit/30 bg-profit/5"
        : todayDay?.status === "no_trade" ? "border-loss/30 bg-loss/5"
        : todayDay?.status === "trading" ? "border-amber-400/30 bg-amber-400/5"
        : "border-primary/20 bg-primary/5"
      )}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Today's Session</p>
            <p className="text-xl font-black mt-0.5">
              {!todayDay ? "Not Started" :
               todayDay.status === "session_complete" ? "Complete ✓" :
               todayDay.status === "no_trade" ? "NO TRADE" :
               todayDay.status === "trading" ? `${todayDay.total_trades} Trade${todayDay.total_trades!==1?"s":""} — In Progress` :
               todayDay.status === "ready" ? "Ready to Trade" :
               todayDay.status === "pre_market" ? "Pre-Market In Progress" :
               "Not Started"}
            </p>
            {todayDay && todayDay.no_trade_reason && (
              <p className="text-xs text-loss mt-1">Blocked: {todayDay.no_trade_reason}</p>
            )}
          </div>
          {todayDay && todayDay.total_trades > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] text-muted-foreground">Today P/L</p>
                <p className={cn("text-xl font-black tabular-nums", todayDay.total_pnl>=0?"text-profit":"text-loss")}>
                  {todayDay.total_pnl>=0?"+":""} ${fmt(Math.abs(todayDay.total_pnl))}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Today R</p>
                <p className={cn("text-xl font-black tabular-nums", todayDay.total_r>=0?"text-profit":"text-loss")}>
                  {todayDay.total_r>=0?"+":""}{fmt(todayDay.total_r)}R
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Trades", value: closed.length, unit: "", color: "" },
          { label: "Win Rate", value: `${winRate}%`, unit: "", color: winRate >= 50 ? "text-profit" : "text-loss" },
          { label: "Total P/L", value: `${totalPnl >= 0 ? "+" : ""}$${fmt(Math.abs(totalPnl))}`, unit: "", color: totalPnl >= 0 ? "text-profit" : "text-loss" },
          { label: "Total R", value: `${totalR >= 0 ? "+" : ""}${fmt(totalR)}R`, unit: "", color: totalR >= 0 ? "text-profit" : "text-loss" },
          { label: "Avg R/Trade", value: `${avgR >= 0 ? "+" : ""}${fmt(avgR)}R`, unit: "", color: avgR > 0 ? "text-profit" : "text-muted-foreground" },
          { label: "Losing Streak", value: losingStreak, unit: "", color: losingStreak >= losingStreakThreshold ? "text-loss" : "text-muted-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={cn("text-xl font-black tabular-nums mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Bottom grid: recent sessions + quick actions */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        {/* Recent sessions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent Sessions</span>
            </div>
            <Link href="/journal/calendar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View calendar →
            </Link>
          </div>
          {recentWithTrades.length > 0 ? (
            <div className="divide-y divide-border">
              {recentWithTrades.map((day) => (
                <Link key={day.id} href={`/day/${day.trade_date}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors group">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-semibold">
                      {new Date(day.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(day.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">{day.total_trades}T · {day.winning_trades}W · {day.losing_trades}L</span>
                  </div>
                  {day.total_pnl !== 0 && (
                    <span className={cn("text-sm font-bold tabular-nums ml-auto", day.total_pnl >= 0 ? "text-profit" : "text-loss")}>
                      {day.total_pnl >= 0 ? "+" : ""}${fmt(Math.abs(day.total_pnl))}
                    </span>
                  )}
                  {day.total_r !== 0 && (
                    <span className={cn("text-xs tabular-nums", day.total_r >= 0 ? "text-profit" : "text-loss")}>
                      {day.total_r >= 0 ? "+" : ""}{fmt(day.total_r)}R
                    </span>
                  )}
                  {day.no_trade_blocked && (
                    <span className="rounded-full bg-loss/10 text-loss text-[10px] px-2 py-0.5 font-bold ml-auto">NO TRADE</span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sessions recorded yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Open today's session to start</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Quick Access</p>
          {[
            { href: `/day/${today}`, label: "Open Today's Session", icon: Clock, color: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" },
            { href: "/journal/calendar", label: "Calendar View", icon: CalendarDays, color: "bg-card hover:bg-accent border-border text-foreground" },
            { href: "/journal", label: "Trade Journal", icon: BookOpen, color: "bg-card hover:bg-accent border-border text-foreground" },
            { href: "/analytics/performance", label: "Analytics", icon: Activity, color: "bg-card hover:bg-accent border-border text-foreground" },
            { href: "/settings/trade-os", label: "Trade OS Rules", icon: Target, color: "bg-card hover:bg-accent border-border text-foreground" },
            { href: "/settings/no-trade", label: "No-Trade Conditions", icon: AlertTriangle, color: "bg-card hover:bg-accent border-border text-foreground" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors", item.color)}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
