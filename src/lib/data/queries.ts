import { createClient } from "@/lib/supabase/server";
import type {
  RiskSettings,
  WatchlistWithSymbols,
  TradingPlan,
  SimulatedTrade,
  MarketAnalysis,
  Strategy,
  StrategyWithConditions,
  TradingRule,
} from "@/types/database";

// ============================================================
// RISK SETTINGS
// ============================================================
export async function getRiskSettings(): Promise<RiskSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("risk_settings")
    .select("*")
    .single();
  return data;
}

// ============================================================
// WATCHLISTS
// ============================================================
export async function getDefaultWatchlistWithSymbols(): Promise<WatchlistWithSymbols | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("watchlists")
    .select("*, watchlist_symbols(*)")
    .eq("is_default", true)
    .order("sort_order", { referencedTable: "watchlist_symbols", ascending: true })
    .limit(1)
    .single();
  return data as WatchlistWithSymbols | null;
}

export async function getAllWatchlists(): Promise<WatchlistWithSymbols[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("watchlists")
    .select("*, watchlist_symbols(*)")
    .order("name");
  return (data ?? []) as WatchlistWithSymbols[];
}

// ============================================================
// TRADING PLANS (analysis-focused)
// ============================================================
export async function getTodayTradingPlan(): Promise<TradingPlan | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("trading_plans")
    .select("*")
    .eq("plan_date", today)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data;
}

export async function getTradingPlans(limit?: number): Promise<TradingPlan[]> {
  const supabase = await createClient();
  let query = supabase
    .from("trading_plans")
    .select("*")
    .order("plan_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
}

// ============================================================
// MARKET ANALYSES
// ============================================================
export async function getRecentAnalyses(limit = 10): Promise<MarketAnalysis[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_analyses")
    .select("*")
    .eq("is_archived", false)
    .order("analysis_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAnalysesBySymbol(symbol: string): Promise<MarketAnalysis[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_analyses")
    .select("*")
    .eq("symbol", symbol)
    .eq("is_archived", false)
    .order("analysis_date", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getAnalysisById(id: string): Promise<MarketAnalysis | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_analyses")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

// ============================================================
// SIMULATED TRADES
// ============================================================
export async function getSimulatedTrades(limit?: number): Promise<SimulatedTrade[]> {
  const supabase = await createClient();
  let query = supabase
    .from("simulated_trades")
    .select("*")
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
}

export async function getLiveTrades(limit?: number): Promise<SimulatedTrade[]> {
  const supabase = await createClient();
  let query = supabase
    .from("simulated_trades")
    .select("*")
    .eq("is_backtest", false)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
}

export async function getBacktestSimTrades(limit?: number): Promise<SimulatedTrade[]> {
  const supabase = await createClient();
  let query = supabase
    .from("simulated_trades")
    .select("*")
    .eq("is_backtest", true)
    .order("trade_date", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
}

export async function getSimulatedTradeById(id: string): Promise<SimulatedTrade | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("simulated_trades")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

// ============================================================
// STRATEGIES
// ============================================================
export async function getStrategies(): Promise<StrategyWithConditions[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategies")
    .select("*, strategy_conditions(*)")
    .eq("is_archived", false)
    .order("name");
  return (data ?? []) as StrategyWithConditions[];
}

export async function getStrategyById(id: string): Promise<StrategyWithConditions | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategies")
    .select("*, strategy_conditions(*)")
    .eq("id", id)
    .single();
  return data as StrategyWithConditions | null;
}

// ============================================================
// TRADING RULES
// ============================================================
export async function getTradingRules(): Promise<TradingRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trading_rules")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return data ?? [];
}

export async function getActiveTradingRules(): Promise<TradingRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trading_rules")
    .select("*")
    .eq("is_active", true)
    .order("severity")
    .order("sort_order");
  return data ?? [];
}

// ============================================================
// LEGACY QUERIES (kept for backward compat — from 001 schema)
// ============================================================
export async function getActiveAccount() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data;
}

export async function getMistakeCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mistake_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPsychologyCategories(type?: "before" | "after") {
  const supabase = await createClient();
  let query = supabase
    .from("psychology_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (type) query = query.eq("category_type", type);
  const { data } = await query;
  return data ?? [];
}
