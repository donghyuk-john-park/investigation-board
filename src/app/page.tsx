import { createClient } from "@/lib/supabase/server";
import AssumptionCard from "@/components/AssumptionCard";
import Link from "next/link";
import type { Assumption } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">GNOSIS</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Track your investment theses. Surface your reasoning when emotions run
          high. Stop losing money on theses that were never actually
          invalidated.
        </p>
        <a
          href="/auth/login"
          className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
        >
          Sign in
        </a>
      </div>
    );
  }

  const { data: assumptions } = await supabase
    .from("assumptions")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (assumptions || []) as Assumption[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-100">
          Your Assumptions
        </h1>
        <Link
          href="/assumptions/new"
          className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
        >
          + New Assumption
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-2">No assumptions yet.</p>
          <p className="text-sm">
            Create your first assumption to start tracking your theses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <AssumptionCard key={a.id} assumption={a} />
          ))}
        </div>
      )}
    </div>
  );
}
