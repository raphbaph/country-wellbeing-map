import assert from "node:assert/strict";
import test from "node:test";
import { applyWealthSource } from "../src/wealth.ts";
import type { CountryMetrics } from "../src/types.ts";

const country: CountryMetrics = {
  id: "che",
  name: "Switzerland",
  values: {
    avgIncome: { v: 90077, y: 2023 },
    avgWealth: { v: 1, y: 1999 },
  },
  wealth: {
    wid: {
      avgWealth: { v: 708048, y: 2023 },
      medWealth: { v: 201832, y: 2023 },
    },
    ubs: {
      avgWealth: { v: 910382, y: 2025 },
      medWealth: { v: 145555, y: 2025 },
    },
  },
};

const widOnly: CountryMetrics = {
  id: "nga",
  name: "Nigeria",
  values: { lifeExpectancy: { v: 54, y: 2023 } },
  wealth: {
    wid: { avgWealth: { v: 70901, y: 2023 }, medWealth: { v: 25324, y: 2023 } },
  },
};

test("UBS wealth replaces WID and does not fall back", () => {
  const [swiss, nigeria] = applyWealthSource([country, widOnly], "ubs");
  assert.equal(swiss.values.avgWealth?.v, 910382);
  assert.equal(swiss.values.medWealth?.v, 145555);
  assert.equal(swiss.values.avgIncome?.v, 90077);
  assert.equal(nigeria.values.avgWealth, undefined);
  assert.equal(nigeria.values.medWealth, undefined);
  assert.equal(nigeria.values.lifeExpectancy?.v, 54);
});

test("WID wealth is used only when that source is selected", () => {
  const [swiss] = applyWealthSource([country], "wid");
  assert.equal(swiss.values.avgWealth?.v, 708048);
  assert.equal(swiss.values.medWealth?.v, 201832);
  assert.notEqual(swiss.values.avgWealth?.v, 910382);
});
