import { createClient } from "@/lib/supabase/server";
import { ensureSeedData } from "@/lib/seed-data";
import AssumptionCard from "@/components/AssumptionCard";
import SeedDataBanner from "@/components/SeedDataBanner";
import Link from "next/link";
import type { Assumption } from "@/lib/types";
import { getMissingSupabaseEnvVars, hasSupabaseEnv } from "@/lib/env";

function groupByAssetTag(assumptions: Assumption[]) {
  const tagMap = new Map<string, Assumption[]>();
  const ungrouped: Assumption[] = [];

  for (const a of assumptions) {
    if (!a.asset_tags?.length) {
      ungrouped.push(a);
      continue;
    }
    for (const tag of a.asset_tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push(a);
    }
  }

  // Sort groups by lowest health score (most at-risk first)
  const groups = Array.from(tagMap.entries())
    .map(([tag, items]) => {
      const lowestHealth = Math.min(
        ...items.map((a) => a.analysis_cache?.health?.score ?? 99)
      );
      return { tag, items, lowestHealth };
    })
    .sort((a, b) => a.lowestHealth - b.lowestHealth);

  return { groups, ungrouped };
}

export default async function Home() {
  if (!hasSupabaseEnv()) {
    const missingVars = getMissingSupabaseEnvVars();

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">GNOSIS</h1>
        <p className="text-gray-400 mb-3 max-w-xl">
          Supabase environment variables are missing, so the app can boot but
          cannot load data yet.
        </p>
        <p className="text-sm text-gray-500">
          Add {missingVars.join(", ")} to `.env.local` and restart the dev
          server.
        </p>
      </div>
    );
  }

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

  // Seed data for first-time users
  await ensureSeedData(supabase, user.id);

  const { data: assumptions } = await supabase
    .from("assumptions")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (assumptions || []) as Assumption[];
  const activeItems = items.filter((a) => a.status === "active");
  const invalidatedItems = items.filter((a) => a.status === "invalidated");
  const seedIds = items.filter((a) => a.is_seed).map((a) => a.id);
  const atRiskCount = activeItems.filter(
    (a) => a.analysis_cache?.health?.score != null && a.analysis_cache.health.score <= 6
  ).length;

  const { groups, ungrouped } = groupByAssetTag(activeItems);

  // Track which assumption IDs have already been rendered (for "also in" indicator)
  const renderedInGroups = new Map<string, string[]>();
  for (const { tag, items: groupItems } of groups) {
    for (const a of groupItems) {
      if (!renderedInGroups.has(a.id)) renderedInGroups.set(a.id, []);
      renderedInGroups.get(a.id)!.push(tag);
    }
  }

  return (
    <div>
      <SeedDataBanner seedAssumptionIds={seedIds} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">GNOSIS</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeItems.length} active
            {atRiskCount > 0 && (
              <span className="text-yellow-400/80"> · {atRiskCount} at risk</span>
            )}
          </p>
        </div>
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
        <div className="space-y-6">
          {/* Asset Tag Groups */}
          {groups.map(({ tag, items: groupItems }) => (
            <div key={tag}>
              <div className="mb-2">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              </div>
              <div className="space-y-2">
                {groupItems.map((a) => {
                  const allTags = renderedInGroups.get(a.id) || [];
                  const otherTags = allTags.filter((t) => t !== tag);
                  return (
                    <AssumptionCard
                      key={`${tag}-${a.id}`}
                      assumption={a}
                      healthScore={a.analysis_cache?.health?.score ?? null}
                      alsoIn={otherTags.length > 0 ? otherTags : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ungrouped */}
          {ungrouped.length > 0 && (
            <div>
              <div className="mb-2">
                <span className="text-xs text-gray-600">No asset tags</span>
              </div>
              <div className="space-y-2">
                {ungrouped.map((a) => (
                  <AssumptionCard
                    key={a.id}
                    assumption={a}
                    healthScore={a.analysis_cache?.health?.score ?? null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invalidated */}
          {invalidatedItems.length > 0 && (
            <div>
              <div className="mb-2">
                <span className="text-xs text-gray-600">
                  Invalidated ({invalidatedItems.length})
                </span>
              </div>
              <div className="space-y-2">
                {invalidatedItems.map((a) => (
                  <AssumptionCard
                    key={a.id}
                    assumption={a}
                    healthScore={null}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
