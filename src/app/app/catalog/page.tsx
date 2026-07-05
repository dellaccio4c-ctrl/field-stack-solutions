import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/money";
import { CatalogManager } from "./catalog-manager";

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Services Catalog
        </h1>
      </div>
      <p className="text-[#5a6b85] mb-6">
        Saved products and services with preset prices — pick them when building
        estimates and invoices. Deactivated items stay on old documents but
        can&apos;t be added to new ones.
      </p>
      <CatalogManager
        items={(items ?? []).map((i) => ({
          ...i,
          priceLabel: money(i.unit_price),
        }))}
      />
    </div>
  );
}
