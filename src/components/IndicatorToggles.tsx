import type { IndicatorId, IndicatorMeta } from "../types";

interface IndicatorTogglesProps {
  indicators: IndicatorMeta[];
  enabled: ReadonlySet<IndicatorId>;
  onToggle: (id: IndicatorId) => void;
}

export function IndicatorToggles({ indicators, enabled, onToggle }: IndicatorTogglesProps) {
  return (
    <fieldset className="toggles">
      <legend>Indicators</legend>
      {indicators.map((indicator) => {
        const on = enabled.has(indicator.id);
        return (
          <label key={indicator.id} className={on ? "toggle on" : "toggle"}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(indicator.id)}
            />
            <span>
              <strong>{indicator.label}</strong>
              <small>
                {indicator.detail}
                {indicator.higherIsBetter ? "" : " · higher is worse, so the score is reversed"}
              </small>
            </span>
          </label>
        );
      })}
      {indicators.filter((indicator) => indicator.id === "avgWages").map((indicator) => (
        <details className="wage-notes" key={indicator.id}>
          <summary>Wage data & coverage</summary>
          <p>{indicator.yearNote}. Missing values are not estimated.</p>
          <p>Mean monthly employee earnings, generally gross, adjusted for purchasing power
            (2021 PPP$). Not take-home pay or an amount exchangeable into US dollars.
            National coverage and working hours can differ; these are not uniform full-time salaries.</p>
          <p>Explicitly labelled median, net, full-time-only, full-time-equivalent and unreliable
            observations are excluded. Values before 2015 are omitted.</p>
          <a href={indicator.sourceUrl} target="_blank" rel="noreferrer">ILOSTAT methodology</a>
        </details>
      ))}
    </fieldset>
  );
}
