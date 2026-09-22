import assert from "node:assert/strict";
import test from "node:test";
import { minimumCoverage, percentileRanks, rankCountries } from "../src/score.ts";
import type { CountryMetrics, IndicatorMeta } from "../src/types.ts";

const indicators: IndicatorMeta[] = [
  {
    id: "avgIncome",
    label: "Average income",
    detail: "",
    unit: "",
    higherIsBetter: true,
    format: "usd",
    source: "",
    yearNote: "",
  },
  {
    id: "violentCrime",
    label: "Violent crimes",
    detail: "",
    unit: "",
    higherIsBetter: false,
    format: "rate",
    source: "",
    yearNote: "",
  },
];

function country(id: string, values: CountryMetrics["values"]): CountryMetrics {
  return { id, name: id.toUpperCase(), values };
}

test("percentile ranks put the minimum at 0 and the maximum at 1", () => {
  const ranks = percentileRanks([
    { id: "a", value: 10 },
    { id: "b", value: 30 },
    { id: "c", value: 20 },
  ]);
  assert.equal(ranks.get("a"), 0);
  assert.equal(ranks.get("c"), 0.5);
  assert.equal(ranks.get("b"), 1);
});

test("ties share the average rank", () => {
  const ranks = percentileRanks([
    { id: "a", value: 1 },
    { id: "b", value: 2 },
    { id: "c", value: 2 },
  ]);
  assert.equal(ranks.get("a"), 0);
  assert.equal(ranks.get("b"), 0.75);
  assert.equal(ranks.get("c"), 0.75);
});

test("violent crime is inverted and missing metrics are dropped from the average", () => {
  const ranked = rankCountries(
    [
      country("rich-safe", { avgIncome: { v: 100, y: 2023 }, violentCrime: { v: 1, y: 2023 } }),
      country("poor-unsafe", { avgIncome: { v: 10, y: 2023 }, violentCrime: { v: 50, y: 2023 } }),
      country("income-only", { avgIncome: { v: 10, y: 2023 } }),
    ],
    indicators,
    new Set(["avgIncome", "violentCrime"]),
  );

  assert.equal(ranked[0].id, "rich-safe");
  assert.equal(ranked[0].score, 100);
  assert.equal(ranked.at(-1)?.id, "poor-unsafe");

  const partial = ranked.find((row) => row.id === "income-only");
  assert.ok(partial);
  assert.equal(partial.parts.length, 1);
  // Income 10 is tied for last with the other low-income country, so its
  // only contribution is the shared percentile, not a zero for missing crime.
  assert.equal(partial.score, 25);
  assert.equal(ranked.find((row) => row.id === "poor-unsafe")?.score, 12.5);
});

test("fewer than half of the enabled indicators leaves a country unscored", () => {
  const four = [
    ...indicators,
    { ...indicators[0], id: "avgWealth" as const, higherIsBetter: true },
    { ...indicators[0], id: "lifeExpectancy" as const, higherIsBetter: true },
  ];
  const ranked = rankCountries(
    [
      country("full", {
        avgIncome: { v: 3, y: 2023 },
        violentCrime: { v: 1, y: 2023 },
        avgWealth: { v: 3, y: 2023 },
        lifeExpectancy: { v: 80, y: 2023 },
      }),
      country("thin", { avgWealth: { v: 99, y: 2023 } }),
    ],
    four,
    new Set(["avgIncome", "violentCrime", "avgWealth", "lifeExpectancy"]),
  );
  assert.equal(minimumCoverage(4), 2);
  assert.deepEqual(ranked.map((row) => row.id), ["full"]);
});

test("income Gini is inverted so a more equal country scores higher", () => {
  const gini: IndicatorMeta = {
    ...indicators[0],
    id: "incomeGini",
    label: "Income inequality (Gini)",
    higherIsBetter: false,
    format: "gini",
  };
  const ranked = rankCountries(
    [
      country("equal", { incomeGini: { v: 25, y: 2023 } }),
      country("unequal", { incomeGini: { v: 55, y: 2022 } }),
    ],
    [gini],
    new Set(["incomeGini"]),
  );
  assert.deepEqual(
    ranked.map((row) => [row.id, row.score, row.parts[0].normalized]),
    [
      ["equal", 100, 1],
      ["unequal", 0, 0],
    ],
  );
});

test("a higher Lynn & Becker IQ ranks above a lower one", () => {
  const iq: IndicatorMeta = {
    ...indicators[0],
    id: "avgIq",
    label: "Average IQ (Lynn & Becker 2019)",
    higherIsBetter: true,
    format: "iq",
  };
  const ranked = rankCountries(
    [
      country("low", { avgIq: { v: 80, y: 2019 } }),
      country("high", { avgIq: { v: 105, y: 2019 } }),
    ],
    [iq],
    new Set(["avgIq"]),
  );
  assert.deepEqual(
    ranked.map((row) => [row.id, row.score]),
    [
      ["high", 100],
      ["low", 0],
    ],
  );
});

test("no enabled indicators produces an empty ranking", () => {
  const ranked = rankCountries(
    [country("a", { avgIncome: { v: 1, y: 2023 } })],
    indicators,
    new Set(),
  );
  assert.deepEqual(ranked, []);
});
