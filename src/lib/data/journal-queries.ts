import { createAdminClient, getSingleUserId } from "@/lib/supabase/admin";
import type {
  TradingDay,
  PreMarketChecklist,
  JournalTrade,
  EodReview,
  DailyMarketAnalysis,
  NewsEvent,
} from "@/types/trading-os";

export interface JournalDayEntry {
  day: TradingDay;
  pre_market: PreMarketChecklist | null;
  market_analysis: DailyMarketAnalysis[];
  news_events: NewsEvent[];
  trades: JournalTrade[];
  eod_review: EodReview | null;
}

/**
 * Fetches all trading days that have any data at all —
 * pre-market, trades, OR EOD. No section needs to be complete.
 */
export async function getJournalDays(limit = 90): Promise<JournalDayEntry[]> {
  const db = createAdminClient() as any;
  const userId = getSingleUserId();

  // Get recent trading days ordered newest first
  const { data: days } = await db
    .from("trading_days")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "not_started")  // skip totally blank days
    .order("trade_date", { ascending: false })
    .limit(limit);

  if (!days || days.length === 0) return [];

  const dayIds = (days as TradingDay[]).map((d) => d.id);

  // Fetch all related data in parallel
  const [preMarkets, analyses, newsEvents, trades, eodReviews] = await Promise.all([
    db.from("pre_market_checklists").select("*").in("trading_day_id", dayIds)
      .then((r: any) => (r.data ?? []) as PreMarketChecklist[]),
    db.from("daily_market_analysis").select("*").in("trading_day_id", dayIds)
      .then((r: any) => (r.data ?? []) as DailyMarketAnalysis[]),
    db.from("news_events").select("*").in("trading_day_id", dayIds)
      .then((r: any) => (r.data ?? []) as NewsEvent[]),
    db.from("journal_trades").select("*").in("trading_day_id", dayIds)
      .order("trade_number")
      .then((r: any) => (r.data ?? []) as JournalTrade[]),
    db.from("eod_reviews").select("*").in("trading_day_id", dayIds)
      .then((r: any) => (r.data ?? []) as EodReview[]),
  ]);

  // Group by day
  return (days as TradingDay[]).map((day) => ({
    day,
    pre_market: preMarkets.find((p: PreMarketChecklist) => p.trading_day_id === day.id) ?? null,
    market_analysis: analyses.filter((a: DailyMarketAnalysis) => a.trading_day_id === day.id),
    news_events: newsEvents.filter((n: NewsEvent) => n.trading_day_id === day.id),
    trades: trades.filter((t: JournalTrade) => t.trading_day_id === day.id),
    eod_review: eodReviews.find((e: EodReview) => e.trading_day_id === day.id) ?? null,
  }));
}
