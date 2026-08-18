"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Loader2, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SimulatedTrade, RiskSettings, Strategy } from "@/types/database";
import { createSimulatedTrade, deleteSimulatedTrade } from "@/lib/actions/simulator";

interface Props {
  initialTrades: SimulatedTrade[];
  riskSettings: RiskSettings | null;
  strategies: Strategy[];
}

const PSYCHOLOGY_OPTIONS = [
  "Calm", "Confident", "Anxious", "FOMO", "Revenge", "Greedy",
  "Patient", "Disciplined", "Tired", "Distracted", "Overconfident",
];

const SESSIONS = ["London", "New York", "Asian", "London/NY Overlap"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D"];
const INSTRUMENTS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","NZDUSD","USDCAD",
  "GBPJPY","EURJPY","EURGBP","XAUUSD","XAGUSD","BTCUSD","ETHUSD",
  "US30","SPX500","NAS100","DAX40",
];

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function ResultBadge({ result }: { result: SimulatedTrade["result"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      result === "win" && "bg-profit/15 text-profit",
      result === "loss" && "bg-loss/15 text-loss",
      result === "breakeven" && "bg-muted text-muted-foreground",
      result === "pending" && "bg-primary/10 text-primary",
    )}>
      {result === "win" && <TrendingUp className="h-2.5 w-2.5" />}
      {result === "loss" && <TrendingDown className="h-2.5 w-2.5" />}
      {result === "breakeven" && <Minus className="h-2.5 w-2.5" />}
      {result}
    </span>
  );
}

function TradeRow({ trade, onDelete }: { trade: SimulatedTrade; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    await deleteSimulatedTrade(trade.id);
    onDelete(trade.id);
    router.refresh();
    setDeleting(false);
  }

  return (
    <>
      <tr
        className="border-b border-border hover:bg-accent/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{trade.trade_date}</td>
        <td className="px-3 py-2.5 text-sm font-semibold">{trade.instrument}</td>
        <td className="px-3 py-2.5">
          <span className={cn("text-xs font-medium", trade.direction === "long" ? "text-profit" : "text-loss")}>
            {trade.direction === "long" ? "LONG" : "SHORT"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">{trade.timeframe ?? "—"}</td>
        <td className="px-3 py-2.5 text-xs tabular-nums">{trade.entry_price ?? "—"}</td>
        <td className="px-3 py-2.5 text-xs tabular-nums">{trade.stop_loss ?? "—"}</td>
        <td className="px-3 py-2.5 text-xs tabular-nums">{trade.take_profit ?? "—"}</td>
        <td className="px-3 py-2.5">
          <ResultBadge result={trade.result} />
        </td>
        <td className={cn("px-3 py-2.5 text-sm font-bold tabular-nums", trade.pnl != null && trade.pnl >= 0 ? "text-profit" : "text-loss")}>
          {trade.pnl != null ? `${trade.pnl >= 0 ? "+" : ""}$${fmt(trade.pnl)}` : "—"}
        </td>
        <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
          {trade.r_multiple != null ? `${trade.r_multiple >= 0 ? "+" : ""}${fmt(trade.r_multiple)}R` : "—"}
        </td>
        <td className="px-3 py-2.5">
          <span className={cn("h-2 w-2 rounded-full inline-block", trade.is_backtest ? "bg-amber-400" : "bg-blue-400")} />
        </td>
        <td className="px-3 py-2.5 w-8">
          {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-accent/20">
          <td colSpan={12} className="px-4 py-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {trade.setup_notes && (
                <div><p className="text-muted-foreground mb-0.5">Setup Notes</p><p>{trade.setup_notes}</p></div>
              )}
              {trade.reason_for_entry && (
                <div><p className="text-muted-foreground mb-0.5">Reason for Entry</p><p>{trade.reason_for_entry}</p></div>
              )}
              {trade.what_went_well && (
                <div><p className="text-muted-foreground mb-0.5">What went well</p><p className="text-profit">{trade.what_went_well}</p></div>
              )}
              {trade.what_went_wrong && (
                <div><p className="text-muted-foreground mb-0.5">What went wrong</p><p className="text-loss">{trade.what_went_wrong}</p></div>
              )}
              {trade.lesson_learned && (
                <div><p className="text-muted-foreground mb-0.5">Lesson learned</p><p>{trade.lesson_learned}</p></div>
              )}
              <div className="flex flex-wrap gap-2 items-start">
                {trade.followed_plan != null && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", trade.followed_plan ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                    Plan: {trade.followed_plan ? "Followed" : "Broke"}
                  </span>
                )}
                {trade.broke_rules && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-loss/10 text-loss">Rules broken</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                Delete trade
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function TradeSimulator({ initialTrades, riskSettings, strategies }: Props) {
  const router = useRouter();
  const [trades, setTrades] = useState(initialTrades);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "live" | "backtest">("all");
  const [form, setForm] = useState({
    instrument: "EURUSD",
    direction: "long" as "long" | "short",
    trade_date: new Date().toISOString().split("T")[0],
    trade_time: "",
    session: "",
    timeframe: "1H",
    htf_bias: "",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    account_size: String(riskSettings?.default_account_size ?? 10000),
    risk_percentage: String(riskSettings?.max_risk_per_trade ?? 1),
    result: "pending" as SimulatedTrade["result"],
    pnl: "",
    r_multiple: "",
    setup_notes: "",
    reason_for_entry: "",
    what_went_well: "",
    what_went_wrong: "",
    lesson_learned: "",
    followed_plan: "",
    broke_rules: "",
    rule_notes: "",
    psychology_before: [] as string[],
    is_backtest: false,
    strategy_id: "",
  });

  function togglePsych(val: string) {
    setForm((f) => ({
      ...f,
      psychology_before: f.psychology_before.includes(val)
        ? f.psychology_before.filter((v) => v !== val)
        : [...f.psychology_before, val],
    }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const data = {
        instrument: form.instrument,
        direction: form.direction,
        trade_date: form.trade_date,
        trade_time: form.trade_time || null,
        session: form.session || null,
        timeframe: form.timeframe || null,
        htf_bias: form.htf_bias || null,
        entry_price: form.entry_price ? parseFloat(form.entry_price) : null,
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
        take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
        exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
        account_size: form.account_size ? parseFloat(form.account_size) : null,
        risk_percentage: form.risk_percentage ? parseFloat(form.risk_percentage) : null,
        result: form.result,
        pnl: form.pnl ? parseFloat(form.pnl) : null,
        r_multiple: form.r_multiple ? parseFloat(form.r_multiple) : null,
        setup_notes: form.setup_notes || null,
        reason_for_entry: form.reason_for_entry || null,
        what_went_well: form.what_went_well || null,
        what_went_wrong: form.what_went_wrong || null,
        lesson_learned: form.lesson_learned || null,
        followed_plan: form.followed_plan === "yes" ? true : form.followed_plan === "no" ? false : null,
        broke_rules: form.broke_rules === "yes" ? true : false,
        rule_notes: form.rule_notes || null,
        psychology_before: form.psychology_before,
        psychology_after: {},
        is_backtest: form.is_backtest,
        strategy_id: form.strategy_id || null,
      };
      const created = await createSimulatedTrade(data);
      if (created) {
        setTrades((prev) => [created, ...prev]);
        router.refresh();
        setOpen(false);
      }
    });
  }

  const filtered = trades.filter((t) => {
    if (filter === "live") return !t.is_backtest;
    if (filter === "backtest") return t.is_backtest;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "live", "backtest"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >{f === "all" ? `All (${trades.length})` : f === "live" ? `Live (${trades.filter(t => !t.is_backtest).length})` : `Backtest (${trades.filter(t => t.is_backtest).length})`}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log Trade
        </Button>
      </div>

      {/* Trade Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date","Symbol","Dir","TF","Entry","SL","TP","Result","P/L","R","Type",""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No trades logged yet. Click <span className="font-semibold text-foreground">Log Trade</span> to record your first simulated trade.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    onDelete={(id) => setTrades((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-semibold">Log Simulated Trade</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Instrument</Label>
                  <select
                    value={form.instrument}
                    onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {INSTRUMENTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <div className="flex gap-2">
                    {(["long", "short"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, direction: d }))}
                        className={cn(
                          "flex-1 h-9 rounded-md text-sm font-medium capitalize transition-colors border",
                          form.direction === d
                            ? d === "long" ? "bg-profit/15 border-profit/40 text-profit" : "bg-loss/15 border-loss/40 text-loss"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trade Date</Label>
                  <Input type="date" value={form.trade_date} onChange={(e) => setForm((f) => ({ ...f, trade_date: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Timeframe</Label>
                  <select
                    value={form.timeframe}
                    onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TIMEFRAMES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Levels</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["entry_price","stop_loss","take_profit","exit_price"].map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">{field.replace("_", " ")}</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00000"
                        value={form[field as keyof typeof form] as string}
                        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk & Result</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Size</Label>
                    <Input type="number" value={form.account_size} onChange={(e) => setForm((f) => ({ ...f, account_size: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Risk %</Label>
                    <Input type="number" step="0.1" value={form.risk_percentage} onChange={(e) => setForm((f) => ({ ...f, risk_percentage: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">P/L ($)</Label>
                    <Input type="number" step="0.01" placeholder="±0.00" value={form.pnl} onChange={(e) => setForm((f) => ({ ...f, pnl: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">R Multiple</Label>
                    <Input type="number" step="0.1" placeholder="±1.0" value={form.r_multiple} onChange={(e) => setForm((f) => ({ ...f, r_multiple: e.target.value }))} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(["pending","win","loss","breakeven"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setForm((f) => ({ ...f, result: r }))}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold capitalize border transition-colors",
                        form.result === r
                          ? r === "win" ? "bg-profit text-white border-profit" : r === "loss" ? "bg-loss text-white border-loss" : r === "pending" ? "bg-primary text-primary-foreground border-primary" : "bg-muted-foreground text-white border-muted-foreground"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >{r}</button>
                  ))}
                </div>
              </div>

              {/* Psychology */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Psychology Before</p>
                <div className="flex flex-wrap gap-1.5">
                  {PSYCHOLOGY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePsych(p)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs border transition-colors",
                        form.psychology_before.includes(p)
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                {["setup_notes","reason_for_entry","what_went_well","what_went_wrong","lesson_learned"].map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                    <textarea
                      rows={2}
                      value={form[field as keyof typeof form] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      placeholder={field === "what_went_well" ? "e.g. Waited for confirmation" : field === "what_went_wrong" ? "e.g. Entered too early" : ""}
                    />
                  </div>
                ))}
              </div>

              {/* Discipline */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Discipline</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Followed Plan?</Label>
                    <div className="flex gap-2">
                      {["yes","no","n/a"].map((v) => (
                        <button key={v} onClick={() => setForm((f) => ({ ...f, followed_plan: v === "n/a" ? "" : v }))}
                          className={cn("flex-1 h-8 rounded text-xs border capitalize transition-colors",
                            form.followed_plan === (v === "n/a" ? "" : v) ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                          )}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Broke Rules?</Label>
                    <div className="flex gap-2">
                      {["yes","no"].map((v) => (
                        <button key={v} onClick={() => setForm((f) => ({ ...f, broke_rules: v }))}
                          className={cn("flex-1 h-8 rounded text-xs border capitalize transition-colors",
                            form.broke_rules === v ? (v === "yes" ? "bg-loss/10 border-loss/40 text-loss" : "bg-profit/10 border-profit/40 text-profit") : "border-border text-muted-foreground hover:bg-accent"
                          )}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {form.broke_rules === "yes" && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-xs">Which rules?</Label>
                    <Input value={form.rule_notes} onChange={(e) => setForm((f) => ({ ...f, rule_notes: e.target.value }))} className="h-9 text-sm" placeholder="Describe the rule violation..." />
                  </div>
                )}
              </div>

              {/* Session & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Session</Label>
                  <select value={form.session} onChange={(e) => setForm((f) => ({ ...f, session: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Select —</option>
                    {SESSIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <div className="flex gap-2">
                    {([{ val: false, label: "Live sim" }, { val: true, label: "Backtest" }]).map(({ val, label }) => (
                      <button key={label} onClick={() => setForm((f) => ({ ...f, is_backtest: val }))}
                        className={cn("flex-1 h-9 rounded text-xs border transition-colors",
                          form.is_backtest === val ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                        )}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {strategies.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Strategy</Label>
                  <select value={form.strategy_id} onChange={(e) => setForm((f) => ({ ...f, strategy_id: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— None —</option>
                    {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Trade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
