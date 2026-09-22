import { formatScore, formatValue } from "../format";
import { minimumCoverage } from "../score";
import type { CountryMetrics, IndicatorId, IndicatorMeta, RankedCountry } from "../types";

interface CountryDetailProps {
  country: CountryMetrics | null;
  ranked: RankedCountry | null;
  rank: number | null;
  indicators: IndicatorMeta[];
  enabled: ReadonlySet<IndicatorId>;
  anyEnabled: boolean;
}

export function CountryDetail({
  country,
  ranked,
  rank,
  indicators,
  enabled,
  anyEnabled,
}: CountryDetailProps) {
  if (!country) {
    return (
      <section className="detail empty">
        <h2>Country</h2>
        <p>Hover or click a country to see the values behind its color.</p>
      </section>
    );
  }

  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));

  return (
    <section className="detail">
      <h2>{country.name}</h2>
      {!anyEnabled ? (
        <p>Turn on an indicator to score this country.</p>
      ) : ranked ? (
        <>
          <p className="detail-score">
            <span>Composite</span>
            <strong>{formatScore(ranked.score)}</strong>
            {rank ? <em>#{rank}</em> : null}
          </p>
          <p className="coverage">
            Based on {ranked.parts.length} of {ranked.enabledCount} enabled indicator
            {ranked.enabledCount === 1 ? "" : "s"}. Missing ones are left out of the average.
          </p>
          <dl>
            {ranked.parts.map((part) => {
              const meta = byId.get(part.id);
              if (!meta) return null;
              return (
                <div key={part.id}>
                  <dt>{meta.label}</dt>
                  <dd>
                    {formatValue(meta.format, part.raw)}
                    <span>
                      {part.year} · percentile {Math.round(part.normalized * 100)}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      ) : (
        <p>
          {presentCount(country, indicators, enabled) === 0
            ? "No data for the indicators that are on. This country stays gray and is left off the ranking."
            : `Only ${presentCount(country, indicators, enabled)} of ${enabled.size} enabled indicators have a value. At least ${minimumCoverage(enabled.size)} are required, so this country stays gray.`}
        </p>
      )}
    </section>
  );
}

function presentCount(
  country: CountryMetrics,
  indicators: IndicatorMeta[],
  enabled: ReadonlySet<IndicatorId>,
): number {
  return indicators.filter((indicator) => enabled.has(indicator.id) && country.values[indicator.id]).length;
}
