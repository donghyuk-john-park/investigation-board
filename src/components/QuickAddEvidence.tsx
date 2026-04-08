"use client";

import { useState, useCallback } from "react";

const URL_PATTERN = /^https?:\/\//i;

export default function QuickAddEvidence({
  assumptionId,
  onAdded,
}: {
  assumptionId: string;
  onAdded: () => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      setLoading(true);
      setError(null);

      const isUrl = URL_PATTERN.test(input.trim());

      try {
        const endpoint = isUrl ? "/api/evidence/url" : "/api/evidence";
        const body = isUrl
          ? { assumption_id: assumptionId, url: input.trim() }
          : { assumption_id: assumptionId, text: input.trim() };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          // If URL extraction failed with fallback, show manual entry hint
          if (data.fallback) {
            setError(
              "Could not extract from URL. Paste the relevant text instead."
            );
            return;
          }
          throw new Error(data.error || "Failed to add evidence");
        }

        setInput("");
        onAdded();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, assumptionId, onAdded]
  );

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a URL or type a quick note..."
          className="flex-1 px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "..." : "+ Add"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
