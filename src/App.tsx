import { useEffect, useMemo, useState } from "react";
import { CountryDetail } from "./components/CountryDetail";
import { IndicatorToggles } from "./components/IndicatorToggles";
import { RankingList } from "./components/RankingList";
import { WealthSourceControl } from "./components/WealthSourceControl";
import { WorldMap } from "./components/WorldMap";
import { scoreColor } from "./color";
import { minimumCoverage, rankCountries } from "./score";
import type { IndicatorId, MetricsFile, WealthSourceId, WorldCollection } from "./types";
import { applyWealthSource, indicatorsForWealthSource } from "./wealth";

const ALL_IDS: IndicatorId[] = [
  "avgWealth",
  "medWealth",
  "avgIncome",
  "medIncome",
  "incomeGini",
  "violentCrime",
  "lifeExpectancy",
  "avgIq",
];

export function App() {
  const [metrics, setMetrics] = useState<MetricsFile | null>(null);
  const [world, setWorld] = useState<WorldCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<IndicatorId>>(() => new Set(ALL_IDS));
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [wealthSource, setWealthSource] = useState<WealthSourceId>("ubs");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/metrics.json").then((response) => {
        if (!response.ok) throw new Error("Could not load indicator data");
        return response.json() as Promise<MetricsFile>;
      }),
      fetch("/data/world.geojson").then((response) => {
        if (!response.ok) throw new Error("Could not load the country map");
        return response.json() as Promise<WorldCollection>;
      }),
    ])
      .then(([nextMetrics, nextWorld]) => {
        if (cancelled) return;
        setMetrics(nextMetrics);
        setWorld(nextWorld);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load data");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinnedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeWealthSpec = metrics?.wealthSources.options.find((option) => option.id === wealthSource);
  const viewIndicators = useMemo(
    () =>
      metrics && activeWealthSpec
        ? indicatorsForWealthSource(metrics.indicators, activeWealthSpec)
        : metrics?.indicators ?? [],
    [metrics, activeWealthSpec],
  );
  const viewCountries = useMemo(
    () => (metrics ? applyWealthSource(metrics.countries, wealthSource) : []),
    [metrics, wealthSource],
  );
  const ranked = useMemo(
    () => (metrics ? rankCountries(viewCountries, viewIndicators, enabled) : []),
    [metrics, viewCountries, viewIndicators, enabled],
  );
  const rankedById = useMemo(() => new Map(ranked.map((row) => [row.id, row])), [ranked]);
  const countryById = useMemo(
    () => new Map(viewCountries.map((country) => [country.id, country])),
    [viewCountries],
  );
  const nameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const feature of world?.features ?? []) names.set(feature.properties.id, feature.properties.name);
    for (const country of viewCountries) names.set(country.id, country.name);
    return names;
  }, [world, viewCountries]);

  const activeId = hoveredId ?? pinnedId;
  const activeCountry = activeId
    ? countryById.get(activeId) ?? { id: activeId, name: nameById.get(activeId) ?? activeId, values: {} }
    : null;
  const activeRanked = activeId ? rankedById.get(activeId) ?? null : null;
  const activePlace = activeRanked ? ranked.findIndex((row) => row.id === activeRanked.id) + 1 : null;
  const scores = useMemo(() => new Map(ranked.map((row) => [row.id, row.score])), [ranked]);

  function toggle(id: IndicatorId) {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local snapshot · anchor year {metrics?.anchorYear ?? 2023}</p>
          <h1>Country wellbeing</h1>
        </div>
        <p className="formula">
          Each enabled indicator is turned into a percentile across countries that have a value.
          The composite is the average of those percentiles. Violent crime and income inequality are
          reversed, so a lower homicide rate and a more equal distribution score higher. Missing
          numbers are skipped, not filled in. A country needs data for at least half of the enabled
          indicators (rounded up) or it stays gray.
        </p>
      </header>
      {error ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}
      {!metrics || !world ? (
        <p className="loading">Loading map and indicators…</p>
      ) : (
        <main className="workspace">
          <aside className="side">
            <WealthSourceControl
              sources={metrics.wealthSources}
              selected={wealthSource}
              onChange={setWealthSource}
            />
            <IndicatorToggles indicators={viewIndicators} enabled={enabled} onToggle={toggle} />
            <div className="legend" aria-hidden={enabled.size === 0}>
              <span>Lower</span>
              <span
                className="legend-bar"
                style={{
                  background:
                    enabled.size === 0
                      ? "#3f4d63"
                      : `linear-gradient(90deg, ${scoreColor(0)}, ${scoreColor(25)}, ${scoreColor(50)}, ${scoreColor(75)}, ${scoreColor(100)})`,
                }}
              />
              <span>Higher</span>
            </div>
            <p className="legend-note">
              {enabled.size === 0
                ? "The map stays neutral until an indicator is on."
                : `Gray countries have fewer than ${minimumCoverage(enabled.size)} of the ${enabled.size} enabled indicators.`}
            </p>
            <CountryDetail
              country={activeCountry}
              ranked={activeRanked}
              rank={activePlace}
              indicators={viewIndicators}
              enabled={enabled}
              anyEnabled={enabled.size > 0}
            />
          </aside>
          <WorldMap
            world={world}
            scores={scores}
            anyEnabled={enabled.size > 0}
            activeId={activeId}
            onHover={setHoveredId}
            onSelect={(id) => setPinnedId((current) => (current === id ? null : id))}
          />
          <RankingList
            rows={ranked}
            indicators={viewIndicators}
            anyEnabled={enabled.size > 0}
            activeId={activeId}
            query={query}
            onQuery={setQuery}
            onHover={setHoveredId}
            onSelect={(id) => setPinnedId((current) => (current === id ? null : id))}
          />
        </main>
      )}
    </div>
  );
}
