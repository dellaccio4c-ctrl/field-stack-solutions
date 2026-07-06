import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Ask FieldStack: Claude with read-only tools over the user's own Supabase
// session. RLS enforces the role ladder — a tool call by a field tech simply
// can't see owner-only financials, so the model can't leak them.

export const maxDuration = 60;

const MODEL = "claude-opus-4-8";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "query_work_orders",
    description:
      "List work orders. Filter by status (open/scheduled/in_progress/on_hold/completed/cancelled), type (service/preventative/pumping/install/inspection/network), or text search on the title. Returns number, title, status, priority, type, customer, site, created/completed dates, minutes on site.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        wo_type: { type: "string" },
        search: { type: "string" },
        limit: { type: "number", description: "max rows, default 30" },
      },
    },
  },
  {
    name: "query_sites",
    description:
      "List service locations (sites) with their customer, address, equipment count, and open work order count. Optional text search over label/city/state.",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "query_equipment",
    description:
      "List equipment/assets with brand, model, serial, site, install date, PM interval, status, plus each unit's total work order count. Optional text search.",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "query_report_entries",
    description:
      "Operational report submissions (opening/closing checklists, PM daily→annual, site closures, incident claims). Filter by form name (partial match), days back, or site name. Returns entry date, site, submitter data fields.",
    input_schema: {
      type: "object",
      properties: {
        form_name: { type: "string" },
        since_days: { type: "number", description: "default 30" },
        site_search: { type: "string" },
      },
    },
  },
  {
    name: "query_financials",
    description:
      "Financial summary: payments received (with dates), expenses, external/POS sales, and per-invoice status totals. Only returns data the asking user is allowed to see — empty results mean their role can't access financials, say so.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "query_customers",
    description:
      "List customers with site counts and (role permitting) invoice counts and statuses.",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
];

type Json = Record<string, unknown>;

async function runTool(
  supabase: SupabaseClient,
  name: string,
  input: Json
): Promise<string> {
  const lim = Math.min(Number(input.limit) || 30, 100);
  try {
    if (name === "query_work_orders") {
      let q = supabase
        .from("work_orders")
        .select(
          "number, title, status, priority, wo_type, created_at, completed_at, minutes_on_site, customers(name), locations(label)"
        )
        .order("created_at", { ascending: false })
        .limit(lim);
      if (input.status) q = q.eq("status", String(input.status));
      if (input.wo_type) q = q.eq("wo_type", String(input.wo_type));
      if (input.search) q = q.ilike("title", `%${input.search}%`);
      const { data, error } = await q;
      return error ? `error: ${error.message}` : JSON.stringify(data);
    }
    if (name === "query_sites") {
      let q = supabase
        .from("locations")
        .select(
          "label, city, state, customers(name), equipment(id), work_orders(status)"
        )
        .limit(100);
      if (input.search)
        q = q.or(
          `label.ilike.%${input.search}%,city.ilike.%${input.search}%,state.ilike.%${input.search}%`
        );
      const { data, error } = await q;
      if (error) return `error: ${error.message}`;
      return JSON.stringify(
        (data ?? []).map((s) => ({
          label: s.label,
          city: s.city,
          state: s.state,
          customer: (s.customers as unknown as { name: string } | null)?.name,
          equipment_count: (s.equipment as unknown as unknown[])?.length ?? 0,
          open_work_orders:
            (s.work_orders as unknown as { status: string }[])?.filter((w) =>
              ["open", "scheduled", "in_progress", "on_hold"].includes(w.status)
            ).length ?? 0,
        }))
      );
    }
    if (name === "query_equipment") {
      let q = supabase
        .from("equipment")
        .select(
          "name, category, brand, model, serial_number, unit_number, install_date, pm_interval_months, status, customers(name), locations(label), work_orders(id)"
        )
        .limit(lim);
      if (input.search)
        q = q.or(
          `name.ilike.%${input.search}%,brand.ilike.%${input.search}%,model.ilike.%${input.search}%,serial_number.ilike.%${input.search}%`
        );
      const { data, error } = await q;
      if (error) return `error: ${error.message}`;
      return JSON.stringify(
        (data ?? []).map((e) => ({
          ...e,
          customers: (e.customers as unknown as { name: string } | null)?.name,
          locations: (e.locations as unknown as { label: string } | null)?.label,
          work_order_count: (e.work_orders as unknown as unknown[])?.length ?? 0,
          work_orders: undefined,
        }))
      );
    }
    if (name === "query_report_entries") {
      const sinceDays = Number(input.since_days) || 30;
      const since = new Date(Date.now() - sinceDays * 86400000)
        .toISOString()
        .slice(0, 10);
      let q = supabase
        .from("ops_entries")
        .select("entry_date, data, ops_forms(name), locations(label)")
        .gte("entry_date", since)
        .order("entry_date", { ascending: false })
        .limit(100);
      const { data, error } = await q;
      if (error) return `error: ${error.message}`;
      let rows = (data ?? []).map((e) => ({
        date: e.entry_date,
        form: (e.ops_forms as unknown as { name: string } | null)?.name,
        site: (e.locations as unknown as { label: string } | null)?.label,
        data: e.data,
      }));
      if (input.form_name)
        rows = rows.filter((r) =>
          r.form?.toLowerCase().includes(String(input.form_name).toLowerCase())
        );
      if (input.site_search)
        rows = rows.filter((r) =>
          r.site?.toLowerCase().includes(String(input.site_search).toLowerCase())
        );
      return JSON.stringify(rows.slice(0, 60));
    }
    if (name === "query_financials") {
      const [payments, expenses, external, invoices] = await Promise.all([
        supabase.from("payments").select("amount, received_at").limit(500),
        supabase.from("expenses").select("amount, incurred_at, description").limit(200),
        supabase.from("external_sales").select("amount, occurred_on").limit(1000),
        supabase.from("invoices").select("status, tax_rate, line_items(quantity, unit_price)").limit(300),
      ]);
      return JSON.stringify({
        payments: payments.data ?? [],
        expenses: expenses.data ?? [],
        external_sales_total: (external.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
        external_sales_count: external.data?.length ?? 0,
        invoices_by_status: (invoices.data ?? []).reduce(
          (acc: Record<string, number>, i) => {
            acc[i.status] = (acc[i.status] ?? 0) + 1;
            return acc;
          },
          {}
        ),
        note: "empty arrays may mean the asking user's role cannot access financials",
      });
    }
    if (name === "query_customers") {
      let q = supabase
        .from("customers")
        .select("name, locations(id), invoices(status)")
        .limit(100);
      if (input.search) q = q.ilike("name", `%${input.search}%`);
      const { data, error } = await q;
      if (error) return `error: ${error.message}`;
      return JSON.stringify(
        (data ?? []).map((c) => ({
          name: c.name,
          site_count: (c.locations as unknown as unknown[])?.length ?? 0,
          invoice_count: (c.invoices as unknown as unknown[])?.length ?? 0,
        }))
      );
    }
    return "unknown tool";
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : "tool failed"}`;
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json(
      { error: "AI isn't configured yet — add ANTHROPIC_API_KEY." },
      { status: 503 }
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, preferred_name, full_name")
    .eq("id", user.id)
    .single();
  if (!me || me.role === "customer")
    return Response.json({ error: "Staff only." }, { status: 403 });

  const body = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };
  const history = (body.messages ?? []).slice(-12);
  if (!history.length)
    return Response.json({ error: "Empty message." }, { status: 400 });

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const system = `You are Ask FieldStack, the operations assistant inside Field Stack Solutions' field-service platform. Today is ${new Date().toDateString()}.
The user is ${me.preferred_name || me.full_name || "a staff member"} (role: ${me.role}).
Use the query tools to answer from live data — never invent numbers. Data access is enforced by the database per the user's role: if a financial query returns empty for a non-owner, tell them that view is owner-only rather than guessing.
Be concise and operational: lead with the answer, use short bullet lists for multiple items, include specific numbers, names, and dates. Money in USD. If data is insufficient, say what's missing. Do not fabricate records.`;

  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages,
        tools: TOOLS,
      });

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await runTool(
              supabase as unknown as SupabaseClient,
              block.name,
              block.input as Json
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.slice(0, 40000),
            });
          }
        }
        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return Response.json({ reply: text || "(no answer)" });
    }
    return Response.json({
      reply:
        "That question needed more lookups than I'm allowed in one go — try narrowing it down.",
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI request failed." },
      { status: 500 }
    );
  }
}
