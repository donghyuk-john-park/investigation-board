"use client";

import Link from "next/link";
import type { Assumption } from "@/lib/types";
import {
  getAssumptionHealthScore,
  getSharedAssetTags,
} from "@/lib/related-assumptions";

function RelatedHealthBadge({ score }: { score: number }) {
  let bg = "var(--health-good)";
  let border = "var(--health-good-border)";
  let text = "var(--health-good-text)";

  if (score <= 3) {
    bg = "var(--health-danger)";
    border = "var(--health-danger-border)";
    text = "var(--health-danger-text)";
  } else if (score <= 6) {
    bg = "var(--health-warn)";
    border = "var(--health-warn-border)";
    text = "var(--health-warn-text)";
  }

  return (
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: bg, border: `1px solid ${border}`, color: text }}
      aria-label={`Health score ${score}`}
    >
      {score}
    </div>
  );
}

export default function RelatedAssumptionsSection({
  currentAssetTags,
  assumptions,
}: {
  currentAssetTags: string[] | null;
  assumptions: Assumption[];
}) {
  const items = assumptions
    .map((assumption) => ({
      assumption,
      sharedTags: getSharedAssetTags(currentAssetTags, assumption.asset_tags),
    }))
    .filter(({ sharedTags }) => sharedTags.length > 0);

  return (
    <section className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-100">
          Related Assumptions
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Nearby thesis work that overlaps with this exposure.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/30 px-4 py-5 text-sm text-gray-500">
          No related assumptions yet. Add another thesis with a shared asset
          tag to connect this board.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(({ assumption, sharedTags }) => {
            const healthScore = getAssumptionHealthScore(assumption);

            return (
              <Link
                key={assumption.id}
                href={`/assumptions/${assumption.id}`}
                className={`block border rounded-lg p-3 transition-colors ${
                  assumption.status === "invalidated"
                    ? "border-red-900/40 bg-red-950/10 opacity-70"
                    : "border-gray-700 bg-gray-950/40 hover:border-indigo-500/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {healthScore != null && <RelatedHealthBadge score={healthScore} />}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-100 line-clamp-1">
                        {assumption.belief}
                      </div>
                      {assumption.status === "invalidated" && (
                        <span className="text-[10px] font-medium text-red-400 uppercase tracking-wide">
                          Invalidated
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="text-yellow-400/80">
                        Confidence {assumption.confidence}/10
                      </span>
                      <span>
                        Shared tags: {sharedTags.join(", ")}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-indigo-200/70">
                      Related via shared exposure: {sharedTags.join(", ")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
