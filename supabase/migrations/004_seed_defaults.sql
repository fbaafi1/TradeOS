-- ============================================================
-- ONE-TIME SEED SCRIPT
-- Run this in Supabase SQL Editor for your existing account
-- It inserts default No-Trade conditions + Trade OS rules
-- Safe to run: uses DO NOTHING if records already exist
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get your user ID (the currently authenticated user)
  -- If you're running this from the SQL Editor, replace with your actual user ID
  -- You can find it in: Authentication → Users → copy the UUID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found. Make sure you are logged in.';
  END IF;

  RAISE NOTICE 'Seeding defaults for user: %', v_user_id;

  -- ──────────────────────────────────────────────────────────
  -- NO-TRADE FILTER CONDITIONS
  -- ──────────────────────────────────────────────────────────
  INSERT INTO no_trade_conditions
    (user_id, name, description, is_auto_detected, is_hard_block, sort_order)
  VALUES
    (v_user_id, 'Price in the middle of nowhere',
      'Price is not at a meaningful liquidity or structural location.',
      false, true, 1),
    (v_user_id, 'Slow and choppy price action',
      'Price is moving in a slow, indecisive, overlapping manner.',
      false, true, 2),
    (v_user_id, 'Monday',
      'Mondays often have erratic price action from weekend gaps and repositioning.',
      true, false, 3),
    (v_user_id, 'Friday',
      'Fridays often see liquidity grabs and reversals ahead of weekend.',
      true, false, 4),
    (v_user_id, 'December',
      'Low liquidity holiday season — unpredictable price action.',
      true, true, 5),
    (v_user_id, 'Immediately before/after high-impact news',
      'Avoid 30 minutes before and after high-impact news events.',
      false, true, 6),
    (v_user_id, 'Not in the right mental state',
      'Feeling anxious, angry, fearful, greedy, or revenge trading.',
      false, true, 7),
    (v_user_id, 'Active losing streak',
      'Current losing streak has reached or exceeded threshold.',
      true, false, 8),
    (v_user_id, 'Last trading day of the month',
      'Month-end liquidity conditions are often unpredictable.',
      true, false, 9)
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- TRADE OS RULES (Setup Checklist)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO trade_os_rules
    (user_id, section, name, description, rule_type, sort_order)
  VALUES
    (v_user_id, 'setup', 'Correct market location',
      'Trade must be at a meaningful structural or liquidity level.', 'hard', 1),
    (v_user_id, 'setup', 'Liquidity identified',
      'Clearly identify buy-side and sell-side liquidity.', 'hard', 2),
    (v_user_id, 'setup', 'Liquidity swept',
      'Confirm that liquidity has been taken before entry.', 'hard', 3),
    (v_user_id, 'setup', 'Displacement occurred',
      'Strong, impulsive move away from the liquidity level.', 'hard', 4),
    (v_user_id, 'setup', 'Market structure shift confirmed',
      'Lower timeframe MSS in the intended trade direction.', 'hard', 5),
    (v_user_id, 'entry', 'Entry model confirmed',
      'Entry aligns with your defined entry model (OB, FVG, etc.).', 'hard', 6),
    (v_user_id, 'entry', 'Risk acceptable',
      'Risk is within your defined maximum per-trade risk.', 'hard', 7),
    (v_user_id, 'entry', 'No high-impact news conflict',
      'No high-impact news within 30 minutes of entry.', 'hard', 8),
    (v_user_id, 'psychology', 'Mental state acceptable',
      'You are calm, focused, and trading for the right reason.', 'hard', 9),
    (v_user_id, 'general', 'Trade follows Trade OS',
      'This trade passes all Trade OS conditions.', 'hard', 10)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Done! Defaults seeded for user: %', v_user_id;
END;
$$;
