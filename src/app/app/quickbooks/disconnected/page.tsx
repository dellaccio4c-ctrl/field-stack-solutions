import Link from "next/link";

// Landing page Intuit sends users to after disconnecting from their side.
export default function QboDisconnectedPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        QuickBooks disconnected
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Your QuickBooks connection was removed. Nothing already synced is
        affected — reconnect anytime to resume syncing.
      </p>
      <Link
        href="/app/quickbooks"
        className="inline-block bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition"
      >
        QuickBooks settings
      </Link>
    </div>
  );
}
