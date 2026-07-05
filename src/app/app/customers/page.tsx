import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewCustomerForm } from "./new-customer-form";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, contact_name, email, phone, locations(id)")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Customers
        </h1>
        <NewCustomerForm />
      </div>

      {!customers?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No customers yet. Add your first customer to get started.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Name</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Email</th>
                <th className="px-5 py-3.5 font-semibold">Phone</th>
                <th className="px-5 py-3.5 font-semibold">Sites</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/app/customers/${c.id}`}
                      className="font-semibold text-[#0e1726] hover:text-[#b9700f]"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {c.contact_name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">{c.email ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">{c.phone ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {c.locations?.length ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
