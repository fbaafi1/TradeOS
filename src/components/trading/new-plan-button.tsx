"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTradingPlan } from "@/lib/actions/trading-plan";

const SESSIONS = ["Asian", "London", "New York", "London/NY Overlap"];
const COMMON_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "USDCAD", "AUDUSD"];

interface NewPlanButtonProps {
  hasTodayPlan: boolean;
}

export function NewPlanButton({ hasTodayPlan }: NewPlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [session, setSession] = useState("");
  const [marketBias, setMarketBias] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [maxTrades, setMaxTrades] = useState("3");
  const [maxRisk, setMaxRisk] = useState("3");
  const [conditions, setConditions] = useState("");
  const [avoid, setAvoid] = useState("");
  const [news, setNews] = useState("");
  const [notes, setNotes] = useState("");

  function toggleInstrument(sym: string) {
    setInstruments((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  }

  function reset() {
    setSession(""); setMarketBias(""); setInstruments([]);
    setMaxTrades("3"); setMaxRisk("3");
    setConditions(""); setAvoid(""); setNews(""); setNotes("");
    setError(null);
  }

  function handleClose() { setOpen(false); reset(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTradingPlan({
        session: session || null,
        market_bias: marketBias || null,
        instruments,
        max_trades: maxTrades ? parseInt(maxTrades) : null,
        max_risk_percent: maxRisk ? parseFloat(maxRisk) : null,
        conditions_to_trade: conditions || null,
        conditions_to_avoid: avoid || null,
        important_news: news || null,
        notes: notes || null,
      });
      if (result?.error) { setError(result.error); return; }
      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        {hasTodayPlan ? "Add Session Plan" : "Today's Plan"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-xl mx-4 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">New Trading Plan</h2>
              <button onClick={handleClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Session + Risk */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Session</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SESSIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setSession(session === s ? "" : s)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-all ${session === s ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 col-span-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="max-trades">Max Trades</Label>
                    <Input id="max-trades" type="number" min="1" max="20" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max-risk">Max Risk %</Label>
                    <Input id="max-risk" type="number" min="0" max="100" step="0.5" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Market Bias */}
              <div className="space-y-1.5">
                <Label htmlFor="bias">Overall Market Bias</Label>
                <Input id="bias" placeholder="e.g. Risk-off, DXY bullish, watching for pullbacks…" value={marketBias} onChange={(e) => setMarketBias(e.target.value)} />
              </div>

              {/* Instruments */}
              <div className="space-y-1.5">
                <Label>Instruments to Watch</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMBOLS.map((s) => (
                    <button key={s} type="button" onClick={() => toggleInstrument(s)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-all ${instruments.includes(s) ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* News */}
              <div className="space-y-1.5">
                <Label htmlFor="news">Important News / Events</Label>
                <Input id="news" placeholder="CPI 8:30 EST, FOMC minutes 2pm…" value={news} onChange={(e) => setNews(e.target.value)} />
              </div>

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="conditions" className="text-profit">Conditions to Trade</Label>
                  <Textarea id="conditions" rows={2} placeholder="Only trade if…" value={conditions} onChange={(e) => setConditions(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avoid" className="text-loss">Conditions to Avoid</Label>
                  <Textarea id="avoid" rows={2} placeholder="Stay out if…" value={avoid} onChange={(e) => setAvoid(e.target.value)} />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Anything else to remember today…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {error && <p className="text-sm text-loss">{error}</p>}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
