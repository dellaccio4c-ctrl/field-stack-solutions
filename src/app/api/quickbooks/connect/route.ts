import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, qboConfigured } from "@/lib/quickbooks";

export async function GET() {
  if (!qboConfigured())
    return new Response("QuickBooks isn't configured — add QBO_CLIENT_ID and QBO_CLIENT_SECRET.", { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "owner") redirect("/app");

  // State ties the callback to this user (verified again server-side there).
  redirect(authorizeUrl(user.id));
}
