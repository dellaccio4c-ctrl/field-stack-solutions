import { createClient } from "@/lib/supabase/server";
import { LeadRow } from "./lead-row";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const newCount = (leads ?? []).filter((l) => l.status === "new").length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Leads
        {newCount > 0 && (
          <span className="ml-3 align-middle text-sm bg-[#ff8a1e] text-white font-bold rounded-full px-3 py-1">
            {newCount} new
          </span>
        )}
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Service requests submitted through the website&apos;s quote form.
      </p>

      {!leads?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No leads yet. Requests from the &quot;Get a Quote&quot; form on the
          website will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
