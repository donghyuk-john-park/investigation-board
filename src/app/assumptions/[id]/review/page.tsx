"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import CrisisQuestion from "@/components/CrisisQuestion";
import type { Assumption, EvidenceEntry } from "@/lib/types";

export default function CrisisReview() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [assumption, setAssumption] = useState<Assumption | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [freshSummary, setFreshSummary] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assumptions/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAssumption(data.assumption);
      setEvidence(data.evidence);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Check for stale summary and recompute if needed
  const checkSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/review?assumption_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recomputed && data.summary) {
          setFreshSummary(data.summary);
        }
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData().then(() => checkSummary());
  }, [fetchData, checkSummary]);

  if (loading) {
    return <div className="text-center py-16 text-gray-600">Loading...</div>;
  }

  if (!assumption) {
    return (
      <div className="text-center py-16 text-red-400">
        Assumption not found
      </div>
    );
  }

  if (assumption.status === "invalidated") {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">
          This thesis was invalidated on{" "}
          {new Date(assumption.created_at).toLocaleDateString()}.
        </p>
        <button
          onClick={() => router.push(`/assumptions/${id}`)}
          className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700"
        >
          View assumption
        </button>
      </div>
    );
  }

  const displaySummary = freshSummary || assumption.ai_summary;
  const recentEvidence = evidence.slice(0, 5);

  // Compute raw stance counts for fallback
  const stanceCounts = evidence.reduce(
    (acc, e) => {
      acc[e.stance]++;
      return acc;
    },
    { supports: 0, contradicts: 0, neutral: 0 }
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Crisis header */}
      <div className="text-center py-6">
        <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">
          Thesis Under Pressure
        </div>
        <div className="text-xs text-gray-600">
          Review your reasoning before making any trades.
        </div>
      </div>

      {/* Thesis in large text */}
      <div className="text-xl font-semibold text-white text-center px-6 py-6 bg-blue-950/30 rounded-lg border-l-4 border-indigo-500 mb-6">
        &ldquo;{assumption.belief}&rdquo;
      </div>

      {/* Invalidation conditions checklist */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          Your invalidation conditions — has any been met?
        </div>
        {assumption.invalidation_conditions.map((condition, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 py-2"
          >
            <span className="text-gray-600 mt-0.5 text-lg leading-none">
              &#9633;
            </span>
            <span className="text-sm text-gray-300">{condition}</span>
          </div>
        ))}
      </div>

      {/* AI Summary or raw counts */}
      <div className="border border-indigo-900/30 rounded-lg p-4 bg-indigo-950/20 mb-4">
        <div className="text-xs text-indigo-400/60 uppercase tracking-wide mb-1.5">
          Evidence Summary
          {summaryLoading && (
            <span className="ml-2 text-gray-600">(updating...)</span>
          )}
        </div>
        {displaySummary ? (
          <div className="text-sm text-gray-300">{displaySummary}</div>
        ) : (
          <div className="text-sm text-gray-400">
            {stanceCounts.supports} supporting, {stanceCounts.contradicts}{" "}
            contradicting, {stanceCounts.neutral} neutral.
          </div>
        )}
      </div>

      {/* Recent evidence */}
      {recentEvidence.length > 0 && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Recent Evidence
          </div>
          <EvidenceTimeline evidence={recentEvidence} />
        </div>
      )}

      {/* The question */}
      <div className="border-2 border-gray-700 rounded-lg p-6 mb-8">
        <CrisisQuestion
          assumptionId={id}
          invalidationConditions={assumption.invalidation_conditions}
        />
      </div>
    </div>
  );
}
