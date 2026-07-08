import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { atLeast, type UserRole } from "@/lib/roles";
import { SignOutButton } from "./signout-button";
import { MobileNav } from "./mobile-nav";

type NavItem = { href: string; label: string; min: UserRole };
type NavEntry =
  | { kind: "link"; item: NavItem }
  | { kind: "menu"; label: string; items: NavItem[] };

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) redirect("/login");
  const role = profile.role as UserRole;

  const staffNav: NavEntry[] = [
    {
      kind: "link",
      item: { href: "/app", label: "Dashboard", min: "customer" },
    },
    {
      kind: "menu",
      label: "Operations",
      items: [
        { href: "/app/work-orders", label: "Work Orders", min: "field" },
        { href: "/app/dispatch", label: "Dispatch", min: "manager" },
        { href: "/app/time", label: "Time Clock", min: "field" },
        { href: "/app/work-orders/trip", label: "Trip Planner", min: "field" },
        { href: "/app/reports", label: "Reports", min: "field" },
        { href: "/app/sites", label: "Sites", min: "field" },
        { href: "/app/network", label: "Network", min: "field" },
        { href: "/app/equipment", label: "Equipment", min: "field" },
        { href: "/app/inventory", label: "Inventory", min: "field" },
        { href: "/app/dev/pump", label: "Pump Scheduler", min: "manager" },
      ],
    },
    {
      kind: "menu",
      label: "Sales",
      items: [
        { href: "/app/leads", label: "Leads", min: "field" },
        { href: "/app/customers", label: "Customers", min: "readonly" },
        { href: "/app/estimates", label: "Estimates", min: "readonly" },
        { href: "/app/invoices", label: "Invoices", min: "readonly" },
        { href: "/app/catalog", label: "Catalog", min: "manager" },
        { href: "/app/vendor-parts", label: "Vendor Parts & Pricing", min: "field" },
      ],
    },
    {
      kind: "menu",
      label: "Company",
      items: [
        { href: "/app/financials", label: "Financials", min: "owner" },
        { href: "/app/integrations", label: "Integrations", min: "owner" },
        { href: "/app/team", label: "Team", min: "admin" },
        { href: "/app/dev", label: "Under Development", min: "owner" },
      ],
    },
    {
      kind: "link",
      item: { href: "/app/ai", label: "Ask AI", min: "readonly" },
    },
    {
      kind: "link",
      item: { href: "/app/account", label: "Account", min: "customer" },
    },
  ];

  // Xpress Pumping: a focused menu of their world.
  const xpressNav: NavEntry[] = [
    {
      kind: "menu",
      label: "Operations",
      items: [
        { href: "/app/dev/pump", label: "Pump Schedule", min: "customer" },
        { href: "/app/work-orders", label: "Work Orders", min: "customer" },
        { href: "/app/work-orders/trip", label: "Trip Planner", min: "customer" },
        { href: "/app/sites", label: "Sites", min: "customer" },
        { href: "/app/equipment", label: "Equipment", min: "customer" },
        { href: "/app/inventory", label: "Inventory", min: "customer" },
      ],
    },
    {
      kind: "menu",
      label: "Sales",
      items: [
        { href: "/app/customers", label: "Customers", min: "customer" },
        { href: "/app/invoices", label: "Invoices", min: "customer" },
      ],
    },
    {
      kind: "link",
      item: { href: "/app/financials", label: "Financials", min: "customer" },
    },
    {
      kind: "link",
      item: { href: "/app/account", label: "Account", min: "customer" },
    },
  ];

  const entries = (role === "xpress_pumping" ? xpressNav : staffNav)
    .map((entry) => {
      if (entry.kind === "link") {
        return atLeast(role, entry.item.min) ? entry : null;
      }
      const visible = entry.items.filter((i) => atLeast(role, i.min));
      return visible.length
        ? ({ ...entry, items: visible } as NavEntry)
        : null;
    })
    .filter(Boolean) as NavEntry[];

  // Show only the preferred name, or the first name if none is set.
  const displayName =
    profile.preferred_name ||
    (profile.full_name || "").split(" ")[0] ||
    user.email;

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="sticky top-0 z-50 bg-[#0e1f38] border-b border-white/10 print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 md:gap-8">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/fss-badge-navy.png"
              alt="FSS"
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="text-white font-extrabold tracking-tight whitespace-nowrap">
              Field Stack
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1">
            {entries.map((entry) =>
              entry.kind === "link" ? (
                <Link
                  key={entry.item.href}
                  href={entry.item.href}
                  className="text-[#cdd6e5] hover:text-white hover:bg-white/10 text-sm font-medium transition px-3 py-2 rounded-lg whitespace-nowrap"
                >
                  {entry.item.label}
                </Link>
              ) : (
                <div key={entry.label} className="relative group">
                  <button className="flex items-center gap-1 text-[#cdd6e5] group-hover:text-white group-hover:bg-white/10 text-sm font-medium transition px-3 py-2 rounded-lg whitespace-nowrap">
                    {entry.label}
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition group-hover:rotate-180"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className="absolute left-0 top-full pt-1 hidden group-hover:block group-focus-within:block z-50">
                    <div className="bg-[#15294a] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[200px]">
                      {entry.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-4 py-2.5 text-sm font-medium text-[#cdd6e5] hover:text-white hover:bg-white/10 transition whitespace-nowrap"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-auto">
            <div className="text-white text-sm font-semibold whitespace-nowrap hidden sm:block">
              {displayName}
            </div>
            <SignOutButton />
            <MobileNav
              entries={entries.map((e) =>
                e.kind === "link"
                  ? { kind: "link" as const, item: { href: e.item.href, label: e.item.label } }
                  : {
                      kind: "menu" as const,
                      label: e.label,
                      items: e.items.map((i) => ({ href: i.href, label: i.label })),
                    }
              )}
            />
          </div>
        </div>
      </header>
      <main className="max-w-[1140px] mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
