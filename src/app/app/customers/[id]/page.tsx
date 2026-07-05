import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddLocationForm } from "./add-location-form";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*, locations(*)")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  return (
    <div>
      <Link
        href="/app/customers"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← All customers
      </Link>
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
            {customer.name}
          </h1>
          <div className="text-[#5a6b85] mt-1 text-sm space-x-4">
            {customer.contact_name && <span>👤 {customer.contact_name}</span>}
            {customer.email && <span>✉️ {customer.email}</span>}
            {customer.phone && <span>📞 {customer.phone}</span>}
          </div>
        </div>
      </div>

      {customer.billing_address && (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 mb-6">
          <div className="text-xs font-bold tracking-wider text-[#b9700f] mb-1">
            BILLING ADDRESS
          </div>
          <div className="text-[#0e1726]">{customer.billing_address}</div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-[#0e1726]">
          Sites ({customer.locations?.length ?? 0})
        </h2>
        <AddLocationForm customerId={customer.id} />
      </div>

      {!customer.locations?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-8 text-center text-[#5a6b85]">
          No sites yet. Add the customer&apos;s service locations here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customer.locations.map(
            (loc: {
              id: string;
              label: string;
              address: string;
              city: string | null;
              state: string | null;
              zip: string | null;
              notes: string | null;
            }) => (
              <div
                key={loc.id}
                className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm"
              >
                <div className="font-bold text-[#0e1726] mb-1">{loc.label}</div>
                <div className="text-sm text-[#5a6b85]">
                  {loc.address}
                  {loc.city && (
                    <>
                      <br />
                      {loc.city}
                      {loc.state ? `, ${loc.state}` : ""} {loc.zip ?? ""}
                    </>
                  )}
                </div>
                {loc.notes && (
                  <div className="text-xs text-[#5a6b85] mt-2 italic">
                    {loc.notes}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {customer.notes && (
        <div className="bg-[#fff2e3] rounded-2xl p-5 mt-6">
          <div className="text-xs font-bold tracking-wider text-[#b9700f] mb-1">
            NOTES
          </div>
          <div className="text-[#0e1726] text-sm">{customer.notes}</div>
        </div>
      )}
    </div>
  );
}
