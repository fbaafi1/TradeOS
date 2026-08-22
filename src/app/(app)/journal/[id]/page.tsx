import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowLeft, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalTrade, TradeResult } from "@/types/trading-os";

export const metadata = { title: "Trade Detail — Trade OS" };

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const RESULT_STYLES: Record<TradeResult, string> = {
  open: "bg-blue-400/15 text-blue-400",
  win: "bg-profit/15 text-profit",
  loss: "bg-loss/15 text-loss",
  breakeven: "bg-muted text-muted-foreground",
  cancelled: "bg-muted/50 text-muted-foreground/50",
};

async function getJournalTrade(id: string): Promise<JournalTrade | null> {
  const db = createAdminClient() as any;
  const { data } = await db.from("journal_trades").select("*").eq("id", id).single();
  return data as JournalTrade | null;
}

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await getJournalTrade(id);
  if (!trade) notFound();

  const pnlPositive = (trade.pnl ?? 0) >= 0;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/journal" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{trade.pair}</h1>
            <span className={cn("text-xs font-semibold rounded px-2 py-0.5",
              trade.direction === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
            )}>
              {trade.direction === "buy"
                ? <><TrendingUp className="h-3 w-3 inline mr-1"/>BUY</>
                : <><TrendingDown className="h-3 w-3 inline mr-1"/>SELL</>}
            </span>
            <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5 capitalize", RESULT_STYLES[trade.result])}>
              {trade.result}
            </span>
            {trade.entry_model && (
              <span className="text-xs text-muted-foreground">{trade.entry_model}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(trade.trade_date + "T00:00:00Z").toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric", timeZone:"UTC" })}
            {trade.trade_time && ` · ${trade.trade_time} UTC`}
            {trade.session && ` · ${trade.session}`}
            {trade.trade_number && ` · Trade #${trade.trade_number}`}
          </p>
        </div>
        <div className="text-right">
          {trade.pnl != null && (
            <p className={cn("text-2xl font-bold tabular-nums", pnlPositive ? "text-profit" : "text-loss")}>
              {pnlPositive ? "+" : ""}${fmt(Math.abs(trade.pnl))}
            </p>
          )}
          {trade.r_multiple != null && (
            <p className={cn("text-sm font-semibold tabular-nums", trade.r_multiple >= 0 ? "text-profit" : "text-loss")}>
              {trade.r_multiple >= 0 ? "+" : ""}{fmt(trade.r_multiple)}R
            </p>
          )}
        </div>
      </div>

      {/* Back to day link */}
      <Link href={`/day/${trade.trade_date}`}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors">
        <ExternalLink className="h-3 w-3" /> Open day session for {trade.trade_date}
      </Link>

      {/* Price grid */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price Levels</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Entry", value: trade.entry_price },
            { label: "Stop Loss", value: trade.stop_loss },
            { label: "Take Profit", value: trade.take_profit },
            { label: "Exit", value: trade.exit_price },
            { label: "Lot Size", value: trade.lot_size },
            { label: "R:R", value: trade.rr_ratio != null ? `1:${trade.rr_ratio}` : null },
            { label: "Risk %", value: trade.risk_percent != null ? `${trade.risk_percent}%` : null },
            { label: "Risk $", value: trade.risk_amount != null ? `$${fmt(trade.risk_amount)}` : null },
            { label: "Account", value: trade.account_size != null ? `$${fmt(trade.account_size, 0)}` : null },
          ].filter(f => f.value != null).map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-background p-2.5">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      {trade.screenshot_path && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Screenshot</p>
          <a href={trade.screenshot_path} target="_blank" rel="noopener noreferrer">
            <img src={trade.screenshot_path} alt="Trade screenshot"
              className="w-full rounded-lg border border-border object-contain max-h-80 hover:opacity-90 transition-opacity" />
          </a>
        </div>
      )}

      {/* Psychology */}
      {(trade.psychology_before?.length > 0 || trade.psychology_during || trade.psychology_after) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Psychology</p>
          {trade.psychology_before?.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">Before</p>
              <div className="flex flex-wrap gap-1.5">
                {trade.psychology_before.map((p) => (
                  <span key={p} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}
          {trade.psychology_during && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">During</p>
              <p className="text-sm">{trade.psychology_during}</p>
            </div>
          )}
          {trade.psychology_after && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">After</p>
              <p className="text-sm">{trade.psychology_after}</p>
            </div>
          )}
        </div>
      )}

      {/* Discipline flags */}
      {(trade.followed_setup !== null || trade.followed_risk_rules !== null || trade.correct_location !== null ||
        trade.waited_for_confirmation !== null || trade.managed_correctly !== null || trade.trade_category) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discipline Review</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Followed Setup", value: trade.followed_setup },
              { label: "Followed Risk Rules", value: trade.followed_risk_rules },
              { label: "Correct Location", value: trade.correct_location },
              { label: "Waited for Confirmation", value: trade.waited_for_confirmation },
              { label: "Managed Correctly", value: trade.managed_correctly },
            ].filter(f => f.value !== null).map(({ label, value }) => (
              <div key={label} className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                value ? "border-profit/30 bg-profit/5 text-profit" : "border-loss/30 bg-loss/5 text-loss"
              )}>
                {value ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                {label}
              </div>
            ))}
          </div>
          {trade.trade_category && (
            <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize",
              trade.trade_category.includes("bad") ? "bg-loss/10 text-loss" : "bg-profit/10 text-profit"
            )}>
              {trade.trade_category.replace(/_/g, " ")}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {trade.notes && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{trade.notes}</p>
        </div>
      )}

      {/* Win/Loss analysis */}
      {trade.win_loss_cause && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win/Loss Cause</p>
          <p className="text-sm capitalize">{trade.win_loss_cause}</p>
        </div>
      )}
    </div>
  );
}
