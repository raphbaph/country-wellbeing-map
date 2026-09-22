import type { CountryMetrics, IndicatorId } from "./types";

export interface CorrelationPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  xYear: number;
  yYear: number;
}

export interface CorrelationPair {
  key: string;
  xId: IndicatorId;
  yId: IndicatorId;
  points: CorrelationPoint[];
  r: number | null;
  reason: "too-few" | "constant" | null;
}

/** Pairwise complete observations, equally weighted, in original units/directions. */
export function correlateCountries(countries: CountryMetrics[], ids: IndicatorId[]): CorrelationPair[] {
  const unique = [...new Set(ids)];
  return unique.flatMap((xId, index) => unique.slice(index + 1).map((yId) => {
    const points: CorrelationPoint[] = [];
    for (const country of countries) {
      const x = country.values[xId];
      const y = country.values[yId];
      if (x && y && Number.isFinite(x.v) && Number.isFinite(y.v)) {
        points.push({ id: country.id, name: country.name, x: x.v, y: y.v, xYear: x.y, yYear: y.y });
      }
    }
    const base = { key: `${xId}:${yId}`, xId, yId, points };
    if (points.length < 3) return { ...base, r: null, reason: "too-few" as const };
    // Scale before centering to avoid overflow for large monetary values.
    const sx = Math.max(...points.map((p) => Math.abs(p.x))) || 1;
    const sy = Math.max(...points.map((p) => Math.abs(p.y))) || 1;
    const mx = points.reduce((sum, p) => sum + p.x / sx, 0) / points.length;
    const my = points.reduce((sum, p) => sum + p.y / sy, 0) / points.length;
    let xx = 0, yy = 0, xy = 0;
    for (const p of points) {
      const dx = p.x / sx - mx, dy = p.y / sy - my;
      xx += dx * dx; yy += dy * dy; xy += dx * dy;
    }
    if (xx === 0 || yy === 0) return { ...base, r: null, reason: "constant" as const };
    return { ...base, r: Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))), reason: null };
  }));
}
