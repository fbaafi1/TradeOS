import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Single-user server client.
 * Uses the service role key — bypasses RLS entirely.
 * Falls back to anon key if service role key is not set
 * (safe because RLS is disabled on all Trade OS tables).
 */
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
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
  return (
    process.env.SINGLE_USER_ID ??
    process.env.NEXT_PUBLIC_SINGLE_USER_ID ??
    "00000000-0000-0000-0000-000000000001"
  );
}
