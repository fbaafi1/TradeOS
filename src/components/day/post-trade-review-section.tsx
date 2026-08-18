"use client";

import { useState, useTransition } from "react";
import { FileText, Check, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { savePostTradeReview } from "@/lib/actions/trading-os";
import type { TradingDayFull, JournalTrade, TradeCategory } from "@/types/trading-os";

interface Props { day: TradingDayFull; onNext: () => void; }

const BOOL_BUTTONS = (value: boolean | null | undefined, setter: (v: boolean) => void, labels = ["Yes","No"]) => (
  <div className="flex gap-2">
    {[true, false].map((v, i) => (
      <button key={String(v)} onClick={() => setter(v)}
        className={cn("flex-1 h-8 rounded-md text-xs font-semibold border transition-colors capitalize",
          value === v
            ? v ? "bg-profit/15 border-profit/40 text-profit" : "bg-loss/15 border-loss/40 text-loss"
            : "border-border text-muted-foreground hover:bg-accent"
        )}>{labels[i]}</button>
    ))}
  </div>
);

const CATEGORIES: { value: TradeCategory; label: string; description: string; color: string }[] = [
  { value: "good_win",  label: "Good Trade / Win",  description: "Followed rules & won",       color: "border-profit/40 bg-profit/10 text-profit" },
  { value: "good_loss", label: "Good Trade / Loss", description: "Followed rules & lost",       color: "border-blue-400/40 bg-blue-400/10 text-blue-400" },
  { value: "bad_win",   label: "Bad Trade / Win",   description: "Broke rules but still won",   color: "border-amber-400/40 bg-amber-400/10 text-amber-400" },
  { value: "bad_loss",  label: "Bad Trade / Loss",  description: "Broke rules & lost",          color: "border-loss/40 bg-loss/10 text-loss" },
];

function TradeReviewPanel({ trade }: { trade: JournalTrade }) {
  const [isPending, startTransition] = useTransition();
  const [followedSetup, setFollowedSetup] = useState<boolean | null>(null);
  const [followedRisk, setFollowedRisk] = useState<boolean | null>(null);
  const [correctLocation, setCorrectLocation] = useState<boolean | null>(null);
  const [waitedConfirmation, setWaitedConfirmation] = useState<boolean | null>(null);
  const [managedCorrectly, setManagedCorrectly] = useState<boolean | null>(null);
  const [winLossCause, setWinLossCause] = useState<"strategy"|"execution"|"both"|"luck"|"">("");
  const [category, setCategory] = useState<TradeCategory | "">("");
  const [wellNotes, setWellNotes] = useState("");
  const [wrongNotes, setWrongNotes] = useState("");
  const [lessonNotes, setLessonNotes] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await savePostTradeReview(trade.id, {
        followed_setup: followedSetup,
        followed_risk_rules: followedRisk,
        correct_location: correctLocation,
        waited_for_confirmation: waitedConfirmation,
        managed_correctly: managedCorrectly,
        win_loss_cause: (winLossCause as "strategy"|"execution"|"both"|"luck") || null,
        trade_category: (category as TradeCategory) || null,
        what_went_well: wellNotes || null,
        what_went_wrong: wrongNotes || null,
        lesson_learned: lessonNotes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const resultColor = trade.result === "win" ? "text-profit" : trade.result === "loss" ? "text-loss" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Trade header */}
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">{trade.trade_number}</span>
        <span className={cn("text-xs font-bold", trade.direction==="buy"?"text-profit":"text-loss")}>{trade.direction.toUpperCase()}</span>
        <span className="font-bold text-sm">{trade.pair}</span>
        {trade.entry_model && <span className="text-xs text-muted-foreground">· {trade.entry_model}</span>}
        <span className={cn("ml-auto text-sm font-bold capitalize", resultColor)}>{trade.result}</span>
        {trade.pnl != null && <span className={cn("text-sm font-bold tabular-nums", trade.pnl>=0?"text-profit":"text-loss")}>{trade.pnl>=0?"+":""} ${trade.pnl.toFixed(2)}</span>}
        {trade.r_multiple != null && <span className="text-xs text-muted-foreground">{trade.r_multiple>=0?"+":""}{trade.r_multiple.toFixed(2)}R</span>}
      </div>

      {/* Questions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1"><p className="text-xs text-muted-foreground">1. Did I follow my setup?</p>{BOOL_BUTTONS(followedSetup, setFollowedSetup)}</div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">2. Did I follow my risk rules?</p>{BOOL_BUTTONS(followedRisk, setFollowedRisk)}</div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">3. Correct market location?</p>{BOOL_BUTTONS(correctLocation, setCorrectLocation)}</div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">4. Waited for confirmation?</p>{BOOL_BUTTONS(waitedConfirmation, setWaitedConfirmation)}</div>
        <div className="space-y-1 sm:col-span-2"><p className="text-xs text-muted-foreground">5. Managed the trade correctly?</p>{BOOL_BUTTONS(managedCorrectly, setManagedCorrectly)}</div>
      </div>

      {/* Cause */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">6. Win/loss caused by:</p>
        <div className="flex flex-wrap gap-2">
          {(["strategy","execution","both","luck"] as const).map(c => (
            <button key={c} onClick={() => setWinLossCause(c)} className={cn("px-3 h-7 rounded-md text-xs font-semibold capitalize border transition-colors",winLossCause===c?"bg-primary/10 border-primary/40 text-primary":"border-border text-muted-foreground hover:bg-accent")}>{c}</button>
          ))}
        </div>
      </div>

      {/* Category — the most important distinction */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Trade Category</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={cn("rounded-lg border px-3 py-2 text-left transition-colors",category===cat.value?cat.color:"border-border bg-card hover:bg-accent/40")}>
              <p className="text-xs font-bold">{cat.label}</p>
              <p className="text-[10px] text-muted-foreground">{cat.description}</p>
            </button>
          ))}
        </div>
        {(category === "bad_win" || category === "bad_loss") && (
          <p className="mt-2 text-xs text-amber-400 font-semibold">⚠ A losing trade following the rules is still a GOOD trade. A winning trade breaking rules is still a BAD trade.</p>
        )}
      </div>

      {/* Notes */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[["What went well?", wellNotes, setWellNotes],["What went wrong?", wrongNotes, setWrongNotes],["Lesson learned?", lessonNotes, setLessonNotes]].map(([label, value, setter]) => (
          <div key={label as string} className="space-y-1">
            <label className="text-[10px] text-muted-foreground">{label as string}</label>
            <textarea rows={2} value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"/>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isPending}
          className={cn("flex items-center gap-2 rounded-md px-4 h-8 text-xs font-semibold transition-colors",
            saved ? "bg-profit/10 text-profit border border-profit/30" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : saved ? <Check className="h-3.5 w-3.5"/> : <Check className="h-3.5 w-3.5"/>}
          {saved ? "Saved!" : "Save Review"}
        </button>
      </div>
    </div>
  );
}

export function PostTradeReviewSection({ day, onNext }: Props) {
  const closedTrades = day.trades.filter(t => t.result !== "open" && t.result !== "cancelled");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10"><FileText className="h-5 w-5 text-purple-400"/></div>
        <div><h2 className="text-lg font-bold">Post-Trade Review</h2><p className="text-xs text-muted-foreground">Review each closed trade honestly</p></div>
      </div>
      {closedTrades.length > 0 ? (
        <div className="space-y-4">
          {closedTrades.map(t => <TradeReviewPanel key={t.id} trade={t}/>)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
          <p className="text-sm text-muted-foreground">No closed trades to review yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Close a trade in Trade Execution to review it here</p>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button onClick={onNext} className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors">
          Continue to End-of-Day Review <ArrowRight className="h-3.5 w-3.5"/>
        </button>
      </div>
    </div>
  );
}
