import { getCalendarDays, getRecentTradingDays } from "@/lib/data/trading-os-queries";
import { TradingCalendar } from "@/components/journal/trading-calendar";
import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";

interface Props { searchParams: Promise<{ year?: string; month?: string }>; }

export const metadata: Metadata = { title: "Calendar — Trade OS" };

export default async function CalendarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const year  = sp.year  ? parseInt(sp.year)  : now.getFullYear();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;

  const [calendarDays, recentDays] = await Promise.all([
    getCalendarDays(year, month),
    getRecentTradingDays(60),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
          <CalendarDays className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Trading Calendar</h1>
          <p className="text-sm text-muted-foreground">Visual overview of all your trading sessions</p>
        </div>
      </div>
      <TradingCalendar calendarDays={calendarDays} recentDays={recentDays} year={year} month={month} />
    </div>
  );
}
