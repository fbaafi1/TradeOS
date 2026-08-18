"use client";

import { useState, useTransition } from "react";
import {
  Shield, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2,
  ArrowRight, Save, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { savePreMarketChecklist } from "@/lib/actions/trading-os";
import type { TradingDayFull, LiquidityLevel, KeyLevel, Scenario } from "@/types/trading-os";
import { LIQUIDITY_LABELS, KEY_LEVEL_TYPES } from "@/types/trading-os";

interface Props {
  day: TradingDayFull;
  onComplete: () => void;
}

const MARKET_CONDITIONS = [
  { value: "trending", label: "Trending", color: "text-profit" },
  { value: "ranging", label: "Ranging", color: "text-blue-400" },
  { value: "consolidating", label: "Consolidating", color: "text-amber-400" },
  { value: "choppy", label: "Choppy", color: "text-loss" },
  { value: "expanding", label: "Expanding", color: "text-purple-400" },
];

const BIAS_OPTIONS = [
  { value: "bullish", label: "Bullish", color: "text-profit" },
  { value: "bearish", label: "Bearish", color: "text-loss" },
  { value: "neutral", label: "Neutral", color: "text-muted-foreground" },
  { value: "unclear", label: "Unclear", color: "text-amber-400" },
];

const IMPORTANCE = ["high", "medium", "low"] as const;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function SectionCard({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function PreMarketSection({ day, onComplete }: Props) {
  const pm = day.pre_market;
  const [isPending, startTransition] = useTransition();

  const [htfBias, setHtfBias] = useState(pm?.htf_bias ?? "");
  const [dailyStructure, setDailyStructure] = useState(pm?.daily_structure ?? "");
  const [h4Structure, setH4Structure] = useState(pm?.h4_structure ?? "");
  const [h1Structure, setH1Structure] = useState(pm?.h1_structure ?? "");
  const [marketCondition, setMarketCondition] = useState(pm?.market_condition ?? "");
  const [notes, setNotes] = useState(pm?.notes ?? "");

  const [liquidityLevels, setLiquidityLevels] = useState<LiquidityLevel[]>(
    pm?.liquidity_levels?.length ? pm.liquidity_levels : LIQUIDITY_LABELS.slice(0, 6).map((l) => ({ label: l, price: "", notes: "" }))
  );

  const [keyLevels, setKeyLevels] = useState<KeyLevel[]>(pm?.key_levels ?? []);
  const [scenarios, setScenarios] = useState<Scenario[]>(pm?.scenarios ?? []);

  function addKeyLevel() {
    setKeyLevels((prev) => [
      ...prev,
      { price: "", type: "support", importance: "medium", notes: "" },
    ]);
  }

  function updateKeyLevel(i: number, field: keyof KeyLevel, value: string) {
    setKeyLevels((prev) => prev.map((k, idx) => idx === i ? { ...k, [field]: value } : k));
  }

  function removeKeyLevel(i: number) {
    setKeyLevels((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addScenario() {
    setScenarios((prev) => [...prev, { id: uid(), conditions: [""], actions: [""] }]);
  }

  function updateScenario(id: string, type: "conditions" | "actions", idx: number, value: string) {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, [type]: s[type].map((v, i) => (i === idx ? value : v)) }
          : s
      )
    );
  }

  function addScenarioStep(id: string, type: "conditions" | "actions") {
    setScenarios((prev) =>
      prev.map((s) => s.id === id ? { ...s, [type]: [...s[type], ""] } : s)
    );
  }

  function removeScenario(id: string) {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  function updateLiquidity(i: number, field: keyof LiquidityLevel, value: string) {
    setLiquidityLevels((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function handleSave(markComplete = false) {
    startTransition(async () => {
      await savePreMarketChecklist(day.id, {
        htf_bias: htfBias || null,
        daily_structure: dailyStructure || null,
        h4_structure: h4Structure || null,
        h1_structure: h1Structure || null,
        market_condition: (marketCondition as PreMarketChecklist["market_condition"]) || null,
        liquidity_levels: liquidityLevels,
        key_levels: keyLevels,
        scenarios,
        notes: notes || null,
        is_complete: markComplete,
      });
      if (markComplete) onComplete();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Pre-Market Routine</h2>
          <p className="text-xs text-muted-foreground">Complete this before any market analysis or trading</p>
        </div>
        {pm?.is_complete && (
          <CheckCircle2 className="h-5 w-5 text-profit ml-auto" />
        )}
      </div>

      {/* A. Market Environment */}
      <SectionCard title="A. Market Environment">
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Higher-Timeframe Bias</label>
            <div className="flex flex-wrap gap-2">
              {BIAS_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setHtfBias(b.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    htfBias === b.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Daily Structure", value: dailyStructure, set: setDailyStructure },
              { label: "4H Structure", value: h4Structure, set: setH4Structure },
              { label: "1H Structure", value: h1Structure, set: setH1Structure },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1">
                <label className="block text-xs text-muted-foreground">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="e.g. HH/HL, BOS, CHoCH"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-2">Market Condition</label>
            <div className="flex flex-wrap gap-2">
              {MARKET_CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setMarketCondition(c.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    marketCondition === c.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* B. Liquidity */}
      <SectionCard title="B. Liquidity Levels">
        <div className="space-y-2 pt-1">
          {liquidityLevels.map((level, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center">
              <div className="text-xs font-medium text-muted-foreground truncate">{level.label}</div>
              <input
                type="text"
                value={level.price}
                onChange={(e) => updateLiquidity(i, "price", e.target.value)}
                placeholder="Price"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <input
                type="text"
                value={level.notes}
                onChange={(e) => updateLiquidity(i, "notes", e.target.value)}
                placeholder="Notes..."
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* C. Key Levels */}
      <SectionCard title="C. Key Levels">
        <div className="space-y-2 pt-1">
          {keyLevels.map((kl, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_2fr_auto] gap-2 items-center">
              <input
                type="text"
                value={kl.price}
                onChange={(e) => updateKeyLevel(i, "price", e.target.value)}
                placeholder="Price"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <select
                value={kl.type}
                onChange={(e) => updateKeyLevel(i, "type", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {KEY_LEVEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={kl.importance}
                onChange={(e) => updateKeyLevel(i, "importance", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {IMPORTANCE.map((imp) => (
                  <option key={imp} value={imp}>{imp.charAt(0).toUpperCase() + imp.slice(1)}</option>
                ))}
              </select>
              <input
                type="text"
                value={kl.notes}
                onChange={(e) => updateKeyLevel(i, "notes", e.target.value)}
                placeholder="Notes..."
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <button onClick={() => removeKeyLevel(i)} className="p-1 rounded hover:bg-loss/10 text-muted-foreground hover:text-loss transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addKeyLevel}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add key level
          </button>
        </div>
      </SectionCard>

      {/* D. Scenarios */}
      <SectionCard title="D. Market Scenarios (IF/THEN)">
        <div className="space-y-4 pt-1">
          {scenarios.map((sc) => (
            <div key={sc.id} className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario</span>
                <button onClick={() => removeScenario(sc.id)} className="p-1 rounded hover:bg-loss/10 text-muted-foreground hover:text-loss transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">IF (Conditions)</p>
                {sc.conditions.map((c, i) => (
                  <input
                    key={i}
                    type="text"
                    value={c}
                    onChange={(e) => updateScenario(sc.id, "conditions", i, e.target.value)}
                    placeholder={`e.g. price sweeps ${i === 0 ? "Asian Low" : "and forms FVG"}`}
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                  />
                ))}
                <button
                  onClick={() => addScenarioStep(sc.id, "conditions")}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add condition
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-profit font-semibold uppercase tracking-wider">THEN (Actions)</p>
                {sc.actions.map((a, i) => (
                  <input
                    key={i}
                    type="text"
                    value={a}
                    onChange={(e) => updateScenario(sc.id, "actions", i, e.target.value)}
                    placeholder={`e.g. wait for ${i === 0 ? "bullish displacement" : "MSS on 5M"}`}
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                  />
                ))}
                <button
                  onClick={() => addScenarioStep(sc.id, "actions")}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add action
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addScenario}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2 w-full justify-center hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Scenario
          </button>
        </div>
      </SectionCard>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-xs text-muted-foreground">General Pre-Market Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes, thoughts, context..."
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => handleSave(false)}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-4 h-9 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 ml-auto"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Mark Complete
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Need to declare the type alias for the import in the function
type PreMarketChecklist = import("@/types/trading-os").PreMarketChecklist;
