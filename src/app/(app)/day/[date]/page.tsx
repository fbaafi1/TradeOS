import { notFound } from "next/navigation";
import { getTradingDayFull, getNoTradeConditions, getTradeOsRules, getCurrentLosingStreak } from "@/lib/data/trading-os-queries";
import { getOrCreateTradingDay } from "@/lib/actions/trading-os";
import { DayOsShell } from "@/components/day/day-os-shell";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const d = new Date(date + "T00:00:00Z");
  const label = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return { title: `${label} — Trade OS` };
}

export default async function DayPage({ params }: Props) {
  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return notFound();

  // Ensure the trading day record exists
  await getOrCreateTradingDay(date);

  const [dayFull, noTradeConditions, setupRules, losingStreak] = await Promise.all([
    getTradingDayFull(date),
    getNoTradeConditions(),
    getTradeOsRules(),
    getCurrentLosingStreak(),
  ]);

  if (!dayFull) return notFound();

  return (
    <DayOsShell
      day={dayFull}
      noTradeConditions={noTradeConditions}
      setupRules={setupRules}
      currentLosingStreak={losingStreak}
    />
  );
}
