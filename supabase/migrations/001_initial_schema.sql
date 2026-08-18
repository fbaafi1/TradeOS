-- TradeOS Initial Schema
-- Run in Supabase SQL Editor or via supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Account',
  starting_balance DECIMAL(18, 2) NOT NULL DEFAULT 10000,
  current_balance DECIMAL(18, 2) NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_risk_per_trade DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  max_daily_loss DECIMAL(5, 2) NOT NULL DEFAULT 3.0,
  max_trades_per_day INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ============================================================
-- STRATEGIES
-- ============================================================
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  market_conditions TEXT,
  preferred_pairs TEXT[] DEFAULT '{}',
  preferred_sessions TEXT[] DEFAULT '{}',
  preferred_timeframes TEXT[] DEFAULT '{}',
  entry_conditions TEXT,
  confirmation_conditions TEXT,
  stop_loss_rules TEXT,
  take_profit_rules TEXT,
  minimum_rr DECIMAL(5, 2) DEFAULT 2.0,
  invalidation_rules TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategies_user_id ON strategies(user_id);

CREATE TABLE strategy_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategy_conditions_strategy_id ON strategy_conditions(strategy_id);

-- ============================================================
-- MISTAKE CATEGORIES
-- ============================================================
CREATE TABLE mistake_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mistake_categories_user_id ON mistake_categories(user_id);

-- ============================================================
-- PSYCHOLOGY CATEGORIES (configurable)
-- ============================================================
CREATE TABLE psychology_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('before', 'after')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_psychology_categories_user_id ON psychology_categories(user_id);

-- ============================================================
-- CONTEXT FIELDS (configurable trade context checklist)
-- ============================================================
CREATE TABLE context_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_context_fields_user_id ON context_fields(user_id);

-- ============================================================
-- TRADING SESSIONS (configurable)
-- ============================================================
CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_sessions_user_id ON trading_sessions(user_id);

-- ============================================================
-- TRADES
-- ============================================================
CREATE TYPE trade_direction AS ENUM ('long', 'short');
CREATE TYPE trade_result AS ENUM ('win', 'loss', 'breakeven', 'open');

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,

  -- Basic info
  trade_date DATE NOT NULL,
  trade_time TIME,
  instrument TEXT NOT NULL,
  direction trade_direction NOT NULL,
  session TEXT,
  account_balance_at_trade DECIMAL(18, 2),

  -- Setup
  timeframe TEXT,
  htf_bias TEXT,
  entry_price DECIMAL(18, 8),
  stop_loss DECIMAL(18, 8),
  take_profit DECIMAL(18, 8),
  exit_price DECIMAL(18, 8),
  lot_size DECIMAL(18, 8),
  risk_percentage DECIMAL(5, 2),
  risk_amount DECIMAL(18, 2),
  expected_reward DECIMAL(18, 2),
  risk_reward_ratio DECIMAL(5, 2),
  setup_quality_score DECIMAL(5, 2),

  -- Context (JSON for flexible checklist)
  context_data JSONB DEFAULT '{}',

  -- Psychology
  psychology_before TEXT[] DEFAULT '{}',
  psychology_after JSONB DEFAULT '{}',

  -- Review
  reason_for_entry TEXT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  lesson_learned TEXT,
  mistake_category_id UUID REFERENCES mistake_categories(id) ON DELETE SET NULL,

  -- Outcome
  result trade_result DEFAULT 'open',
  pnl DECIMAL(18, 2),
  r_multiple DECIMAL(8, 2),

  is_backtest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_trade_date ON trades(trade_date);
CREATE INDEX idx_trades_instrument ON trades(instrument);
CREATE INDEX idx_trades_result ON trades(result);

CREATE TABLE trade_mistakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  mistake_category_id UUID NOT NULL REFERENCES mistake_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trade_id, mistake_category_id)
);

CREATE INDEX idx_trade_mistakes_trade_id ON trade_mistakes(trade_id);

CREATE TABLE trade_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  screenshot_type TEXT NOT NULL CHECK (screenshot_type IN ('before_entry', 'entry', 'exit')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_screenshots_trade_id ON trade_screenshots(trade_id);

-- ============================================================
-- DAILY PLANS & REVIEWS
-- ============================================================
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  market_bias TEXT,
  pairs_to_watch TEXT[] DEFAULT '{}',
  key_levels TEXT,
  liquidity_zones TEXT,
  important_news TEXT,
  trading_session TEXT,
  max_trades INTEGER,
  max_daily_risk DECIMAL(5, 2),
  entry_conditions TEXT,
  stay_out_conditions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);

CREATE INDEX idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX idx_daily_plans_plan_date ON daily_plans(plan_date);

CREATE TABLE daily_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE SET NULL,
  review_date DATE NOT NULL,
  followed_plan BOOLEAN,
  emotional_state TEXT,
  what_went_well TEXT,
  what_to_improve TEXT,
  lessons_learned TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_date)
);

CREATE INDEX idx_daily_reviews_user_id ON daily_reviews(user_id);

-- ============================================================
-- BACKTESTS
-- ============================================================
CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  pair TEXT NOT NULL,
  timeframe TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtests_user_id ON backtests(user_id);

CREATE TABLE backtest_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backtest_id UUID NOT NULL REFERENCES backtests(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  direction trade_direction NOT NULL,
  entry_price DECIMAL(18, 8) NOT NULL,
  stop_loss DECIMAL(18, 8) NOT NULL,
  take_profit DECIMAL(18, 8),
  exit_price DECIMAL(18, 8),
  result trade_result NOT NULL,
  r_multiple DECIMAL(8, 2),
  reason TEXT,
  notes TEXT,
  screenshot_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtest_trades_backtest_id ON backtest_trades(backtest_id);

-- ============================================================
-- ACCOUNT SNAPSHOTS
-- ============================================================
CREATE TABLE account_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  balance DECIMAL(18, 2) NOT NULL,
  equity DECIMAL(18, 2),
  daily_pnl DECIMAL(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, snapshot_date)
);

CREATE INDEX idx_account_snapshots_account_id ON account_snapshots(account_id);

-- ============================================================
-- PSYCHOLOGY ENTRIES (standalone tracking)
-- ============================================================
CREATE TABLE psychology_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  emotional_state TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_psychology_entries_user_id ON psychology_entries(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER strategies_updated_at BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trades_updated_at BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_plans_updated_at BEFORE UPDATE ON daily_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_reviews_updated_at BEFORE UPDATE ON daily_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER backtests_updated_at BEFORE UPDATE ON backtests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_entries ENABLE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY "Users manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Strategies policies
CREATE POLICY "Users manage own strategies" ON strategies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own strategy conditions" ON strategy_conditions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid())
  );

-- Mistake categories
CREATE POLICY "Users manage own mistake categories" ON mistake_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Psychology categories
CREATE POLICY "Users manage own psychology categories" ON psychology_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Context fields
CREATE POLICY "Users manage own context fields" ON context_fields
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trading sessions
CREATE POLICY "Users manage own trading sessions" ON trading_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trades
CREATE POLICY "Users manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trade mistakes" ON trade_mistakes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users manage own trade screenshots" ON trade_screenshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trades t WHERE t.id = trade_id AND t.user_id = auth.uid())
  );

-- Daily plans
CREATE POLICY "Users manage own daily plans" ON daily_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily reviews
CREATE POLICY "Users manage own daily reviews" ON daily_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backtests
CREATE POLICY "Users manage own backtests" ON backtests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own backtest trades" ON backtest_trades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM backtests b WHERE b.id = backtest_id AND b.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM backtests b WHERE b.id = backtest_id AND b.user_id = auth.uid())
  );

-- Account snapshots
CREATE POLICY "Users manage own account snapshots" ON account_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

-- Psychology entries
CREATE POLICY "Users manage own psychology entries" ON psychology_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase dashboard or via API)
-- Create bucket: trade-screenshots (private)
-- Policy: users can upload/read/delete their own files
-- ============================================================

-- ============================================================
-- SEED FUNCTION: Initialize default data for new users
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default account
  INSERT INTO accounts (user_id, name, starting_balance, current_balance)
  VALUES (NEW.id, 'Main Account', 10000, 10000);

  -- Default mistake categories
  INSERT INTO mistake_categories (user_id, name) VALUES
    (NEW.id, 'FOMO entry'),
    (NEW.id, 'Revenge trade'),
    (NEW.id, 'Overtrading'),
    (NEW.id, 'Moved stop-loss'),
    (NEW.id, 'Entered without confirmation'),
    (NEW.id, 'Ignored HTF bias'),
    (NEW.id, 'Traded outside session'),
    (NEW.id, 'Risked too much'),
    (NEW.id, 'Entered during restricted news'),
    (NEW.id, 'Broke strategy rules');

  -- Default psychology categories (before)
  INSERT INTO psychology_categories (user_id, name, category_type) VALUES
    (NEW.id, 'Calm', 'before'),
    (NEW.id, 'Confident', 'before'),
    (NEW.id, 'Fearful', 'before'),
    (NEW.id, 'FOMO', 'before'),
    (NEW.id, 'Revenge', 'before'),
    (NEW.id, 'Bored', 'before'),
    (NEW.id, 'Other', 'before');

  -- Default context fields
  INSERT INTO context_fields (user_id, label, sort_order) VALUES
    (NEW.id, 'Liquidity taken?', 1),
    (NEW.id, 'Market structure shift?', 2),
    (NEW.id, 'Fair Value Gap?', 3),
    (NEW.id, 'Order Block?', 4),
    (NEW.id, 'Premium/Discount?', 5),
    (NEW.id, 'Previous Day High/Low?', 6),
    (NEW.id, 'Session High/Low?', 7),
    (NEW.id, 'News nearby?', 8);

  -- Default trading sessions
  INSERT INTO trading_sessions (user_id, name, start_time, end_time) VALUES
    (NEW.id, 'Asian', '00:00', '09:00'),
    (NEW.id, 'London', '08:00', '17:00'),
    (NEW.id, 'New York', '13:00', '22:00');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_defaults();
