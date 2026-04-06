"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceChart from "@/components/ConfidenceChart";
import QuickAddEvidence from "@/components/QuickAddEvidence";
import type { Assumption, EvidenceEntry, ConfidenceSnapshot } from "@/lib/types";

export default function AssumptionDetail() {
  const params = useParams();
  const id = params.id as string;

  const [assumption, setAssumption] = useState<Assumption | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [snapshots, setSnapshots] = useState<ConfidenceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assumptions/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAssumption(data.assumption);
      setEvidence(data.evidence);
      setSnapshots(data.snapshots);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center py-16 text-gray-600">Loading...</div>;
  }

  if (error || !assumption) {
    return (
      <div className="text-center py-16 text-red-400">
        {error || "Assumption not found"}
      </div>
    );
  }

  const isInvalidated = assumption.status === "invalidated";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400">
            &larr; All assumptions
          </Link>
          <h1 className="text-xl font-semibold text-gray-100 mt-1">
            {assumption.belief}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="text-yellow-400/80">
              Confidence: {assumption.confidence}/10
            </span>
            {assumption.asset_tags?.length ? (
              <span>{assumption.asset_tags.join(", ")}</span>
            ) : null}
            {isInvalidated && (
              <span className="text-red-400 font-medium">INVALIDATED</span>
            )}
          </div>
        </div>
        {!isInvalidated && (
          <Link
            href={`/assumptions/${id}/review`}
            className="shrink-0 px-4 py-2 text-sm font-medium rounded-md border border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 transition-colors"
          >
            Check Thesis
          </Link>
        )}
      </div>

      {/* Causal Logic */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
          Causal Logic
        </div>
        <div className="text-sm text-gray-300 whitespace-pre-wrap">
          {assumption.causal_logic}
        </div>
      </div>

      {/* Invalidation Conditions */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Invalidation Conditions
        </div>
        <ul className="space-y-1.5">
          {assumption.invalidation_conditions.map((condition, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-gray-600 mt-0.5">&#9633;</span>
              {condition}
            </li>
          ))}
        </ul>
      </div>

      {/* Confidence Chart */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Confidence Trend
        </div>
        <ConfidenceChart snapshots={snapshots} />
      </div>

      {/* AI Summary */}
      {assumption.ai_summary && (
        <div className="border border-indigo-900/30 rounded-lg p-4 bg-indigo-950/20 mb-4">
          <div className="text-xs text-indigo-400/60 uppercase tracking-wide mb-1.5">
            AI Evidence Summary
          </div>
          <div className="text-sm text-gray-300">{assumption.ai_summary}</div>
        </div>
      )}

      {/* Evidence Log */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          Evidence Log ({evidence.length} entries)
        </div>
        {!isInvalidated && (
          <div className="mb-4 relative">
            <QuickAddEvidence assumptionId={id} onAdded={fetchData} />
          </div>
        )}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
          <EvidenceTimeline evidence={evidence} />
        </div>
      </div>
    </div>
  );
}
