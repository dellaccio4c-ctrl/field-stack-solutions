import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase auth redirects (invite links, password resets).
// Exchanges the one-time code for a session, then forwards to `next`.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=invite_link_invalid", url.origin)
  );
}
