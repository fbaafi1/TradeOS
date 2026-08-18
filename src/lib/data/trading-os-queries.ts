import { createClient } from "@/lib/supabase/server";
import type {
  TradingDay,
  PreMarketChecklist,
  DailyNoTradeFilter,
  NewsEvent,
  DailyMarketAnalysis,
  PsychologyLog,
  JournalTrade,
  PostTradeReview,
  EodReview,
  TradingDayFull,
  NoTradeCondition,
  TradeOsRule,
  CalendarDayData,
} from "@/types/trading-os";

// ============================================================
// HELPER — bypass Supabase generated type system for new tables
// ============================================================
async function getDb() {
  const supabase = await createClient();
  return supabase as any;
}

// ============================================================
// TRADING DAY QUERIES
// ============================================================
export async function getTradingDay(date: string): Promise<TradingDay | null> {
  const db = await getDb();
  const { data } = await db
    .from("trading_days")
    .select("*")
    .eq("trade_date", date)
    .single();
  return data as TradingDay | null;
}

export async function getTradingDayFull(date: string): Promise<TradingDayFull | null> {
  const db = await getDb();

  const { data: day } = await db
    .from("trading_days")
    .select("*")
    .eq("trade_date", date)
    .single();

  if (!day) return null;
  const d = day as TradingDay;

  const [preMarket, noTradeFilter, newsEvents, marketAnalysis, psychology, trades, eodReview] =
    await Promise.all([
      db.from("pre_market_checklists").select("*").eq("trading_day_id", d.id).single().then((r: any) => r.data as PreMarketChecklist | null),
      db.from("daily_no_trade_filters").select("*").eq("trading_day_id", d.id).single().then((r: any) => r.data as DailyNoTradeFilter | null),
      db.from("news_events").select("*").eq("trading_day_id", d.id).order("event_time").then((r: any) => (r.data ?? []) as NewsEvent[]),
      db.from("daily_market_analysis").select("*").eq("trading_day_id", d.id).then((r: any) => (r.data ?? []) as DailyMarketAnalysis[]),
      db.from("psychology_logs").select("*").eq("trading_day_id", d.id).single().then((r: any) => r.data as PsychologyLog | null),
      db.from("journal_trades").select("*").eq("trading_day_id", d.id).order("trade_number").then((r: any) => (r.data ?? []) as JournalTrade[]),
      db.from("eod_reviews").select("*").eq("trading_day_id", d.id).single().then((r: any) => r.data as EodReview | null),
    ]);

  return {
    ...d,
    pre_market: preMarket,
    no_trade_filter: noTradeFilter,
    news_events: newsEvents,
    market_analysis: marketAnalysis,
    psychology: psychology,
    trades: trades,
    eod_review: eodReview,
  };
}

export async function getCalendarDays(year: number, month: number): Promise<CalendarDayData[]> {
  const db = await getDb();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: days } = await db
    .from("trading_days")
    .select("id, trade_date, status, total_pnl, total_trades, rule_violations, no_trade_blocked")
    .gte("trade_date", startDate)
    .lte("trade_date", endDate)
    .order("trade_date");

  const { data: eodDays } = await db
    .from("eod_reviews")
    .select("trading_day_id");

  const eodSet = new Set((eodDays ?? []).map((e: { trading_day_id: string }) => e.trading_day_id));

  return (days ?? []).map((day: any) => {
    let indicator: CalendarDayData["indicator"] = "none";
    if (day.rule_violations > 0) indicator = "violation";
    else if (day.no_trade_blocked) indicator = "no_trade";
    else if (eodSet.has(day.id)) indicator = "complete";
    else if (day.total_pnl > 0) indicator = "profitable";
    else if (day.total_pnl < 0) indicator = "losing";

    return {
      date: day.trade_date,
      status: day.status,
      total_pnl: day.total_pnl,
      total_trades: day.total_trades,
      rule_violations: day.rule_violations,
      no_trade_blocked: day.no_trade_blocked,
      eod_complete: eodSet.has(day.id),
      indicator,
    };
  });
}

export async function getRecentTradingDays(limit = 30): Promise<TradingDay[]> {
  const db = await getDb();
  const { data } = await db
    .from("trading_days")
    .select("*")
    .order("trade_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as TradingDay[];
}

// ============================================================
// NO-TRADE CONDITIONS
// ============================================================
export async function getNoTradeConditions(): Promise<NoTradeCondition[]> {
  const db = await getDb();
  const { data } = await db
    .from("no_trade_conditions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as NoTradeCondition[];
}

export async function getAllNoTradeConditions(): Promise<NoTradeCondition[]> {
  const db = await getDb();
  const { data } = await db
    .from("no_trade_conditions")
    .select("*")
    .order("sort_order");
  return (data ?? []) as NoTradeCondition[];
}

// ============================================================
// TRADE OS RULES
// ============================================================
export async function getTradeOsRules(): Promise<TradeOsRule[]> {
  const db = await getDb();
  const { data } = await db
    .from("trade_os_rules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as TradeOsRule[];
}

export async function getAllTradeOsRules(): Promise<TradeOsRule[]> {
  const db = await getDb();
  const { data } = await db
    .from("trade_os_rules")
    .select("*")
    .order("section")
    .order("sort_order");
  return (data ?? []) as TradeOsRule[];
}

// ============================================================
// JOURNAL TRADES
// ============================================================
export async function getJournalTrades(limit?: number): Promise<JournalTrade[]> {
  const db = await getDb();
  let query = db
    .from("journal_trades")
    .select("*")
    .order("trade_date", { ascending: false })
    .order("trade_number", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []) as JournalTrade[];
}

export async function getPostTradeReviews(): Promise<PostTradeReview[]> {
  const db = await getDb();
  const { data } = await db.from("post_trade_reviews").select("*");
  return (data ?? []) as PostTradeReview[];
}

// ============================================================
// LOSING STREAK
// ============================================================
export async function getCurrentLosingStreak(): Promise<number> {
  const db = await getDb();
  const { data } = await db
    .from("journal_trades")
    .select("result")
    .neq("result", "open")
    .neq("result", "cancelled")
    .order("trade_date", { ascending: false })
    .order("trade_number", { ascending: false })
    .limit(50);

  const trades = (data ?? []) as Pick<JournalTrade, "result">[];
  let streak = 0;
  for (const t of trades) {
    if (t.result === "loss") streak++;
    else break;
  }
  return streak;
}
