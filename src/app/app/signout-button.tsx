"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-[#cdd6e5] hover:text-white border border-white/25 rounded-lg px-3 py-1.5 transition"
    >
      Sign out
    </button>
  );
}
