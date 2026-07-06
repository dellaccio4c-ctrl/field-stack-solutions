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
    name: "export_data",
    description:
      "Prepare a CSV download for the user from any query result. First decide what data they want (reuse the same filters as the query tools), then call this with the dataset and filters. The user gets a Download button in chat. Datasets: work_orders, sites, equipment, report_entries, customers, financial_payments, financial_expenses.",
    input_schema: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          enum: [
            "work_orders",
            "sites",
            "equipment",
            "report_entries",
            "customers",
            "financial_payments",
            "financial_expenses",
          ],
        },
        filename: { type: "string", description: "e.g. open-work-orders.csv" },
        status: { type: "string" },
        wo_type: { type: "string" },
        search: { type: "string" },
        form_name: { type: "string" },
        since_days: { type: "number" },
        limit: { type: "number", description: "default 500, max 2000" },
      },
      required: ["dataset"],
    },
  },
  {
    name: "import_sites",
    description:
      "Bulk import sites/locations the user pasted or uploaded in chat. Map their columns to: customer_name (required), label, address (required), city, state, zip, notes. Customers are auto-created when missing; duplicate addresses under the same customer are skipped. Confirm the mapping with the user before importing unless it is obvious.",
    input_schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              label: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip: { type: "string" },
              notes: { type: "string" },
            },
            required: ["customer_name", "address"],
          },
        },
      },
      required: ["rows"],
    },
  },
  {
    name: "import_equipment",
    description:
      "Bulk import equipment the user pasted or uploaded in chat. Map their columns to: customer_name (required), site_label, name (required), category, brand, model, serial_number, unit_number, install_date (YYYY-MM-DD), warranty_expires, pm_interval_months, pm_window_days, notes. Duplicates skipped by serial number. Confirm the mapping with the user before importing unless it is obvious.",
    input_schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              site_label: { type: "string" },
              name: { type: "string" },
              category: { type: "string" },
              brand: { type: "string" },
              model: { type: "string" },
              serial_number: { type: "string" },
              unit_number: { type: "string" },
              install_date: { type: "string" },
              warranty_expires: { type: "string" },
              pm_interval_months: { type: "string" },
              pm_window_days: { type: "string" },
              notes: { type: "string" },
            },
            required: ["customer_name", "name"],
          },
        },
      },
      required: ["rows"],
    },
  },
  {
    name: "query_catalog",
    description:
      "The company's saved services/products catalog with standard prices. Use this to price estimate line items whenever possible instead of inventing prices. Optional text search.",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "create_estimate_draft",
    description:
      "Create a DRAFT estimate for a customer. It is never sent automatically — a human reviews it in the estimate editor. Match line item prices to the catalog when a matching service exists. customer_name must match an existing customer (use query_customers first if unsure). Returns the estimate number and link.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        site_label: {
          type: "string",
          description: "optional site name under that customer",
        },
        title: { type: "string", description: "short job title" },
        notes: { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
      },
      required: ["customer_name", "title", "line_items"],
    },
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

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    if (v === true) return "Yes";
    if (v === false) return "No";
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\r\n");
}

async function fetchDataset(
  supabase: SupabaseClient,
  input: Json
): Promise<Record<string, unknown>[] | string> {
  const lim = Math.min(Number(input.limit) || 500, 2000);
  const dataset = String(input.dataset);
  if (dataset === "work_orders") {
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
    if (error) return error.message;
    return (data ?? []).map((w) => ({
      number: `WO-${w.number}`,
      title: w.title,
      status: w.status,
      priority: w.priority,
      type: w.wo_type,
      customer: (w.customers as unknown as { name: string } | null)?.name ?? "",
      site: (w.locations as unknown as { label: string } | null)?.label ?? "",
      created: w.created_at,
      completed: w.completed_at,
      minutes_on_site: w.minutes_on_site,
    }));
  }
  if (dataset === "sites") {
    const { data, error } = await supabase
      .from("locations")
      .select("label, address, city, state, zip, notes, customers(name)")
      .limit(lim);
    if (error) return error.message;
    return (data ?? []).map((s) => ({
      site: s.label,
      customer: (s.customers as unknown as { name: string } | null)?.name ?? "",
      address: s.address,
      city: s.city,
      state: s.state,
      zip: s.zip,
      notes: s.notes,
    }));
  }
  if (dataset === "equipment") {
    let q = supabase
      .from("equipment")
      .select(
        "name, category, brand, model, serial_number, unit_number, install_date, warranty_expires, pm_interval_months, status, customers(name), locations(label)"
      )
      .limit(lim);
    if (input.search)
      q = q.or(
        `name.ilike.%${input.search}%,brand.ilike.%${input.search}%,serial_number.ilike.%${input.search}%`
      );
    const { data, error } = await q;
    if (error) return error.message;
    return (data ?? []).map((e) => ({
      name: e.name,
      category: e.category,
      brand: e.brand,
      model: e.model,
      serial_number: e.serial_number,
      unit_number: e.unit_number,
      customer: (e.customers as unknown as { name: string } | null)?.name ?? "",
      site: (e.locations as unknown as { label: string } | null)?.label ?? "",
      install_date: e.install_date,
      warranty_expires: e.warranty_expires,
      pm_interval_months: e.pm_interval_months,
      status: e.status,
    }));
  }
  if (dataset === "report_entries") {
    const sinceDays = Number(input.since_days) || 90;
    const since = new Date(Date.now() - sinceDays * 86400000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("ops_entries")
      .select("entry_date, data, ops_forms(name), locations(label)")
      .gte("entry_date", since)
      .order("entry_date", { ascending: false })
      .limit(lim);
    if (error) return error.message;
    let rows = (data ?? []).map((e) => ({
      date: e.entry_date,
      form: (e.ops_forms as unknown as { name: string } | null)?.name ?? "",
      site: (e.locations as unknown as { label: string } | null)?.label ?? "",
      ...(e.data as Record<string, unknown>),
    }));
    if (input.form_name)
      rows = rows.filter((r) =>
        String(r.form)
          .toLowerCase()
          .includes(String(input.form_name).toLowerCase())
      );
    return rows;
  }
  if (dataset === "customers") {
    const { data, error } = await supabase
      .from("customers")
      .select("name, contact_name, email, phone, billing_address, notes")
      .limit(lim);
    if (error) return error.message;
    return data ?? [];
  }
  if (dataset === "financial_payments") {
    const { data, error } = await supabase
      .from("payments")
      .select("amount, method, received_at, invoices(number, customers(name))")
      .order("received_at", { ascending: false })
      .limit(lim);
    if (error) return error.message;
    return (data ?? []).map((p) => ({
      received: p.received_at,
      amount: p.amount,
      method: p.method,
      invoice: `INV-${(p.invoices as unknown as { number: number } | null)?.number ?? ""}`,
      customer:
        (
          p.invoices as unknown as {
            customers: { name: string } | null;
          } | null
        )?.customers?.name ?? "",
    }));
  }
  if (dataset === "financial_expenses") {
    const { data, error } = await supabase
      .from("expenses")
      .select("incurred_at, amount, description, is_pumping")
      .order("incurred_at", { ascending: false })
      .limit(lim);
    if (error) return error.message;
    return data ?? [];
  }
  return `unknown dataset: ${dataset}`;
}

async function runTool(
  supabase: SupabaseClient,
  name: string,
  input: Json,
  userId: string
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
    if (name === "export_data") {
      const rows = await fetchDataset(supabase, input);
      if (typeof rows === "string") return `error: ${rows}`;
      if (!rows.length) return "error: no rows matched — nothing to export";
      const filename =
        String(input.filename ?? "").trim().replace(/[^a-zA-Z0-9._-]/g, "-") ||
        `${input.dataset}-export.csv`;
      return JSON.stringify({
        __export: {
          filename: filename.endsWith(".csv") ? filename : `${filename}.csv`,
          csv: "﻿" + toCsv(rows),
        },
        row_count: rows.length,
      });
    }
    if (name === "import_sites") {
      const { importSites } = await import("@/app/app/sites/actions");
      const rows = (input.rows ?? []) as {
        customer_name: string;
        address: string;
        label?: string;
        city?: string;
        state?: string;
        zip?: string;
        notes?: string;
      }[];
      if (!rows.length) return "error: no rows provided";
      const res = await importSites(rows);
      return JSON.stringify(res);
    }
    if (name === "import_equipment") {
      const { importEquipment } = await import(
        "@/app/app/equipment/import-actions"
      );
      const rows = (input.rows ?? []) as import("@/app/app/equipment/import-actions").ImportEquipmentRow[];
      if (!rows.length) return "error: no rows provided";
      const res = await importEquipment(rows);
      return JSON.stringify(res);
    }
    if (name === "query_catalog") {
      let q = supabase
        .from("catalog_items")
        .select("name, description, unit_price")
        .eq("is_active", true)
        .limit(100);
      if (input.search) q = q.ilike("name", `%${input.search}%`);
      const { data, error } = await q;
      return error ? `error: ${error.message}` : JSON.stringify(data);
    }
    if (name === "create_estimate_draft") {
      const items = (input.line_items ?? []) as {
        description: string;
        quantity: number;
        unit_price: number;
      }[];
      if (!items.length) return "error: at least one line item is required";
      if (items.length > 30) return "error: too many line items (max 30)";
      for (const it of items) {
        if (!it.description?.trim()) return "error: every line item needs a description";
        if (!(Number(it.quantity) > 0)) return "error: quantities must be positive";
        if (!(Number(it.unit_price) >= 0)) return "error: prices must be zero or positive";
      }

      const custName = String(input.customer_name ?? "").trim();
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, locations(id, label)");
      const customer = (customers ?? []).find(
        (c) => c.name.trim().toLowerCase() === custName.toLowerCase()
      );
      if (!customer)
        return `error: no customer named "${custName}". Existing customers: ${(customers ?? [])
          .map((c) => c.name)
          .slice(0, 40)
          .join(", ")}`;

      let locationId: string | null = null;
      if (input.site_label) {
        const site = (
          (customer.locations as unknown as { id: string; label: string }[]) ?? []
        ).find(
          (l) =>
            l.label.trim().toLowerCase() ===
            String(input.site_label).trim().toLowerCase()
        );
        if (!site)
          return `error: customer "${customer.name}" has no site named "${input.site_label}". Their sites: ${(
            (customer.locations as unknown as { label: string }[]) ?? []
          )
            .map((l) => l.label)
            .slice(0, 40)
            .join(", ") || "(none)"}`;
        locationId = site.id;
      }

      const { data: estimate, error: estErr } = await supabase
        .from("estimates")
        .insert({
          customer_id: customer.id,
          location_id: locationId,
          title: String(input.title ?? "").trim() || "Estimate",
          notes: String(input.notes ?? "").trim() || null,
          created_by: userId,
        })
        .select("id, number")
        .single();
      if (estErr) return `error: ${estErr.message}`;

      const { error: lineErr } = await supabase.from("line_items").insert(
        items.map((it, i) => ({
          estimate_id: estimate.id,
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          sort_order: i,
        }))
      );
      if (lineErr) return `error: line items failed: ${lineErr.message}`;

      const total = items.reduce(
        (s, it) => s + Number(it.quantity) * Number(it.unit_price),
        0
      );
      return JSON.stringify({
        created: true,
        estimate_number: `EST-${estimate.number}`,
        subtotal: total,
        status: "draft — review before sending",
        link: `/app/estimates/${estimate.id}`,
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
Be concise and operational: lead with the answer, use short bullet lists for multiple items, include specific numbers, names, and dates. Money in USD. If data is insufficient, say what's missing. Do not fabricate records.
You can also draft estimates with create_estimate_draft. Rules: check query_catalog first and use catalog prices for matching services; if the user gave no price for an item and the catalog has no match, ask them rather than inventing one. Confirm the line items with the user before creating unless they were fully specified. Drafts are never sent automatically — after creating, give the estimate number and tell them to review it under Estimates.
Export: when the user wants data as a file/CSV/spreadsheet, use export_data — they get a download button in chat.
Import: when the user pastes or uploads tabular data (uploaded files appear in their message as structured rows), map the columns to import_sites or import_equipment fields, show them your mapping for confirmation if any column is ambiguous, then import and report imported/skipped counts. Never guess required values that are missing.`;

  const exports: { filename: string; csv: string }[] = [];

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
            let result = await runTool(
              supabase as unknown as SupabaseClient,
              block.name,
              block.input as Json,
              user.id
            );
            // Exports are handed to the browser, not fed back to the model.
            if (block.name === "export_data" && result.startsWith("{")) {
              try {
                const parsed = JSON.parse(result) as {
                  __export?: { filename: string; csv: string };
                  row_count?: number;
                };
                if (parsed.__export) {
                  exports.push(parsed.__export);
                  result = `export ready: ${parsed.__export.filename} (${parsed.row_count} rows). The user will see a download button — tell them it's ready.`;
                }
              } catch {
                // fall through with raw result
              }
            }
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
      return Response.json({ reply: text || "(no answer)", exports });
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
