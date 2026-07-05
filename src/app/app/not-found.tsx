import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-2xl font-extrabold text-[#0e1726] mb-2">
        That record isn&apos;t here
      </h1>
      <p className="text-[#5a6b85] mb-8">
        It may have been deleted, or the link is out of date. Nothing else was
        affected.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link
          href="/app"
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          Go to dashboard
        </Link>
        <Link
          href="/app/work-orders"
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-5 py-2.5 transition"
        >
          Work orders
        </Link>
      </div>
    </div>
  );
}
