import { useMemo, useState } from "react";
import { correlateCountries } from "../correlation";
import { formatValue } from "../format";
import type { CountryMetrics, IndicatorId, IndicatorMeta } from "../types";

interface Props {
  countries: CountryMetrics[];
  indicators: IndicatorMeta[];
  enabled: ReadonlySet<IndicatorId>;
  activeId: string | null;
  onSelect: (id: string) => void;
}

const number = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function CorrelationPanel({ countries, indicators, enabled, activeId, onSelect }: Props) {
  const [pairKey, setPairKey] = useState("");
  const pairs = useMemo(() => correlateCountries(countries,
    indicators.filter((meta) => enabled.has(meta.id)).map((meta) => meta.id)), [countries, indicators, enabled]);
  const pair = pairs.find((p) => p.key === pairKey) ?? pairs[0];
  const xMeta = indicators.find((meta) => meta.id === pair?.xId);
  const yMeta = indicators.find((meta) => meta.id === pair?.yId);
  const activePoint = pair?.points.find((p) => p.id === activeId);
  const extent = (values: number[]) => {
    if (values.length === 0) return [0, 1];
    const lo = Math.min(...values), hi = Math.max(...values);
    const padding = (hi - lo) * 0.06 || Math.abs(lo) * 0.06 || 1;
    return [lo - padding, hi + padding];
  };
  const [xmin, xmax] = extent(pair?.points.map((p) => p.x) ?? [0]);
  const [ymin, ymax] = extent(pair?.points.map((p) => p.y) ?? [0]);
  const x = (v: number) => 48 + (v - xmin) / (xmax - xmin) * 278;
  const y = (v: number) => 151 - (v - ymin) / (ymax - ymin) * 125;

  return <section className="correlation" aria-labelledby="correlation-title">
    <h2 id="correlation-title">Indicator correlations</h2>
    {!pair || !xMeta || !yMeta ? <p>Select at least two indicators to compare them.</p> : <>
      <div className="correlation-pairs">
        <table>
          <thead><tr><th scope="col">Pair</th><th scope="col">Pearson r</th><th scope="col">Countries</th></tr></thead>
          <tbody>{pairs.map((p) => <tr key={p.key} className={p.key === pair.key ? "selected" : ""}>
            <td><button type="button" aria-pressed={p.key === pair.key} onClick={() => setPairKey(p.key)}>
              {indicators.find((meta) => meta.id === p.xId)?.label} × {indicators.find((meta) => meta.id === p.yId)?.label}
            </button></td>
            <td className="correlation-number">{p.r === null ? "—" : p.r.toFixed(2)}</td>
            <td className="correlation-number">{p.points.length}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="correlation-direction" role="status">
        {pair.r === null ? pair.reason === "too-few" ? "At least 3 countries with both values are needed." : "Correlation is undefined: one indicator is constant."
          : `r = ${pair.r.toFixed(2)} · ${pair.r > 0 ? "Positive" : pair.r < 0 ? "Negative" : "No linear"} relationship · n = ${pair.points.length}`}
      </p>
      <div className="correlation-axis-label">Y: {yMeta.label} · {yMeta.unit}</div>
      {pair.points.length > 0 ? <svg className="correlation-plot" viewBox="0 0 342 183" aria-label={`${xMeta.label} versus ${yMeta.label}. Select a country point for details.`}>
        <rect x="48" y="26" width="278" height="125" className="correlation-frame" />
        {[0, 0.5, 1].map((t) => <g key={t}>
          <text x={48 + 278 * t} y="172" textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"}>{number.format(xmin + (xmax - xmin) * t)}</text>
          <text x="41" y={155 - 125 * t} textAnchor="end">{number.format(ymin + (ymax - ymin) * t)}</text>
        </g>)}
        {pair.points.map((p) => <circle key={p.id} cx={x(p.x)} cy={y(p.y)} r={p.id === activeId ? 5 : 3.5}
          className={p.id === activeId ? "correlation-point active" : "correlation-point"}
          role="button" tabIndex={0} aria-label={`${p.name}: ${xMeta.label} ${formatValue(xMeta.format, p.x)} (${p.xYear}); ${yMeta.label} ${formatValue(yMeta.format, p.y)} (${p.yYear})`}
          onClick={() => onSelect(p.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(p.id); } }}>
          <title>{p.name}: {formatValue(xMeta.format, p.x)} ({p.xYear}) / {formatValue(yMeta.format, p.y)} ({p.yYear})</title>
        </circle>)}
      </svg> : null}
      <div className="correlation-axis-label">X: {xMeta.label} · {xMeta.unit}</div>
      {activePoint ? <p className="correlation-country">{activePoint.name}: {formatValue(xMeta.format, activePoint.x)} ({activePoint.xYear}) / {formatValue(yMeta.format, activePoint.y)} ({activePoint.yYear})</p> : null}
      <p className="correlation-note">−1: opposite direction · 0: no linear relationship · +1: same direction.
        Raw values, equally weighted countries, not ranking scores; crime and Gini are not reversed. Each pair uses all countries with both values, regardless of the ranking filter. Years may differ. Correlation does not imply causation.</p>
    </>}
  </section>;
}
