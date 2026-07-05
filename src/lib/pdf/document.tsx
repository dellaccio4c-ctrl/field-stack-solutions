import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";

const NAVY = "#0e1f38";
const AMBER = "#ff8a1e";
const SLATE = "#5a6b85";
const LINE = "#e4e9f1";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: "#0e1726", fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY },
  tagline: { fontSize: 8, color: AMBER, marginTop: 2, letterSpacing: 1 },
  docType: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  docNumber: { fontSize: 11, color: SLATE, textAlign: "right", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 40, marginBottom: 24 },
  metaLabel: {
    fontSize: 7.5,
    color: AMBER,
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  metaValue: { fontSize: 10, lineHeight: 1.4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    color: "#ffffff",
    padding: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  row: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colPrice: { width: 80, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: NAVY,
    marginTop: 4,
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  notes: {
    marginTop: 28,
    padding: 12,
    backgroundColor: "#fff2e3",
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: "center",
    color: SLATE,
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
});

export type DocData = {
  kind: "ESTIMATE" | "INVOICE";
  number: string;
  date: string;
  customerName: string;
  siteLabel?: string | null;
  siteAddress?: string | null;
  title: string;
  items: { description: string; quantity: number; unit_price: number }[];
  taxRate: number;
  amountPaid?: number;
  notes?: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function renderDocumentPdf(data: DocData): Promise<Buffer> {
  const sub = data.items.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.unit_price),
    0
  );
  const tax = sub * data.taxRate;
  const total = sub + tax;
  const paid = data.amountPaid ?? 0;

  const doc = (
    <Document
      title={`${data.kind} ${data.number}`}
      author={COMPANY.name}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{COMPANY.name}</Text>
            <Text style={styles.tagline}>{COMPANY.tagline.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.docType}>{data.kind}</Text>
            <Text style={styles.docNumber}>{data.number}</Text>
            <Text style={styles.docNumber}>{data.date}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>
              {data.kind === "ESTIMATE" ? "PREPARED FOR" : "BILL TO"}
            </Text>
            <Text style={styles.metaValue}>{data.customerName}</Text>
          </View>
          {data.siteLabel && (
            <View>
              <Text style={styles.metaLabel}>SITE</Text>
              <Text style={styles.metaValue}>
                {data.siteLabel}
                {data.siteAddress ? `\n${data.siteAddress}` : ""}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.metaLabel}>PROJECT</Text>
            <Text style={styles.metaValue}>{data.title}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit price</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {data.items.map((it, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.colDesc}>{it.description}</Text>
            <Text style={styles.colQty}>{Number(it.quantity)}</Text>
            <Text style={styles.colPrice}>{fmt(Number(it.unit_price))}</Text>
            <Text style={styles.colAmount}>
              {fmt(Number(it.quantity) * Number(it.unit_price))}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ color: SLATE }}>Subtotal</Text>
            <Text>{fmt(sub)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: SLATE }}>
              Tax ({(data.taxRate * 100).toFixed(2)}%)
            </Text>
            <Text>{fmt(tax)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{fmt(total)}</Text>
          </View>
          {data.kind === "INVOICE" && paid > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={{ color: "#1f9d63" }}>Paid</Text>
                <Text style={{ color: "#1f9d63" }}>{fmt(paid)}</Text>
              </View>
              <View style={styles.grandTotal}>
                <Text>Balance due</Text>
                <Text>{fmt(Math.max(0, total - paid))}</Text>
              </View>
            </>
          )}
        </View>

        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.metaLabel}>NOTES</Text>
            <Text style={styles.metaValue}>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {COMPANY.name} · {COMPANY.website}
          {COMPANY.email ? ` · ${COMPANY.email}` : ""}
          {COMPANY.phone ? ` · ${COMPANY.phone}` : ""}
        </Text>
      </Page>
    </Document>
  );

  return Buffer.from(await renderToBuffer(doc));
}
