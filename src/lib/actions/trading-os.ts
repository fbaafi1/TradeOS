"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  TradingDay,
  PreMarketChecklist,
  DailyNoTradeFilter,
  FilterEvaluation,
  NewsEvent,
  DailyMarketAnalysis,
  PsychologyLog,
  JournalTrade,
  TradeManagementAction,
  PostTradeReview,
  EodReview,
} from "@/types/trading-os";

// ============================================================
// HELPERS
// ============================================================
async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Cast as any to bypass Supabase generated-type restrictions for new tables
  return { db: supabase as any, user };
}

function revalidateDay(date: string) {
  revalidatePath(`/day/${date}`);
  revalidatePath("/dashboard");
  revalidatePath("/journal/calendar");
}

// ============================================================
// TRADING DAY
// ============================================================
export async function getOrCreateTradingDay(date: string): Promise<TradingDay | null> {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("trading_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("trade_date", date)
    .single();

  if (existing) return existing as TradingDay;

  const { data: created, error } = await db
    .from("trading_days")
    .insert({ user_id: user.id, trade_date: date })
    .select()
    .single();

  if (error) { console.error("[getOrCreateTradingDay]", error); return null; }
  return created as TradingDay;
}

export async function updateTradingDayStatus(dayId: string, status: TradingDay["status"]) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("trading_days")
    .update({ status })
    .eq("id", dayId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[updateTradingDayStatus]", error); return null; }
  const d = data as TradingDay;
  revalidateDay(d.trade_date);
  return d;
}

export async function refreshTradingDayStats(dayId: string) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: trades } = await db
    .from("journal_trades")
    .select("result, pnl, r_multiple")
    .eq("trading_day_id", dayId)
    .neq("result", "cancelled");

  const tradeList = (trades ?? []) as Pick<JournalTrade, "result" | "pnl" | "r_multiple">[];
  const closed = tradeList.filter((t) => t.result !== "open");

  const stats = {
    total_trades: tradeList.length,
    winning_trades: closed.filter((t) => t.result === "win").length,
    losing_trades: closed.filter((t) => t.result === "loss").length,
    breakeven_trades: closed.filter((t) => t.result === "breakeven").length,
    total_pnl: closed.reduce((s, t) => s + (t.pnl ?? 0), 0),
    total_r: closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0),
  };

  const { data } = await db
    .from("trading_days")
    .update(stats)
    .eq("id", dayId)
    .eq("user_id", user.id)
    .select("trade_date")
    .single();

  if (data) revalidateDay((data as { trade_date: string }).trade_date);
  return stats;
}

// ============================================================
// PRE-MARKET CHECKLIST
// ============================================================
export async function savePreMarketChecklist(
  dayId: string,
  payload: Partial<Omit<PreMarketChecklist, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("pre_market_checklists")
    .select("id")
    .eq("trading_day_id", dayId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("pre_market_checklists")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[savePreMarket] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("pre_market_checklists")
      .insert({ ...payload, user_id: user.id, trading_day_id: dayId })
      .select()
      .single();
    if (error) { console.error("[savePreMarket] insert", error); return null; }
    result = data;
  }

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return result as PreMarketChecklist;
}

// ============================================================
// NO-TRADE FILTER
// ============================================================
export async function saveNoTradeFilter(
  dayId: string,
  evaluations: FilterEvaluation[],
  overall_pass: boolean | null,
  override_reason?: string
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const payload = { evaluations, overall_pass, override_reason: override_reason ?? null };

  const { data: existing } = await db
    .from("daily_no_trade_filters")
    .select("id")
    .eq("trading_day_id", dayId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("daily_no_trade_filters")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[saveNoTradeFilter] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("daily_no_trade_filters")
      .insert({ ...payload, user_id: user.id, trading_day_id: dayId })
      .select()
      .single();
    if (error) { console.error("[saveNoTradeFilter] insert", error); return null; }
    result = data;
  }

  const newStatus = overall_pass === false ? "no_trade" : "ready";
  await db
    .from("trading_days")
    .update({
      status: newStatus,
      no_trade_blocked: overall_pass === false,
      no_trade_reason: overall_pass === false
        ? evaluations.filter((e) => e.status === "fail" && e.is_hard_block).map((e) => e.condition_name).join(", ")
        : null,
    })
    .eq("id", dayId)
    .eq("user_id", user.id);

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return result as DailyNoTradeFilter;
}

// ============================================================
// NEWS EVENTS
// ============================================================
export async function createNewsEvent(
  dayId: string,
  payload: Omit<NewsEvent, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("news_events")
    .insert({ ...payload, user_id: user.id, trading_day_id: dayId })
    .select()
    .single();
  if (error) { console.error("[createNewsEvent]", error); return null; }

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return data as NewsEvent;
}

export async function updateNewsEvent(
  id: string,
  payload: Partial<Omit<NewsEvent, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("news_events")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) { console.error("[updateNewsEvent]", error); return null; }
  return data as NewsEvent;
}

export async function deleteNewsEvent(id: string) {
  const { db, user } = await getUser();
  if (!user) return false;
  const { error } = await db.from("news_events").delete().eq("id", id).eq("user_id", user.id);
  return !error;
}

// ============================================================
// MARKET ANALYSIS
// ============================================================
export async function saveMarketAnalysis(
  dayId: string,
  timeframe: string,
  payload: Partial<Omit<DailyMarketAnalysis, "id" | "user_id" | "trading_day_id" | "timeframe" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("daily_market_analysis")
    .select("id")
    .eq("trading_day_id", dayId)
    .eq("timeframe", timeframe)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("daily_market_analysis")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[saveMarketAnalysis] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("daily_market_analysis")
      .insert({ ...payload, user_id: user.id, trading_day_id: dayId, timeframe })
      .select()
      .single();
    if (error) { console.error("[saveMarketAnalysis] insert", error); return null; }
    result = data;
  }

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return result as DailyMarketAnalysis;
}

// ============================================================
// PSYCHOLOGY
// ============================================================
export async function savePsychologyLog(
  dayId: string,
  payload: Partial<Omit<PsychologyLog, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("psychology_logs")
    .select("id")
    .eq("trading_day_id", dayId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("psychology_logs")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[savePsychologyLog] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("psychology_logs")
      .insert({ ...payload, user_id: user.id, trading_day_id: dayId })
      .select()
      .single();
    if (error) { console.error("[savePsychologyLog] insert", error); return null; }
    result = data;
  }

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return result as PsychologyLog;
}

// ============================================================
// JOURNAL TRADES
// ============================================================
export async function createJournalTrade(
  dayId: string,
  payload: Partial<Omit<JournalTrade, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { count } = await db
    .from("journal_trades")
    .select("*", { count: "exact", head: true })
    .eq("trading_day_id", dayId);

  const { data, error } = await db
    .from("journal_trades")
    .insert({
      ...payload,
      user_id: user.id,
      trading_day_id: dayId,
      trade_number: (count ?? 0) + 1,
      psychology_before: payload.psychology_before ?? [],
      setup_checklist: payload.setup_checklist ?? [],
    })
    .select()
    .single();

  if (error) { console.error("[createJournalTrade]", error); return null; }

  await db
    .from("trading_days")
    .update({ status: "trading" })
    .eq("id", dayId)
    .eq("user_id", user.id);

  await refreshTradingDayStats(dayId);

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return data as JournalTrade;
}

export async function updateJournalTrade(
  id: string,
  payload: Partial<Omit<JournalTrade, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("journal_trades")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[updateJournalTrade]", error); return null; }
  const trade = data as JournalTrade;
  await refreshTradingDayStats(trade.trading_day_id);
  revalidateDay(trade.trade_date);
  return trade;
}

export async function deleteJournalTrade(id: string) {
  const { db, user } = await getUser();
  if (!user) return false;

  const { data: trade } = await db
    .from("journal_trades")
    .select("trading_day_id, trade_date")
    .eq("id", id)
    .single();

  const { error } = await db
    .from("journal_trades")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (!error && trade) {
    const t = trade as Pick<JournalTrade, "trading_day_id" | "trade_date">;
    await refreshTradingDayStats(t.trading_day_id);
    revalidateDay(t.trade_date);
  }
  return !error;
}

// ============================================================
// TRADE MANAGEMENT
// ============================================================
export async function addTradeManagementAction(
  tradeId: string,
  payload: Omit<TradeManagementAction, "id" | "user_id" | "trade_id" | "created_at">
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("trade_management_actions")
    .insert({ ...payload, user_id: user.id, trade_id: tradeId })
    .select()
    .single();

  if (error) { console.error("[addTradeManagementAction]", error); return null; }
  return data as TradeManagementAction;
}

// ============================================================
// POST-TRADE REVIEW
// ============================================================
export async function savePostTradeReview(
  tradeId: string,
  payload: Partial<Omit<PostTradeReview, "id" | "user_id" | "trade_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("post_trade_reviews")
    .select("id")
    .eq("trade_id", tradeId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("post_trade_reviews")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[savePostTradeReview] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("post_trade_reviews")
      .insert({ ...payload, user_id: user.id, trade_id: tradeId })
      .select()
      .single();
    if (error) { console.error("[savePostTradeReview] insert", error); return null; }
    result = data;
  }
  return result as PostTradeReview;
}

// ============================================================
// END-OF-DAY REVIEW
// ============================================================
export async function saveEodReview(
  dayId: string,
  payload: Partial<Omit<EodReview, "id" | "user_id" | "trading_day_id" | "created_at" | "updated_at">>
) {
  const { db, user } = await getUser();
  if (!user) return null;

  const { data: existing } = await db
    .from("eod_reviews")
    .select("id")
    .eq("trading_day_id", dayId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await db
      .from("eod_reviews")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("[saveEodReview] update", error); return null; }
    result = data;
  } else {
    const { data, error } = await db
      .from("eod_reviews")
      .insert({ ...payload, user_id: user.id, trading_day_id: dayId })
      .select()
      .single();
    if (error) { console.error("[saveEodReview] insert", error); return null; }
    result = data;
  }

  await db
    .from("trading_days")
    .update({ status: "session_complete" })
    .eq("id", dayId)
    .eq("user_id", user.id);

  const { data: day } = await db
    .from("trading_days")
    .select("trade_date")
    .eq("id", dayId)
    .single();
  if (day) revalidateDay((day as { trade_date: string }).trade_date);
  return result as EodReview;
}
