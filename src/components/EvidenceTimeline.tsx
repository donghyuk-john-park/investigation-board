"use client";

import type { EvidenceEntry } from "@/lib/types";

const stanceStyles = {
  supports: "bg-green-500/15 text-green-400 border-green-500/30",
  contradicts: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export default function EvidenceTimeline({
  evidence,
}: {
  evidence: EvidenceEntry[];
}) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No evidence logged yet. Add evidence to track your thesis.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {evidence.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 py-3 border-b border-gray-800 last:border-0"
        >
          <div className="text-xs text-gray-600 whitespace-nowrap pt-0.5 w-16 shrink-0">
            {new Date(entry.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
          <div
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border self-start shrink-0 ${
              stanceStyles[entry.stance]
            }`}
          >
            {entry.stance}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-gray-300">{entry.summary}</div>
            {entry.source_url && (
              <a
                href={entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 block truncate"
              >
                {entry.source_label || entry.source_url}
              </a>
            )}
            {!entry.source_url && entry.source_label && (
              <div className="text-xs text-gray-600 mt-0.5">
                {entry.source_label}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
