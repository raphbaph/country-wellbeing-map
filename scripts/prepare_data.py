#!/usr/bin/env python3
"""Build static map + indicator files for the local wellbeing app.

Public inputs (downloaded on each run):
  - Gapminder catalog, geometries, and indicator series from
    github.com/dinorgcom/artmarcovici-next public/gapminder
    (GDP per capita, homicide, life expectancy, income Gini)
  - data/lynn-becker-2019-iq.json (Lynn & Becker 2019 / NIQ V1.3.3, QNW+SAS)
  - Our World in Data "daily median income" CSV (World Bank PIP)
  - ISO 3166 names/codes

Wealth input (already extracted; no API key in this repo):
  - data/wid-wealth.json produced from WID.world series
    ahweal_p0p100_992_j, thweal_p50p51_992_j, xlcusp_p0p100_999_i

Pass --extract-wid /path/to/wid-api.json to regenerate data/wid-wealth.json
from a raw WID countries-variables response.
"""

from __future__ import annotations

import argparse
import csv
import json
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GM = "https://raw.githubusercontent.com/dinorgcom/artmarcovici-next/master/public/gapminder/data"
ISO_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json"
OWID_URL = (
    "https://ourworldindata.org/grapher/daily-median-income.csv"
    "?v=1&csvType=full&useColumnShortNames=true"
)
ANCHOR = 2023
FALLBACK_MIN = 2018
MEDIAN_INCOME_MIN = 2015
MEDIAN_INCOME_MAX = 2025
# Income Gini is a household survey, like median income, not an annual series.
GINI_MIN = 2015
GINI_MAX = 2025
UA = {"User-Agent": "country-wellbeing-map/1.0"}


def fetch_json(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as res:
        return json.load(res)


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read().decode("utf-8")


def pick_year(by_year: dict[int, float], anchor: int = ANCHOR) -> tuple[int, float] | None:
    if anchor in by_year:
        return anchor, by_year[anchor]
    candidates = [y for y in by_year if FALLBACK_MIN <= y <= anchor]
    if not candidates:
        return None
    year = max(candidates)
    return year, by_year[year]


def survey_at(indicator: dict, country_id: str, lo: int, hi: int) -> tuple[int, float] | None:
    """Latest published survey year inside [lo, hi]. Older and later years are ignored."""
    rows = indicator["data"].get(country_id)
    if not rows:
        return None
    best: tuple[int, float] | None = None
    for year, value in zip(indicator["years"], rows):
        if value is None:
            continue
        year = int(year)
        if year < lo or year > hi:
            continue
        if best is None or year > best[0]:
            best = (year, float(value))
    return best


def series_at(indicator: dict, country_id: str) -> tuple[int, float] | None:
    rows = indicator["data"].get(country_id)
    if not rows:
        return None
    years = indicator["years"]
    by_year = {}
    for year, value in zip(years, rows):
        if value is None:
            continue
        year = int(year)
        if year > ANCHOR:
            continue
        by_year[year] = float(value)
    return pick_year(by_year)


def value_map(entries: list) -> dict[str, dict[int, float]]:
    out: dict[str, dict[int, float]] = {}
    for row in entries:
        code, payload = next(iter(row.items()))
        by_year = {}
        for item in payload.get("values", []):
            if item.get("v") is None:
                continue
            by_year[int(item["y"])] = float(item["v"])
        out[code] = by_year
    return out


def extract_wid(raw_path: Path, dest: Path) -> None:
    raw = json.loads(raw_path.read_text())
    means = value_map(raw["ahweal_p0p100_992_j"])
    medians = value_map(raw["thweal_p50p51_992_j"])
    ppp = value_map(raw["xlcusp_p0p100_999_i"])
    compact = {}
    for code in sorted(set(means) | set(medians)):
        rates = ppp.get(code) or {}
        mean_usd = {}
        median_usd = {}
        for year, local in means.get(code, {}).items():
            rate = rates.get(year)
            if rate and rate > 0:
                mean_usd[str(year)] = local / rate
        for year, local in medians.get(code, {}).items():
            rate = rates.get(year)
            if rate and rate > 0:
                median_usd[str(year)] = local / rate
        if mean_usd or median_usd:
            compact[code] = {"mean": mean_usd, "median": median_usd}
    dest.write_text(json.dumps(compact, separators=(",", ":")))
    print(f"wrote {dest} ({len(compact)} countries)")


def load_iso() -> dict[str, dict]:
    rows = fetch_json(ISO_URL)
    by_alpha2 = {}
    for row in rows:
        by_alpha2[row["alpha-2"]] = {
            "iso3": row["alpha-3"].lower(),
            "name": row["name"],
        }
    # Kosovo is not in the ISO file. Gapminder and the shape file use "kos".
    by_alpha2["XK"] = {"iso3": "kos", "name": "Kosovo"}
    return by_alpha2


def load_median_income() -> dict[str, tuple[int, float]]:
    text = fetch_text(OWID_URL)
    reader = csv.DictReader(text.splitlines())
    med_col = next(name for name in reader.fieldnames or [] if name.startswith("median"))
    latest: dict[str, tuple[int, float]] = {}
    for row in reader:
        code = (row.get("code") or "").strip().lower()
        raw = (row.get(med_col) or "").strip()
        if len(code) != 3 or not raw:
            continue
        year = int(row["year"])
        if year < MEDIAN_INCOME_MIN or year > MEDIAN_INCOME_MAX:
            continue
        value = float(raw)
        prev = latest.get(code)
        if prev is None or year > prev[0]:
            latest[code] = (year, value)
    return latest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--extract-wid", type=Path, help="Raw WID API JSON to compact")
    args = parser.parse_args()
    wid_path = ROOT / "data" / "wid-wealth.json"
    if args.extract_wid:
        extract_wid(args.extract_wid, wid_path)

    print("downloading gapminder catalog, shapes, and indicators...")
    index = fetch_json(f"{GM}/index.json")
    globe = fetch_json(f"{GM}/globe_countries.json")
    gdp = fetch_json(f"{GM}/indicators/gdppercapita_us_inflation_adjusted.json")
    murder = fetch_json(f"{GM}/indicators/murder_per_100000_people.json")
    life = fetch_json(f"{GM}/indicators/life_expectancy_years.json")
    gini = fetch_json(f"{GM}/indicators/inequality_index_gini.json")
    iso = load_iso()
    print("downloading median income...")
    median_income = load_median_income()
    wid = json.loads(wid_path.read_text())

    names = {c["id"]: c["name"] for c in index["countries"]}
    for row in iso.values():
        names.setdefault(row["iso3"], row["name"])
    names["kos"] = names.get("kos", "Kosovo")

    values: dict[str, dict] = defaultdict(dict)

    def put(cid: str, key: str, found: tuple[int, float] | None) -> None:
        if found is None:
            return
        year, value = found
        values[cid][key] = {"v": value, "y": year}

    for cid in set(gdp["data"]) | set(murder["data"]) | set(life["data"]) | set(gini["data"]):
        put(cid, "avgIncome", series_at(gdp, cid))
        put(cid, "violentCrime", series_at(murder, cid))
        put(cid, "lifeExpectancy", series_at(life, cid))
        put(cid, "incomeGini", survey_at(gini, cid, GINI_MIN, GINI_MAX))

    for code, obs in median_income.items():
        # OWID uses ISO3. Kosovo may appear as xkx; keep both if present.
        cid = "kos" if code == "xkx" else code
        values[cid]["medIncome"] = {"v": obs[1], "y": obs[0]}

    wid_wealth: dict[str, dict] = defaultdict(dict)
    for alpha2, series in wid.items():
        meta = iso.get(alpha2)
        if not meta:
            continue
        cid = meta["iso3"]
        mean_years = {int(y): v for y, v in series.get("mean", {}).items()}
        median_years = {int(y): v for y, v in series.get("median", {}).items()}
        mean = pick_year(mean_years)
        median = pick_year(median_years)
        if mean:
            wid_wealth[cid]["avgWealth"] = {"v": mean[1], "y": mean[0]}
        if median:
            wid_wealth[cid]["medWealth"] = {"v": median[1], "y": median[0]}

    iq_path = ROOT / "data" / "lynn-becker-2019-iq.json"
    iq_file = json.loads(iq_path.read_text())
    iq_year = int(iq_file["year"])
    for cid, row in iq_file["countries"].items():
        values[cid]["avgIq"] = {"v": row["iq"], "y": iq_year}
        names.setdefault(cid, row["name"])

    ubs_path = ROOT / "data" / "ubs-wealth.json"
    ubs = json.loads(ubs_path.read_text())
    ubs_year = int(ubs["dataYear"])
    ubs_wealth: dict[str, dict] = {}
    for cid, row in ubs["countries"].items():
        entry = {}
        if "mean" in row:
            entry["avgWealth"] = {"v": row["mean"], "y": ubs_year}
        if "median" in row:
            entry["medWealth"] = {"v": row["median"], "y": ubs_year}
        if entry:
            ubs_wealth[cid] = entry
            names.setdefault(cid, row.get("name", cid.upper()))

    # Shapes. Drop Antarctica so the fitted projection is the inhabited world.
    rings_by_id: dict[str, list] = defaultdict(list)
    for poly in globe["polys"]:
        cid = globe["countries"][poly["c"]]
        if cid == "ata":
            continue
        for ring in poly["rings"]:
            if len(ring) >= 4:
                rings_by_id[cid].append(ring)

    features = []
    for cid, rings in rings_by_id.items():
        name = names.get(cid, cid.upper())
        geometry: dict
        if len(rings) == 1:
            geometry = {"type": "Polygon", "coordinates": rings}
        else:
            geometry = {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}
        features.append(
            {
                "type": "Feature",
                "id": cid,
                "properties": {"id": cid, "name": name},
                "geometry": geometry,
            }
        )
    features.sort(key=lambda f: f["id"])

    countries = []
    for cid in sorted(set(values) | set(wid_wealth) | set(ubs_wealth)):
        wealth = {}
        if cid in wid_wealth:
            wealth["wid"] = wid_wealth[cid]
        if cid in ubs_wealth:
            wealth["ubs"] = ubs_wealth[cid]
        if not values.get(cid) and not wealth:
            continue
        entry = {"id": cid, "name": names.get(cid, cid.upper()), "values": values.get(cid, {})}
        if wealth:
            entry["wealth"] = wealth
        countries.append(entry)

    metrics = {
        "anchorYear": ANCHOR,
        "indicators": [
            {
                "id": "avgWealth",
                "label": "Average wealth",
                "detail": "Mean wealth per adult · UBS GWR, market USD",
                "unit": "market USD per adult",
                "higherIsBetter": True,
                "format": "usd",
                "source": "UBS Global Wealth Report 2026, top 30 by average wealth",
                "yearNote": "End of 2025",
            },
            {
                "id": "medWealth",
                "label": "Median wealth",
                "detail": "Median wealth per adult · UBS GWR, market USD",
                "unit": "market USD per adult",
                "higherIsBetter": True,
                "format": "usd",
                "source": "UBS Global Wealth Report 2026, top 30 by median wealth",
                "yearNote": "End of 2025",
            },
            {
                "id": "avgIncome",
                "label": "Average income",
                "detail": "GDP per capita",
                "unit": "constant 2015 US$ per person",
                "higherIsBetter": True,
                "format": "usd",
                "source": "Gapminder gdppercapita_us_inflation_adjusted (World Bank)",
                "yearNote": "2023, or latest year in 2018–2023",
            },
            {
                "id": "medIncome",
                "label": "Median income",
                "detail": "Median income or consumption per day",
                "unit": "2021 PPP$ per person per day",
                "higherIsBetter": True,
                "format": "usdPerDay",
                "source": "World Bank PIP via Our World in Data (daily-median-income)",
                "yearNote": "Latest survey year in 2015–2025",
            },
            {
                "id": "incomeGini",
                "label": "Income inequality (Gini)",
                "detail": "0–100 index · higher means more unequal",
                "unit": "Gini index, 0 (equal) to 100 (unequal)",
                "higherIsBetter": False,
                "format": "gini",
                "source": "Gapminder inequality_index_gini (World Bank Gini index, SI.POV.GINI)",
                "yearNote": "Latest survey year in 2015–2025",
            },
            {
                "id": "violentCrime",
                "label": "Violent crimes",
                "detail": "Homicide rate (age-standardized)",
                "unit": "deaths per 100,000 people",
                "higherIsBetter": False,
                "format": "rate",
                "source": "Gapminder murder_per_100000_people",
                "yearNote": "2023, or latest year in 2018–2023",
            },
            {
                "id": "lifeExpectancy",
                "label": "Life expectancy",
                "detail": "Life expectancy at birth",
                "unit": "years",
                "higherIsBetter": True,
                "format": "years",
                "source": "Gapminder life_expectancy_years",
                "yearNote": "2023, or latest year in 2018–2023",
            },
            {
                "id": "avgIq",
                "label": "Average IQ (Lynn & Becker 2019)",
                "detail": "National IQ compilation · scientifically contested",
                "unit": "IQ points, British mean 100",
                "higherIsBetter": True,
                "format": "iq",
                "source": "Lynn & Becker 2019, NIQ dataset V1.3.3 column QNW+SAS",
                "yearNote": "2019 cross-section",
            },
        ],
        "wealthSources": {
            "default": "ubs",
            "options": [
                {
                    "id": "ubs",
                    "label": "UBS GWR (market USD)",
                    "avgWealth": {
                        "detail": "Mean wealth per adult · UBS GWR, market USD",
                        "unit": "market USD per adult",
                        "source": "UBS Global Wealth Report 2026, top 30 by average wealth",
                        "yearNote": "End of 2025",
                    },
                    "medWealth": {
                        "detail": "Median wealth per adult · UBS GWR, market USD",
                        "unit": "market USD per adult",
                        "source": "UBS Global Wealth Report 2026, top 30 by median wealth",
                        "yearNote": "End of 2025",
                    },
                },
                {
                    "id": "wid",
                    "label": "WID (PPP)",
                    "avgWealth": {
                        "detail": "Mean net personal wealth per adult · WID, USD PPP",
                        "unit": "2023 USD PPP",
                        "source": "WID.world ahweal (equal-split adults), local currency ÷ xlcusp",
                        "yearNote": "2023, or latest year in 2018–2023",
                    },
                    "medWealth": {
                        "detail": "Median net personal wealth per adult · WID, USD PPP",
                        "unit": "2023 USD PPP",
                        "source": "WID.world thweal at the 50th percentile (p50p51), same PPP conversion",
                        "yearNote": "2023, or latest year in 2018–2023",
                    },
                },
            ],
        },
        "countries": countries,
    }

    out_metrics = ROOT / "public" / "data" / "metrics.json"
    out_geo = ROOT / "public" / "data" / "world.geojson"
    out_metrics.write_text(json.dumps(metrics, separators=(",", ":")))
    out_geo.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))

    shaped = set(rings_by_id)
    scored = {c["id"] for c in countries}
    print(f"countries with data: {len(scored)}")
    print(f"map features: {len(features)}")
    print(f"shaped but no data: {len(shaped - scored)}")
    print(f"data but no shape: {sorted(scored - shaped)[:30]} ({len(scored - shaped)})")
    counts = {ind["id"]: 0 for ind in metrics["indicators"]}
    wealth_counts = {"ubs": {"avgWealth": 0, "medWealth": 0}, "wid": {"avgWealth": 0, "medWealth": 0}}
    for country in countries:
        for key in country["values"]:
            counts[key] += 1
        for source, fields in country.get("wealth", {}).items():
            for key in fields:
                wealth_counts[source][key] += 1
    print("coverage", counts)
    print("wealth", wealth_counts)
    for cid in ("che", "usa", "lux", "aus", "deu", "bra", "swe", "zaf", "jpn", "gbr"):
        row = next(country for country in countries if country["id"] == cid)
        print(
            cid,
            row["name"],
            "ubs",
            row.get("wealth", {}).get("ubs"),
            "gini",
            row["values"].get("incomeGini"),
            "iq",
            row["values"].get("avgIq"),
        )
    print(f"wrote {out_metrics} ({out_metrics.stat().st_size} bytes)")
    print(f"wrote {out_geo} ({out_geo.stat().st_size} bytes)")

    import subprocess

    fix = ROOT / "scripts" / "fix_winding.mjs"
    print("rewinding inverted polygons with d3-geo...")
    subprocess.check_call(["node", str(fix)], cwd=ROOT)


if __name__ == "__main__":
    main()
