import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { correlateCountries } from "../src/correlation.ts";
import { rankCountries } from "../src/score.ts";
import { formatValue } from "../src/format.ts";
import type { MetricsFile } from "../src/types.ts";

const data: MetricsFile = JSON.parse(readFileSync(new URL("../public/data/metrics.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(readFileSync(new URL("../data/ilo-wages.json", import.meta.url), "utf8"));

test("published wage snapshot preserves source values, years and missingness", () => {
  const rows = data.countries.filter(c => c.values.avgWages);
  assert.equal(rows.length, Object.keys(snapshot.countries).length);
  assert.equal(rows.length, 146);
  for (const c of rows) {
    assert.equal(c.values.avgWages!.v, snapshot.countries[c.id].v);
    assert.equal(c.values.avgWages!.y, snapshot.countries[c.id].y);
    assert.ok(c.values.avgWages!.y >= 2015 && c.values.avgWages!.y <= 2025);
    assert.ok(c.values.avgWages!.source);
  }
  assert.equal(data.countries.find(c => c.id === "aut")!.values.avgWages!.v, 7259.17);
  assert.equal(data.countries.find(c => c.id === "deu")!.values.avgWages!.y, 2022);
  assert.equal(data.countries.find(c => c.id === "chn")!.values.avgWages, undefined);
});

test("wages participate in ranking and pairwise correlations in monthly PPP units", () => {
  const ranked = rankCountries(data.countries, data.indicators, new Set(["avgWages"]));
  assert.equal(ranked.length, 146);
  assert.equal(ranked[0].parts[0].raw, Math.max(...ranked.map(r => r.parts[0].raw)));
  const pair = correlateCountries(data.countries, ["avgWages", "lifeExpectancy"])[0];
  const joint = data.countries.filter(c => c.values.avgWages && c.values.lifeExpectancy);
  assert.equal(pair.points.length, joint.length);
  assert.ok(Number.isFinite(pair.r));
  assert.equal(formatValue("pppPerMonth", 7259.17), "7,259 PPP$/mo");
});
