"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RiskSettings } from "@/types/database";
import { saveRiskSettings } from "@/lib/actions/settings";

interface Props {
  initialSettings: RiskSettings | null;
}

export function PreferencesForm({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    max_risk_per_trade: String(initialSettings?.max_risk_per_trade ?? 1),
    max_daily_risk: String(initialSettings?.max_daily_risk ?? 3),
    max_trades_per_day: String(initialSettings?.max_trades_per_day ?? 3),
    min_rr: String(initialSettings?.min_rr ?? 2),
    default_account_size: String(initialSettings?.default_account_size ?? 10000),
    currency: initialSettings?.currency ?? "USD",
  });

  function field(key: keyof typeof form, label: string, type: "number" | "text" = "number", help?: string) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
        <Input
          type={type}
          step={type === "number" ? "any" : undefined}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="h-10"
        />
      </div>
    );
  }

  function handleSave() {
    startTransition(async () => {
      await saveRiskSettings({
        max_risk_per_trade: parseFloat(form.max_risk_per_trade) || 1,
        max_daily_risk: parseFloat(form.max_daily_risk) || 3,
        max_trades_per_day: parseInt(form.max_trades_per_day) || 3,
        min_rr: parseFloat(form.min_rr) || 2,
        default_account_size: parseFloat(form.default_account_size) || 10000,
        currency: form.currency,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-5 border-b border-border">
        <p className="text-sm font-semibold">Risk Parameters</p>
        <p className="text-xs text-muted-foreground mt-0.5">These defaults pre-fill the Risk Calculator and appear on the Dashboard.</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {field("max_risk_per_trade", "Max Risk per Trade (%)", "number", "e.g. 1 = 1% of account")}
          {field("max_daily_risk", "Max Daily Risk (%)", "number", "Hard stop for the day")}
          {field("max_trades_per_day", "Max Trades per Day", "number", "0 = unlimited")}
          {field("min_rr", "Minimum R:R Ratio", "number", "e.g. 2 = 1:2 minimum")}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field("default_account_size", "Default Account Size", "number", "Used in risk calculations")}
          <div className="space-y-1.5">
            <Label className="text-sm">Currency</Label>
            <p className="text-xs text-muted-foreground">Display currency for P/L values</p>
            <div className="flex gap-2 mt-1">
              {["USD", "EUR", "GBP"].map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  className={`flex-1 h-10 rounded-md text-sm font-medium border transition-colors ${
                    form.currency === c
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-border flex items-center justify-between">
        {saved ? (
          <span className="flex items-center gap-1.5 text-sm text-profit">
            <CheckCircle2 className="h-4 w-4" /> Settings saved
          </span>
        ) : <span />}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
