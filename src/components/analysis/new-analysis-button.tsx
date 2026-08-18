"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAnalysis } from "@/lib/actions/analysis";
import type { Strategy } from "@/types/database";

import { cn } from "@/lib/utils";

const SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD",
  "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD", "US30", "SPX500", "NAS100",
];

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];

interface NewAnalysisButtonProps {
  strategies: Strategy[];
}

export function NewAnalysisButton({ strategies }: NewAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [symbol, setSymbol] = useState("EURUSD");
  const [customSymbol, setCustomSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("4H");
  const [htfBias, setHtfBias] = useState<"bullish" | "bearish" | "neutral" | "">("");
  const [biasNotes, setBiasNotes] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [strategyId, setStrategyId] = useState<string>("");
  const [setupNotes, setSetupNotes] = useState("");
  const [invalidation, setInvalidation] = useState("");

  function reset() {
    setSymbol("EURUSD");
    setCustomSymbol("");
    setTimeframe("4H");
    setHtfBias("");
    setBiasNotes("");
    setAnalysisNotes("");
    setStrategyId("");
    setSetupNotes("");
    setInvalidation("");
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const finalSymbol = symbol === "CUSTOM" ? customSymbol.trim().toUpperCase() : symbol;
    if (!finalSymbol) { setError("Symbol is required"); return; }

    startTransition(async () => {
      const result = await createAnalysis({
        symbol: finalSymbol,
        timeframe,
        htf_bias: htfBias || null,
        bias_notes: biasNotes || null,
        analysis_notes: analysisNotes || null,
        strategy_id: strategyId || null,
        setup_notes: setupNotes || null,
        invalidation: invalidation || null,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }
      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        New Analysis
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="relative z-10 w-full max-w-xl mx-4 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">New Market Analysis</h2>
              <button
                onClick={handleClose}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Symbol + Timeframe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYMBOLS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="CUSTOM">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {symbol === "CUSTOM" && (
                    <Input
                      placeholder="e.g. GBPJPY"
                      value={customSymbol}
                      onChange={(e) => setCustomSymbol(e.target.value)}
                      className="mt-1.5"
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeframe">Primary Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger id="timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* HTF Bias */}
              <div className="space-y-1.5">
                <Label>HTF Bias</Label>
                <div className="flex gap-2">
                  {(["bullish", "bearish", "neutral"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setHtfBias(htfBias === b ? "" : b)}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                        htfBias === b && b === "bullish" && "bg-profit/15 border-profit text-profit",
                        htfBias === b && b === "bearish" && "bg-loss/15 border-loss text-loss",
                        htfBias === b && b === "neutral" && "bg-muted border-muted-foreground/50 text-foreground",
                        htfBias !== b && "border-border text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bias notes */}
              <div className="space-y-1.5">
                <Label htmlFor="bias-notes">Bias Notes</Label>
                <Textarea
                  id="bias-notes"
                  rows={2}
                  placeholder="Why is your bias bullish / bearish? Structure, liquidity, key levels…"
                  value={biasNotes}
                  onChange={(e) => setBiasNotes(e.target.value)}
                />
              </div>

              {/* Strategy */}
              {strategies.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="strategy">Strategy (optional)</Label>
                  <Select value={strategyId} onValueChange={setStrategyId}>
                    <SelectTrigger id="strategy">
                      <SelectValue placeholder="Link a strategy…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No strategy</SelectItem>
                      {strategies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Setup notes */}
              <div className="space-y-1.5">
                <Label htmlFor="setup-notes">Setup Notes</Label>
                <Textarea
                  id="setup-notes"
                  rows={2}
                  placeholder="What setup are you watching for? ICT, SMC, price action…"
                  value={setupNotes}
                  onChange={(e) => setSetupNotes(e.target.value)}
                />
              </div>

              {/* Analysis notes */}
              <div className="space-y-1.5">
                <Label htmlFor="analysis-notes">Full Analysis</Label>
                <Textarea
                  id="analysis-notes"
                  rows={3}
                  placeholder="Detailed notes — structure, liquidity, key levels, expected movement…"
                  value={analysisNotes}
                  onChange={(e) => setAnalysisNotes(e.target.value)}
                />
              </div>

              {/* Invalidation */}
              <div className="space-y-1.5">
                <Label htmlFor="invalidation">Invalidation</Label>
                <Input
                  id="invalidation"
                  placeholder="What price action would invalidate this analysis?"
                  value={invalidation}
                  onChange={(e) => setInvalidation(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-loss">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    "Save Analysis"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
