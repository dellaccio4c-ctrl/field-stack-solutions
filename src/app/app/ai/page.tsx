import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AiChat } from "./ai-chat";

export default async function AiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!me || me.role === "customer") redirect("/app");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Ask FieldStack
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Ask about your operations in plain English — work orders, sites,
        equipment, reports, closures{me.role === "owner" ? ", financials" : ""}.
        Answers come from live data and respect your access level.
      </p>
      <AiChat
        suggestions={[
          "Which sites have open work orders right now?",
          "Any site closures in the last 30 days, and why?",
          "Which equipment has the most work orders?",
          ...(me.role === "owner"
            ? ["How is revenue trending this month vs expenses?"]
            : ["What PM reports were submitted this week?"]),
        ]}
      />
    </div>
  );
}
