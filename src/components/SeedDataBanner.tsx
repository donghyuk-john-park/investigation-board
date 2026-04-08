"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SeedDataBanner({
  seedAssumptionIds,
}: {
  seedAssumptionIds: string[];
}) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || seedAssumptionIds.length === 0) return null;

  async function handleClear() {
    setClearing(true);
    try {
      await Promise.all(
        seedAssumptionIds.map((id) =>
          fetch(`/api/assumptions/${id}`, { method: "DELETE" })
        )
      );
      router.refresh();
    } catch {
      setClearing(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-lg border border-indigo-900/30 bg-indigo-950/20 text-xs text-indigo-300/80">
      <span>
        Sample data is loaded to show how Gnosis works. Create your own thesis
        to get started.
      </span>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button
          onClick={handleClear}
          disabled={clearing}
          className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
        >
          {clearing ? "Clearing..." : "Clear sample data"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-600 hover:text-gray-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
