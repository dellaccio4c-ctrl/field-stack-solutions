import { NextResponse } from "next/server";
import { buildInvoicePdf } from "@/lib/pdf/build";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await buildInvoicePdf(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.number}.pdf"`,
    },
  });
}
