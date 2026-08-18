import { getSimulatedTradeById } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowLeft, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = { title: "Trade Detail — TradeOS" };

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  if (!value && value !== 0) return null;
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await getSimulatedTradeById(id);
  if (!trade) notFound();

  const pnlPositive = (trade.pnl ?? 0) >= 0;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/journal" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{trade.instrument}</h1>
            <span className={cn("text-xs font-semibold rounded px-2 py-0.5", trade.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
              {trade.direction.toUpperCase()}
            </span>
            <span className={cn(
              "text-xs font-semibold rounded-full px-2 py-0.5",
              trade.result === "win" && "bg-profit/15 text-profit",
              trade.result === "loss" && "bg-loss/15 text-loss",
              trade.result === "breakeven" && "bg-muted text-muted-foreground",
              trade.result === "pending" && "bg-primary/10 text-primary",
            )}>
              {trade.result.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {trade.trade_date}{trade.session ? ` · ${trade.session}` : ""}{trade.timeframe ? ` · ${trade.timeframe}` : ""}{trade.is_backtest ? " · Backtest" : " · Live Sim"}
          </p>
        </div>
        {trade.pnl != null && (
          <p className={cn("text-2xl font-bold tabular-nums", pnlPositive ? "text-profit" : "text-loss")}>
            {pnlPositive ? "+" : ""}${fmt(Math.abs(trade.pnl))}
          </p>
        )}
      </div>

      {/* P/L Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Entry", value: trade.entry_price != null ? fmt(trade.entry_price, 5) : "—" },
          { label: "Stop Loss", value: trade.stop_loss != null ? fmt(trade.stop_loss, 5) : "—" },
          { label: "Take Profit", value: trade.take_profit != null ? fmt(trade.take_profit, 5) : "—" },
          { label: "Exit", value: trade.exit_price != null ? fmt(trade.exit_price, 5) : "—" },
          { label: "R Multiple", value: trade.r_multiple != null ? `${trade.r_multiple >= 0 ? "+" : ""}${fmt(trade.r_multiple)}R` : "—" },
          { label: "Risk %", value: trade.risk_percentage != null ? `${fmt(trade.risk_percentage)}%` : "—" },
          { label: "Account Size", value: trade.account_size != null ? `$${fmt(trade.account_size, 0)}` : "—" },
          { label: "Risk Amount", value: trade.risk_amount != null ? `$${fmt(trade.risk_amount)}` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Notes section */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trade Notes</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Setup Notes" value={trade.setup_notes} />
          <Field label="Reason for Entry" value={trade.reason_for_entry} />
          <Field label="What went well" value={trade.what_went_well} className="text-profit" />
          <Field label="What went wrong" value={trade.what_went_wrong} className="text-loss" />
          <Field label="Lesson Learned" value={trade.lesson_learned} />
        </div>
      </div>

      {/* Discipline */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discipline Check</p>
        <div className="flex flex-wrap gap-2">
          {trade.followed_plan != null && (
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", trade.followed_plan ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
              Plan: {trade.followed_plan ? "✓ Followed" : "✗ Broke"}
            </span>
          )}
          {trade.broke_rules && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-loss/10 text-loss">
              ✗ Rules violated{trade.rule_notes ? `: ${trade.rule_notes}` : ""}
            </span>
          )}
          {trade.psychology_before?.length > 0 && (
            <div className="w-full">
              <p className="text-[10px] text-muted-foreground mb-1">Psychology Before</p>
              <div className="flex flex-wrap gap-1">
                {(trade.psychology_before as string[]).map((p) => (
                  <span key={p} className="rounded-full border border-border px-2 py-0.5 text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
