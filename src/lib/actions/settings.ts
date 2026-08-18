"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface RiskSettingsData {
  max_risk_per_trade: number;
  max_daily_risk: number;
  max_trades_per_day: number;
  min_rr: number;
  default_account_size: number;
  currency: string;
}

export async function saveRiskSettings(data: RiskSettingsData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Upsert — update if exists, insert if not
  const { data: existing } = await (supabase as any)
    .from("risk_settings")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing?.id) {
    await (supabase as any)
      .from("risk_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await (supabase as any)
      .from("risk_settings")
      .insert({ ...data, user_id: user.id });
  }

  revalidatePath("/settings/preferences");
  revalidatePath("/dashboard");
  revalidatePath("/trading/risk-calculator");
  return true;
}
