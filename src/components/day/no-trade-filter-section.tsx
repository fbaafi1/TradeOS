"use client";

import { useState, useTransition, useMemo } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Minus, AlertTriangle, ArrowRight, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveNoTradeFilter } from "@/lib/actions/trading-os";
import type { TradingDayFull, NoTradeCondition, FilterEvaluation } from "@/types/trading-os";

interface Props {
  day: TradingDayFull;
  conditions: NoTradeCondition[];
  currentLosingStreak: number;
  onComplete: () => void;
}

type EvalStatus = "pass" | "fail" | "na";

const LOSING_STREAK_THRESHOLD = 3;

function isMonday(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").getUTCDay() === 1;
}
function isFriday(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").getUTCDay() === 5;
}
function isDecember(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").getUTCMonth() === 11;
}
function isLastTradingDayOfMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCDate() === lastDay || (d.getUTCDay() === 5 && d.getUTCDate() >= lastDay - 2);
}

function autoDetectStatus(condition: NoTradeCondition, dateStr: string, streak: number): EvalStatus | null {
  if (!condition.is_auto_detected) return null;

  const name = condition.name.toLowerCase();
  if (name.includes("monday") && isMonday(dateStr)) return "fail";
  if (name.includes("friday") && isFriday(dateStr)) return "fail";
  if (name.includes("december") && isDecember(dateStr)) return "fail";
  if (name.includes("last trading day") && isLastTradingDayOfMonth(dateStr)) return "fail";
  if (name.includes("losing streak") && streak >= LOSING_STREAK_THRESHOLD) return "fail";

  // Auto-detected but condition not triggered
  if (name.includes("monday") || name.includes("friday") || name.includes("december") || name.includes("last trading day") || name.includes("losing streak")) {
    return "pass";
  }

  return null;
}

export function NoTradeFilterSection({ day, conditions, currentLosingStreak, onComplete }: Props) {
  const existingEvals = day.no_trade_filter?.evaluations ?? [];

  const [isPending, startTransition] = useTransition();

  const [evaluations, setEvaluations] = useState<Record<string, { status: EvalStatus; note: string }>>(() => {
    const init: Record<string, { status: EvalStatus; note: string }> = {};
    for (const cond of conditions) {
      const existing = existingEvals.find((e) => e.condition_id === cond.id);
      if (existing) {
        init[cond.id] = { status: existing.status, note: existing.note };
      } else {
        const autoStatus = autoDetectStatus(cond, day.trade_date, currentLosingStreak);
        init[cond.id] = { status: autoStatus ?? "na", note: "" };
      }
    }
    return init;
  });

  const hardFails = conditions.filter(
    (c) => c.is_hard_block && evaluations[c.id]?.status === "fail"
  );
  const hasHardBlock = hardFails.length > 0;

  const overallPass = useMemo(() => {
    if (!conditions.length) return null;
    const allEvaluated = conditions.every((c) => evaluations[c.id]?.status !== undefined);
    if (!allEvaluated) return null;
    if (hasHardBlock) return false;
    return true;
  }, [conditions, evaluations, hasHardBlock]);

  function setStatus(condId: string, status: EvalStatus) {
    setEvaluations((prev) => ({ ...prev, [condId]: { ...prev[condId], status } }));
  }

  function setNote(condId: string, note: string) {
    setEvaluations((prev) => ({ ...prev, [condId]: { ...prev[condId], note } }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const evals: FilterEvaluation[] = conditions.map((c) => ({
        condition_id: c.id,
        condition_name: c.name,
        status: evaluations[c.id]?.status ?? "na",
        note: evaluations[c.id]?.note ?? "",
        is_auto_detected: c.is_auto_detected,
        is_hard_block: c.is_hard_block,
      }));

      await saveNoTradeFilter(day.id, evals, overallPass);
      if (overallPass !== false) onComplete();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-loss/10">
          <ShieldAlert className="h-5 w-5 text-loss" />
        </div>
        <div>
          <h2 className="text-lg font-bold">No-Trade Filter</h2>
          <p className="text-xs text-muted-foreground">Evaluate ALL conditions before considering any trade</p>
        </div>
      </div>

      {/* Hard block alert */}
      {hasHardBlock && (
        <div className="rounded-xl border-2 border-loss bg-loss/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-loss">NO TRADE — TRADE OS CONDITION FAILED</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hard block(s) triggered: {hardFails.map((c) => c.name).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conditions list */}
      <div className="space-y-2">
        {conditions.map((cond) => {
          const eval_ = evaluations[cond.id] ?? { status: "na" as EvalStatus, note: "" };
          const isAutoDetected = cond.is_auto_detected;
          const isHard = cond.is_hard_block;

          return (
            <div
              key={cond.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                eval_.status === "fail" && isHard
                  ? "border-loss/40 bg-loss/5"
                  : eval_.status === "fail"
                  ? "border-amber-400/40 bg-amber-400/5"
                  : eval_.status === "pass"
                  ? "border-profit/20 bg-profit/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{cond.name}</span>
                    {isHard && (
                      <span className="rounded-full bg-loss/10 px-1.5 py-0.5 text-[9px] font-bold text-loss uppercase tracking-wider">
                        HARD BLOCK
                      </span>
                    )}
                    {!isHard && (
                      <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                        SOFT
                      </span>
                    )}
                    {isAutoDetected && (
                      <span className="rounded-full bg-blue-400/10 px-1.5 py-0.5 text-[9px] text-blue-400 uppercase tracking-wider flex items-center gap-0.5">
                        <Info className="h-2.5 w-2.5" />
                        AUTO
                      </span>
                    )}
                  </div>
                  {cond.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{cond.description}</p>
                  )}
                </div>

                {/* Pass / Fail / N/A buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  {(["pass", "fail", "na"] as EvalStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(cond.id, s)}
                      className={cn(
                        "px-2.5 h-7 rounded-md text-xs font-bold uppercase transition-colors border",
                        eval_.status === s
                          ? s === "pass"
                            ? "bg-profit text-white border-profit"
                            : s === "fail"
                            ? "bg-loss text-white border-loss"
                            : "bg-muted-foreground text-white border-muted-foreground"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {s === "na" ? "N/A" : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <input
                type="text"
                value={eval_.note}
                onChange={(e) => setNote(cond.id, e.target.value)}
                placeholder="Note explaining decision..."
                className="mt-2 w-full h-7 rounded-md border border-input bg-background/60 px-2 text-xs"
              />
            </div>
          );
        })}
      </div>

      {/* Result summary */}
      {overallPass !== null && (
        <div className={cn(
          "rounded-xl border-2 p-4 text-center",
          overallPass ? "border-profit/40 bg-profit/5" : "border-loss/40 bg-loss/5"
        )}>
          {overallPass ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-profit" />
              <p className="font-bold text-profit">ALL FILTERS PASSED — YOU MAY TRADE</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5 text-loss" />
              <p className="font-bold text-loss">NO TRADE — CONDITIONS NOT MET</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || conditions.length === 0}
          className={cn(
            "flex items-center gap-2 rounded-md px-5 h-9 text-sm font-semibold transition-colors ml-auto disabled:opacity-50",
            overallPass === false
              ? "bg-loss text-white hover:bg-loss/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {overallPass === false ? "Confirm: No Trade Today" : "Confirm Filter & Continue"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
