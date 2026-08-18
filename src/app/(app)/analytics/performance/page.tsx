import { getJournalTrades, getPostTradeReviews } from "@/lib/data/trading-os-queries";
import { getRiskSettings } from "@/lib/data/queries";
import { PerformanceDashboard } from "@/components/analytics/performance-dashboard";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Performance Analytics — Trade OS" };

export default async function PerformancePage() {
  const [trades, reviews, riskSettings] = await Promise.all([
    getJournalTrades(),
    getPostTradeReviews(),
    getRiskSettings(),
  ]);

  // Map journal_trades to the shape PerformanceDashboard expects
  const mapped = trades.map(t => ({
    id: t.id,
    instrument: t.pair,
    trade_date: t.trade_date,
    result: t.result === "open" ? "pending" : t.result,
    pnl: t.pnl,
    r_multiple: t.r_multiple,
    risk_reward_ratio: t.rr_ratio,
    psychology_before: t.psychology_before,
    followed_plan: t.followed_setup,
    followed_strategy: t.followed_risk_rules,
    broke_rules: t.followed_risk_rules === false,
    session: t.session,
    direction: t.direction === "buy" ? "long" : "short",
    timeframe: null,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
          <BarChart3 className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground">Real statistics from your journal trades</p>
        </div>
      </div>
      <PerformanceDashboard trades={mapped as any} currency={riskSettings?.currency ?? "USD"} />
    </div>
  );
}
