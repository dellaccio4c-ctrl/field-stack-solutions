import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { atLeast, ROLE_LABEL, type UserRole } from "@/lib/roles";
import { SignOutButton } from "./signout-button";

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
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) redirect("/login");
  const role = profile.role as UserRole;

  const nav = [
    { href: "/app", label: "Dashboard", min: "customer" as UserRole },
    { href: "/app/customers", label: "Customers", min: "readonly" as UserRole },
    { href: "/app/estimates", label: "Estimates", min: "readonly" as UserRole },
    { href: "/app/invoices", label: "Invoices", min: "readonly" as UserRole },
    { href: "/app/catalog", label: "Catalog", min: "manager" as UserRole },
    { href: "/app/financials", label: "Financials", min: "owner" as UserRole },
    { href: "/app/team", label: "Team", min: "admin" as UserRole },
    { href: "/app/dev", label: "Under Development", min: "owner" as UserRole },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="sticky top-0 z-50 bg-[#0e1f38] border-b border-white/10">
        <div className="max-w-[1140px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/app" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff8a1e] to-[#ffa347] flex items-center justify-center text-white font-extrabold">
                F
              </div>
              <span className="text-white font-extrabold tracking-tight">
                FieldStack
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              {nav
                .filter((n) => atLeast(role, n.min))
                .map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="text-[#cdd6e5] hover:text-white text-sm font-medium transition"
                  >
                    {n.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-white text-sm font-semibold leading-tight">
                {profile.full_name || user.email}
              </div>
              <div className="text-[#ffa347] text-xs">{ROLE_LABEL[role]}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-[1140px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
