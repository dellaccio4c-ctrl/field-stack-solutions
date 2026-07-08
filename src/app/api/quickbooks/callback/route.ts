import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, qboConfigured } from "@/lib/quickbooks";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  const dest = (ok: boolean, msg?: string) =>
    NextResponse.redirect(
      `https://www.fieldstacksolutions.com/app/quickbooks?${ok ? "connected=1" : `error=${encodeURIComponent(msg ?? "connection failed")}`}`
    );

  if (!qboConfigured()) return dest(false, "QuickBooks keys missing");
  if (!code || !realmId) return dest(false, "Missing code from Intuit");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== state) return dest(false, "Session mismatch — sign in and try again");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "owner") return dest(false, "Owners only");

  try {
    const tokens = await exchangeCode(code);
    // Single-company setup: replace any prior connection.
    await supabase.from("qbo_connection").delete().neq("realm_id", "");
    const { error } = await supabase.from("qbo_connection").insert({
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_by: user.id,
    });
    if (error) return dest(false, error.message);
    return dest(true);
  } catch (e) {
    return dest(false, e instanceof Error ? e.message : "Token exchange failed");
  }
}
