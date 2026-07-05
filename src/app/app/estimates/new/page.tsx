import { createClient } from "@/lib/supabase/server";
import { NewEstimateForm } from "./new-estimate-form";

export default async function NewEstimatePage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, locations(id, label)")
    .order("name");

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-6">
        New Estimate
      </h1>
      <NewEstimateForm customers={customers ?? []} />
    </div>
  );
}
