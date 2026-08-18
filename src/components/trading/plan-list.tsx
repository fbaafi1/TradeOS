"use client";

import { TrendingUp, TrendingDown, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TradingPlan } from "@/types/database";

interface PlanListProps {
  plans: TradingPlan[];
}

export function PlanList({ plans }: PlanListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/25 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">No plans yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Click "Today's Plan" to write your first trading plan.</p>
      </div>
    );
  }

  // Group by date
  const grouped = plans.reduce<Record<string, TradingPlan[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = [];
    acc[p.plan_date].push(p);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const isToday = date === today;
        return (
          <div key={date}>
            {/* Date label */}
            <div className="flex items-center gap-3 mb-2">
              <span className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-muted-foreground")}>
                {isToday
                  ? "Today"
                  : new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
              </span>
              {isToday && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Plans for this date */}
            <div className="space-y-2">
              {grouped[date].map((plan) => {
                const isOpen = expanded === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-lg border bg-card transition-all",
                      isOpen ? "border-primary/30" : "border-border",
                      isToday && !isOpen && "border-primary/10 bg-primary/5"
                    )}
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : plan.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {plan.session && (
                            <span className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground">
                              {plan.session}
                            </span>
                          )}
                          {plan.instruments.map((sym) => (
                            <span key={sym} className="text-xs font-semibold text-foreground">
                              {sym}
                            </span>
                          ))}
                          {plan.max_trades != null && (
                            <span className="text-xs text-muted-foreground">
                              Max {plan.max_trades} trades
                            </span>
                          )}
                          {plan.max_risk_percent != null && (
                            <span className="text-xs text-muted-foreground">
                              · {plan.max_risk_percent}% risk
                            </span>
                          )}
                        </div>
                        {plan.market_bias && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {plan.market_bias}
                          </p>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                        {plan.important_news && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-1">
                              ⚡ News / Events
                            </p>
                            <p className="text-sm">{plan.important_news}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {plan.conditions_to_trade && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-profit mb-1">
                                ✓ Trade If
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{plan.conditions_to_trade}</p>
                            </div>
                          )}
                          {plan.conditions_to_avoid && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-loss mb-1">
                                ✗ Avoid If
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{plan.conditions_to_avoid}</p>
                            </div>
                          )}
                        </div>
                        {plan.notes && (
                          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">{plan.notes}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground/50">
                          Saved {new Date(plan.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
