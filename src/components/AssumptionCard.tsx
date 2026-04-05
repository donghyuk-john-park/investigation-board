"use client";

import Link from "next/link";
import type { Assumption } from "@/lib/types";

export default function AssumptionCard({
  assumption,
}: {
  assumption: Assumption;
}) {
  const isInvalidated = assumption.status === "invalidated";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isInvalidated
          ? "border-red-900/50 bg-red-950/20 opacity-60"
          : "border-gray-700 bg-gray-900 hover:border-indigo-500/50"
      } transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/assumptions/${assumption.id}`}
            className="text-sm font-medium text-gray-100 hover:text-white line-clamp-2"
          >
            {assumption.belief}
          </Link>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="text-yellow-400/80">
              {assumption.confidence}/10
            </span>
            {assumption.asset_tags?.length ? (
              <span>{assumption.asset_tags.join(", ")}</span>
            ) : null}
            {isInvalidated && (
              <span className="text-red-400 font-medium">INVALIDATED</span>
            )}
            <span>
              {new Date(assumption.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {!isInvalidated && (
          <Link
            href={`/assumptions/${assumption.id}/review`}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded border border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 hover:border-red-700/50 transition-colors"
          >
            Check Thesis
          </Link>
        )}
      </div>
    </div>
  );
}
