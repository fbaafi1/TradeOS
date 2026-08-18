"use server";

import { createClient } from "@/lib/supabase/server";

interface PlanData {
  plan_date?: string;
  session?: string | null;
  instruments?: string[];
  market_bias?: string | null;
  key_levels?: string | null;
  expected_setups?: string | null;
  important_news?: string | null;
  max_trades?: number | null;
  max_risk_percent?: number | null;
  conditions_to_trade?: string | null;
  conditions_to_avoid?: string | null;
  notes?: string | null;
  analysis_ids?: string[];
}

export async function createTradingPlan(
  data: PlanData
): Promise<{ error?: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("trading_plans").insert({
    ...data,
    user_id: user.id,
    plan_date: data.plan_date ?? new Date().toISOString().split("T")[0],
    instruments: data.instruments ?? [],
    analysis_ids: data.analysis_ids ?? [],
  });

  if (error) return { error: (error as { message: string }).message };
  return null;
}

export async function updateTradingPlan(
  id: string,
  data: Partial<PlanData>
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("trading_plans")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: (error as { message: string }).message };
  return null;
}
