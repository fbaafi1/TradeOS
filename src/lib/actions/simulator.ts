"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface SimTradeData {
  instrument: string;
  direction: "long" | "short";
  trade_date: string;
  trade_time?: string | null;
  session?: string | null;
  timeframe?: string | null;
  htf_bias?: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  exit_price?: number | null;
  account_size?: number | null;
  risk_percentage?: number | null;
  risk_amount?: number | null;
  position_size?: number | null;
  potential_profit?: number | null;
  risk_reward_ratio?: number | null;
  result: "win" | "loss" | "breakeven" | "pending";
  pnl?: number | null;
  r_multiple?: number | null;
  setup_notes?: string | null;
  reason_for_entry?: string | null;
  what_went_well?: string | null;
  what_went_wrong?: string | null;
  lesson_learned?: string | null;
  followed_plan?: boolean | null;
  followed_strategy?: boolean | null;
  broke_rules?: boolean | null;
  rule_notes?: string | null;
  psychology_before?: string[];
  psychology_after?: Record<string, unknown>;
  is_backtest?: boolean;
  strategy_id?: string | null;
  analysis_id?: string | null;
  plan_id?: string | null;
}

export async function createSimulatedTrade(data: SimTradeData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: created, error } = await (supabase as any)
    .from("simulated_trades")
    .insert({
      ...data,
      user_id: user.id,
      psychology_before: data.psychology_before ?? [],
      psychology_after: data.psychology_after ?? {},
      is_backtest: data.is_backtest ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("[createSimulatedTrade]", error);
    return null;
  }

  revalidatePath("/trading/simulator");
  revalidatePath("/dashboard");
  revalidatePath("/analytics/performance");
  return created;
}

export async function updateSimulatedTrade(id: string, data: Partial<SimTradeData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: updated, error } = await (supabase as any)
    .from("simulated_trades")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[updateSimulatedTrade]", error);
    return null;
  }

  revalidatePath("/trading/simulator");
  revalidatePath("/analytics/performance");
  return updated;
}

export async function deleteSimulatedTrade(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await (supabase as any)
    .from("simulated_trades")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteSimulatedTrade]", error);
    return false;
  }

  revalidatePath("/trading/simulator");
  revalidatePath("/dashboard");
  revalidatePath("/analytics/performance");
  return true;
}
