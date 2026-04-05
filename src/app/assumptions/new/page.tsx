"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAssumption() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [belief, setBelief] = useState("");
  const [causalLogic, setCausalLogic] = useState("");
  const [invalidationConditions, setInvalidationConditions] = useState<
    string[]
  >([""]);
  const [confidence, setConfidence] = useState(5);
  const [assetTags, setAssetTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAIStructure() {
    if (!rawInput.trim()) return;
    setAiProcessing(true);
    setAiError(null);

    try {
      const res = await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_input: rawInput.slice(0, 10000),
          asset_tags: assetTags
            ? assetTags.split(",").map((t) => t.trim())
            : null,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAiError("sign-in-required");
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create assumption");
        }
        setAiProcessing(false);
        return;
      }

      const data = await res.json();

      // Redirect to the new assumption's detail page
      router.push(`/assumptions/${data.assumption.id}`);
    } catch (err) {
      setAiError((err as Error).message);
      setAiProcessing(false);
    }
  }

  async function handleManualSave() {
    if (!belief.trim() || invalidationConditions.filter((c) => c.trim()).length === 0) {
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_input: rawInput || belief,
          belief,
          causal_logic: causalLogic,
          invalidation_conditions: invalidationConditions.filter((c) =>
            c.trim()
          ),
          confidence,
          asset_tags: assetTags
            ? assetTags.split(",").map((t) => t.trim())
            : null,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAiError("sign-in-required");
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save assumption");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      router.push(`/assumptions/${data.assumption.id}`);
    } catch (err) {
      setAiError((err as Error).message);
      setLoading(false);
    }
  }

  function addCondition() {
    setInvalidationConditions([...invalidationConditions, ""]);
  }

  function updateCondition(index: number, value: string) {
    const updated = [...invalidationConditions];
    updated[index] = value;
    setInvalidationConditions(updated);
  }

  function removeCondition(index: number) {
    if (invalidationConditions.length <= 1) return;
    setInvalidationConditions(invalidationConditions.filter((_, i) => i !== index));
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-100 mb-6">
        New Assumption
      </h1>

      {/* AI-assisted creation */}
      <div className="border border-gray-700 rounded-lg p-5 bg-gray-900 mb-6">
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
          Paste your thinking{" "}
          <span className="text-indigo-400 text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded-full ml-1">
            AI structures this
          </span>
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Paste anything — an article, a tweet, a rambling thought. AI will structure it into a thesis."
          className="w-full px-3 py-3 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 resize-y min-h-24 focus:border-indigo-500 focus:outline-none"
          rows={4}
          maxLength={10000}
        />
        <div className="flex items-center gap-3 mt-3">
          <input
            type="text"
            value={assetTags}
            onChange={(e) => setAssetTags(e.target.value)}
            placeholder="Asset tags (optional, comma-separated: CL, XLE, BNO)"
            className="flex-1 px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAIStructure}
            disabled={!rawInput.trim() || aiProcessing}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiProcessing ? "Processing..." : "Create with AI"}
          </button>
        </div>
        {aiError && (
          <p className="mt-2 text-xs text-red-400">
            {aiError === "sign-in-required" ? (
              <>
                You need to{" "}
                <a href="/auth/login" className="text-indigo-400 underline hover:text-indigo-300">
                  sign in
                </a>{" "}
                before creating assumptions.
              </>
            ) : (
              aiError
            )}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-600">or fill in manually</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Manual creation */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
            Belief
          </label>
          <input
            type="text"
            value={belief}
            onChange={(e) => setBelief(e.target.value)}
            placeholder="One-sentence statement of your belief"
            maxLength={500}
            className="w-full px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
            Causal Logic
          </label>
          <textarea
            value={causalLogic}
            onChange={(e) => setCausalLogic(e.target.value)}
            placeholder="IF X AND Y THEN Z BECAUSE W"
            maxLength={1000}
            className="w-full px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 resize-y focus:border-indigo-500 focus:outline-none"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
            Invalidation Conditions
          </label>
          {invalidationConditions.map((condition, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={condition}
                onChange={(e) => updateCondition(i, e.target.value)}
                placeholder={`Condition ${i + 1}: what would prove this wrong?`}
                aria-label={`Invalidation condition ${i + 1}`}
                className="flex-1 px-3 py-2 text-sm bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              {invalidationConditions.length > 1 && (
                <button
                  onClick={() => removeCondition(i)}
                  className="px-2 text-gray-600 hover:text-red-400"
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addCondition}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            + Add condition
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
            Confidence ({confidence}/10)
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleManualSave}
          disabled={
            loading ||
            !belief.trim() ||
            !invalidationConditions.some((c) => c.trim())
          }
          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving..." : "Save Assumption"}
        </button>
        {aiError && (
          <p className="mt-2 text-xs text-red-400">
            {aiError === "sign-in-required" ? (
              <>
                You need to{" "}
                <a href="/auth/login" className="text-indigo-400 underline hover:text-indigo-300">
                  sign in
                </a>{" "}
                before creating assumptions.
              </>
            ) : (
              aiError
            )}
          </p>
        )}
      </div>
    </div>
  );
}
