"use client";

import { useState, useTransition } from "react";
import { LineChart, Save, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveMarketAnalysis } from "@/lib/actions/trading-os";
import { uploadScreenshot, deleteScreenshot } from "@/lib/actions/screenshots";
import { ScreenshotUpload } from "@/components/shared/screenshot-upload";
import type { TradingDayFull, DailyMarketAnalysis } from "@/types/trading-os";
import { HIGHER_TIMEFRAMES, ENTRY_TIMEFRAMES } from "@/types/trading-os";

interface Props {
  day: TradingDayFull;
  onNext: () => void;
}

const BIAS_OPTIONS = [
  { value: "bullish", label: "Bullish", cls: "border-profit/40 bg-profit/10 text-profit" },
  { value: "bearish", label: "Bearish", cls: "border-loss/40 bg-loss/10 text-loss" },
  { value: "neutral", label: "Neutral", cls: "border-muted-foreground/40 bg-muted text-muted-foreground" },
];

function TimeframePanel({
  timeframe,
  analysis,
  dayId,
}: {
  timeframe: string;
  analysis: DailyMarketAnalysis | undefined;
  dayId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [bias, setBias] = useState(analysis?.bias ?? "");
  const [structure, setStructure] = useState(analysis?.structure ?? "");
  const [liquidity, setLiquidity] = useState(analysis?.liquidity ?? "");
  const [notes, setNotes] = useState(analysis?.notes ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(analysis?.screenshot_path ?? null);
  const [saved, setSaved] = useState(false);

  const group = [...HIGHER_TIMEFRAMES].includes(timeframe as typeof HIGHER_TIMEFRAMES[number]) ? "higher" : "entry";

  function handleSave() {
    startTransition(async () => {
      await saveMarketAnalysis(dayId, timeframe, {
        timeframe_group: group,
        bias: bias || null,
        structure: structure || null,
        liquidity: liquidity || null,
        notes: notes || null,
        screenshot_path: screenshotUrl,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleScreenshotUploaded(url: string) {
    setScreenshotUrl(url);
    // Auto-save the URL to the analysis record immediately
    await saveMarketAnalysis(dayId, timeframe, { screenshot_path: url });
  }

  async function handleScreenshotDeleted() {
    setScreenshotUrl(null);
    await saveMarketAnalysis(dayId, timeframe, { screenshot_path: null });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "rounded-md px-2.5 py-1 text-xs font-bold",
            group === "higher" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"
          )}>
            {timeframe}
          </span>
          <span className="text-xs text-muted-foreground">
            {group === "higher" ? "Higher TF" : "Entry TF"}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 h-7 text-xs font-semibold transition-colors",
            saved
              ? "bg-profit/10 text-profit border border-profit/30"
              : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          )}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Bias */}
      <div>
        <label className="block text-[10px] text-muted-foreground mb-1.5">Bias</label>
        <div className="flex gap-1.5">
          {BIAS_OPTIONS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBias(b.value)}
              className={cn(
                "px-2.5 h-7 rounded-md text-xs font-semibold border transition-colors",
                bias === b.value ? b.cls : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {b.label}
            </button>
          ))}
          <button
            onClick={() => setBias("")}
            className={cn(
              "px-2.5 h-7 rounded-md text-xs border transition-colors",
              bias === "" ? "border-border text-foreground bg-accent" : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Structure */}
      <div>
        <label className="block text-[10px] text-muted-foreground mb-1.5">Structure</label>
        <input
          type="text"
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
          placeholder="e.g. HH/HL, BOS, CHoCH, LH/LL"
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
        />
      </div>

      {/* Liquidity */}
      <div>
        <label className="block text-[10px] text-muted-foreground mb-1.5">Liquidity</label>
        <input
          type="text"
          value={liquidity}
          onChange={(e) => setLiquidity(e.target.value)}
          placeholder="e.g. BSL at 1.0950, SSL at 1.0880"
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] text-muted-foreground mb-1.5">Notes & Analysis</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key observations for this timeframe..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none"
        />
      </div>

      {/* Screenshot */}
      <ScreenshotUpload
        currentUrl={screenshotUrl}
        folder={`analysis/${dayId}`}
        label="Chart Screenshot"
        onUploaded={handleScreenshotUploaded}
        onDeleted={handleScreenshotDeleted}
      />
    </div>
  );
}

export function MarketAnalysisSection({ day, onNext }: Props) {
  const analysisMap: Record<string, DailyMarketAnalysis> = {};
  for (const a of day.market_analysis) {
    analysisMap[a.timeframe] = a;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
          <LineChart className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Market Analysis</h2>
          <p className="text-xs text-muted-foreground">Multi-timeframe analysis with bias, structure & liquidity</p>
        </div>
      </div>

      {/* Higher Timeframes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
          Higher Timeframe Analysis
        </p>
        <div className="space-y-4">
          {HIGHER_TIMEFRAMES.map((tf) => (
            <TimeframePanel
              key={tf}
              timeframe={tf}
              analysis={analysisMap[tf]}
              dayId={day.id}
            />
          ))}
        </div>
      </div>

      {/* Entry Timeframes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-3">
          Entry Timeframe Analysis
        </p>
        <div className="space-y-4">
          {ENTRY_TIMEFRAMES.map((tf) => (
            <TimeframePanel
              key={tf}
              timeframe={tf}
              analysis={analysisMap[tf]}
              dayId={day.id}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Continue to Trade Setup
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
