import type { ValueFormat } from "./types";

export function formatValue(format: ValueFormat, value: number, compact = false): string {
  if (format === "usd") {
    const sign = value < 0 ? "−" : "";
    const abs = Math.abs(value);
    if (compact && abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (compact && abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
    return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (format === "usdPerDay") return `$${value.toFixed(2)}/day`;
  if (format === "rate") return `${value.toFixed(2)} / 100k`;
  if (format === "gini") return value.toFixed(1);
  if (format === "iq") return value.toFixed(2);
  return `${value.toFixed(1)} years`;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}
