"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type Entry =
  | { kind: "link"; item: NavItem }
  | { kind: "menu"; label: string; items: NavItem[] };

export function MobileNav({ entries }: { entries: Entry[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever navigation happens. (No body scroll-lock —
  // it can stick and freeze page scrolling; the overlay covering the
  // content is enough.)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-[#0e1f38] overflow-y-auto overscroll-contain">
          <nav className="px-5 py-4 pb-24">
            {entries.map((entry) =>
              entry.kind === "link" ? (
                <Link
                  key={entry.item.href}
                  href={entry.item.href}
                  className="block px-3 py-3.5 text-base font-semibold text-white border-b border-white/10"
                >
                  {entry.item.label}
                </Link>
              ) : (
                <div key={entry.label} className="border-b border-white/10 py-2">
                  <div className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider uppercase text-[#8fa0ba]">
                    {entry.label}
                  </div>
                  {entry.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-3 text-base font-medium text-[#cdd6e5] active:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
