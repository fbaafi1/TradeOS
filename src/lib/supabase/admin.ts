import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Single-user server client.
 * Uses the service role key — bypasses RLS entirely.
 * No auth session needed.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Returns the fixed single-user ID from env.
 */
export function getSingleUserId(): string {
  return process.env.SINGLE_USER_ID ?? "00000000-0000-0000-0000-000000000001";
}
