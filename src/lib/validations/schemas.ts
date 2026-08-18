import { z } from "zod";

export const tradeSchema = z.object({
  trade_date: z.string().min(1, "Date is required"),
  trade_time: z.string().optional(),
  instrument: z.string().min(1, "Instrument is required"),
  direction: z.enum(["long", "short"]),
  session: z.string().optional(),
  strategy_id: z.string().optional(),
  timeframe: z.string().optional(),
  htf_bias: z.string().optional(),
  entry_price: z.coerce.number().optional(),
  stop_loss: z.coerce.number().optional(),
  take_profit: z.coerce.number().optional(),
  exit_price: z.coerce.number().optional(),
  lot_size: z.coerce.number().optional(),
  risk_percentage: z.coerce.number().min(0).max(100).optional(),
  risk_amount: z.coerce.number().optional(),
  expected_reward: z.coerce.number().optional(),
  risk_reward_ratio: z.coerce.number().optional(),
  setup_quality_score: z.coerce.number().min(0).max(100).optional(),
  context_data: z.record(z.string(), z.boolean()).optional(),
  psychology_before: z.array(z.string()).optional(),
  psychology_after: z
    .object({
      followed_rules: z.boolean().optional(),
      entered_early: z.boolean().optional(),
      moved_stop: z.boolean().optional(),
      revenge_trade: z.boolean().optional(),
      overtraded: z.boolean().optional(),
      followed_plan: z.boolean().optional(),
    })
    .optional(),
  reason_for_entry: z.string().optional(),
  what_went_well: z.string().optional(),
  what_went_wrong: z.string().optional(),
  lesson_learned: z.string().optional(),
  mistake_category_id: z.string().optional(),
  result: z.enum(["win", "loss", "breakeven", "open"]).default("open"),
  pnl: z.coerce.number().optional(),
  r_multiple: z.coerce.number().optional(),
  mistake_ids: z.array(z.string()).optional(),
});

export type TradeFormData = z.input<typeof tradeSchema>;
export type TradeFormOutput = z.output<typeof tradeSchema>;

export const strategySchema = z.object({
  name: z.string().min(1, "Strategy name is required"),
  description: z.string().optional(),
  market_conditions: z.string().optional(),
  preferred_pairs: z.array(z.string()).optional(),
  preferred_sessions: z.array(z.string()).optional(),
  preferred_timeframes: z.array(z.string()).optional(),
  entry_conditions: z.string().optional(),
  confirmation_conditions: z.string().optional(),
  stop_loss_rules: z.string().optional(),
  take_profit_rules: z.string().optional(),
  minimum_rr: z.coerce.number().min(0).default(2),
  invalidation_rules: z.string().optional(),
  conditions: z.array(z.object({ label: z.string().min(1) })).optional(),
});

export type StrategyFormData = z.input<typeof strategySchema>;
export type StrategyFormOutput = z.output<typeof strategySchema>;

export const dailyPlanSchema = z.object({
  plan_date: z.string().min(1, "Date is required"),
  market_bias: z.string().optional(),
  pairs_to_watch: z.array(z.string()).optional(),
  key_levels: z.string().optional(),
  liquidity_zones: z.string().optional(),
  important_news: z.string().optional(),
  trading_session: z.string().optional(),
  max_trades: z.coerce.number().min(0).optional(),
  max_daily_risk: z.coerce.number().min(0).max(100).optional(),
  entry_conditions: z.string().optional(),
  stay_out_conditions: z.string().optional(),
  notes: z.string().optional(),
});

export type DailyPlanFormData = z.input<typeof dailyPlanSchema>;
export type DailyPlanFormOutput = z.output<typeof dailyPlanSchema>;

export const dailyReviewSchema = z.object({
  review_date: z.string().min(1),
  followed_plan: z.boolean().optional(),
  emotional_state: z.string().optional(),
  what_went_well: z.string().optional(),
  what_to_improve: z.string().optional(),
  lessons_learned: z.string().optional(),
  notes: z.string().optional(),
});

export type DailyReviewFormData = z.input<typeof dailyReviewSchema>;
export type DailyReviewFormOutput = z.output<typeof dailyReviewSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1),
  starting_balance: z.coerce.number().min(0),
  current_balance: z.coerce.number().min(0),
  currency: z.string().min(1),
  max_risk_per_trade: z.coerce.number().min(0).max(100),
  max_daily_loss: z.coerce.number().min(0).max(100),
  max_trades_per_day: z.coerce.number().min(1).max(50),
});

export type SettingsFormData = z.input<typeof settingsSchema>;
export type SettingsFormOutput = z.output<typeof settingsSchema>;

export const riskCalculatorSchema = z.object({
  account_balance: z.coerce.number().min(0),
  risk_percentage: z.coerce.number().min(0).max(100),
  entry_price: z.coerce.number().min(0),
  stop_loss: z.coerce.number().min(0),
  take_profit: z.coerce.number().min(0).optional(),
  instrument: z.string().optional(),
  pip_size: z.coerce.number().min(0).default(0.0001),
  pip_value: z.coerce.number().min(0).default(10),
});

export type RiskCalculatorFormData = z.input<typeof riskCalculatorSchema>;
export type RiskCalculatorFormOutput = z.output<typeof riskCalculatorSchema>;
