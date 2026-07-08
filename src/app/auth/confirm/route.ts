import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Verifies invite / recovery links via token_hash — works in ANY browser,
// unlike the ?code= flow which needs the PKCE verifier cookie from the
// browser that created the link (invitees never have it).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "invite") as EmailOtpType;
  const next = url.searchParams.get("next") ?? "/welcome";

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(
    new URL("/login?error=invite_link_invalid", url.origin)
  );
}
