"use client";

import { useState, useTransition } from "react";
import { BookOpen, Loader2, Check, Trophy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveEodReview } from "@/lib/actions/trading-os";
import type { TradingDayFull, FollowedOS } from "@/types/trading-os";

interface Props { day: TradingDayFull; }

function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

export function EodReviewSection({ day }: Props) {
  const eod = day.eod_review;
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const closed = day.trades.filter(t => t.result !== "open" && t.result !== "cancelled");
  const wins = closed.filter(t => t.result === "win").length;
  const losses = closed.filter(t => t.result === "loss").length;
  const be = closed.filter(t => t.result === "breakeven").length;
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR = closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0);

  const [wellText, setWellText] = useState(eod?.what_went_well ?? "");
  const [badlyText, setBadlyText] = useState(eod?.what_went_badly ?? "");
  const [lessonsText, setLessonsText] = useState(eod?.lessons_learned ?? "");
  const [improvementsText, setImprovementsText] = useState(eod?.improvements_tomorrow ?? "");
  const [followedOS, setFollowedOS] = useState<FollowedOS | "">(eod?.followed_trade_os ?? "");
  const [violations, setViolations] = useState(String(eod?.rule_violations ?? day.rule_violations));

  function handleSave() {
    startTransition(async () => {
      await saveEodReview(day.id, {
        total_trades: closed.length,
        wins, losses, breakeven: be,
        total_pnl: totalPnl,
        total_r: totalR,
        rule_violations: parseInt(violations) || 0,
        what_went_well: wellText || null,
        what_went_badly: badlyText || null,
        lessons_learned: lessonsText || null,
        improvements_tomorrow: improvementsText || null,
        followed_trade_os: (followedOS as FollowedOS) || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const followedOSConfig: Record<FollowedOS, { label: string; color: string }> = {
    yes:       { label: "YES", color: "bg-profit text-white border-profit" },
    partially: { label: "PARTIALLY", color: "bg-amber-400 text-black border-amber-400" },
    no:        { label: "NO", color: "bg-loss text-white border-loss" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10"><BookOpen className="h-5 w-5 text-amber-400"/></div>
        <div><h2 className="text-lg font-bold">End-of-Day Review</h2><p className="text-xs text-muted-foreground">Complete your daily journal before closing the session</p></div>
        {eod && <span className="ml-auto rounded-full bg-profit/10 px-2 py-0.5 text-[10px] font-bold text-profit uppercase">COMPLETE</span>}
      </div>

      {/* Day Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Day Summary</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
          {[
            { label: "Trades", value: String(closed.length), color: "" },
            { label: "Wins",   value: String(wins),          color: "text-profit" },
            { label: "Losses", value: String(losses),        color: "text-loss" },
            { label: "B/E",    value: String(be),            color: "text-muted-foreground" },
            { label: "P/L",    value: `${totalPnl>=0?"+":""}$${fmt(Math.abs(totalPnl))}`, color: totalPnl>=0?"text-profit":"text-loss" },
            { label: "R",      value: `${totalR>=0?"+":""}${fmt(totalR)}R`, color: totalR>=0?"text-profit":"text-loss" },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border py-2 px-1">
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className={cn("text-base font-black tabular-nums", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Rule violations */}
        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs text-muted-foreground flex-shrink-0">Rule violations today:</label>
          <input type="number" min="0" value={violations} onChange={e => setViolations(e.target.value)}
            className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm text-center font-bold"/>
          {parseInt(violations) > 0 && (
            <span className="text-xs text-loss flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/> Violations recorded</span>
          )}
        </div>
      </div>

      {/* Journal questions */}
      <div className="space-y-3">
        {[
          { label: "What did I do well today?", value: wellText, setter: setWellText, placeholder: "e.g. Waited patiently for my setup, followed my SL...", color: "border-profit/20 focus:border-profit/40" },
          { label: "What did I do badly today?", value: badlyText, setter: setBadlyText, placeholder: "e.g. Entered too early, moved SL, overtraded...", color: "border-loss/20 focus:border-loss/40" },
          { label: "What did I learn?", value: lessonsText, setter: setLessonsText, placeholder: "Key lessons from today's session...", color: "" },
          { label: "What will I improve tomorrow?", value: improvementsText, setter: setImprovementsText, placeholder: "Specific actions to improve...", color: "" },
        ].map(({ label, value, setter, placeholder, color }) => (
          <div key={label} className="space-y-1.5">
            <label className="block text-sm font-semibold">{label}</label>
            <textarea rows={3} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
              className={cn("w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm resize-none outline-none transition-colors", color)}/>
          </div>
        ))}
      </div>

      {/* Final question */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-base font-bold mb-4 text-center">Did I follow my Trade OS today?</p>
        <div className="flex gap-3">
          {(["yes","partially","no"] as FollowedOS[]).map(opt => (
            <button key={opt} onClick={() => setFollowedOS(opt)}
              className={cn("flex-1 h-12 rounded-xl text-sm font-black uppercase border-2 transition-all",
                followedOS === opt ? followedOSConfig[opt].color : "border-border text-muted-foreground hover:bg-accent"
              )}>
              {followedOSConfig[opt].label}
            </button>
          ))}
        </div>
        {followedOS === "no" && (
          <p className="mt-3 text-xs text-loss text-center font-semibold">Identify what went wrong and commit to fixing it tomorrow.</p>
        )}
        {followedOS === "yes" && (
          <p className="mt-3 text-xs text-profit text-center font-semibold flex items-center justify-center gap-1.5">
            <Trophy className="h-3.5 w-3.5"/> Excellent discipline. Results follow process.
          </p>
        )}
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={isPending || !followedOS}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl h-12 text-sm font-bold transition-colors",
          saved ? "bg-profit/10 text-profit border-2 border-profit/30" : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        )}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
        {saved ? "Review Saved — Session Complete ✓" : "Save End-of-Day Review"}
      </button>
    </div>
  );
}
