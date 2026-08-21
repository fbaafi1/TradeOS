import { getJournalTrades } from "@/lib/data/trading-os-queries";
import { getJournalDays } from "@/lib/data/journal-queries";
import { getRiskSettings } from "@/lib/data/queries";
import { JournalTable } from "@/components/journal/journal-table";
import { DailyJournalView } from "@/components/journal/daily-journal-view";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Trade Journal — Trade OS" };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showDailyView = view !== "table";

  const [journalDays, trades, riskSettings] = await Promise.all([
    getJournalDays(90),
    getJournalTrades(500),
    getRiskSettings(),
  ]);

  const totalTrades = trades.length;
  const totalDays = journalDays.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
            <BookOpen className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Trade Journal</h1>
            <p className="text-sm text-muted-foreground">
              {totalDays} session{totalDays !== 1 ? "s" : ""} · {totalTrades} trade{totalTrades !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <a
            href="/journal"
            className={`px-4 h-8 flex items-center text-xs font-medium transition-colors ${
              showDailyView
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            Daily View
          </a>
          <a
            href="/journal?view=table"
            className={`px-4 h-8 flex items-center text-xs font-medium transition-colors ${
              !showDailyView
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            Trade Table
          </a>
        </div>
      </div>

      {/* Content */}
      {showDailyView ? (
        <DailyJournalView entries={journalDays} />
      ) : (
        <JournalTable trades={trades} currency={riskSettings?.currency ?? "USD"} />
      )}
    </div>
  );
}
