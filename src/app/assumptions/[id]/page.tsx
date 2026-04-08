"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceChart from "@/components/ConfidenceChart";
import QuickAddEvidence from "@/components/QuickAddEvidence";
import CrisisQuestion from "@/components/CrisisQuestion";
import type {
  Assumption,
  EvidenceEntry,
  ConfidenceSnapshot,
  ThesisAnalysis,
} from "@/lib/types";

function HealthBadge({ score }: { score: number }) {
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
      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl"
      style={{ background: bg, border: `1px solid ${border}`, color: text }}
    >
      {score}
    </div>
  );
}

function AIPanel({
  label,
  labelColor,
  bgVar,
  borderVar,
  loading,
  error,
  onRetry,
  children,
}: {
  label: string;
  labelColor: string;
  bgVar: string;
  borderVar: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: `var(${bgVar})`, border: `1px solid var(${borderVar})` }}
    >
      <div className="text-xs uppercase tracking-wide mb-2" style={{ color: labelColor }}>
        {label}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
        </div>
      ) : error ? (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 mb-2">Failed to load</p>
          <button
            onClick={onRetry}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Retry
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ThesisDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const isCrisisMode = searchParams.get("crisis") === "1";

  const [assumption, setAssumption] = useState<Assumption | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [snapshots, setSnapshots] = useState<ConfidenceSnapshot[]>([]);
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [relatedAssumptions, setRelatedAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assumptions/${id}`);
      if (res.status === 401) throw new Error("unauthorized");
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

  const fetchAnalysis = useCallback(
    async (force = false) => {
      setAnalysisLoading(true);
      try {
        const res = await fetch(
          `/api/assumptions/${id}/analysis${force ? "?force=1" : ""}`
        );
        if (res.ok) {
          const data = await res.json();
          setAnalysis(data);
        }
      } catch {
        // Analysis fetch failed, panels will show error state
      } finally {
        setAnalysisLoading(false);
      }
    },
    [id]
  );

  const fetchRelated = useCallback(async () => {
    if (!assumption?.asset_tags?.length) return;
    try {
      const res = await fetch("/api/assumptions");
      if (!res.ok) return;
      const all: Assumption[] = await res.json();
      const related = all
        .filter(
          (a) =>
            a.id !== id &&
            a.asset_tags?.some((tag) => assumption.asset_tags?.includes(tag))
        )
        .slice(0, 10);
      setRelatedAssumptions(related);
    } catch {
      // Non-critical
    }
  }, [id, assumption?.asset_tags]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading && assumption) {
      fetchAnalysis(isCrisisMode);
      fetchRelated();
    }
  }, [loading, assumption, fetchAnalysis, fetchRelated, isCrisisMode]);

  if (loading) {
    return <div className="text-center py-16 text-gray-600">Loading...</div>;
  }

  if (error || !assumption) {
    if (error === "unauthorized") {
      return (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-2">You need to sign in to view this thesis.</p>
          <a href="/auth/login" className="text-sm text-indigo-400 hover:text-indigo-300">
            Sign in
          </a>
        </div>
      );
    }
    return (
      <div className="text-center py-16 text-red-400">
        {error || "Assumption not found"}
      </div>
    );
  }

  const isInvalidated = assumption.status === "invalidated";
  const healthScore = analysis?.health?.score;

  function closeCrisisModal() {
    router.push(`/assumptions/${id}`);
  }

  return (
    <div>
      {/* Crisis Modal Overlay */}
      {isCrisisMode && !isInvalidated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center py-2 mb-4">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">
                Thesis Under Pressure
              </div>
              <div className="text-xs text-gray-600">
                Review your reasoning before making any trades.
              </div>
            </div>
            <div className="border-2 border-gray-700 rounded-lg p-6 mb-4">
              <CrisisQuestion
                assumptionId={id}
                invalidationConditions={assumption.invalidation_conditions}
              />
            </div>
            <button
              onClick={closeCrisisModal}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-300 py-2"
            >
              Close and return to dashboard
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400">
          Board
        </Link>
        <span>/</span>
        {assumption.asset_tags?.length ? (
          <>
            <span className="text-indigo-400/60">
              {assumption.asset_tags.join(", ")}
            </span>
            <span>/</span>
          </>
        ) : null}
        <span className="text-gray-400 truncate">{assumption.belief.length > 40 ? assumption.belief.slice(0, 40) + "..." : assumption.belief}</span>
      </div>

      {/* Hero Thesis */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="bg-indigo-950/20 border border-indigo-900/30 border-l-4 border-l-indigo-500 rounded-lg p-5">
            <h1 className="text-xl font-semibold text-gray-100 leading-relaxed">
              &ldquo;{assumption.belief}&rdquo;
            </h1>
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">
              {assumption.causal_logic}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
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
        </div>
        {!isInvalidated && (
          <Link
            href={`/assumptions/${id}?crisis=1`}
            className="shrink-0 px-4 py-2 text-sm font-medium rounded-md border border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 transition-colors"
          >
            Check Thesis
          </Link>
        )}
      </div>

      {/* AI Intelligence Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <AIPanel
          label="Thesis Health"
          labelColor="var(--health-good-text)"
          bgVar="--panel-health"
          borderVar="--panel-health-border"
          loading={analysisLoading}
          error={!analysisLoading && !analysis?.health}
          onRetry={() => fetchAnalysis(true)}
        >
          {analysis?.health && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HealthBadge score={analysis.health.score} />
                <span className="text-sm text-gray-300">/ 10</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {analysis.health.reasoning}
              </p>
            </div>
          )}
        </AIPanel>

        <AIPanel
          label="Strongest Counter-View"
          labelColor="#f87171"
          bgVar="--panel-counter"
          borderVar="--panel-counter-border"
          loading={analysisLoading}
          error={!analysisLoading && !analysis?.counter}
          onRetry={() => fetchAnalysis(true)}
        >
          {analysis?.counter && (
            <div>
              <p className="text-xs text-red-300/80 leading-relaxed">
                {analysis.counter.argument}
              </p>
              {analysis.counter.grounding && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  {analysis.counter.grounding}
                </p>
              )}
            </div>
          )}
        </AIPanel>

        <AIPanel
          label="What You're Missing"
          labelColor="#fbbf24"
          bgVar="--panel-missing"
          borderVar="--panel-missing-border"
          loading={analysisLoading}
          error={!analysisLoading && !analysis?.missing}
          onRetry={() => fetchAnalysis(true)}
        >
          {analysis?.missing && (
            <ul className="space-y-1.5">
              {analysis.missing.gaps.map((gap, i) => (
                <li key={i} className="text-xs text-amber-200/70 leading-relaxed">
                  <span className="text-amber-400/60 mr-1">&bull;</span>
                  {gap.description}
                </li>
              ))}
            </ul>
          )}
        </AIPanel>

        <AIPanel
          label="What Changed Recently"
          labelColor="#818cf8"
          bgVar="--panel-shift"
          borderVar="--panel-shift-border"
          loading={analysisLoading}
          error={!analysisLoading && !analysis?.stateShift}
          onRetry={() => fetchAnalysis(true)}
        >
          {analysis?.stateShift && (
            <div className="space-y-1.5 text-xs text-indigo-200/70 leading-relaxed">
              <p>{analysis.stateShift.changes}</p>
              {analysis.stateShift.weakest_link && (
                <p>
                  <span className="text-indigo-400/60">Weakest link:</span>{" "}
                  {analysis.stateShift.weakest_link}
                </p>
              )}
              {analysis.stateShift.watch_next && (
                <p>
                  <span className="text-indigo-400/60">Watch:</span>{" "}
                  {analysis.stateShift.watch_next}
                </p>
              )}
            </div>
          )}
        </AIPanel>
      </div>

      {/* Refresh Analysis button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => fetchAnalysis(true)}
          disabled={analysisLoading}
          className="text-xs text-gray-600 hover:text-indigo-400 disabled:opacity-50 transition-colors"
        >
          {analysisLoading ? "Refreshing..." : "Refresh analysis"}
        </button>
      </div>

      {/* Invalidation Conditions with AI status */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Invalidation Conditions
        </div>
        <ul className="space-y-1.5">
          {assumption.invalidation_conditions.map((condition, i) => {
            const status = analysis?.health?.condition_status?.find(
              (cs) => cs.index === i
            );
            const isApproaching = status?.status === "approaching";
            const isMet = status?.status === "met";
            return (
              <li
                key={i}
                className={`flex items-start gap-2 text-sm ${
                  isMet
                    ? "text-red-400"
                    : isApproaching
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
              >
                <span className="mt-0.5">
                  {isMet ? "✗" : isApproaching ? "⚠" : "☐"}
                </span>
                <div>
                  <span>{condition}</span>
                  {status?.note && (isApproaching || isMet) && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({status.note})
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Confidence Chart */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Confidence Trend
        </div>
        <ConfidenceChart snapshots={snapshots} />
      </div>

      {/* Evidence Log */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          Evidence Log ({evidence.length} entries)
        </div>
        {!isInvalidated && (
          <div className="mb-4">
            <QuickAddEvidence assumptionId={id} onAdded={fetchData} />
          </div>
        )}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
          <EvidenceTimeline evidence={evidence} />
        </div>
      </div>

      {/* Related Assumptions Strip */}
      {relatedAssumptions.length > 0 && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Related Assumptions (shared assets)
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {relatedAssumptions.map((ra) => {
              const raHealth = ra.analysis_cache?.health?.score;
              return (
                <Link
                  key={ra.id}
                  href={`/assumptions/${ra.id}`}
                  className={`flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-lg text-xs whitespace-nowrap hover:border-indigo-500/50 transition-colors ${
                    ra.status === "invalidated" ? "opacity-50" : ""
                  }`}
                >
                  {raHealth != null && (
                    <span
                      className="font-bold"
                      style={{
                        color:
                          raHealth > 6
                            ? "var(--health-good-text)"
                            : raHealth > 3
                            ? "var(--health-warn-text)"
                            : "var(--health-danger-text)",
                      }}
                    >
                      {raHealth}
                    </span>
                  )}
                  <span className="text-gray-400 max-w-48 truncate">
                    {ra.belief}
                  </span>
                  {ra.status === "invalidated" && (
                    <span className="text-red-400 text-[10px]">INVALIDATED</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssumptionDetail() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-600">Loading...</div>}>
      <ThesisDashboardContent />
    </Suspense>
  );
}
