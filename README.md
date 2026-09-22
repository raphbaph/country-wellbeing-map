# Country wellbeing map

A local world map and ranking. Six indicators can be switched on or off. Country color and the best-to-worst list both follow the composite of whatever is currently enabled.

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). No account and no server are required after install. `npm test` checks the scoring rules. `npm run build` typechecks and writes a static bundle.

## What the toggles use

The starting point is the Gapminder catalog in [dinorgcom/artmarcovici-next](https://github.com/dinorgcom/artmarcovici-next/tree/master/public/gapminder) (`public/gapminder/data`). Shapes come from `globe_countries.json` in that tree. Country names come from `data/index.json`. Antarctica is omitted so the map frames the inhabited world.

A recent common year is **2023**. When a country has no 2023 observation, the app uses the latest year in **2018–2023** and shows that year. Nothing after 2023 is used for those series, so Gapminder’s long projections are not treated as measurements. Values are copied from the published files. None are filled in or estimated here.

| Toggle | Series | File / code | Year | Unit |
| --- | --- | --- | --- | --- |
| Average wealth | Mean net personal wealth per adult, equal-split | WID.world `ahweal` (`p0p100`, adults `992`, pop `j`), divided by WID PPP `xlcusp` | 2023, else latest 2018–2023 | 2023 USD PPP |
| Median wealth | Wealth threshold at the 50th percentile (the median) | WID.world `thweal` (`p50p51`, same population), same PPP conversion | 2023, else latest 2018–2023 | 2023 USD PPP |
| Average income | GDP per capita | Gapminder `gdppercapita_us_inflation_adjusted` (World Bank) | 2023, else latest 2018–2023 | constant 2015 US$ per person |
| Median income | Median income or consumption per person per day | [Our World in Data `daily-median-income`](https://ourworldindata.org/grapher/daily-median-income), World Bank Poverty and Inequality Platform | Latest survey in **2015–2025** (surveys are not annual) | 2021 PPP$ per day |
| Violent crimes | Age-standardized homicide (interpersonal violence) | Gapminder `murder_per_100000_people` | 2023, else latest 2018–2023 | deaths per 100,000 |
| Life expectancy | Life expectancy at birth | Gapminder `life_expectancy_years` | 2023, else latest 2018–2023 | years |

### Why these series

The Gapminder tree has income, murder, and life expectancy. It does not have average wealth, median wealth, or median income.

- **Average income** uses World Bank GDP per capita from the same catalog. Gapminder’s `income_per_person_long_series` is the usual “income per person” bubble-chart series, but its own description says values **from 2020 onward are projections**. GDP per capita still has a 2023 observation for about 200 countries.
- **Median income** is the World Bank PIP median (income surveys in most high-income countries, consumption surveys in most low-income countries), via the OWID CSV. It is not the same concept as GDP per capita. The year on each country is the survey year.
- **Wealth** is household net wealth per adult from the World Inequality Database (financial and non-financial assets minus debts), converted from local currency to US dollars with WID’s purchasing-power rate. These are not UBS/Credit Suisse market-dollar figures, so the level will not match headline wealth-report tables. Mean and median are both in the database: the mean is `ahweal`, and the median is the `thweal` threshold for percentile `p50p51`.
- **Violent crimes** uses the homicide series. It is the only violent-crime indicator in that tree with broad country coverage. Police-recorded robbery, burglary, and sexual violence in the same catalog cover a few dozen mostly European countries and are not comparable worldwide. The label on the toggle says homicide. A higher rate lowers the composite.

Compiled files shipped with the app:

- `public/data/metrics.json` — one value per country per indicator
- `public/data/world.geojson` — country shapes (a few Gapminder rings are rewound so d3-geo does not treat them as the oceans)
- `data/wid-wealth.json` — WID mean, median, and the PPP conversion, before the year is chosen

Regenerate the app files (network required for Gapminder, OWID, and ISO codes; Node is used to fix polygon winding):

```bash
python3 scripts/prepare_data.py
```

To rebuild `data/wid-wealth.json` from a raw WID `countries-variables` response:

```bash
python3 scripts/prepare_data.py --extract-wid path/to/wid.json
```

## Composite

For each **enabled** indicator, take every country that has a real number. Rank those numbers with average ranks so ties share the middle of the span they occupy. The percentile is that rank divided by (number of countries − 1), so the lowest value is 0 and the highest is 1. If only one country has data, its percentile is 0.5.

Violent crime then becomes `1 − percentile`. Every other indicator keeps the percentile, so higher is always better.

The composite is the **unweighted mean** of the percentiles the country actually has among the enabled indicators, shown on a 0–100 scale. A missing indicator is dropped from that country’s average. It is not treated as zero, and no number is invented.

A country is drawn in gray and left off the ranking when it has values for fewer than half of the enabled indicators, rounded up (`ceil(enabled / 2)`). With one toggle on, that single series is enough. With all six on, a country needs at least three. That keeps a territory that only reports wealth from outranking countries measured on the full set.

If every toggle is off, the map is a single neutral color and the ranking is empty.

Best-to-worst order is the composite descending. Ties break toward the country with more of the enabled indicators present, then by name.

## Attribution

- Country shapes, names, GDP per capita, homicide, and life expectancy: Gapminder data as packaged in [dinorgcom/artmarcovici-next](https://github.com/dinorgcom/artmarcovici-next) `public/gapminder` (series originally from the World Bank, IHME/WHO-style violence mortality, and Gapminder’s life expectancy compilation). Free to reuse with attribution to Gapminder and the original source.
- Average and median wealth: [World Inequality Database](https://wid.world) (World Inequality Lab).
- Median income: World Bank Poverty and Inequality Platform via [Our World in Data](https://ourworldindata.org/grapher/daily-median-income), CC BY.

This project copies only those files and the extracted values. It is not a fork of the Next.js app.
