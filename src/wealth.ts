import type { CountryMetrics, IndicatorMeta, WealthSourceId, WealthSourceSpec } from "./types";

const WEALTH_IDS = ["avgWealth", "medWealth"] as const;

export function applyWealthSource(
  countries: CountryMetrics[],
  source: WealthSourceId,
): CountryMetrics[] {
  return countries.map((country) => {
    const selected = country.wealth?.[source] ?? {};
    const values: CountryMetrics["values"] = { ...country.values };
    delete values.avgWealth;
    delete values.medWealth;
    for (const id of WEALTH_IDS) {
      const metric = selected[id];
      if (metric && Number.isFinite(metric.v)) values[id] = metric;
    }
    return { ...country, values };
  });
}

export function indicatorsForWealthSource(
  indicators: IndicatorMeta[],
  spec: WealthSourceSpec,
): IndicatorMeta[] {
  return indicators.map((indicator) => {
    if (indicator.id !== "avgWealth" && indicator.id !== "medWealth") return indicator;
    const patch = spec[indicator.id];
    return {
      ...indicator,
      detail: patch.detail,
      unit: patch.unit,
      source: patch.source,
      yearNote: patch.yearNote,
    };
  });
}
