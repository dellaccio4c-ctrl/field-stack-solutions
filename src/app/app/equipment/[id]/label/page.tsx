import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LabelCard } from "./label-card";

export default async function EquipmentLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: eq } = await supabase
    .from("equipment")
    .select("id, name, serial_number, unit_number, brand, model, customers(name), locations(label)")
    .eq("id", id)
    .single();
  if (!eq) notFound();

  return (
    <LabelCard
      equipment={{
        id: eq.id,
        name: eq.name,
        serial_number: eq.serial_number,
        unit_number: eq.unit_number,
        brand: eq.brand,
        model: eq.model,
        customerName:
          (eq.customers as unknown as { name: string } | null)?.name ?? null,
        locationLabel:
          (eq.locations as unknown as { label: string } | null)?.label ?? null,
      }}
    />
  );
}
