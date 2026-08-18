import { getAllNoTradeConditions } from "@/lib/data/trading-os-queries";
import { NoTradeConditionsEditor } from "@/components/settings/no-trade-conditions-editor";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "No-Trade Filter — TradeOS" };

export default async function NoTradeSettingsPage() {
  const conditions = await getAllNoTradeConditions();
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-loss/10">
          <ShieldAlert className="h-5 w-5 text-loss" />
        </div>
        <div>
          <h1 className="text-xl font-bold">No-Trade Filter</h1>
          <p className="text-sm text-muted-foreground">
            Manage conditions that prevent or warn against trading
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every trading day, you must evaluate each active condition in the No-Trade Filter before any trade.{" "}
          <strong className="text-foreground">Hard Blocks</strong> will automatically set the day status to "NO TRADE" if triggered.{" "}
          <strong className="text-foreground">Soft Warnings</strong> flag caution but don't block trading.{" "}
          Some conditions are <strong className="text-blue-400">auto-detected</strong> (Monday, Friday, December, losing streak).
        </p>
      </div>

      <NoTradeConditionsEditor conditions={conditions} />
    </div>
  );
}
