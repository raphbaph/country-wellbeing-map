import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const iq = JSON.parse(readFileSync(new URL("../data/lynn-becker-2019-iq.json", import.meta.url), "utf8"));

test("Lynn and Becker file keeps published QNW+SAS scores and drops neighbor fill-ins", () => {
  assert.equal(iq.countries.jpn.iq, 106.43);
  assert.equal(iq.countries.usa.iq, 97.46);
  assert.equal(iq.countries.gbr.iq, 99.22);
  assert.equal(iq.countries.che.iq, 99.25);
  assert.equal(iq.countries.fra.iq, 96.91);
  assert.equal(iq.countries.afg, undefined);
  assert.equal(iq.countries.ant, undefined);
  assert.equal(iq.unmatched[0].iso3, "ANT");
  assert.equal(iq.unmatched[0].iq, 80.01);
  assert.ok(iq.omittedGeographicOnly.some((row: { iso3: string }) => row.iso3 === "AFG"));
  assert.equal(Object.keys(iq.countries).length, 148);
});
