"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrisisQuestion({
  assumptionId,
  invalidationConditions,
}: {
  assumptionId: string;
  invalidationConditions: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"question" | "which" | "unclear" | "done">(
    "question"
  );
  const [selectedCondition, setSelectedCondition] = useState<number | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submitReview(
    outcome: "intact" | "invalidated" | "unclear",
    conditionIndex?: number,
    reviewNotes?: string
  ) {
    setLoading(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assumption_id: assumptionId,
          outcome,
          met_condition_index: conditionIndex ?? null,
          notes: reviewNotes || null,
        }),
      });

      if (outcome === "intact") {
        setResult(
          "Thesis intact. Review your original reasoning before making any trades."
        );
      } else if (outcome === "invalidated") {
        setResult("Thesis marked as invalidated.");
      } else {
        setResult("Review logged as unclear. Add more evidence to resolve.");
      }
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="text-center py-6">
        <p className="text-lg text-gray-200 mb-4">{result}</p>
        <button
          onClick={() => router.push(`/assumptions/${assumptionId}`)}
          className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700"
        >
          Back to assumption
        </button>
      </div>
    );
  }

  if (step === "which") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 mb-2">
          Which invalidation condition was met?
        </p>
        {invalidationConditions.map((condition, i) => (
          <label
            key={i}
            className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
              selectedCondition === i
                ? "border-red-500/50 bg-red-950/30"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <input
              type="radio"
              name="condition"
              checked={selectedCondition === i}
              onChange={() => setSelectedCondition(i)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-300">{condition}</span>
          </label>
        ))}
        <button
          onClick={() =>
            selectedCondition !== null &&
            submitReview("invalidated", selectedCondition)
          }
          disabled={selectedCondition === null || loading}
          className="w-full mt-3 px-4 py-2 text-sm font-medium bg-red-900/50 text-red-200 rounded-md border border-red-800/50 hover:bg-red-900/70 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Confirm invalidation"}
        </button>
      </div>
    );
  }

  if (step === "unclear") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">
          What additional evidence would resolve this?
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 resize-y min-h-20"
          placeholder="What would you need to see to make a decision?"
          rows={3}
        />
        <button
          onClick={() => submitReview("unclear", undefined, notes)}
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium bg-yellow-900/30 text-yellow-200 rounded-md border border-yellow-800/50 hover:bg-yellow-900/50 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Log as unclear"}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-lg font-medium text-gray-200">
        Has any of your invalidation conditions actually been met?
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => submitReview("intact")}
          disabled={loading}
          className="px-6 py-2.5 text-sm font-medium rounded-md border border-green-700/50 bg-green-950/30 text-green-300 hover:bg-green-900/40 transition-colors"
        >
          No — thesis intact
        </button>
        <button
          onClick={() => setStep("unclear")}
          className="px-6 py-2.5 text-sm font-medium rounded-md border border-yellow-700/50 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-900/40 transition-colors"
        >
          Unclear
        </button>
        <button
          onClick={() => setStep("which")}
          className="px-6 py-2.5 text-sm font-medium rounded-md border border-red-700/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 transition-colors"
        >
          Yes — invalidated
        </button>
      </div>
    </div>
  );
}
