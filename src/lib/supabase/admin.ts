import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-side only, used for admin
// operations like creating user accounts. Requires SUPABASE_SERVICE_ROLE_KEY.

// Accept either casing of the env var name (some dashboards lowercase it).
function serviceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.supabase_service_role_key ??
    null
  );
}

export function adminConfigured() {
  return Boolean(serviceRoleKey());
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey()!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
