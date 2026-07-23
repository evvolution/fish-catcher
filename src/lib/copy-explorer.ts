type ExplorerCopy = {
  id: string;
  kind: string;
  content: string;
  activitySlug: string | null;
  dimensionKeys: Record<string, string[]>;
};

const semanticWeights: Record<string, number> = {
  emotional_core: 7,
  psychological_need: 6,
  scene: 5,
  energy: 4,
  literary_gesture: 3,
  content_tone: 2,
  time_of_day: 1,
};

export function rankRelatedCopyEntries<T extends ExplorerCopy>(
  entries: T[],
  current: ExplorerCopy,
  excludedIds: readonly string[] = [],
) {
  const excluded = new Set([current.id, ...excludedIds]);

  return entries
    .filter((entry) =>
      (entry.kind === "RESULT" || entry.kind === "CARD")
      && !excluded.has(entry.id)
      && entry.content !== current.content)
    .map((entry) => ({ entry, score: scoreRelatedCopy(entry, current) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id))
    .map((item) => item.entry);
}

function scoreRelatedCopy(candidate: ExplorerCopy, current: ExplorerCopy) {
  let score = 0;

  if (candidate.activitySlug && candidate.activitySlug === current.activitySlug) {
    score += 8;
  }

  for (const [dimension, weight] of Object.entries(semanticWeights)) {
    const currentValues = current.dimensionKeys[dimension] ?? [];
    const candidateValues = candidate.dimensionKeys[dimension] ?? [];
    score += candidateValues.filter((value) => currentValues.includes(value)).length * weight;
  }

  return score;
}
