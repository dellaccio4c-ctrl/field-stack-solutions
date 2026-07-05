import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-side only, used for admin
// operations like creating user accounts. Requires SUPABASE_SERVICE_ROLE_KEY.

export function adminConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
