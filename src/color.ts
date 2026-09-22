const STOPS: Array<[number, [number, number, number]]> = [
  [0, [190, 24, 93]],
  [0.28, [37, 99, 235]],
  [0.52, [8, 145, 178]],
  [0.76, [34, 197, 94]],
  [1, [253, 224, 71]],
];

export const NO_DATA = "#334155";
export const NEUTRAL = "#3f4d63";

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const channel = (index: 0 | 1 | 2) => Math.round(a[index] + (b[index] - a[index]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Sequential color for a 0–100 composite. Higher (better) is gold. */
export function scoreColor(score: number): string {
  const t = Math.min(1, Math.max(0, score / 100));
  for (let index = 1; index < STOPS.length; index += 1) {
    const [end, color] = STOPS[index];
    const [start, previous] = STOPS[index - 1];
    if (t <= end) {
      const span = end - start;
      return mix(previous, color, span === 0 ? 0 : (t - start) / span);
    }
  }
  return mix(STOPS[STOPS.length - 1][1], STOPS[STOPS.length - 1][1], 0);
}
