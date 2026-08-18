"use client";

import { useState, useTransition } from "react";
import {
  Newspaper, Plus, Trash2, AlertTriangle, Edit2,
  X, Check, Loader2, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createNewsEvent, updateNewsEvent, deleteNewsEvent } from "@/lib/actions/trading-os";
import type { TradingDayFull, NewsEvent, NewsImpact } from "@/types/trading-os";

interface Props {
  day: TradingDayFull;
  onNext: () => void;
}

const IMPACT_COLORS: Record<NewsImpact, string> = {
  high: "text-loss bg-loss/10 border-loss/30",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low: "text-profit bg-profit/10 border-profit/30",
};

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "NZD", "CAD", "CNY"];

const EMPTY_FORM = {
  event_time: "",
  currency: "USD",
  event_name: "",
  impact: "high" as NewsImpact,
  forecast: "",
  previous: "",
  actual: "",
  notes: "",
};

export function NewsSection({ day, onNext }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const highImpact = day.news_events.filter((e) => e.impact === "high");

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(event: NewsEvent) {
    setForm({
      event_time: event.event_time ?? "",
      currency: event.currency,
      event_name: event.event_name,
      impact: event.impact,
      forecast: event.forecast ?? "",
      previous: event.previous ?? "",
      actual: event.actual ?? "",
      notes: event.notes ?? "",
    });
    setEditingId(event.id);
    setShowForm(true);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        event_time: form.event_time as `${string}:${string}`,
        currency: form.currency,
        event_name: form.event_name,
        impact: form.impact,
        forecast: form.forecast || null,
        previous: form.previous || null,
        actual: form.actual || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await updateNewsEvent(editingId, payload);
      } else {
        await createNewsEvent(day.id, payload);
      }
      setShowForm(false);
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNewsEvent(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
          <Newspaper className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">News Events</h2>
          <p className="text-xs text-muted-foreground">Log economic events for today's session</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-8 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Event
        </button>
      </div>

      {/* High impact warning */}
      {highImpact.length > 0 && (
        <div className="rounded-xl border border-loss/30 bg-loss/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-loss">
                HIGH-IMPACT NEWS TODAY — AVOID NEW POSITIONS AROUND THESE EVENTS
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {highImpact.map((e) => (
                  <span key={e.id} className="text-[10px] font-semibold text-loss bg-loss/10 rounded px-2 py-0.5">
                    {e.event_time} {e.currency} {e.event_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            {editingId ? "Edit Event" : "Add News Event"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Time (UTC)</label>
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Event Name</label>
              <input
                type="text"
                value={form.event_name}
                onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
                placeholder="e.g. CPI, NFP, FOMC"
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Impact</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as NewsImpact[]).map((imp) => (
                <button
                  key={imp}
                  onClick={() => setForm((f) => ({ ...f, impact: imp }))}
                  className={cn(
                    "px-3 h-7 rounded-md text-xs font-bold uppercase border transition-colors capitalize",
                    form.impact === imp
                      ? imp === "high" ? "bg-loss text-white border-loss" : imp === "medium" ? "bg-amber-400 text-black border-amber-400" : "bg-profit text-white border-profit"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {imp}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["forecast", "previous", "actual"].map((f) => (
              <div key={f} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{f}</label>
                <input
                  type="text"
                  value={form[f as keyof typeof form] as string}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))}
                  placeholder="—"
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Trading implications..."
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-xs hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !form.event_name || !form.event_time}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-8 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {day.news_events.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Time", "Currency", "Event", "Impact", "Forecast", "Previous", "Actual", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {day.news_events.map((event) => (
                <tr key={event.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono tabular-nums">{event.event_time}</td>
                  <td className="px-3 py-2.5 text-xs font-bold">{event.currency}</td>
                  <td className="px-3 py-2.5 text-xs font-medium">
                    {event.event_name}
                    {event.notes && <span className="block text-[10px] text-muted-foreground">{event.notes}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border", IMPACT_COLORS[event.impact])}>
                      {event.impact}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{event.forecast ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{event.previous ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{event.actual ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(event)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-1 rounded hover:bg-loss/10 text-muted-foreground hover:text-loss transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No news events added yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add economic calendar events manually — API integration can be connected later
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Continue to Market Analysis
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
