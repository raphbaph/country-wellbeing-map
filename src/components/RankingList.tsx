import { formatScore, formatValue } from "../format";
import { scoreColor } from "../color";
import type { IndicatorMeta, RankedCountry } from "../types";

interface RankingListProps {
  rows: RankedCountry[];
  indicators: IndicatorMeta[];
  anyEnabled: boolean;
  activeId: string | null;
  query: string;
  onQuery: (value: string) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function RankingList({
  rows,
  indicators,
  anyEnabled,
  activeId,
  query,
  onQuery,
  onHover,
  onSelect,
}: RankingListProps) {
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const needle = query.trim().toLowerCase();
  const visible = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows;

  return (
    <section className="ranking">
      <header>
        <h2>Best to worst</h2>
        <p>
          {anyEnabled
            ? `${rows.length} countries scored`
            : "No indicators selected"}
        </p>
      </header>
      <input
        type="search"
        value={query}
        placeholder="Filter countries"
        aria-label="Filter ranked countries"
        onChange={(event) => onQuery(event.target.value)}
      />
      {!anyEnabled ? (
        <p className="ranking-empty">Turn on at least one indicator. The map stays neutral until then.</p>
      ) : visible.length === 0 ? (
        <p className="ranking-empty">No country names match that filter.</p>
      ) : (
        <ol>
          {visible.map((row) => {
            const place = rows.findIndex((candidate) => candidate.id === row.id) + 1;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={row.id === activeId ? "rank-row active" : "rank-row"}
                  onMouseEnter={() => onHover(row.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(row.id)}
                  aria-pressed={row.id === activeId}
                >
                  <span className="place">{place}</span>
                  <span className="rank-main">
                    <span className="rank-name">{row.name}</span>
                    <span className="rank-metrics">
                      {row.parts.map((part) => {
                        const meta = byId.get(part.id);
                        if (!meta) return null;
                        return (
                          <span key={part.id}>
                            {meta.label} {formatValue(meta.format, part.raw, true)}
                            {part.year !== 2023 ? ` (${part.year})` : ""}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                  <span className="rank-score">
                    <span className="swatch" style={{ background: scoreColor(row.score) }} />
                    {formatScore(row.score)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
