"use client";

import { useState } from "react";
import { Target, CheckSquare, Square, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingDayFull, TradeOsRule } from "@/types/trading-os";

interface Props {
  day: TradingDayFull;
  setupRules: TradeOsRule[];
  onNext: () => void;
}

export function TradeSetupSection({ day, setupRules, onNext }: Props) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const rule of setupRules) {
      init[rule.id] = false;
    }
    return init;
  });

  const total = setupRules.length;
  const checked = Object.values(checklist).filter(Boolean).length;
  const score = total > 0 ? checked : 0;
  const scorePercent = total > 0 ? Math.round((checked / total) * 100) : 0;
  const isAPlus = score === total;

  function toggle(id: string) {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function checkAll() {
    const allChecked = Object.values(checklist).every(Boolean);
    const next: Record<string, boolean> = {};
    for (const r of setupRules) next[r.id] = !allChecked;
    setChecklist(next);
  }

  const hardRules = setupRules.filter((r) => r.rule_type === "hard");
  const softRules = setupRules.filter((r) => r.rule_type === "soft");
  const hardChecked = hardRules.filter((r) => checklist[r.id]).length;
  const allHardPassed = hardChecked === hardRules.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10">
          <Target className="h-5 w-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Trade Setup Validation</h2>
          <p className="text-xs text-muted-foreground">Complete this checklist before every trade</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums" style={{ color: scorePercent >= 90 ? "var(--profit)" : scorePercent >= 70 ? "#f59e0b" : "var(--loss)" }}>
            {score}/{total}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {isAPlus ? "A+ SETUP" : scorePercent >= 70 ? "GOOD SETUP" : "INCOMPLETE"}
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Setup Score</p>
          <p className="text-xs font-bold">{scorePercent}%</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              scorePercent >= 90 ? "bg-profit" : scorePercent >= 70 ? "bg-amber-400" : "bg-loss"
            )}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        {isAPlus && (
          <p className="text-xs text-profit font-bold mt-2 text-center animate-pulse">
            ✦ A+ SETUP — ALL CONDITIONS MET
          </p>
        )}
        {!allHardPassed && total > 0 && (
          <p className="text-xs text-loss mt-2 text-center">
            ⚠ {hardRules.length - hardChecked} HARD requirement{hardRules.length - hardChecked !== 1 ? "s" : ""} not met
          </p>
        )}
      </div>

      {/* Hard rules */}
      {hardRules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-loss">Required (Hard Rules)</p>
          {hardRules.map((rule) => (
            <button
              key={rule.id}
              onClick={() => toggle(rule.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                checklist[rule.id]
                  ? "border-profit/30 bg-profit/5"
                  : "border-border bg-card hover:bg-accent/40"
              )}
            >
              {checklist[rule.id] ? (
                <CheckSquare className="h-4 w-4 text-profit flex-shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", checklist[rule.id] ? "text-profit" : "text-foreground")}>
                  {rule.name}
                </p>
                {rule.description && (
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                )}
              </div>
              <span className="ml-auto rounded-full bg-loss/10 px-1.5 py-0.5 text-[9px] font-bold text-loss uppercase tracking-wider flex-shrink-0">
                HARD
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Soft rules */}
      {softRules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Recommended (Soft Rules)</p>
          {softRules.map((rule) => (
            <button
              key={rule.id}
              onClick={() => toggle(rule.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                checklist[rule.id]
                  ? "border-profit/30 bg-profit/5"
                  : "border-border bg-card hover:bg-accent/40"
              )}
            >
              {checklist[rule.id] ? (
                <CheckSquare className="h-4 w-4 text-profit flex-shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", checklist[rule.id] ? "text-profit line-through opacity-70" : "text-foreground")}>
                  {rule.name}
                </p>
                {rule.description && (
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                )}
              </div>
              <span className="ml-auto rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider flex-shrink-0">
                SOFT
              </span>
            </button>
          ))}
        </div>
      )}

      {setupRules.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No setup rules configured</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add rules in Settings → Trade OS Rules</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {total > 0 && (
          <button
            onClick={checkAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {Object.values(checklist).every(Boolean) ? "Uncheck all" : "Check all"}
          </button>
        )}
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors ml-auto"
        >
          Continue to Trade Execution
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
