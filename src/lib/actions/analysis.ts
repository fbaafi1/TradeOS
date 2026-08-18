"use server";

import { createClient } from "@/lib/supabase/server";

interface AnalysisData {
  symbol: string;
  analysis_date?: string;
  timeframe?: string | null;
  htf_bias?: "bullish" | "bearish" | "neutral" | null;
  bias_notes?: string | null;
  market_structure?: string[] | null;
  buy_side_liquidity?: string | null;
  sell_side_liquidity?: string | null;
  key_levels?: object;
  strategy_id?: string | null;
  setup_notes?: string | null;
  analysis_notes?: string | null;
  invalidation?: string | null;
  targets?: object;
  is_archived?: boolean;
}

export async function createAnalysis(
  data: AnalysisData
): Promise<{ error?: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("market_analyses").insert({
    ...data,
    user_id: user.id,
    analysis_date: data.analysis_date ?? new Date().toISOString().split("T")[0],
    key_levels: data.key_levels ?? [],
    targets: data.targets ?? [],
    is_archived: data.is_archived ?? false,
  });

  if (error) return { error: (error as { message: string }).message };
  return null;
}

export async function updateAnalysis(
  id: string,
  data: Partial<AnalysisData>
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("market_analyses")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: (error as { message: string }).message };
  return null;
}

export async function archiveAnalysis(id: string): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("market_analyses")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: (error as { message: string }).message };
  return null;
}
