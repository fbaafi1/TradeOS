// ============================================================
// TradeOS — Daily Trading OS TypeScript Types
// ============================================================

export type DayStatus =
  | "not_started"
  | "pre_market"
  | "ready"
  | "no_trade"
  | "trading"
  | "session_complete";

export type TradeDirection = "buy" | "sell";
export type TradeResult = "open" | "win" | "loss" | "breakeven" | "cancelled";
export type NewsImpact = "high" | "medium" | "low";
export type TimeframeGroup = "higher" | "entry";
export type TradeCategory = "good_win" | "good_loss" | "bad_win" | "bad_loss";
export type FollowedOS = "yes" | "partially" | "no";

export interface TradingDay {
  id: string;
  user_id: string;
  trade_date: string; // ISO date YYYY-MM-DD
  status: DayStatus;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  total_pnl: number;
  total_r: number;
  rule_violations: number;
  no_trade_blocked: boolean;
  no_trade_reason: string | null;
  losing_streak_at_open: number;
  created_at: string;
  updated_at: string;
}

export interface NoTradeCondition {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_auto_detected: boolean;
  is_hard_block: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FilterEvaluation {
  condition_id: string;
  condition_name: string;
  status: "pass" | "fail" | "na";
  note: string;
  is_auto_detected: boolean;
  is_hard_block: boolean;
}

export interface DailyNoTradeFilter {
  id: string;
  user_id: string;
  trading_day_id: string;
  evaluations: FilterEvaluation[];
  overall_pass: boolean | null;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiquidityLevel {
  label: string;
  price: string;
  notes: string;
}

export interface KeyLevel {
  price: string;
  type: "support" | "resistance" | "supply" | "demand" | "fvg" | "order_block" | "other";
  importance: "high" | "medium" | "low";
  notes: string;
}

export interface Scenario {
  id: string;
  conditions: string[];
  actions: string[];
}

export interface PreMarketChecklist {
  id: string;
  user_id: string;
  trading_day_id: string;
  htf_bias: string | null;
  daily_structure: string | null;
  h4_structure: string | null;
  h1_structure: string | null;
  market_condition: "trending" | "ranging" | "consolidating" | "choppy" | "expanding" | null;
  liquidity_levels: LiquidityLevel[];
  key_levels: KeyLevel[];
  scenarios: Scenario[];
  notes: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsEvent {
  id: string;
  user_id: string;
  trading_day_id: string;
  event_time: string; // HH:MM
  currency: string;
  event_name: string;
  impact: NewsImpact;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyMarketAnalysis {
  id: string;
  user_id: string;
  trading_day_id: string;
  timeframe: string; // Daily, 4H, 1H, 15M, 5M, 1M
  timeframe_group: TimeframeGroup;
  bias: string | null;
  structure: string | null;
  liquidity: string | null;
  notes: string | null;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface PsychologyLog {
  id: string;
  user_id: string;
  trading_day_id: string;
  state_before: string[];
  trading_for_right_reason: boolean | null;
  pre_notes: string | null;
  state_after: string[];
  emotions_affected_execution: boolean | null;
  post_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupChecklistItem {
  item: string;
  checked: boolean;
}

export interface JournalTrade {
  id: string;
  user_id: string;
  trading_day_id: string;
  trade_number: number | null;
  trade_date: string;
  trade_time: string | null;
  pair: string;
  direction: TradeDirection;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number | null;
  exit_price: number | null;
  account_size: number | null;
  risk_percent: number | null;
  risk_amount: number | null;
  reward_amount: number | null;
  rr_ratio: number | null;
  result: TradeResult;
  pnl: number | null;
  r_multiple: number | null;
  entry_model: string | null;
  session: string | null;
  setup_score: number | null;
  setup_checklist: SetupChecklistItem[];
  psychology_before: string[];
  psychology_during: string | null;
  psychology_after: string | null;
  emotions_affected: boolean | null;
  followed_setup: boolean | null;
  followed_risk_rules: boolean | null;
  correct_location: boolean | null;
  waited_for_confirmation: boolean | null;
  managed_correctly: boolean | null;
  win_loss_cause: string | null;
  trade_category: TradeCategory | null;
  notes: string | null;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeManagementAction {
  id: string;
  user_id: string;
  trade_id: string;
  action_type: "partial_close" | "move_sl" | "move_tp" | "breakeven" | "manual_exit" | "note";
  action_time: string;
  price_at_action: number | null;
  new_sl: number | null;
  new_tp: number | null;
  partial_size: number | null;
  reason: string;
  created_at: string;
}

export interface PostTradeReview {
  id: string;
  user_id: string;
  trade_id: string;
  followed_setup: boolean | null;
  followed_risk_rules: boolean | null;
  correct_location: boolean | null;
  waited_for_confirmation: boolean | null;
  managed_correctly: boolean | null;
  win_loss_cause: "strategy" | "execution" | "both" | "luck" | null;
  trade_category: TradeCategory | null;
  what_went_well: string | null;
  what_went_wrong: string | null;
  lesson_learned: string | null;
  improvement: string | null;
  created_at: string;
  updated_at: string;
}

export interface EodReview {
  id: string;
  user_id: string;
  trading_day_id: string;
  total_trades: number | null;
  wins: number | null;
  losses: number | null;
  breakeven: number | null;
  total_pnl: number | null;
  total_r: number | null;
  best_trade_id: string | null;
  worst_trade_id: string | null;
  rule_violations: number | null;
  what_went_well: string | null;
  what_went_badly: string | null;
  lessons_learned: string | null;
  improvements_tomorrow: string | null;
  followed_trade_os: FollowedOS | null;
  created_at: string;
  updated_at: string;
}

export interface TradeOsRule {
  id: string;
  user_id: string;
  section: "pre_market" | "no_trade_filter" | "setup" | "entry" | "psychology" | "general";
  name: string;
  description: string | null;
  rule_type: "hard" | "soft";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// COMPOSED / VIEW TYPES
// ============================================================
export interface TradingDayFull extends TradingDay {
  pre_market: PreMarketChecklist | null;
  no_trade_filter: DailyNoTradeFilter | null;
  news_events: NewsEvent[];
  market_analysis: DailyMarketAnalysis[];
  psychology: PsychologyLog | null;
  trades: JournalTrade[];
  eod_review: EodReview | null;
}

// ============================================================
// CALENDAR DAY STATUS (for calendar view)
// ============================================================
export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  total_pnl: number;
  total_trades: number;
  rule_violations: number;
  no_trade_blocked: boolean;
  eod_complete: boolean;
  // Visual indicator
  indicator: "profitable" | "losing" | "violation" | "no_trade" | "complete" | "none";
}

// ============================================================
// PSYCHOLOGY OPTIONS
// ============================================================
export const PSYCHOLOGY_OPTIONS = [
  "Calm",
  "Focused",
  "Confident",
  "Neutral",
  "Anxious",
  "Angry",
  "Fearful",
  "Greedy",
  "Revenge trading",
  "Tired",
  "Distracted",
  "Patient",
  "Disciplined",
  "Overconfident",
] as const;

export type PsychologyOption = (typeof PSYCHOLOGY_OPTIONS)[number];

// ============================================================
// LIQUIDITY LEVEL LABELS
// ============================================================
export const LIQUIDITY_LABELS = [
  "Previous Day High",
  "Previous Day Low",
  "Previous Week High",
  "Previous Week Low",
  "Asian High",
  "Asian Low",
  "London High",
  "London Low",
  "Major Buy-Side Liquidity",
  "Major Sell-Side Liquidity",
] as const;

// ============================================================
// KEY LEVEL TYPES
// ============================================================
export const KEY_LEVEL_TYPES = [
  { value: "support", label: "Support" },
  { value: "resistance", label: "Resistance" },
  { value: "supply", label: "Supply Zone" },
  { value: "demand", label: "Demand Zone" },
  { value: "fvg", label: "FVG (Fair Value Gap)" },
  { value: "order_block", label: "Order Block" },
  { value: "other", label: "Other" },
] as const;

// ============================================================
// TIMEFRAMES
// ============================================================
export const HIGHER_TIMEFRAMES = ["Daily", "4H", "1H"] as const;
export const ENTRY_TIMEFRAMES = ["15M", "5M", "1M"] as const;
export const ALL_TIMEFRAMES = [...HIGHER_TIMEFRAMES, ...ENTRY_TIMEFRAMES] as const;

// ============================================================
// TRADING PAIRS
// ============================================================
export const DEFAULT_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
  "AUDUSD", "NZDUSD", "USDCAD",
  "GBPJPY", "EURJPY", "EURGBP",
  "XAUUSD", "BTCUSD",
] as const;

// ============================================================
// SESSIONS
// ============================================================
export const TRADING_SESSIONS = ["London", "New York", "Asian", "London/NY Overlap"] as const;
