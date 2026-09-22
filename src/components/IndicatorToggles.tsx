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
    </fieldset>
  );
}
