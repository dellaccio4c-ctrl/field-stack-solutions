"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { qboRequest, refreshTokens } from "@/lib/quickbooks";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getConnection(supabase: SupabaseClient) {
  const { data: conn } = await supabase
    .from("qbo_connection")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (!conn) return null;

  // Refresh the access token when it's within 5 minutes of expiring.
  if (
    !conn.token_expires_at ||
    new Date(conn.token_expires_at).getTime() - Date.now() < 300000
  ) {
    const t = await refreshTokens(conn.refresh_token);
    await supabase
      .from("qbo_connection")
      .update({
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      })
      .eq("id", conn.id);
    conn.access_token = t.access_token;
  }
  return conn as { id: string; realm_id: string; access_token: string };
}

export async function disconnectQbo() {
  const supabase = await createClient();
  const { error } = await supabase.from("qbo_connection").delete().neq("realm_id", "");
  if (error) return { error: error.message };
  revalidatePath("/app/quickbooks");
  return { error: null };
}

// Push customers, sent/paid invoices, payments, and expenses to QBO.
// Idempotent via qbo_links; safe to run repeatedly.
export async function syncToQbo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner")
    return { error: "Owners only.", synced: null };

  let conn;
  try {
    conn = await getConnection(supabase);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Token refresh failed", synced: null };
  }
  if (!conn) return { error: "Not connected to QuickBooks yet.", synced: null };

  const { data: links } = await supabase.from("qbo_links").select("entity, local_id, qbo_id");
  const linkMap = new Map((links ?? []).map((l) => [`${l.entity}|${l.local_id}`, l.qbo_id]));
  const saveLink = async (entity: string, localId: string, qboId: string) => {
    linkMap.set(`${entity}|${localId}`, qboId);
    await supabase.from("qbo_links").upsert(
      { entity, local_id: localId, qbo_id: qboId },
      { onConflict: "entity,local_id" }
    );
  };

  const counts = { customers: 0, invoices: 0, payments: 0, expenses: 0 };
  const q = (path: string, init?: RequestInit) =>
    qboRequest(conn!.realm_id, conn!.access_token, path, init);

  try {
    // --- Customers (only those with financial activity get pushed) ---
    const { data: invoices } = await supabase
      .from("invoices")
      .select(
        "id, number, title, status, tax_rate, created_at, customer_id, customers(name, email), line_items(description, quantity, unit_price), payments(id, amount, method, received_at)"
      )
      .neq("status", "draft")
      .neq("status", "void");

    for (const inv of invoices ?? []) {
      const cust = inv.customers as unknown as { name: string; email: string | null } | null;
      if (!inv.customer_id || !cust) continue;

      // Ensure the customer exists in QBO.
      let custQboId = linkMap.get(`customer|${inv.customer_id}`);
      if (!custQboId) {
        const safeName = cust.name.replace(/'/g, "\\'");
        const found = await q(
          `/query?query=${encodeURIComponent(`select Id from Customer where DisplayName = '${safeName}'`)}`
        );
        const existing = found?.QueryResponse?.Customer?.[0]?.Id;
        if (existing) custQboId = String(existing);
        else {
          const created = await q(`/customer`, {
            method: "POST",
            body: JSON.stringify({
              DisplayName: cust.name,
              ...(cust.email ? { PrimaryEmailAddr: { Address: cust.email } } : {}),
            }),
          });
          custQboId = String(created.Customer.Id);
          counts.customers++;
        }
        await saveLink("customer", inv.customer_id, custQboId);
      }

      // Invoice
      let invQboId = linkMap.get(`invoice|${inv.id}`);
      if (!invQboId) {
        const lines = (inv.line_items ?? []).map(
          (li: { description: string; quantity: number; unit_price: number }) => ({
            DetailType: "SalesItemLineDetail",
            Amount: Number(li.quantity) * Number(li.unit_price),
            Description: li.description,
            SalesItemLineDetail: {
              Qty: Number(li.quantity),
              UnitPrice: Number(li.unit_price),
            },
          })
        );
        if (!lines.length) continue;
        const created = await q(`/invoice`, {
          method: "POST",
          body: JSON.stringify({
            CustomerRef: { value: custQboId },
            DocNumber: `FSS-${inv.number}`,
            TxnDate: String(inv.created_at).slice(0, 10),
            Line: lines,
          }),
        });
        invQboId = String(created.Invoice.Id);
        counts.invoices++;
        await saveLink("invoice", inv.id, invQboId);
      }

      // Payments against that invoice
      for (const p of (inv.payments ?? []) as {
        id: string;
        amount: number;
        received_at: string;
      }[]) {
        if (linkMap.get(`payment|${p.id}`)) continue;
        const created = await q(`/payment`, {
          method: "POST",
          body: JSON.stringify({
            CustomerRef: { value: custQboId },
            TotalAmt: Number(p.amount),
            TxnDate: String(p.received_at).slice(0, 10),
            Line: [
              {
                Amount: Number(p.amount),
                LinkedTxn: [{ TxnId: invQboId, TxnType: "Invoice" }],
              },
            ],
          }),
        });
        counts.payments++;
        await saveLink("payment", p.id, String(created.Payment.Id));
      }
    }

    // --- Expenses (as cash purchases) ---
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, amount, description, incurred_at");
    let expenseAccountId: string | null = null;
    for (const e of expenses ?? []) {
      if (linkMap.get(`expense|${e.id}`)) continue;
      if (!expenseAccountId) {
        const found = await q(
          `/query?query=${encodeURIComponent(
            "select Id from Account where AccountType = 'Expense' maxresults 1"
          )}`
        );
        expenseAccountId = String(found?.QueryResponse?.Account?.[0]?.Id ?? "");
        if (!expenseAccountId) break; // no expense account — skip expenses
      }
      const bank = await q(
        `/query?query=${encodeURIComponent(
          "select Id from Account where AccountType = 'Bank' maxresults 1"
        )}`
      );
      const bankId = String(bank?.QueryResponse?.Account?.[0]?.Id ?? "");
      if (!bankId) break;
      const created = await q(`/purchase`, {
        method: "POST",
        body: JSON.stringify({
          PaymentType: "Cash",
          AccountRef: { value: bankId },
          TxnDate: String(e.incurred_at).slice(0, 10),
          Line: [
            {
              DetailType: "AccountBasedExpenseLineDetail",
              Amount: Number(e.amount),
              Description: e.description,
              AccountBasedExpenseLineDetail: { AccountRef: { value: expenseAccountId } },
            },
          ],
        }),
      });
      counts.expenses++;
      await saveLink("expense", e.id, String(created.Purchase.Id));
    }

    await supabase
      .from("qbo_connection")
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", conn.id);
    revalidatePath("/app/quickbooks");
    return { error: null, synced: counts };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await supabase
      .from("qbo_connection")
      .update({ last_error: msg })
      .eq("id", conn.id);
    revalidatePath("/app/quickbooks");
    return { error: msg, synced: counts };
  }
}
