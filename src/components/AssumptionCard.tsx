"use client";

import Link from "next/link";
import type { Assumption } from "@/lib/types";

export default function AssumptionCard({
  assumption,
  healthScore,
  alsoIn,
}: {
  assumption: Assumption;
  healthScore: number | null;
  alsoIn?: string[];
}) {
  const isInvalidated = assumption.status === "invalidated";

  let badgeBg = "var(--health-good)";
  let badgeBorder = "var(--health-good-border)";
  let badgeText = "var(--health-good-text)";
  if (healthScore != null && healthScore <= 3) {
    badgeBg = "var(--health-danger)";
    badgeBorder = "var(--health-danger-border)";
    badgeText = "var(--health-danger-text)";
  } else if (healthScore != null && healthScore <= 6) {
    badgeBg = "var(--health-warn)";
    badgeBorder = "var(--health-warn-border)";
    badgeText = "var(--health-warn-text)";
  }

  return (
    <div
      className={`border rounded-lg p-3 flex items-center gap-3 ${
        isInvalidated
          ? "border-red-900/50 bg-red-950/20 opacity-60"
          : "border-gray-700 bg-gray-900 hover:border-indigo-500/50"
      } transition-colors`}
    >
      {/* Health Badge */}
      {healthScore != null ? (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
          style={{
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            color: badgeText,
          }}
        >
          {healthScore}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-700 bg-gray-800 border border-gray-700 text-xs shrink-0">
          —
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/assumptions/${assumption.id}`}
          className="text-sm font-medium text-gray-100 hover:text-white line-clamp-1"
        >
          {assumption.belief}
        </Link>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="text-yellow-400/80">
            {assumption.confidence}/10
          </span>
          {isInvalidated && (
            <span className="text-red-400 font-medium">INVALIDATED</span>
          )}
          <span>
            {new Date(assumption.created_at).toLocaleDateString()}
          </span>
          {alsoIn && alsoIn.length > 0 && (
            <span className="text-gray-600">
              also in: {alsoIn.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Check Thesis button */}
      {!isInvalidated && (
        <Link
          href={`/assumptions/${assumption.id}?crisis=1`}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded border border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 hover:border-red-700/50 transition-colors"
        >
          Check Thesis
        </Link>
      )}
    </div>
  );
}
