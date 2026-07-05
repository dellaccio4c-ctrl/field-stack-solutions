import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint for the marketing-page quote form.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const fullName = String(body.full_name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const service = String(body.service ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!fullName || !phone || !email) {
    return NextResponse.json(
      { error: "Name, phone, and email are required." },
      { status: 400 }
    );
  }
  if (fullName.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase.from("leads").insert({
    full_name: fullName,
    phone,
    email,
    service: service || null,
    message: message || null,
  });
  if (error)
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
