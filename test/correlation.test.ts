import assert from "node:assert/strict";
import test from "node:test";
import { correlateCountries } from "../src/correlation.ts";
import { applyWealthSource } from "../src/wealth.ts";
import type { CountryMetrics } from "../src/types.ts";

const rows = (xs: number[], ys: number[]): CountryMetrics[] => xs.map((v, i) => ({
  id: String(i), name: String(i), values: { avgIncome: { v, y: 2023 }, violentCrime: { v: ys[i], y: 2022 } },
}));
const pair = (data: CountryMetrics[]) => correlateCountries(data, ["avgIncome", "violentCrime"])[0];

test("Pearson retains raw direction, supports zero/negative values and independent units", () => {
  assert.ok(Math.abs(pair(rows([-1, 0, 1], [3, 2, 1])).r! + 1) < 1e-12);
  assert.ok(Math.abs(pair(rows([1e150, 2e150, 3e150], [10, 20, 30])).r! - 1) < 1e-12);
  assert.equal(pair(rows([-1, 0, 1], [1, -2, 1])).r, 0);
});
test("missing/non-finite values are excluded pairwise, not imputed", () => {
  const data = rows([1, 2, 3, NaN, 4], [2, 4, 6, 9, Infinity]);
  data.push({ id: "missing", name: "Missing", values: { avgIncome: { v: 100, y: 2023 } } });
  const result = pair(data);
  assert.equal(result.points.length, 3);
  assert.ok(Math.abs(result.r! - 1) < 1e-12);
  assert.equal(result.points[0].yYear, 2022);
});
test("small samples and constant series have no coefficient", () => {
  assert.equal(pair(rows([1, 2], [3, 4])).reason, "too-few");
  assert.equal(pair(rows([], [])).r, null);
  assert.equal(pair(rows([1, 1, 1], [1, 2, 3])).reason, "constant");
  assert.equal(pair(rows([1, 2, 3], [0, 0, 0])).r, null);
});
test("three selections produce three distinct pairs; zero/one produce none", () => {
  assert.equal(correlateCountries([], []).length, 0);
  assert.equal(correlateCountries([], ["avgIq"]).length, 0);
  assert.equal(correlateCountries([], ["avgIq", "avgIncome", "violentCrime", "avgIq"]).length, 3);
});
test("switching wealth source recalculates coverage and values without fallback", () => {
  const data = rows([1, 2, 3], [1, 2, 3]).map((c, i) => ({ ...c, wealth: {
    wid: { avgWealth: { v: i + 1, y: 2023 } },
    ubs: i === 2 ? {} : { avgWealth: { v: 9 - i, y: 2025 } },
  } }));
  const calc = (source: "wid" | "ubs") => correlateCountries(applyWealthSource(data, source), ["avgIncome", "avgWealth"])[0];
  assert.equal(calc("ubs").points.length, 2);
  assert.equal(calc("ubs").r, null);
  assert.ok(Math.abs(calc("wid").r! - 1) < 1e-12);
});
