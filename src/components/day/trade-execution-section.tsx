"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Plus, X, Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Trash2, ArrowRight, AlertTriangle, Check, Save, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createJournalTrade, deleteJournalTrade, updateJournalTrade } from "@/lib/actions/trading-os";
import { attachTradeScreenshot, deleteScreenshot } from "@/lib/actions/screenshots";
import { ScreenshotUpload } from "@/components/shared/screenshot-upload";
import type { TradingDayFull, JournalTrade, TradeResult } from "@/types/trading-os";
import { PSYCHOLOGY_OPTIONS, DEFAULT_PAIRS, TRADING_SESSIONS } from "@/types/trading-os";

interface Props { day: TradingDayFull; onNext: () => void; }

const ENTRY_MODELS = ["ICT Order Block","Fair Value Gap (FVG)","Market Structure Shift (MSS)","Breaker Block","Mitigation Block","OTE","Liquidity Sweep + Reversal","CISD","Other"];
const RESULT_COLORS: Record<TradeResult, string> = { open:"bg-blue-400/10 text-blue-400 border-blue-400/30", win:"bg-profit/10 text-profit border-profit/30", loss:"bg-loss/10 text-loss border-loss/30", breakeven:"bg-muted text-muted-foreground border-border", cancelled:"bg-muted/50 text-muted-foreground/60 border-border/40" };
function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function calcRR(entry: string, sl: string, tp: string) { const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp); if (!e||!s||!t) return null; const risk = Math.abs(e-s), reward = Math.abs(t-e); return risk===0 ? null : parseFloat((reward/risk).toFixed(2)); }
function calcRiskAmount(account: string, pct: string) { const a = parseFloat(account), r = parseFloat(pct); return (!a||!r) ? null : parseFloat(((a*r)/100).toFixed(2)); }

interface FormData {
  pair: string; direction: "buy"|"sell"; trade_time: string; session: string;
  entry_price: string; stop_loss: string; take_profit: string; lot_size: string; exit_price: string;
  account_size: string; risk_percent: string; result: TradeResult; pnl: string; r_multiple: string;
  entry_model: string; psychology_before: string[]; notes: string;
}
const EMPTY: FormData = { pair:"EURUSD", direction:"buy", trade_time:"", session:"", entry_price:"", stop_loss:"", take_profit:"", lot_size:"", exit_price:"", account_size:"10000", risk_percent:"1", result:"open", pnl:"", r_multiple:"", entry_model:"", psychology_before:[], notes:"" };

// ── TradeCard ────────────────────────────────────────────────
function TradeCard({
  trade,
  onDelete,
  onUpdate,
  onScreenshotChange,
}: {
  trade: JournalTrade;
  onDelete: () => void;
  onUpdate: (updated: Partial<JournalTrade>) => void;
  onScreenshotChange: (id: string, url: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();
  const [del, startDel] = useTransition();
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(trade.screenshot_path ?? null);

  // Edit form state — pre-filled from trade
  const [ef, setEf] = useState({
    pair: trade.pair,
    direction: trade.direction as "buy"|"sell",
    trade_time: trade.trade_time ?? "",
    session: trade.session ?? "",
    entry_price: trade.entry_price?.toString() ?? "",
    stop_loss: trade.stop_loss?.toString() ?? "",
    take_profit: trade.take_profit?.toString() ?? "",
    exit_price: trade.exit_price?.toString() ?? "",
    lot_size: trade.lot_size?.toString() ?? "",
    account_size: trade.account_size?.toString() ?? "",
    risk_percent: trade.risk_percent?.toString() ?? "",
    pnl: trade.pnl?.toString() ?? "",
    r_multiple: trade.r_multiple?.toString() ?? "",
    result: trade.result as TradeResult,
    entry_model: trade.entry_model ?? "",
    notes: trade.notes ?? "",
  });

  const editRR = calcRR(ef.entry_price, ef.stop_loss, ef.take_profit);
  const editRisk = calcRiskAmount(ef.account_size, ef.risk_percent);

  function handleSaveEdit() {
    startSave(async () => {
      const updates = {
        pair: ef.pair,
        direction: ef.direction,
        trade_time: ef.trade_time || null,
        session: ef.session || null,
        entry_price: ef.entry_price ? parseFloat(ef.entry_price) : null,
        stop_loss: ef.stop_loss ? parseFloat(ef.stop_loss) : null,
        take_profit: ef.take_profit ? parseFloat(ef.take_profit) : null,
        exit_price: ef.exit_price ? parseFloat(ef.exit_price) : null,
        lot_size: ef.lot_size ? parseFloat(ef.lot_size) : null,
        account_size: ef.account_size ? parseFloat(ef.account_size) : null,
        risk_percent: ef.risk_percent ? parseFloat(ef.risk_percent) : null,
        risk_amount: editRisk,
        rr_ratio: editRR,
        pnl: ef.pnl ? parseFloat(ef.pnl) : null,
        r_multiple: ef.r_multiple ? parseFloat(ef.r_multiple) : null,
        result: ef.result,
        entry_model: ef.entry_model || null,
        notes: ef.notes || null,
      };
      await updateJournalTrade(trade.id, updates);
      onUpdate(updates);
      setEditing(false);
    });
  }

  async function handleScreenshotUploaded(url: string) {
    setScreenshotUrl(url);
    onScreenshotChange(trade.id, url);
    await updateJournalTrade(trade.id, { screenshot_path: url });
  }

  async function handleScreenshotDeleted() {
    if (screenshotUrl) await deleteScreenshot(screenshotUrl);
    await updateJournalTrade(trade.id, { screenshot_path: null });
    setScreenshotUrl(null);
    onScreenshotChange(trade.id, null);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Row header */}
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left" onClick={() => setExpanded(!expanded)}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold flex-shrink-0">{trade.trade_number ?? "?"}</span>
        <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", trade.direction==="buy"?"bg-profit/10 text-profit":"bg-loss/10 text-loss")}>
          {trade.direction==="buy"?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>} {trade.direction.toUpperCase()}
        </span>
        <span className="font-bold text-sm">{trade.pair}</span>
        {trade.trade_time && <span className="text-xs text-muted-foreground">{trade.trade_time}</span>}
        <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border", RESULT_COLORS[trade.result])}>{trade.result}</span>
        {trade.pnl!=null && <span className={cn("text-sm font-bold tabular-nums ml-2", trade.pnl>=0?"text-profit":"text-loss")}>{trade.pnl>=0?"+":""} ${fmt(Math.abs(trade.pnl))}</span>}
        {trade.r_multiple!=null && <span className="text-xs text-muted-foreground tabular-nums">{trade.r_multiple>=0?"+":""}{fmt(trade.r_multiple)}R</span>}
        {screenshotUrl && <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" title="Has screenshot" />}
        {expanded?<ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>:<ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 bg-accent/10 space-y-4">

          {editing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-4">
              <p className="text-xs font-bold text-primary">Editing Trade #{trade.trade_number}</p>

              {/* Pair + Direction + Time + Session */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Pair</label>
                  <select value={ef.pair} onChange={e=>setEf(f=>({...f,pair:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                    {DEFAULT_PAIRS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Direction</label>
                  <div className="flex gap-1">
                    {(["buy","sell"] as const).map(d=>(
                      <button key={d} onClick={()=>setEf(f=>({...f,direction:d}))} className={cn("flex-1 h-8 rounded-md text-xs font-bold capitalize border transition-colors",ef.direction===d?(d==="buy"?"bg-profit/15 border-profit/50 text-profit":"bg-loss/15 border-loss/50 text-loss"):"border-border text-muted-foreground hover:bg-accent")}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Time</label>
                  <input type="time" value={ef.trade_time} onChange={e=>setEf(f=>({...f,trade_time:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"/>
                </div>
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Session</label>
                  <select value={ef.session} onChange={e=>setEf(f=>({...f,session:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="">—</option>{TRADING_SESSIONS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[["entry_price","Entry"],["stop_loss","SL"],["take_profit","TP"],["exit_price","Exit"],["lot_size","Lots"]].map(([field,label])=>(
                  <div key={field} className="space-y-1"><label className="text-[10px] text-muted-foreground">{label}</label>
                    <input type="number" step="any" value={ef[field as keyof typeof ef] as string} onChange={e=>setEf(f=>({...f,[field]:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"/>
                  </div>
                ))}
              </div>
              {(editRR||editRisk)&&<div className="flex gap-4 text-xs">{editRR&&<span className="text-muted-foreground">R:R = <strong>1:{editRR}</strong></span>}{editRisk&&<span className="text-muted-foreground">Risk $ = <strong>${fmt(editRisk)}</strong></span>}</div>}

              {/* Risk + Outcome */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["account_size","Account $"],["risk_percent","Risk %"],["pnl","P/L ($)"],["r_multiple","R"]].map(([field,label])=>(
                  <div key={field} className="space-y-1"><label className="text-[10px] text-muted-foreground">{label}</label>
                    <input type="number" step="any" value={ef[field as keyof typeof ef] as string} onChange={e=>setEf(f=>({...f,[field]:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"/>
                  </div>
                ))}
              </div>

              {/* Result */}
              <div className="flex flex-wrap gap-1.5">
                {(["open","win","loss","breakeven","cancelled"] as TradeResult[]).map(r=>(
                  <button key={r} onClick={()=>setEf(f=>({...f,result:r}))} className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border transition-colors",ef.result===r?(r==="win"?"bg-profit text-white border-profit":r==="loss"?"bg-loss text-white border-loss":r==="open"?"bg-blue-400 text-white border-blue-400":"bg-muted-foreground text-white border-muted-foreground"):"border-border text-muted-foreground hover:bg-accent")}>{r}</button>
                ))}
              </div>

              {/* Model + Notes */}
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Model</label>
                  <select value={ef.entry_model} onChange={e=>setEf(f=>({...f,entry_model:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="">—</option>{ENTRY_MODELS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Notes</label>
                  <input type="text" value={ef.notes} onChange={e=>setEf(f=>({...f,notes:e.target.value}))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"/>
                </div>
              </div>

              {/* Edit actions */}
              <div className="flex gap-2 justify-end">
                <button onClick={()=>setEditing(false)} className="rounded-md border border-border px-3 h-7 text-xs hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-7 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving?<Loader2 className="h-3 w-3 animate-spin"/>:<Save className="h-3 w-3"/>} Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                {[["Entry",trade.entry_price],["SL",trade.stop_loss],["TP",trade.take_profit],["Exit",trade.exit_price],["Lots",trade.lot_size],["Risk%",trade.risk_percent!=null?`${trade.risk_percent}%`:null],["Risk$",trade.risk_amount!=null?`$${fmt(trade.risk_amount)}`:null],["R:R",trade.rr_ratio!=null?`1:${trade.rr_ratio}`:null]].map(([l,v])=>v!=null?(
                  <div key={l as string}><p className="text-muted-foreground">{l}</p><p className="font-semibold tabular-nums">{String(v)}</p></div>
                ):null)}
              </div>
              {trade.entry_model && <p className="text-xs"><span className="text-muted-foreground">Model: </span><span className="font-medium">{trade.entry_model}</span></p>}
              {trade.session && <p className="text-xs"><span className="text-muted-foreground">Session: </span><span className="font-medium">{trade.session}</span></p>}
              {trade.notes && <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{trade.notes}</p>}
              {trade.psychology_before.length>0 && (
                <div className="flex flex-wrap gap-1">
                  {trade.psychology_before.map((p)=><span key={p} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px]">{p}</span>)}
                </div>
              )}
            </>
          )}

          {/* Screenshot Upload — always visible */}
          {!editing && (
            <ScreenshotUpload
              currentUrl={screenshotUrl}
              folder={`trades/${trade.trading_day_id}`}
              label="Trade Screenshot"
              onUploaded={handleScreenshotUploaded}
              onDeleted={handleScreenshotDeleted}
            />
          )}

          {/* Action row */}
          {!editing && (
            <div className="flex items-center justify-between pt-1">
              <button onClick={()=>setEditing(true)} className="flex items-center gap-1.5 rounded-md px-3 h-7 text-xs font-medium border border-border hover:bg-accent transition-colors">
                <Edit2 className="h-3 w-3"/> Edit
              </button>
              <button
                onClick={() => startDel(async () => { await deleteJournalTrade(trade.id); onDelete(); })}
                disabled={del}
                className="flex items-center gap-1.5 rounded-md px-3 h-7 text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                {del?<Loader2 className="h-3 w-3 animate-spin"/>:<Trash2 className="h-3 w-3"/>} Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TradeExecutionSection ────────────────────────────────────
export function TradeExecutionSection({ day, onNext }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  // Manage trades in local state so delete/add refresh without full page reload
  const [trades, setTrades] = useState<JournalTrade[]>(day.trades);

  const rr = calcRR(form.entry_price, form.stop_loss, form.take_profit);
  const riskAmount = calcRiskAmount(form.account_size, form.risk_percent);
  const hasRevenge = form.psychology_before.includes("Revenge trading");

  function togglePsych(val: string) {
    setForm(f=>({...f,psychology_before:f.psychology_before.includes(val)?f.psychology_before.filter(v=>v!==val):[...f.psychology_before,val]}));
  }

  function handleSubmit() {
    startTransition(async()=>{
      const created = await createJournalTrade(day.id,{
        pair:form.pair, direction:form.direction, trade_date:day.trade_date, trade_time:form.trade_time||null, session:form.session||null,
        entry_price:form.entry_price?parseFloat(form.entry_price):null, stop_loss:form.stop_loss?parseFloat(form.stop_loss):null,
        take_profit:form.take_profit?parseFloat(form.take_profit):null, lot_size:form.lot_size?parseFloat(form.lot_size):null,
        exit_price:form.exit_price?parseFloat(form.exit_price):null, account_size:form.account_size?parseFloat(form.account_size):null,
        risk_percent:form.risk_percent?parseFloat(form.risk_percent):null, risk_amount:riskAmount, rr_ratio:rr,
        result:form.result, pnl:form.pnl?parseFloat(form.pnl):null, r_multiple:form.r_multiple?parseFloat(form.r_multiple):null,
        entry_model:form.entry_model||null, psychology_before:form.psychology_before, notes:form.notes||null,
      });
      if(created){
        setTrades(prev => [...prev, created]);
        setShowForm(false);
        setForm(EMPTY);
      }
    });
  }

  function handleDelete(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id));
  }

  function handleUpdate(id: string, updates: Partial<JournalTrade>) {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function handleScreenshotChange(id: string, url: string | null) {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, screenshot_path: url } : t));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10"><FlaskConical className="h-5 w-5 text-amber-400"/></div>
        <div className="flex-1"><h2 className="text-lg font-bold">Trade Execution</h2><p className="text-xs text-muted-foreground">Log every trade with full details</p></div>
        <button onClick={()=>{setForm(EMPTY);setShowForm(true);}} className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-8 text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5"/> Log Trade
        </button>
      </div>

      {/* Revenge trading warning */}
      {hasRevenge&&showForm&&(
        <div className="rounded-xl border-2 border-loss bg-loss/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-loss flex-shrink-0"/>
          <p className="text-xs font-bold text-loss">⚠ REVENGE TRADING DETECTED — Are you sure you want to take this trade?</p>
        </div>
      )}

      {/* New trade form */}
      {showForm&&(
        <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">New Trade — #{trades.length+1}</p>
            <button onClick={()=>setShowForm(false)} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="h-4 w-4"/></button>
          </div>
          {/* Pair + Direction + Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Pair</label>
              <select value={form.pair} onChange={e=>setForm(f=>({...f,pair:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {DEFAULT_PAIRS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Direction</label>
              <div className="flex gap-2">
                {(["buy","sell"] as const).map(d=>(
                  <button key={d} onClick={()=>setForm(f=>({...f,direction:d}))} className={cn("flex-1 h-9 rounded-md text-sm font-bold capitalize border transition-colors",form.direction===d?(d==="buy"?"bg-profit/15 border-profit/50 text-profit":"bg-loss/15 border-loss/50 text-loss"):"border-border text-muted-foreground hover:bg-accent")}>{d}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Time (UTC)</label>
              <input type="time" value={form.trade_time} onChange={e=>setForm(f=>({...f,trade_time:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
            </div>
            <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Session</label>
              <select value={form.session} onChange={e=>setForm(f=>({...f,session:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— Select —</option>{TRADING_SESSIONS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {/* Prices */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Levels</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[["entry_price","Entry"],["stop_loss","Stop Loss"],["take_profit","Take Profit"],["exit_price","Exit"],["lot_size","Lots"]].map(([field,label])=>(
                <div key={field} className="space-y-1"><label className="text-[10px] text-muted-foreground">{label}</label>
                  <input type="number" step="any" placeholder="0.00000" value={form[field as keyof FormData] as string} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
                </div>
              ))}
            </div>
            {(rr||riskAmount)&&<div className="mt-2 flex gap-4 text-xs">{rr&&<span className="text-muted-foreground">R:R = <strong className="text-foreground">1:{rr}</strong></span>}{riskAmount&&<span className="text-muted-foreground">Risk $ = <strong className="text-foreground">${fmt(riskAmount)}</strong></span>}</div>}
          </div>
          {/* Risk & Outcome */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk & Outcome</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[["account_size","Account $"],["risk_percent","Risk %"],["pnl","P/L ($)"],["r_multiple","R Multiple"]].map(([field,label])=>(
                <div key={field} className="space-y-1"><label className="text-[10px] text-muted-foreground">{label}</label>
                  <input type="number" step="any" value={form[field as keyof FormData] as string} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["open","win","loss","breakeven","cancelled"] as TradeResult[]).map(r=>(
                <button key={r} onClick={()=>setForm(f=>({...f,result:r}))} className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize border transition-colors",form.result===r?(r==="win"?"bg-profit text-white border-profit":r==="loss"?"bg-loss text-white border-loss":r==="open"?"bg-blue-400 text-white border-blue-400":"bg-muted-foreground text-white border-muted-foreground"):"border-border text-muted-foreground hover:bg-accent")}>{r}</button>
              ))}
            </div>
          </div>
          {/* Entry model */}
          <div className="space-y-1"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Model</label>
            <select value={form.entry_model} onChange={e=>setForm(f=>({...f,entry_model:e.target.value}))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Select model —</option>{ENTRY_MODELS.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          {/* Psychology */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Psychology Before</p>
            <div className="flex flex-wrap gap-1.5">
              {PSYCHOLOGY_OPTIONS.map(p=>(
                <button key={p} onClick={()=>togglePsych(p)} className={cn("px-2.5 py-1 rounded-full text-xs border transition-colors",form.psychology_before.includes(p)?(["Revenge trading","Anxious","Angry","Fearful","Greedy"].includes(p)?"bg-loss/15 border-loss/40 text-loss":"bg-primary/15 border-primary/40 text-primary"):"border-border text-muted-foreground hover:bg-accent")}>{p}</button>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div className="space-y-1"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Setup context, execution notes..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"/>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setShowForm(false)} className="rounded-md border border-border px-4 h-9 text-sm hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={isPending||!form.pair} className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 ml-auto">
              {isPending?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>} Save Trade
            </button>
          </div>
        </div>
      )}

      {/* Trade list */}
      <div className="space-y-2">
        {trades.length > 0 ? trades.map(t => (
          <TradeCard
            key={t.id}
            trade={t}
            onDelete={() => handleDelete(t.id)}
            onUpdate={(updates) => handleUpdate(t.id, updates)}
            onScreenshotChange={handleScreenshotChange}
          />
        )) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <FlaskConical className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
            <p className="text-sm text-muted-foreground">No trades logged today</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onNext} className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors">
          Continue to Post-Trade Review <ArrowRight className="h-3.5 w-3.5"/>
        </button>
      </div>
    </div>
  );
}


interface Props { day: TradingDayFull; onNext: () => void; }

const ENTRY_MODELS = ["ICT Order Block","Fair Value Gap (FVG)","Market Structure Shift (MSS)","Breaker Block","Mitigation Block","OTE","Liquidity Sweep + Reversal","CISD","Other"];
const RESULT_COLORS: Record<TradeResult, string> = { open:"bg-blue-400/10 text-blue-400 border-blue-400/30", win:"bg-profit/10 text-profit border-profit/30", loss:"bg-loss/10 text-loss border-loss/30", breakeven:"bg-muted text-muted-foreground border-border", cancelled:"bg-muted/50 text-muted-foreground/60 border-border/40" };
function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function calcRR(entry: string, sl: string, tp: string) { const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp); if (!e||!s||!t) return null; const risk = Math.abs(e-s), reward = Math.abs(t-e); return risk===0 ? null : parseFloat((reward/risk).toFixed(2)); }
function calcRiskAmount(account: string, pct: string) { const a = parseFloat(account), r = parseFloat(pct); return (!a||!r) ? null : parseFloat(((a*r)/100).toFixed(2)); }

interface FormData {
  pair: string; direction: "buy"|"sell"; trade_time: string; session: string;
  entry_price: string; stop_loss: string; take_profit: string; lot_size: string; exit_price: string;
  account_size: string; risk_percent: string; result: TradeResult; pnl: string; r_multiple: string;
  entry_model: string; psychology_before: string[]; notes: string;
}
const EMPTY: FormData = { pair:"EURUSD", direction:"buy", trade_time:"", session:"", entry_price:"", stop_loss:"", take_profit:"", lot_size:"", exit_price:"", account_size:"10000", risk_percent:"1", result:"open", pnl:"", r_multiple:"", entry_model:"", psychology_before:[], notes:"" };

function TradeCard({ trade, onDelete }: { trade: JournalTrade; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [del, startDel] = useTransition();
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left" onClick={() => setExpanded(!expanded)}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold flex-shrink-0">{trade.trade_number ?? "?"}</span>
        <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", trade.direction==="buy"?"bg-profit/10 text-profit":"bg-loss/10 text-loss")}>
          {trade.direction==="buy"?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>} {trade.direction.toUpperCase()}
        </span>
        <span className="font-bold text-sm">{trade.pair}</span>
        {trade.trade_time && <span className="text-xs text-muted-foreground">{trade.trade_time}</span>}
        <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border", RESULT_COLORS[trade.result])}>{trade.result}</span>
        {trade.pnl!=null && <span className={cn("text-sm font-bold tabular-nums ml-2", trade.pnl>=0?"text-profit":"text-loss")}>{trade.pnl>=0?"+":""} ${fmt(Math.abs(trade.pnl))}</span>}
        {trade.r_multiple!=null && <span className="text-xs text-muted-foreground tabular-nums">{trade.r_multiple>=0?"+":""}{fmt(trade.r_multiple)}R</span>}
        {expanded?<ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>:<ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-accent/10 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
            {[["Entry",trade.entry_price],["SL",trade.stop_loss],["TP",trade.take_profit],["Exit",trade.exit_price],["Lots",trade.lot_size],["Risk%",trade.risk_percent!=null?`${trade.risk_percent}%`:null],["Risk$",trade.risk_amount!=null?`$${fmt(trade.risk_amount)}`:null],["R:R",trade.rr_ratio!=null?`1:${trade.rr_ratio}`:null]].map(([l,v])=>v!=null?(
              <div key={l as string}><p className="text-muted-foreground">{l}</p><p className="font-semibold tabular-nums">{String(v)}</p></div>
            ):null)}
          </div>
          {trade.entry_model && <p className="text-xs"><span className="text-muted-foreground">Model: </span><span className="font-medium">{trade.entry_model}</span></p>}
          {trade.notes && <p className="text-xs text-muted-foreground italic">{trade.notes}</p>}
          {trade.psychology_before.length>0 && <div className="flex flex-wrap gap-1">{trade.psychology_before.map((p)=><span key={p} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px]">{p}</span>)}</div>}
          <div className="flex justify-end">
            <button onClick={()=>startDel(async()=>{await deleteJournalTrade(trade.id);onDelete();})} disabled={del} className="flex items-center gap-1.5 rounded-md px-3 h-7 text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
              {del?<Loader2 className="h-3 w-3 animate-spin"/>:<Trash2 className="h-3 w-3"/>} Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
