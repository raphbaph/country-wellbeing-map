# Country wellbeing map

A local world map and ranking. Eight indicators can be switched on or off. Country color and the best-to-worst list both follow the composite of whatever is currently enabled.

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). No account and no server are required after install. `npm test` checks the scoring rules. `npm run build` typechecks and writes a static bundle.

## What the toggles use

The starting point is the Gapminder catalog in [dinorgcom/artmarcovici-next](https://github.com/dinorgcom/artmarcovici-next/tree/master/public/gapminder) (`public/gapminder/data`). Shapes come from `globe_countries.json` in that tree. Country names come from `data/index.json`. Antarctica is omitted so the map frames the inhabited world.

A recent common year is **2023** for GDP per capita, homicide, life expectancy, and WID wealth. When a country has no 2023 observation, the app uses the latest year in **2018–2023** and shows that year. Nothing after 2023 is used for those series, so Gapminder’s long projections are not treated as measurements. Median income and the Gini index are household surveys, so each country uses its latest published survey in **2015–2025**, which can fall after 2023. Values are copied from the published files. None are filled in or estimated here.

Wealth has two sources. The selector defaults to **UBS GWR (market USD)**. Choosing **WID (PPP)** swaps only average and median wealth. Income, income inequality, homicide, life expectancy, and average IQ do not change. A country missing the selected wealth source is treated as missing for that metric. The app does not fill the gap from the other source.

| Toggle | Series | File / code | Year | Unit |
| --- | --- | --- | --- | --- |
| Average wealth (UBS, default) | Mean wealth per adult | UBS Global Wealth Report 2026, top 30 by average wealth | End of **2025** | market USD per adult |
| Median wealth (UBS, default) | Median wealth per adult | Same report, top 30 by median wealth | End of **2025** | market USD per adult |
| Average wealth (WID) | Mean net personal wealth per adult, equal-split | WID.world `ahweal` (`p0p100`, adults `992`, pop `j`), divided by WID PPP `xlcusp` | 2023, else latest 2018–2023 | 2023 USD PPP |
| Median wealth (WID) | Wealth threshold at the 50th percentile (the median) | WID.world `thweal` (`p50p51`, same population), same PPP conversion | 2023, else latest 2018–2023 | 2023 USD PPP |
| Average income | GDP per capita | Gapminder `gdppercapita_us_inflation_adjusted` (World Bank) | 2023, else latest 2018–2023 | constant 2015 US$ per person |
| Median income | Median income or consumption per person per day | [Our World in Data `daily-median-income`](https://ourworldindata.org/grapher/daily-median-income), World Bank Poverty and Inequality Platform | Latest survey in **2015–2025** (surveys are not annual) | 2021 PPP$ per day |
| Income inequality (Gini) | Income (or, in some countries, consumption) Gini index | Gapminder `inequality_index_gini` (World Bank `SI.POV.GINI`) | Latest survey in **2015–2025** | Gini index, **0–100** (higher = more unequal) |
| Violent crimes | Age-standardized homicide (interpersonal violence) | Gapminder `murder_per_100000_people` | 2023, else latest 2018–2023 | deaths per 100,000 |
| Life expectancy | Life expectancy at birth | Gapminder `life_expectancy_years` | 2023, else latest 2018–2023 | years |
| Average IQ (Lynn & Becker 2019) | Quality-weighted psychometric mean combined with school-assessment IQ (`QNW+SAS`) | [NIQ dataset V1.3.3](https://viewoniq.org/?page_id=9), 21 June 2019, sheet `FAV` | 2019 cross-section | IQ points, British mean 100 |

### Why these series

The Gapminder tree has income, the income Gini, murder, and life expectancy. It does not have average wealth, median wealth, or median income.

- **Average income** uses World Bank GDP per capita from the same catalog. Gapminder’s `income_per_person_long_series` is the usual “income per person” bubble-chart series, but its own description says values **from 2020 onward are projections**. GDP per capita still has a 2023 observation for about 200 countries.
- **Median income** is the World Bank PIP median (income surveys in most high-income countries, consumption surveys in most low-income countries), via the OWID CSV. It is not the same concept as GDP per capita. The year on each country is the survey year.
- **Income inequality** is the World Bank Gini index as packaged by Gapminder (`inequality_index_gini`, the WDI series `SI.POV.GINI`). It runs from 0 (everyone has the same income) to 100 (one person has everything). A higher index lowers the composite, the same way a higher homicide rate does. The underlying survey is income after taxes and transfers in most high-income countries and consumption in most low-income countries, so levels are not perfectly comparable. Surveys are not annual: each country uses its latest published year in 2015–2025. This is income (or consumption) inequality, not a wealth Gini.
- **Wealth, UBS (default).** [UBS Global Wealth Report 2026](https://www.ubs.com/content/dam/assets/wm/static/gwr/global-wealth-report-en-2026.pdf), table “Wealth per adult: the top 30”, market USD per adult as of 31 December 2025. The same table is in the [30 June 2026 press release](https://www.ubs.com/global/en/media/display-page-ndp/en-20260630-gwr-2026.html). Mean and median are separate rankings: Switzerland is first on the mean (USD 910,382) and eighth on the median (USD 145,555). The United Arab Emirates is in the mean top 30 only, so its median is left blank. Slovenia is in the median top 30 only, so its mean is left blank. UBS no longer publishes a near-complete country databook in this report, so coverage is the published top 30 of each ranking (30 means, 30 medians, 31 markets), much thinner than WID.
- **Wealth, WID.** Household net wealth per adult from the [World Inequality Database](https://wid.world) (financial and non-financial assets minus debts), converted from local currency with WID’s PPP rate `xlcusp`. Mean is `ahweal`; median is the `thweal` threshold at percentile `p50p51`. These are 2023 USD PPP, not UBS market dollars, so the levels and the order will not match the UBS table. Coverage is about 200 countries.
- **Violent crimes** uses the homicide series. It is the only violent-crime indicator in that tree with broad country coverage. Police-recorded robbery, burglary, and sexual violence in the same catalog cover a few dozen mostly European countries and are not comparable worldwide. The label on the toggle says homicide. A higher rate lowers the composite.
- **Average IQ** is the 2019 Lynn & Becker national-IQ compilation. The monograph is Richard Lynn and David Becker, *The Intelligence of Nations* (London: Ulster Institute for Social Research, 2019; ISBN 9780993000164). Chapter 2 of that book was calculated from NIQ dataset V1.3.1. The numbers in this app are the corrected 2019 release, **V1.3.3 (21 June 2019)**, downloaded from [viewoniq.org](https://viewoniq.org/?page_id=9) ([zip](https://viewoniq.org/wp-content/uploads/2019/07/NIQ-DATASET-V1.3.3.zip)). The column is `QNW+SAS`: the mean of the quality-and-sample-size-weighted psychometric IQ and the IQ converted from PISA, TIMSS, and PIRLS. If a country has only one of those, that value is kept. Scores are the workbook figures rounded half-up to two decimals. The workbook lists France as `FRA ` with a trailing space; that code is stored as `fra`. These estimates are scientifically contested. A higher score raises the composite. The scale is the British Greenwich norm (the United Kingdom school-assessment anchor is 100). Examples: Japan 106.43, United Kingdom 99.22, United States 97.46, Switzerland 99.25. **148** countries are scored. **52** countries appear in the workbook only as geographic neighbor averages (`QNW+SAS+GEO`); those scores are not copied, and the countries stay missing. Netherlands Antilles (`ANT`, 80.01) has a `QNW+SAS` score but no Gapminder id or shape, so it is listed under `unmatched` and is not assigned to a successor territory. Equatorial Guinea and Guinea-Bissau have neither column filled in.

Compiled files shipped with the app:

- `public/data/metrics.json` — indicators plus both wealth sources on each country (`wealth.ubs` and `wealth.wid`)
- `public/data/world.geojson` — country shapes (a few Gapminder rings are rewound so d3-geo does not treat them as the oceans)
- `data/ubs-wealth.json` — UBS GWR 2026 top-30 mean and median, market USD, end of 2025
- `data/wid-wealth.json` — WID mean, median, and the PPP conversion, before the year is chosen
- `data/lynn-becker-2019-iq.json` — Lynn & Becker / NIQ V1.3.3 `QNW+SAS` scores, plus countries left unmatched or omitted

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

Violent crime and income inequality then become `1 − percentile`. Every other indicator keeps the percentile, so a higher composite is always better.

The composite is the **unweighted mean** of the percentiles the country actually has among the enabled indicators, shown on a 0–100 scale. A missing indicator is dropped from that country’s average. It is not treated as zero, and no number is invented.

A country is drawn in gray and left off the ranking when it has values for fewer than half of the enabled indicators, rounded up (`ceil(enabled / 2)`). With one toggle on, that single series is enough. With all nine on, a country needs at least five. That keeps a territory that only reports wealth from outranking countries measured on the full set.

### Average wages

The ninth indicator is mean monthly employee earnings in **2021 PPP dollars**, from
[ILOSTAT](https://ilostat.ilo.org/methods/concepts-and-definitions/description-wages-and-working-time-statistics/),
series `EAR_EMTA_SEX_CUR_NB_A`, total sex (`SEX_T`), currency `CUR_TYPE_PPP`.
It covers **146 countries/territories** in the 2026-09-22 snapshot. For each country,
the latest eligible annual observation from 2015 through the last complete calendar year is used
(currently 2015–2025), using the API's default best-source feed. Conflicting same-year observations fail the import.

Earnings are generally gross employee remuneration, distinct from the app's GDP-per-capita
"Average income" proxy. PPP dollars represent purchasing power, not exchange-rate US dollars
or take-home pay. Explicitly labelled median, net, full-time-only, full-time-equivalent and unreliable
observations are excluded. Where coverage is unspecified, the ILO indicator definition applies;
national survey coverage, hours and reference periods can still differ. Source labels, years and
national notes are retained in the snapshot and country details. Break-in-series flags are retained.
Missing values remain missing; old observations are not extrapolated and no cross-country estimates are made.

Refresh only wages (leaves existing indicators untouched):

```sh
python3 scripts/prepare_wages.py
python3 -m unittest discover -s test -p 'test_*.py'
npm test
```

`--input path/to/ilo.csv` accepts an offline copy of the API CSV with codes and labels.
The raw endpoint, retrieval date, filters and excluded observations are recorded in
`data/ilo-wages.json`. The full `prepare_data.py` rebuild also applies this checked-in snapshot.

If every toggle is off, the map is a single neutral color and the ranking is empty.

Best-to-worst order is the composite descending. Ties break toward the country with more of the enabled indicators present, then by name.

## Indicator correlations

The panel above the ranking compares every pair of enabled indicators. Two selections produce one
comparison; three produce three. Select a pair to view its scatter plot, then click or keyboard-select
a country point to show its country details on the map. The ranking remains available below.

Pearson's r uses original, untransformed values and equal country weights. Crime and Gini are not
reversed as they are for the composite. Each pair includes only countries with finite values for both
indicators, independently of other enabled indicators, ranking eligibility, and the ranking search.
The sample size is shown for every pair. Fewer than three observations or a constant series produces
an unavailable coefficient, not zero. Changing the wealth source updates both values and coverage
without filling gaps from another source. Observation years can differ and are shown on country points.
Correlation describes a linear association, not causation or statistical significance.

## Attribution

- Country shapes, names, GDP per capita, income Gini, homicide, and life expectancy: Gapminder data as packaged in [dinorgcom/artmarcovici-next](https://github.com/dinorgcom/artmarcovici-next) `public/gapminder` (series originally from the World Bank, IHME/WHO-style violence mortality, and Gapminder’s life expectancy compilation). The Gini file is the World Bank Gini index (`SI.POV.GINI`). Free to reuse with attribution to Gapminder and the original source.
- Average and median wealth, UBS option: UBS Global Wealth Report 2026, UBS Switzerland AG. Figures as of 31 December 2025. [PDF](https://www.ubs.com/content/dam/assets/wm/static/gwr/global-wealth-report-en-2026.pdf).
- Average and median wealth, WID option: [World Inequality Database](https://wid.world) (World Inequality Lab).
- Median income: World Bank Poverty and Inequality Platform via [Our World in Data](https://ourworldindata.org/grapher/daily-median-income), CC BY.
- Average IQ: Lynn, R., & Becker, D. (2019). *The Intelligence of Nations*. London: Ulster Institute for Social Research. Figures from David Becker’s NIQ dataset V1.3.3 (21 June 2019), column `QNW+SAS`.

This project copies only those files and the extracted values. It is not a fork of the Next.js app.
