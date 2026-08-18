import { getJournalTrades } from "@/lib/data/trading-os-queries";
import { getRiskSettings } from "@/lib/data/queries";
import { JournalTable } from "@/components/journal/journal-table";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Trade Journal — Trade OS" };

export default async function JournalPage() {
  const [trades, riskSettings] = await Promise.all([
    getJournalTrades(500),
    getRiskSettings(),
  ]);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
          <BookOpen className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">
            {trades.length} trade{trades.length !== 1 ? "s" : ""} recorded across all sessions
          </p>
        </div>
      </div>
      <JournalTable trades={trades} currency={riskSettings?.currency ?? "USD"} />
    </div>
  );
}
