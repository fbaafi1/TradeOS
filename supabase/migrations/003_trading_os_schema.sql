-- ============================================================
-- TradeOS — Core Daily Trading OS Schema
-- Migration 003: The mechanical trading operating system
-- Run AFTER 001 and 002 in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- NO-TRADE FILTER CONDITIONS
-- Each condition has auto-detection capability
-- ============================================================
CREATE TABLE IF NOT EXISTS no_trade_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_auto_detected BOOLEAN NOT NULL DEFAULT false,
  is_hard_block BOOLEAN NOT NULL DEFAULT true,  -- hard = block trade, soft = warn
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_no_trade_conditions_user_id ON no_trade_conditions(user_id);

-- ============================================================
-- TRADING DAYS — One record per calendar date
-- The "container" for all daily OS data
-- ============================================================
CREATE TABLE IF NOT EXISTS trading_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,

  -- Session status
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','pre_market','ready','no_trade','trading','session_complete')),

  -- Outcome summary (computed/cached)
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  breakeven_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_r DECIMAL(8,2) NOT NULL DEFAULT 0,
  rule_violations INTEGER NOT NULL DEFAULT 0,

  -- No-trade blocked
  no_trade_blocked BOOLEAN NOT NULL DEFAULT false,
  no_trade_reason TEXT,

  -- Losing streak at start of day
  losing_streak_at_open INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_trading_days_user_id ON trading_days(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_days_date ON trading_days(trade_date);

-- ============================================================
-- PRE-MARKET CHECKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS pre_market_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  -- A. Market Environment
  htf_bias TEXT,           -- bullish / bearish / neutral / unclear
  daily_structure TEXT,
  h4_structure TEXT,
  h1_structure TEXT,
  market_condition TEXT    -- trending / ranging / consolidating / choppy / expanding
    CHECK (market_condition IN ('trending','ranging','consolidating','choppy','expanding')),

  -- B. Liquidity levels (JSON array of {label, price, notes})
  liquidity_levels JSONB NOT NULL DEFAULT '[]',

  -- C. Key Levels (JSON array of {price, type, importance, notes})
  key_levels JSONB NOT NULL DEFAULT '[]',

  -- D. IF/THEN Scenarios (JSON array of {conditions: string[], actions: string[]})
  scenarios JSONB NOT NULL DEFAULT '[]',

  -- General notes
  notes TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trading_day_id)
);

CREATE INDEX IF NOT EXISTS idx_pre_market_checklists_day ON pre_market_checklists(trading_day_id);

-- ============================================================
-- NO-TRADE FILTER — Daily evaluation
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_no_trade_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  -- JSON array of {condition_id, condition_name, status: pass|fail|na, note, is_auto_detected}
  evaluations JSONB NOT NULL DEFAULT '[]',

  overall_pass BOOLEAN,  -- null = not evaluated, true = can trade, false = no trade
  override_reason TEXT,  -- if user overrides a hard block

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trading_day_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_no_trade_filters_day ON daily_no_trade_filters(trading_day_id);

-- ============================================================
-- NEWS EVENTS — Per trading day
-- ============================================================
CREATE TABLE IF NOT EXISTS news_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  event_time TIME NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  event_name TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'medium'
    CHECK (impact IN ('high','medium','low')),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_events_day ON news_events(trading_day_id);

-- ============================================================
-- MARKET ANALYSIS — Per day per timeframe (screenshots + notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_market_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  timeframe TEXT NOT NULL,  -- Daily, 4H, 1H, 15M, 5M, 1M
  timeframe_group TEXT NOT NULL DEFAULT 'higher'
    CHECK (timeframe_group IN ('higher','entry')),

  bias TEXT,           -- bullish / bearish / neutral
  structure TEXT,      -- HH/HL, LH/LL, ranging, etc.
  liquidity TEXT,
  notes TEXT,
  screenshot_path TEXT, -- Supabase storage path

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trading_day_id, timeframe)
);

CREATE INDEX IF NOT EXISTS idx_daily_market_analysis_day ON daily_market_analysis(trading_day_id);

-- ============================================================
-- PSYCHOLOGY LOG — Daily state before/after trading
-- ============================================================
CREATE TABLE IF NOT EXISTS psychology_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  -- Pre-session
  state_before TEXT[],        -- ['Calm', 'Focused', ...]
  trading_for_right_reason BOOLEAN,  -- Am I trading because setup exists?
  pre_notes TEXT,

  -- Post-session
  state_after TEXT[],
  emotions_affected_execution BOOLEAN,
  post_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trading_day_id)
);

CREATE INDEX IF NOT EXISTS idx_psychology_logs_day ON psychology_logs(trading_day_id);

-- ============================================================
-- TRADES — The real trade execution log (replaces simulated_trades)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  trade_number INTEGER,  -- 1, 2, 3... per day
  trade_date DATE NOT NULL,
  trade_time TIME,

  pair TEXT NOT NULL DEFAULT 'EURUSD',
  direction TEXT NOT NULL CHECK (direction IN ('buy','sell')),

  -- Execution
  entry_price DECIMAL(18,8),
  stop_loss DECIMAL(18,8),
  take_profit DECIMAL(18,8),
  lot_size DECIMAL(18,6),
  exit_price DECIMAL(18,8),

  -- Risk (calculated)
  account_size DECIMAL(18,2),
  risk_percent DECIMAL(5,2),
  risk_amount DECIMAL(18,2),
  reward_amount DECIMAL(18,2),
  rr_ratio DECIMAL(5,2),

  -- Outcome
  result TEXT NOT NULL DEFAULT 'open'
    CHECK (result IN ('open','win','loss','breakeven','cancelled')),
  pnl DECIMAL(18,2),
  r_multiple DECIMAL(8,2),

  -- Entry context
  entry_model TEXT,            -- ICT OB, FVG, MSS, etc.
  session TEXT,                -- London, New York, Asian

  -- Setup validation score (e.g. 9/10)
  setup_score INTEGER,
  setup_checklist JSONB DEFAULT '[]',  -- [{item, checked}]

  -- Psychology per trade
  psychology_before TEXT[],
  psychology_during TEXT,
  psychology_after TEXT,
  emotions_affected BOOLEAN,

  -- Review
  followed_setup BOOLEAN,
  followed_risk_rules BOOLEAN,
  correct_location BOOLEAN,
  waited_for_confirmation BOOLEAN,
  managed_correctly BOOLEAN,
  win_loss_cause TEXT,  -- strategy / execution / luck

  -- Trade category
  trade_category TEXT,  -- good_win / good_loss / bad_win / bad_loss

  -- Notes & screenshot
  notes TEXT,
  screenshot_path TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_trades_user_id ON journal_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_day ON journal_trades(trading_day_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_date ON journal_trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_journal_trades_result ON journal_trades(result);
CREATE INDEX IF NOT EXISTS idx_journal_trades_pair ON journal_trades(pair);

-- ============================================================
-- TRADE MANAGEMENT ACTIONS — For each open trade
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_management_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL
    CHECK (action_type IN ('partial_close','move_sl','move_tp','breakeven','manual_exit','note')),
  action_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_at_action DECIMAL(18,8),
  new_sl DECIMAL(18,8),
  new_tp DECIMAL(18,8),
  partial_size DECIMAL(18,6),
  reason TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_management_actions_trade ON trade_management_actions(trade_id);

-- ============================================================
-- POST-TRADE REVIEW — Per trade
-- ============================================================
CREATE TABLE IF NOT EXISTS post_trade_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,

  followed_setup BOOLEAN,
  followed_risk_rules BOOLEAN,
  correct_location BOOLEAN,
  waited_for_confirmation BOOLEAN,
  managed_correctly BOOLEAN,
  win_loss_cause TEXT CHECK (win_loss_cause IN ('strategy','execution','both','luck')),
  trade_category TEXT CHECK (trade_category IN ('good_win','good_loss','bad_win','bad_loss')),

  what_went_well TEXT,
  what_went_wrong TEXT,
  lesson_learned TEXT,
  improvement TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trade_id)
);

CREATE INDEX IF NOT EXISTS idx_post_trade_reviews_trade ON post_trade_reviews(trade_id);

-- ============================================================
-- END-OF-DAY REVIEW — Per trading day
-- ============================================================
CREATE TABLE IF NOT EXISTS eod_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_day_id UUID NOT NULL REFERENCES trading_days(id) ON DELETE CASCADE,

  -- Summary
  total_trades INTEGER,
  wins INTEGER,
  losses INTEGER,
  breakeven INTEGER,
  total_pnl DECIMAL(18,2),
  total_r DECIMAL(8,2),
  best_trade_id UUID REFERENCES journal_trades(id) ON DELETE SET NULL,
  worst_trade_id UUID REFERENCES journal_trades(id) ON DELETE SET NULL,
  rule_violations INTEGER DEFAULT 0,

  -- Qualitative review
  what_went_well TEXT,
  what_went_badly TEXT,
  lessons_learned TEXT,
  improvements_tomorrow TEXT,

  -- Final question
  followed_trade_os TEXT CHECK (followed_trade_os IN ('yes','partially','no')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trading_day_id)
);

CREATE INDEX IF NOT EXISTS idx_eod_reviews_day ON eod_reviews(trading_day_id);

-- ============================================================
-- TRADE OS RULES (editable from Settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_os_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,  -- pre_market / no_trade_filter / setup / entry / psychology / general
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'soft' CHECK (rule_type IN ('hard','soft')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_os_rules_user_id ON trade_os_rules(user_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE TRIGGER no_trade_conditions_updated_at BEFORE UPDATE ON no_trade_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trading_days_updated_at BEFORE UPDATE ON trading_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER pre_market_checklists_updated_at BEFORE UPDATE ON pre_market_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER daily_no_trade_filters_updated_at BEFORE UPDATE ON daily_no_trade_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER news_events_updated_at BEFORE UPDATE ON news_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER daily_market_analysis_updated_at BEFORE UPDATE ON daily_market_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER psychology_logs_updated_at BEFORE UPDATE ON psychology_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER journal_trades_updated_at BEFORE UPDATE ON journal_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER post_trade_reviews_updated_at BEFORE UPDATE ON post_trade_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER eod_reviews_updated_at BEFORE UPDATE ON eod_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trade_os_rules_updated_at BEFORE UPDATE ON trade_os_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE no_trade_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_market_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_no_trade_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_management_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_trade_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE eod_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_os_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own no_trade_conditions" ON no_trade_conditions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own trading_days" ON trading_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own pre_market_checklists" ON pre_market_checklists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own daily_no_trade_filters" ON daily_no_trade_filters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own news_events" ON news_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own daily_market_analysis" ON daily_market_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own psychology_logs" ON psychology_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own journal_trades" ON journal_trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own trade_management_actions" ON trade_management_actions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own post_trade_reviews" ON post_trade_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own eod_reviews" ON eod_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own trade_os_rules" ON trade_os_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED: Default No-Trade Conditions for new users
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_trade_os_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Default No-Trade Filter conditions
  INSERT INTO no_trade_conditions (user_id, name, description, is_auto_detected, is_hard_block, sort_order) VALUES
    (NEW.id, 'Price in the middle of nowhere', 'Price is not at a meaningful liquidity or structural location.', false, true, 1),
    (NEW.id, 'Slow and choppy price action', 'Price is moving in a slow, indecisive, overlapping manner.', false, true, 2),
    (NEW.id, 'Monday', 'Mondays often have erratic price action from weekend gaps and repositioning.', true, false, 3),
    (NEW.id, 'Friday', 'Fridays often see liquidity grabs and reversals ahead of weekend.', true, false, 4),
    (NEW.id, 'December', 'Low liquidity holiday season — unpredictable price action.', true, true, 5),
    (NEW.id, 'Immediately before/after high-impact news', 'Avoid 30 minutes before and after high-impact news events.', false, true, 6),
    (NEW.id, 'Not in the right mental state', 'Feeling anxious, angry, fearful, greedy, or revenge trading.', false, true, 7),
    (NEW.id, 'Active losing streak', 'Current losing streak has reached or exceeded threshold.', true, false, 8),
    (NEW.id, 'Last trading day of the month', 'Month-end liquidity conditions are often unpredictable.', true, false, 9);

  -- Default Trade OS rules
  INSERT INTO trade_os_rules (user_id, section, name, description, rule_type, sort_order) VALUES
    (NEW.id, 'setup', 'Correct market location', 'Trade must be at a meaningful structural or liquidity level.', 'hard', 1),
    (NEW.id, 'setup', 'Liquidity identified', 'Clearly identify buy-side and sell-side liquidity.', 'hard', 2),
    (NEW.id, 'setup', 'Liquidity swept', 'Confirm that liquidity has been taken before entry.', 'hard', 3),
    (NEW.id, 'setup', 'Displacement occurred', 'Strong, impulsive move away from the liquidity level.', 'hard', 4),
    (NEW.id, 'setup', 'Market structure shift confirmed', 'Lower timeframe MSS in the intended trade direction.', 'hard', 5),
    (NEW.id, 'entry', 'Entry model confirmed', 'Entry aligns with your defined entry model (OB, FVG, etc.).', 'hard', 6),
    (NEW.id, 'entry', 'Risk acceptable', 'Risk is within your defined maximum per-trade risk.', 'hard', 7),
    (NEW.id, 'entry', 'No high-impact news conflict', 'No high-impact news within 30 minutes of entry.', 'hard', 8),
    (NEW.id, 'psychology', 'Mental state acceptable', 'You are calm, focused, and trading for the right reason.', 'hard', 9),
    (NEW.id, 'general', 'Trade follows Trade OS', 'This trade passes all Trade OS conditions.', 'hard', 10);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_trade_os
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_trade_os_defaults();
