import { getAllTradeOsRules } from "@/lib/data/trading-os-queries";
import { TradeOsRulesEditor } from "@/components/settings/trade-os-rules-editor";
import { Target } from "lucide-react";

export const metadata = { title: "Trade OS Rules — TradeOS" };

export default async function TradeOsRulesPage() {
  const rules = await getAllTradeOsRules();
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Trade OS Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure the rules used in your daily setup validation checklist
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Hard rules</strong> are non-negotiable — if any hard rule is not met, you should not take the trade.{" "}
          <strong className="text-foreground">Soft rules</strong> are recommended but you can still trade if they are not met (reduced score).
          The setup score is calculated as <em>checked items / total items × 100%</em>.
        </p>
      </div>

      <TradeOsRulesEditor rules={rules} />
    </div>
  );
}
