"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Edit2, Save, X, Loader2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeOsRule } from "@/types/trading-os";
import { createAdminClient, getSingleUserId } from "@/lib/supabase/admin";
import { useRouter } from "next/navigation";

interface Props { rules: TradeOsRule[]; }

const SECTIONS = [
  { value: "setup",          label: "Trade Setup",     color: "text-purple-400 bg-purple-400/10" },
  { value: "entry",          label: "Entry",           color: "text-blue-400 bg-blue-400/10" },
  { value: "psychology",     label: "Psychology",      color: "text-pink-400 bg-pink-400/10" },
  { value: "pre_market",     label: "Pre-Market",      color: "text-primary bg-primary/10" },
  { value: "no_trade_filter",label: "No-Trade Filter", color: "text-loss bg-loss/10" },
  { value: "general",        label: "General",         color: "text-muted-foreground bg-muted" },
];

const EMPTY_FORM = { section: "setup", name: "", description: "", rule_type: "hard" as "hard" | "soft" };

export function TradeOsRulesEditor({ rules: initial }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const db = createAdminClient() as any;
  const userId = getSingleUserId();

  async function refreshRules() {
    const { data } = await db.from("trade_os_rules").select("*").eq("user_id", userId).order("section").order("sort_order");
    if (data) setRules(data as TradeOsRule[]);
  }

  function handleAdd() {
    startTransition(async () => {
      const maxOrder = rules.filter(r => r.section === form.section).reduce((m, r) => Math.max(m, r.sort_order), 0);
      await db.from("trade_os_rules").insert({ ...form, user_id: userId, sort_order: maxOrder + 1 });
      await refreshRules();
      setShowAdd(false);
      setForm(EMPTY_FORM);
    });
  }

  function handleEdit(rule: TradeOsRule) {
    setEditingId(rule.id);
    setEditForm({ section: rule.section, name: rule.name, description: rule.description ?? "", rule_type: rule.rule_type });
  }

  function handleUpdate() {
    startTransition(async () => {
      await db.from("trade_os_rules").update(editForm).eq("id", editingId!);
      await refreshRules();
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await db.from("trade_os_rules").delete().eq("id", id);
      setRules(prev => prev.filter(r => r.id !== id));
    });
  }

  async function handleToggle(rule: TradeOsRule) {
    await db.from("trade_os_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  }

  // Group by section
  const grouped = SECTIONS.map(sec => ({
    ...sec,
    rules: rules.filter(r => r.section === sec.value),
  })).filter(g => g.rules.length > 0 || showAdd);

  return (
    <div className="space-y-5">
      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Rule</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Section</label>
              <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Type</label>
              <div className="flex gap-2">
                {(["hard","soft"] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, rule_type: t }))}
                    className={cn("flex-1 h-9 rounded-md text-sm font-bold capitalize border transition-colors",
                      form.rule_type === t ? (t==="hard"?"bg-loss/15 border-loss/40 text-loss":"bg-amber-400/15 border-amber-400/40 text-amber-400") : "border-border text-muted-foreground hover:bg-accent")}>
                    {t === "hard" ? "⛔ Hard" : "⚠ Soft"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Rule Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Liquidity swept before entry"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
          </div>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Description (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explanation or guidance..."
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"/>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 h-8 text-xs hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={isPending || !form.name}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-8 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3 w-3"/>} Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules by section */}
      {SECTIONS.map(sec => {
        const sectionRules = rules.filter(r => r.section === sec.value);
        if (sectionRules.length === 0) return null;
        return (
          <div key={sec.value}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", sec.color)}>{sec.label}</span>
              <span className="text-xs text-muted-foreground">{sectionRules.length} rule{sectionRules.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1.5">
              {sectionRules.map(rule => (
                <div key={rule.id} className={cn("rounded-xl border p-3 transition-colors", rule.is_active ? "border-border bg-card" : "border-border/40 bg-card/50 opacity-60")}>
                  {editingId === rule.id ? (
                    <div className="space-y-2">
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"/>
                      <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..."
                        className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground"/>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="rounded border border-border px-3 h-7 text-xs hover:bg-accent transition-colors">Cancel</button>
                        <button onClick={handleUpdate} disabled={isPending}
                          className="flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 h-7 text-xs font-semibold disabled:opacity-50">
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{rule.name}</p>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider flex-shrink-0",
                            rule.rule_type === "hard" ? "bg-loss/10 text-loss" : "bg-amber-400/10 text-amber-400")}>
                            {rule.rule_type}
                          </span>
                        </div>
                        {rule.description && <p className="text-xs text-muted-foreground truncate">{rule.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleToggle(rule)} className={cn("h-5 w-9 rounded-full border-2 transition-colors relative",
                          rule.is_active ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30")}>
                          <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform", rule.is_active ? "left-[18px]" : "left-0.5")}/>
                        </button>
                        <button onClick={() => handleEdit(rule)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="h-3 w-3"/>
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1 rounded hover:bg-loss/10 text-muted-foreground hover:text-loss transition-colors">
                          <Trash2 className="h-3 w-3"/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {rules.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No rules yet — click "Add Rule" to create your first rule.</p>
        </div>
      )}
    </div>
  );
}
