import type { WealthSourceId, WealthSourcesFile } from "../types";

interface WealthSourceControlProps {
  sources: WealthSourcesFile;
  selected: WealthSourceId;
  onChange: (source: WealthSourceId) => void;
}

export function WealthSourceControl({ sources, selected, onChange }: WealthSourceControlProps) {
  return (
    <fieldset className="source">
      <legend>Wealth source</legend>
      <div className="segment" role="radiogroup" aria-label="Wealth source">
        {sources.options.map((option) => (
          <label key={option.id} className={option.id === selected ? "segment-option on" : "segment-option"}>
            <input
              type="radio"
              name="wealth-source"
              value={option.id}
              checked={option.id === selected}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p>
        Switching source replaces only average and median wealth. If a country has no figure for the
        selected source, that metric stays missing. The other source is not used as a fill-in.
      </p>
    </fieldset>
  );
}
