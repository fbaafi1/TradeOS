"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Edit2, Save, X, Loader2, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoTradeCondition } from "@/types/trading-os";
import { createClient } from "@/lib/supabase/client";

interface Props { conditions: NoTradeCondition[]; }

const EMPTY_FORM = { name: "", description: "", is_hard_block: true, is_auto_detected: false };

export function NoTradeConditionsEditor({ conditions: initial }: Props) {
  const [conditions, setConditions] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  // RLS is disabled — anon key can read/write freely (single-user mode)
  const db = createClient() as any;
  const userId = process.env.NEXT_PUBLIC_SINGLE_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  async function refresh() {
    const { data } = await db.from("no_trade_conditions").select("*").eq("user_id", userId).order("sort_order");
    if (data) setConditions(data as NoTradeCondition[]);
  }

  function handleAdd() {
    startTransition(async () => {
      const maxOrder = conditions.reduce((m, c) => Math.max(m, c.sort_order), 0);
      await db.from("no_trade_conditions").insert({ ...form, user_id: userId, sort_order: maxOrder + 1 });
      await refresh();
      setShowAdd(false);
      setForm(EMPTY_FORM);
    });
  }

  function handleUpdate() {
    startTransition(async () => {
      await db.from("no_trade_conditions").update(editForm).eq("id", editingId!);
      await refresh();
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await db.from("no_trade_conditions").delete().eq("id", id);
      setConditions(prev => prev.filter(c => c.id !== id));
    });
  }

  async function handleToggle(cond: NoTradeCondition) {
    await db.from("no_trade_conditions").update({ is_active: !cond.is_active }).eq("id", cond.id);
    setConditions(prev => prev.map(c => c.id === cond.id ? { ...c, is_active: !c.is_active } : c));
  }

  const hardBlocks = conditions.filter(c => c.is_hard_block);
  const softBlocks = conditions.filter(c => !c.is_hard_block);

  function ConditionRow({ cond }: { cond: NoTradeCondition }) {
    return (
      <div className={cn("rounded-xl border p-3 transition-colors", cond.is_active ? "border-border bg-card" : "border-border/40 bg-card/50 opacity-60")}>
        {editingId === cond.id ? (
          <div className="space-y-2">
            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"/>
            <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..."
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"/>
            <div className="flex gap-2 flex-wrap">
              {(["hard","soft"] as const).map(t => (
                <button key={t} onClick={() => setEditForm(f => ({ ...f, is_hard_block: t === "hard" }))}
                  className={cn("px-3 h-7 rounded-md text-xs font-bold border transition-colors",
                    (t === "hard") === editForm.is_hard_block ? (t === "hard" ? "bg-loss/15 border-loss/40 text-loss" : "bg-amber-400/15 border-amber-400/40 text-amber-400") : "border-border text-muted-foreground hover:bg-accent")}>
                  {t === "hard" ? "⛔ Hard Block" : "⚠ Soft Warning"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingId(null)} className="rounded border border-border px-3 h-7 text-xs hover:bg-accent">Cancel</button>
              <button onClick={handleUpdate} disabled={isPending}
                className="flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 h-7 text-xs font-semibold disabled:opacity-50">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{cond.name}</p>
                {cond.is_auto_detected && (
                  <span className="rounded-full bg-blue-400/10 px-1.5 py-0.5 text-[9px] text-blue-400 uppercase tracking-wider flex items-center gap-0.5">
                    <Info className="h-2.5 w-2.5"/> AUTO
                  </span>
                )}
              </div>
              {cond.description && <p className="text-xs text-muted-foreground truncate">{cond.description}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => handleToggle(cond)} className={cn("h-5 w-9 rounded-full border-2 transition-colors relative",
                cond.is_active ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform", cond.is_active ? "left-[18px]" : "left-0.5")}/>
              </button>
              <button onClick={() => { setEditingId(cond.id); setEditForm({ name: cond.name, description: cond.description ?? "", is_hard_block: cond.is_hard_block, is_auto_detected: cond.is_auto_detected }); }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <Edit2 className="h-3 w-3"/>
              </button>
              <button onClick={() => handleDelete(cond.id)} disabled={cond.is_auto_detected}
                className="p-1 rounded hover:bg-loss/10 text-muted-foreground hover:text-loss transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <Trash2 className="h-3 w-3"/>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5"/> Add Condition
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">New No-Trade Condition</p>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Condition Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Heavy spread widening"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
          </div>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="When does this apply?"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
          </div>
          <div className="flex gap-2">
            {(["hard","soft"] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, is_hard_block: t === "hard" }))}
                className={cn("flex-1 h-9 rounded-md text-sm font-bold border transition-colors",
                  (t === "hard") === form.is_hard_block ? (t === "hard" ? "bg-loss/15 border-loss/40 text-loss" : "bg-amber-400/15 border-amber-400/40 text-amber-400") : "border-border text-muted-foreground hover:bg-accent")}>
                {t === "hard" ? "⛔ Hard Block" : "⚠ Soft Warning"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 h-8 text-xs hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={isPending || !form.name}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-8 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3 w-3"/>} Add
            </button>
          </div>
        </div>
      )}

      {hardBlocks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-loss/10 text-loss">⛔ Hard Blocks</span>
            <p className="text-xs text-muted-foreground">These prevent trading when triggered</p>
          </div>
          <div className="space-y-1.5">{hardBlocks.map(c => <ConditionRow key={c.id} cond={c}/>)}</div>
        </div>
      )}
      {softBlocks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400">⚠ Soft Warnings</span>
            <p className="text-xs text-muted-foreground">These warn but don't block trading</p>
          </div>
          <div className="space-y-1.5">{softBlocks.map(c => <ConditionRow key={c.id} cond={c}/>)}</div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 flex-shrink-0"/>
          Conditions marked <span className="text-blue-400 font-semibold">AUTO</span> are detected automatically based on the current date and losing streak. They cannot be deleted.
        </p>
      </div>
    </div>
  );
}
