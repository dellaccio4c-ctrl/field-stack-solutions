"use client";

import { useRouter } from "next/navigation";

/**
 * Back link that preserves where the user actually came from.
 * If the previous page was within this app section (same origin, path under
 * `scope`), we go back in history — keeping list filters, search terms, and
 * scroll position. Otherwise (direct link, bookmark, cross-section jump) we
 * navigate to the fallback.
 */
export function BackLink({
  fallback,
  scope,
  label,
}: {
  /** Where to go when there's no useful history (e.g. "/app/work-orders") */
  fallback: string;
  /** History is used only if the referrer path starts with this (defaults to fallback) */
  scope?: string;
  label: string;
}) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const scopePath = scope ?? fallback;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      const sameOrigin = ref?.origin === window.location.origin;
      const inScope = sameOrigin && ref!.pathname.startsWith(scopePath);
      if (inScope && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {
      // fall through to fallback navigation
    }
    router.push(fallback);
  }

  return (
    <a
      href={fallback}
      onClick={handleClick}
      className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
    >
      ← {label}
    </a>
  );
}
