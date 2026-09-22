#!/usr/bin/env node
/**
 * Reverse exterior rings that d3-geo treats as the whole sphere (common with a
 * few Gapminder polygons). Without this, those countries paint over the map.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "public/data/world.geojson");
const world = JSON.parse(readFileSync(path, "utf8"));
const half = 2 * Math.PI;
let fixed = 0;

for (const feature of world.features) {
  const polys =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const poly of polys) {
    const probe = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: poly },
    };
    if (geoArea(probe) <= half) continue;
    poly[0] = poly[0].slice().reverse();
    const again = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: poly },
    };
    if (geoArea(again) > half) {
      for (let index = 0; index < poly.length; index += 1) {
        poly[index] = poly[index].slice().reverse();
      }
    }
    fixed += 1;
  }
}

writeFileSync(path, JSON.stringify(world));
const remaining = world.features.filter((feature) => geoArea(feature) > half);
console.log(`rewound ${fixed} polygon(s); still inverted: ${remaining.length}`);
if (remaining.length) {
  console.error(remaining.map((feature) => feature.id));
  process.exit(1);
}
