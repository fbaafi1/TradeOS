-- ============================================================
-- TradeOS Analysis Schema — Migration 002
-- Adds tables for the analysis-focused platform:
-- watchlists, chart layouts, drawings, market analyses,
-- simulated trades, trading rules, and screenshots.
-- Run AFTER 001_initial_schema.sql in the Supabase SQL editor.
-- ============================================================

-- ============================================================
-- RISK SETTINGS (user-level)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_risk_per_trade DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  max_daily_risk DECIMAL(5, 2) NOT NULL DEFAULT 3.0,
  max_trades_per_day INTEGER NOT NULL DEFAULT 3,
  min_rr DECIMAL(5, 2) NOT NULL DEFAULT 2.0,
  default_account_size DECIMAL(18, 2) NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_settings_user_id ON risk_settings(user_id);

-- ============================================================
-- WATCHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

CREATE TABLE IF NOT EXISTS watchlist_symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  display_name TEXT,
  category TEXT NOT NULL DEFAULT 'forex' CHECK (category IN ('forex', 'crypto', 'indices', 'commodities', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_symbols_watchlist_id ON watchlist_symbols(watchlist_id);

-- ============================================================
-- CHART LAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_type TEXT NOT NULL DEFAULT 'single' CHECK (layout_type IN ('single', 'dual', 'quad')),
  -- JSON array of panel configs: [{symbol, timeframe, indicators}]
  panels JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_layouts_user_id ON chart_layouts(user_id);

-- ============================================================
-- CHART DRAWINGS (persist per symbol+timeframe)
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  drawing_type TEXT NOT NULL,
  -- Full drawing data serialized as JSON (points, style, labels, etc.)
  data JSONB NOT NULL DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_drawings_user_id ON chart_drawings(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_drawings_symbol_tf ON chart_drawings(symbol, timeframe);

-- ============================================================
-- MARKET ANALYSES
-- ============================================================
CREATE TABLE IF NOT EXISTS market_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  timeframe TEXT,

  -- Bias
  htf_bias TEXT CHECK (htf_bias IN ('bullish', 'bearish', 'neutral')),
  bias_notes TEXT,

  -- Structure
  market_structure TEXT[], -- e.g. ['HH', 'HL', 'bullish_bos']

  -- Liquidity
  buy_side_liquidity TEXT,
  sell_side_liquidity TEXT,
  prev_day_high DECIMAL(18, 8),
  prev_day_low DECIMAL(18, 8),
  equal_highs TEXT,
  equal_lows TEXT,

  -- Levels
  key_levels JSONB DEFAULT '[]', -- [{price, label, notes}]

  -- Setup
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  setup_notes TEXT,

  -- Analysis
  analysis_notes TEXT,
  invalidation TEXT,
  targets JSONB DEFAULT '[]', -- [{price, label}]

  -- Chart snapshot
  chart_image_path TEXT,

  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_analyses_user_id ON market_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_market_analyses_symbol ON market_analyses(symbol);
CREATE INDEX IF NOT EXISTS idx_market_analyses_date ON market_analyses(analysis_date);

-- ============================================================
-- TRADING PLANS (daily/session)
-- ============================================================
CREATE TABLE IF NOT EXISTS trading_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session TEXT, -- Asian, London, New York
  instruments TEXT[] DEFAULT '{}',
  market_bias TEXT,
  key_levels TEXT,
  expected_setups TEXT,
  important_news TEXT,
  max_trades INTEGER,
  max_risk_percent DECIMAL(5, 2),
  conditions_to_trade TEXT,
  conditions_to_avoid TEXT,
  notes TEXT,
  -- Linked analyses
  analysis_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Functional unique index: one plan per user/date/session (treating NULL session as empty string)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trading_plans_unique
  ON trading_plans(user_id, plan_date, COALESCE(session, ''));

CREATE INDEX IF NOT EXISTS idx_trading_plans_user_id ON trading_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_plans_date ON trading_plans(plan_date);

-- ============================================================
-- SIMULATED TRADES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE sim_direction AS ENUM ('long', 'short');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sim_result AS ENUM ('win', 'loss', 'breakeven', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS simulated_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES market_analyses(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES trading_plans(id) ON DELETE SET NULL,

  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trade_time TIME,
  instrument TEXT NOT NULL,
  direction sim_direction NOT NULL,
  session TEXT,
  timeframe TEXT,

  -- Setup
  htf_bias TEXT,
  setup_notes TEXT,
  setup_score DECIMAL(5, 2),

  -- Prices
  entry_price DECIMAL(18, 8),
  stop_loss DECIMAL(18, 8),
  take_profit DECIMAL(18, 8),
  exit_price DECIMAL(18, 8),

  -- Risk
  account_size DECIMAL(18, 2),
  risk_percentage DECIMAL(5, 2),
  risk_amount DECIMAL(18, 2),
  position_size DECIMAL(18, 6),
  potential_profit DECIMAL(18, 2),
  risk_reward_ratio DECIMAL(5, 2),

  -- Outcome
  result sim_result DEFAULT 'pending',
  pnl DECIMAL(18, 2),
  r_multiple DECIMAL(8, 2),

  -- Psychology
  psychology_before TEXT[] DEFAULT '{}',
  psychology_after JSONB DEFAULT '{}',

  -- Review
  reason_for_entry TEXT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  lesson_learned TEXT,

  -- Rule tracking
  followed_plan BOOLEAN,
  followed_strategy BOOLEAN,
  broke_rules BOOLEAN,
  rule_notes TEXT,

  is_backtest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulated_trades_user_id ON simulated_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_date ON simulated_trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_instrument ON simulated_trades(instrument);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_result ON simulated_trades(result);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_is_backtest ON simulated_trades(is_backtest);

-- ============================================================
-- SCREENSHOTS / IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  -- Polymorphic link (one of these)
  analysis_id UUID REFERENCES market_analyses(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES trading_plans(id) ON DELETE SET NULL,
  simulated_trade_id UUID REFERENCES simulated_trades(id) ON DELETE SET NULL,
  backtest_id UUID REFERENCES backtests(id) ON DELETE SET NULL,
  screenshot_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(user_id);

-- ============================================================
-- TRADING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS trading_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('risk', 'entry', 'exit', 'psychology', 'session', 'strategy', 'general')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_rules_user_id ON trading_rules(user_id);

-- ============================================================
-- RULE VIOLATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS rule_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES trading_rules(id) ON DELETE SET NULL,
  simulated_trade_id UUID REFERENCES simulated_trades(id) ON DELETE SET NULL,
  violation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_violations_user_id ON rule_violations(user_id);

-- ============================================================
-- AI INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL DEFAULT 'behavioral',
  content TEXT NOT NULL,
  data_snapshot JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);

-- ============================================================
-- UPDATED_AT TRIGGERS (new tables)
-- ============================================================
CREATE TRIGGER risk_settings_updated_at BEFORE UPDATE ON risk_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER watchlists_updated_at BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chart_layouts_updated_at BEFORE UPDATE ON chart_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chart_drawings_updated_at BEFORE UPDATE ON chart_drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_analyses_updated_at BEFORE UPDATE ON market_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trading_plans_updated_at BEFORE UPDATE ON trading_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER simulated_trades_updated_at BEFORE UPDATE ON simulated_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trading_rules_updated_at BEFORE UPDATE ON trading_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own risk settings" ON risk_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own watchlist symbols" ON watchlist_symbols
  FOR ALL USING (
    EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
  );

CREATE POLICY "Users manage own chart layouts" ON chart_layouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own chart drawings" ON chart_drawings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own market analyses" ON market_analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trading plans" ON trading_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own simulated trades" ON simulated_trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own screenshots" ON screenshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trading rules" ON trading_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own rule violations" ON rule_violations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own ai insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED FUNCTION: Extend initialize_user_defaults for new tables
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_user_defaults_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Default risk settings
  INSERT INTO risk_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Default watchlist
  INSERT INTO watchlists (user_id, name, is_default) VALUES (NEW.id, 'My Watchlist', true);

  -- Default watchlist symbols (populate after watchlist insert)
  WITH w AS (SELECT id FROM watchlists WHERE user_id = NEW.id AND is_default = true LIMIT 1)
  INSERT INTO watchlist_symbols (watchlist_id, symbol, display_name, category, sort_order)
  SELECT w.id, s.symbol, s.display_name, s.category, s.sort_order
  FROM w, (VALUES
    ('EURUSD', 'EUR/USD', 'forex', 1),
    ('GBPUSD', 'GBP/USD', 'forex', 2),
    ('USDJPY', 'USD/JPY', 'forex', 3),
    ('XAUUSD', 'XAU/USD', 'commodities', 4),
    ('BTCUSD', 'BTC/USD', 'crypto', 5),
    ('ETHUSD', 'ETH/USD', 'crypto', 6)
  ) AS s(symbol, display_name, category, sort_order);

  -- Default trading rules
  INSERT INTO trading_rules (user_id, name, description, category, severity, sort_order) VALUES
    (NEW.id, 'Maximum risk per trade', 'Never risk more than your configured maximum per trade.', 'risk', 'critical', 1),
    (NEW.id, 'Maximum daily loss', 'Stop trading when daily loss limit is reached.', 'risk', 'critical', 2),
    (NEW.id, 'Minimum R:R ratio', 'Only take trades with at least 1:2 risk-to-reward.', 'entry', 'warning', 3),
    (NEW.id, 'No FOMO entries', 'Do not enter trades just because the market moved without you.', 'psychology', 'warning', 4),
    (NEW.id, 'No revenge trading', 'Do not take a trade immediately after a loss to recover.', 'psychology', 'critical', 5),
    (NEW.id, 'Confirm higher timeframe bias', 'Always check HTF bias before entering a trade.', 'entry', 'warning', 6),
    (NEW.id, 'No moving stop loss further', 'Never move SL in the wrong direction once set.', 'exit', 'critical', 7),
    (NEW.id, 'Allowed sessions only', 'Only trade during your pre-defined sessions.', 'session', 'warning', 8);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new trigger for v2 defaults (separate from existing trigger)
CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_defaults_v2();

-- ============================================================
-- STORAGE BUCKET: chart-screenshots (private)
-- Create in Supabase Dashboard → Storage → New bucket
-- Name: chart-screenshots
-- Public: false
-- Allowed MIME: image/png, image/jpeg, image/webp
-- ============================================================
