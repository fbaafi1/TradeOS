"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarDayData, TradingDay } from "@/types/trading-os";

interface Props {
  calendarDays: CalendarDayData[];
  recentDays: TradingDay[];
  year: number;
  month: number;
}

const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Mon offset (JS getDay: 0=Sun, 1=Mon...)
  const d = new Date(year, month - 1, 1);
  return (d.getDay() + 6) % 7; // Convert to Mon=0
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function TradingCalendar({ calendarDays, recentDays, year: initialYear, month: initialMonth }: Props) {
  const router = useRouter();
  const year = initialYear;
  const month = initialMonth;

  const today = new Date().toISOString().split("T")[0];

  const dayMap: Record<string, CalendarDayData> = {};
  for (const d of calendarDays) dayMap[d.date] = d;

  function prevMonth() {
    if (month === 1) router.push(`/journal/calendar?year=${year - 1}&month=12`);
    else router.push(`/journal/calendar?year=${year}&month=${month - 1}`);
  }
  function nextMonth() {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) router.push(`/journal/calendar?year=${year + 1}&month=1`);
    else router.push(`/journal/calendar?year=${year}&month=${month + 1}`);
  }

  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getDateStr(day: number) {
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function getDotColor(indicator: CalendarDayData["indicator"]) {
    switch(indicator) {
      case "profitable": return "bg-profit";
      case "losing": return "bg-loss";
      case "violation": return "bg-amber-400";
      case "no_trade": return "bg-muted-foreground";
      case "complete": return "bg-blue-400";
      default: return "";
    }
  }

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
          <ChevronLeft className="h-4 w-4"/>
        </button>
        <h2 className="text-lg font-bold">{MONTH_NAMES[month-1]} {year}</h2>
        <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
          <ChevronRight className="h-4 w-4"/>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { dot: "bg-profit", label: "Profitable" },
          { dot: "bg-loss", label: "Losing" },
          { dot: "bg-amber-400", label: "Rule violation" },
          { dot: "bg-muted-foreground", label: "No trade" },
          { dot: "bg-blue-400", label: "EOD complete" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", item.dot)}/>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="border-r border-b border-border/30 h-20 bg-background/20" />;
            const dateStr = getDateStr(day);
            const data = dayMap[dateStr];
            const isToday = dateStr === today;
            const isWeekend = (firstDay + day - 1) % 7 >= 5; // Sat or Sun

            return (
              <button
                key={i}
                onClick={() => router.push(`/day/${dateStr}`)}
                className={cn(
                  "border-r border-b border-border/30 h-20 p-1.5 text-left transition-colors hover:bg-accent/40 relative flex flex-col",
                  isToday && "ring-1 ring-inset ring-primary/50 bg-primary/5",
                  isWeekend && "bg-muted/20",
                  !data && "opacity-60"
                )}
              >
                <span className={cn(
                  "text-xs font-semibold leading-none",
                  isToday ? "text-primary" : isWeekend ? "text-muted-foreground/60" : "text-muted-foreground"
                )}>
                  {day}
                  {isToday && <span className="ml-1 text-[9px] text-primary font-bold">TODAY</span>}
                </span>

                {data && (
                  <div className="mt-1 flex-1 flex flex-col justify-between">
                    {/* Indicator dot */}
                    {data.indicator !== "none" && (
                      <span className={cn("h-2 w-2 rounded-full", getDotColor(data.indicator))}/>
                    )}
                    {/* Stats */}
                    <div className="space-y-0.5">
                      {data.total_trades > 0 && (
                        <p className={cn("text-[10px] font-bold tabular-nums leading-none",
                          data.total_pnl > 0 ? "text-profit" : data.total_pnl < 0 ? "text-loss" : "text-muted-foreground")}>
                          {data.total_pnl >= 0 ? "+" : ""}${Math.abs(data.total_pnl) < 100 ? data.total_pnl.toFixed(0) : Math.round(data.total_pnl)}
                        </p>
                      )}
                      {data.no_trade_blocked && !data.total_trades && (
                        <p className="text-[10px] font-bold text-muted-foreground leading-none">NO TRADE</p>
                      )}
                      {data.total_trades > 0 && (
                        <p className="text-[10px] text-muted-foreground/60 leading-none">{data.total_trades}T</p>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent sessions list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Clock className="h-4 w-4 text-muted-foreground"/>
          <span className="text-sm font-semibold">Recent Sessions</span>
        </div>
        {recentDays.filter(d => d.total_trades > 0 || d.no_trade_blocked).length > 0 ? (
          <div className="divide-y divide-border">
            {recentDays.filter(d => d.total_trades > 0 || d.no_trade_blocked).slice(0, 20).map(day => (
              <button key={day.id} onClick={() => router.push(`/day/${day.trade_date}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-left group">
                <div className="w-24 flex-shrink-0">
                  <p className="text-xs font-semibold">
                    {new Date(day.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(day.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.no_trade_blocked ? <span className="text-loss font-bold">NO TRADE</span> : `${day.total_trades}T · ${day.winning_trades}W · ${day.losing_trades}L`}
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
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0"/>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No sessions this month</div>
        )}
      </div>
    </div>
  );
}
