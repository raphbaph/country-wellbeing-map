import type {
  CountryMetrics,
  IndicatorId,
  IndicatorMeta,
  RankedCountry,
  ScorePart,
} from "./types";

/**
 * Average-rank percentile in [0, 1]. The lowest value is 0 and the highest is 1.
 * Ties share the average of the ranks they span. A single observation is 0.5.
 */
export function percentileRanks(rows: { id: string; value: number }[]): Map<string, number> {
  const scores = new Map<string, number>();
  const n = rows.length;
  if (n === 0) return scores;
  if (n === 1) {
    scores.set(rows[0].id, 0.5);
    return scores;
  }

  const sorted = [...rows].sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  let index = 0;
  while (index < n) {
    let end = index + 1;
    while (end < n && sorted[end].value === sorted[index].value) end += 1;
    const averageRank = (index + (end - 1)) / 2;
    const percentile = averageRank / (n - 1);
    for (let cursor = index; cursor < end; cursor += 1) {
      scores.set(sorted[cursor].id, percentile);
    }
    index = end;
  }
  return scores;
}

/** At least half of the enabled indicators, rounded up. One toggle still scores on that one series. */
export function minimumCoverage(enabledCount: number): number {
  if (enabledCount <= 0) return 0;
  return Math.ceil(enabledCount / 2);
}

export function rankCountries(
  countries: CountryMetrics[],
  indicators: IndicatorMeta[],
  enabled: ReadonlySet<IndicatorId>,
): RankedCountry[] {
  const active = indicators.filter((indicator) => enabled.has(indicator.id));
  if (active.length === 0) return [];

  const normalized = new Map<IndicatorId, Map<string, number>>();
  for (const indicator of active) {
    const rows: { id: string; value: number }[] = [];
    for (const country of countries) {
      const metric = country.values[indicator.id];
      if (!metric || !Number.isFinite(metric.v)) continue;
      rows.push({ id: country.id, value: metric.v });
    }
    const ranks = percentileRanks(rows);
    if (!indicator.higherIsBetter) {
      for (const [id, percentile] of ranks) ranks.set(id, 1 - percentile);
    }
    normalized.set(indicator.id, ranks);
  }

  const ranked: RankedCountry[] = [];
  for (const country of countries) {
    const parts: ScorePart[] = [];
    for (const indicator of active) {
      const percentile = normalized.get(indicator.id)?.get(country.id);
      const metric = country.values[indicator.id];
      if (percentile === undefined || !metric) continue;
      parts.push({
        id: indicator.id,
        raw: metric.v,
        year: metric.y,
        normalized: percentile,
      });
    }
    if (parts.length < minimumCoverage(active.length)) continue;
    const mean = parts.reduce((sum, part) => sum + part.normalized, 0) / parts.length;
    ranked.push({
      id: country.id,
      name: country.name,
      score: mean * 100,
      parts,
      enabledCount: active.length,
    });
  }

  ranked.sort(
    (a, b) => b.score - a.score || b.parts.length - a.parts.length || a.name.localeCompare(b.name),
  );
  return ranked;
}
