import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeForm } from "./welcome-form";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name, phone, personal_email, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e1f38] px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/fss-wordmark.png"
          alt="Field Stack Solutions"
          className="h-14 object-contain -ml-2 mb-2"
        />
        <h1 className="text-xl font-extrabold text-[#0e1726] mb-1">
          Welcome — let&apos;s set up your profile
        </h1>
        <p className="text-sm text-[#5a6b85] mb-6">
          Choose your password and tell us how you&apos;d like to be addressed.
        </p>
        <WelcomeForm
          defaults={{
            preferred_name: profile?.preferred_name ?? "",
            phone: profile?.phone ?? "",
            personal_email: profile?.personal_email ?? "",
          }}
        />
      </div>
    </div>
  );
}
