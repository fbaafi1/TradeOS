// ============================================================
// TradeOS — TypeScript Database Types
// Covers both 001_initial_schema and 002_analysis_schema
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TradeDirection = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven" | "open";
export type SimDirection = "long" | "short";
export type SimResult = "win" | "loss" | "breakeven" | "pending";
export type HtfBias = "bullish" | "bearish" | "neutral";
export type RuleCategory = "risk" | "entry" | "exit" | "psychology" | "session" | "strategy" | "general";
export type RuleSeverity = "info" | "warning" | "critical";
export type SymbolCategory = "forex" | "crypto" | "indices" | "commodities" | "other";
export type ChartLayoutType = "single" | "dual" | "quad";

// ============================================================
// DATABASE INTERFACE
// ============================================================
export interface Database {
  public: {
    Tables: {
      // ---- FROM 001_initial_schema ----
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          starting_balance: number;
          current_balance: number;
          currency: string;
          max_risk_per_trade: number;
          max_daily_loss: number;
          max_trades_per_day: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          market_conditions: string | null;
          preferred_pairs: string[];
          preferred_sessions: string[];
          preferred_timeframes: string[];
          entry_conditions: string | null;
          confirmation_conditions: string | null;
          stop_loss_rules: string | null;
          take_profit_rules: string | null;
          minimum_rr: number;
          invalidation_rules: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["strategies"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strategies"]["Insert"]>;
      };
      strategy_conditions: {
        Row: {
          id: string;
          strategy_id: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["strategy_conditions"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strategy_conditions"]["Insert"]>;
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          strategy_id: string | null;
          trade_date: string;
          trade_time: string | null;
          instrument: string;
          direction: TradeDirection;
          session: string | null;
          account_balance_at_trade: number | null;
          timeframe: string | null;
          htf_bias: string | null;
          entry_price: number | null;
          stop_loss: number | null;
          take_profit: number | null;
          exit_price: number | null;
          lot_size: number | null;
          risk_percentage: number | null;
          risk_amount: number | null;
          expected_reward: number | null;
          risk_reward_ratio: number | null;
          setup_quality_score: number | null;
          context_data: Json;
          psychology_before: string[];
          psychology_after: Json;
          reason_for_entry: string | null;
          what_went_well: string | null;
          what_went_wrong: string | null;
          lesson_learned: string | null;
          mistake_category_id: string | null;
          result: TradeResult;
          pnl: number | null;
          r_multiple: number | null;
          is_backtest: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trades"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
      };
      daily_plans: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          plan_date: string;
          market_bias: string | null;
          pairs_to_watch: string[];
          key_levels: string | null;
          liquidity_zones: string | null;
          important_news: string | null;
          trading_session: string | null;
          max_trades: number | null;
          max_daily_risk: number | null;
          entry_conditions: string | null;
          stay_out_conditions: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_plans"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_plans"]["Insert"]>;
      };
      backtests: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string | null;
          name: string;
          pair: string;
          timeframe: string | null;
          start_date: string;
          end_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["backtests"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["backtests"]["Insert"]>;
      };
      backtest_trades: {
        Row: {
          id: string;
          backtest_id: string;
          trade_date: string;
          direction: TradeDirection;
          entry_price: number;
          stop_loss: number;
          take_profit: number | null;
          exit_price: number | null;
          result: TradeResult;
          r_multiple: number | null;
          reason: string | null;
          notes: string | null;
          screenshot_path: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["backtest_trades"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["backtest_trades"]["Insert"]>;
      };
      mistake_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["mistake_categories"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mistake_categories"]["Insert"]>;
      };
      psychology_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category_type: "before" | "after";
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["psychology_categories"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["psychology_categories"]["Insert"]>;
      };
      context_fields: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["context_fields"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["context_fields"]["Insert"]>;
      };
      psychology_entries: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          entry_date: string;
          emotional_state: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["psychology_entries"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["psychology_entries"]["Insert"]>;
      };

      // ---- FROM 002_analysis_schema ----
      risk_settings: {
        Row: {
          id: string;
          user_id: string;
          max_risk_per_trade: number;
          max_daily_risk: number;
          max_trades_per_day: number;
          min_rr: number;
          default_account_size: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["risk_settings"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["risk_settings"]["Insert"]>;
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["watchlists"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watchlists"]["Insert"]>;
      };
      watchlist_symbols: {
        Row: {
          id: string;
          watchlist_id: string;
          symbol: string;
          display_name: string | null;
          category: SymbolCategory;
          sort_order: number;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["watchlist_symbols"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watchlist_symbols"]["Insert"]>;
      };
      chart_layouts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          layout_type: ChartLayoutType;
          panels: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chart_layouts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chart_layouts"]["Insert"]>;
      };
      chart_drawings: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          timeframe: string;
          drawing_type: string;
          data: Json;
          is_visible: boolean;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chart_drawings"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chart_drawings"]["Insert"]>;
      };
      market_analyses: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          analysis_date: string;
          timeframe: string | null;
          htf_bias: HtfBias | null;
          bias_notes: string | null;
          market_structure: string[] | null;
          buy_side_liquidity: string | null;
          sell_side_liquidity: string | null;
          prev_day_high: number | null;
          prev_day_low: number | null;
          equal_highs: string | null;
          equal_lows: string | null;
          key_levels: Json;
          strategy_id: string | null;
          setup_notes: string | null;
          analysis_notes: string | null;
          invalidation: string | null;
          targets: Json;
          chart_image_path: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["market_analyses"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["market_analyses"]["Insert"]>;
      };
      trading_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_date: string;
          session: string | null;
          instruments: string[];
          market_bias: string | null;
          key_levels: string | null;
          expected_setups: string | null;
          important_news: string | null;
          max_trades: number | null;
          max_risk_percent: number | null;
          conditions_to_trade: string | null;
          conditions_to_avoid: string | null;
          notes: string | null;
          analysis_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trading_plans"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trading_plans"]["Insert"]>;
      };
      simulated_trades: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string | null;
          analysis_id: string | null;
          plan_id: string | null;
          trade_date: string;
          trade_time: string | null;
          instrument: string;
          direction: SimDirection;
          session: string | null;
          timeframe: string | null;
          htf_bias: string | null;
          setup_notes: string | null;
          setup_score: number | null;
          entry_price: number | null;
          stop_loss: number | null;
          take_profit: number | null;
          exit_price: number | null;
          account_size: number | null;
          risk_percentage: number | null;
          risk_amount: number | null;
          position_size: number | null;
          potential_profit: number | null;
          risk_reward_ratio: number | null;
          result: SimResult;
          pnl: number | null;
          r_multiple: number | null;
          psychology_before: string[];
          psychology_after: Json;
          reason_for_entry: string | null;
          what_went_well: string | null;
          what_went_wrong: string | null;
          lesson_learned: string | null;
          followed_plan: boolean | null;
          followed_strategy: boolean | null;
          broke_rules: boolean | null;
          rule_notes: string | null;
          is_backtest: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["simulated_trades"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["simulated_trades"]["Insert"]>;
      };
      screenshots: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          caption: string | null;
          analysis_id: string | null;
          plan_id: string | null;
          simulated_trade_id: string | null;
          backtest_id: string | null;
          screenshot_type: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["screenshots"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["screenshots"]["Insert"]>;
      };
      trading_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          category: RuleCategory;
          severity: RuleSeverity;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trading_rules"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trading_rules"]["Insert"]>;
      };
      rule_violations: {
        Row: {
          id: string;
          user_id: string;
          rule_id: string | null;
          simulated_trade_id: string | null;
          violation_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rule_violations"]["Row"], "id" | "created_at"> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rule_violations"]["Insert"]>;
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type: string;
          content: string;
          data_snapshot: Json;
          generated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_insights"]["Row"], "id" | "generated_at"> & {
          id?: string; generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_insights"]["Insert"]>;
      };
    };
  };
}

// ============================================================
// CONVENIENCE ALIASES
// ============================================================
export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type Strategy = Database["public"]["Tables"]["strategies"]["Row"];
export type StrategyCondition = Database["public"]["Tables"]["strategy_conditions"]["Row"];
export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type DailyPlan = Database["public"]["Tables"]["daily_plans"]["Row"];
export type Backtest = Database["public"]["Tables"]["backtests"]["Row"];
export type BacktestTrade = Database["public"]["Tables"]["backtest_trades"]["Row"];
export type MistakeCategory = Database["public"]["Tables"]["mistake_categories"]["Row"];
export type PsychologyCategory = Database["public"]["Tables"]["psychology_categories"]["Row"];
export type ContextField = Database["public"]["Tables"]["context_fields"]["Row"];
export type PsychologyEntry = Database["public"]["Tables"]["psychology_entries"]["Row"];

// New from 002
export type RiskSettings = Database["public"]["Tables"]["risk_settings"]["Row"];
export type Watchlist = Database["public"]["Tables"]["watchlists"]["Row"];
export type WatchlistSymbol = Database["public"]["Tables"]["watchlist_symbols"]["Row"];
export type ChartLayout = Database["public"]["Tables"]["chart_layouts"]["Row"];
export type ChartDrawing = Database["public"]["Tables"]["chart_drawings"]["Row"];
export type MarketAnalysis = Database["public"]["Tables"]["market_analyses"]["Row"];
export type TradingPlan = Database["public"]["Tables"]["trading_plans"]["Row"];
export type SimulatedTrade = Database["public"]["Tables"]["simulated_trades"]["Row"];
export type Screenshot = Database["public"]["Tables"]["screenshots"]["Row"];
export type TradingRule = Database["public"]["Tables"]["trading_rules"]["Row"];
export type RuleViolation = Database["public"]["Tables"]["rule_violations"]["Row"];
export type AiInsight = Database["public"]["Tables"]["ai_insights"]["Row"];

// ============================================================
// RELATIONAL / COMPOSED TYPES
// ============================================================
export type StrategyWithConditions = Strategy & {
  strategy_conditions: StrategyCondition[];
};

export type TradeWithRelations = Trade & {
  strategies?: Strategy | null;
  trade_mistakes?: { mistake_category_id: string; mistake_categories: MistakeCategory }[];
};

export type WatchlistWithSymbols = Watchlist & {
  watchlist_symbols: WatchlistSymbol[];
};

export type MarketAnalysisWithStrategy = MarketAnalysis & {
  strategies?: Pick<Strategy, "id" | "name"> | null;
};

export type SimulatedTradeWithRelations = SimulatedTrade & {
  strategies?: Pick<Strategy, "id" | "name"> | null;
  market_analyses?: Pick<MarketAnalysis, "id" | "symbol" | "htf_bias"> | null;
};

// ============================================================
// MARKET DATA (mock / provider types)
// ============================================================
export interface OHLCV {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Ticker {
  symbol: string;
  displayName: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume?: number;
  category: SymbolCategory;
  isMock?: boolean;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W";

export interface MarketDataProvider {
  fetchOHLCV(symbol: string, timeframe: Timeframe, limit?: number): Promise<OHLCV[]>;
  fetchTicker(symbol: string): Promise<Ticker | null>;
  fetchTickers(symbols: string[]): Promise<Ticker[]>;
  isAvailable(): boolean;
}
