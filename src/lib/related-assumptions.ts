import type { Assumption } from "@/lib/types";

export function getAssumptionHealthScore(assumption: Assumption) {
  return assumption.analysis_cache?.health?.score ?? null;
}

export function sortRelatedAssumptions(assumptions: Assumption[]) {
  return [...assumptions].sort((a, b) => {
    const healthA = getAssumptionHealthScore(a);
    const healthB = getAssumptionHealthScore(b);

    if (healthA != null && healthB != null) {
      if (healthA !== healthB) return healthA - healthB;
    } else if (healthA != null) {
      return -1;
    } else if (healthB != null) {
      return 1;
    }

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

export function getSharedAssetTags(
  currentAssetTags: string[] | null,
  relatedAssetTags: string[] | null
) {
  if (!currentAssetTags?.length || !relatedAssetTags?.length) return [];

  const relatedTagSet = new Set(relatedAssetTags);
  return currentAssetTags.filter((tag) => relatedTagSet.has(tag));
}
