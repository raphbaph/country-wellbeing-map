"""Refresh only average wages from ILOSTAT; preserve every other indicator."""
import argparse
import csv
import io
import json
import math
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = ('https://rplumber.ilo.org/data/indicator?id=EAR_EMTA_SEX_CUR_NB_A'
       '&sex=SEX_T&classif1=CUR_TYPE_PPP&type=both&format=.csv')
METHOD_URL = 'https://ilostat.ilo.org/methods/concepts-and-definitions/description-wages-and-working-time-statistics/'


def select_wages(rows, max_year):
    """Latest eligible annual observation, using ILO's default best-source feed."""
    selected = {}
    excluded = []
    for row in rows:
        if (row['indicator'] != 'EAR_EMTA_SEX_CUR_NB' or row['sex'] != 'SEX_T'
                or row['classif1'] != 'CUR_TYPE_PPP'):
            continue
        try:
            year, value = int(row['time']), float(row['obs_value'])
        except (ValueError, TypeError):
            continue
        if year < 2015 or year > max_year or not math.isfinite(value) or value <= 0:
            continue
        notes = ' | '.join(row.get(f'{key}.label', '') for key in
                           ('note_classif', 'note_indicator', 'note_source'))
        reason = next((term for term in (
            'Central tendency measure: Median', 'Accounting concept: Net',
            'Working time arrangement coverage: Full-time workers',
            'Working time arrangement coverage: Full-time equivalents',
        ) if term.lower() in notes.lower()), None)
        if row.get('obs_status') == 'U':
            reason = 'Unreliable observation'
        if reason:
            excluded.append({'id': row['ref_area'].lower(), 'y': year, 'reason': reason})
            continue
        cid = row['ref_area'].lower()
        cid = 'kos' if cid == 'xkx' else cid
        entry = {
            'name': row['ref_area.label'], 'v': value, 'y': year,
            'source': row['source.label'], 'sourceCode': row['source'],
            'note': ' | '.join(filter(None, (row.get('obs_status.label'),
                row.get('note_classif.label'), row.get('note_indicator.label'),
                row.get('note_source.label')))),
        }
        previous = selected.get(cid)
        if previous and previous['y'] == year and previous != entry:
            raise ValueError(f'Ambiguous best-source observation: {cid} {year}')
        if previous is None or year > previous['y']:
            selected[cid] = entry
    return dict(sorted(selected.items())), excluded


def apply_wages(metrics, snapshot=None):
    if snapshot is None:
        snapshot = json.loads((ROOT / 'data/ilo-wages.json').read_text(encoding='utf-8'))
    known = {c['id']: c for c in metrics['countries']}
    for country in known.values():
        country['values'].pop('avgWages', None)
    unmatched = set(snapshot['countries']) - set(known)
    if unmatched:
        raise ValueError(f'Unmapped wage countries: {sorted(unmatched)}')
    for cid, row in snapshot['countries'].items():
        known[cid]['values']['avgWages'] = {k: row[k] for k in ('v', 'y', 'source', 'note')}
    years = [row['y'] for row in snapshot['countries'].values()]
    meta = {
        'id': 'avgWages', 'label': 'Average wages',
        'detail': 'Gross monthly employee earnings · 2021 PPP$',
        'unit': '2021 PPP$ per employee per month', 'higherIsBetter': True,
        'format': 'pppPerMonth', 'source': 'ILOSTAT · EAR_EMTA_SEX_CUR_NB (total sex, PPP)',
        'sourceUrl': METHOD_URL,
        'yearNote': f'Latest eligible year per country ({min(years)}–{max(years)}); {len(years)} countries/territories',
    }
    metrics['indicators'] = [m for m in metrics['indicators'] if m['id'] != 'avgWages']
    idx = next(i for i, m in enumerate(metrics['indicators']) if m['id'] == 'avgIncome')
    metrics['indicators'].insert(idx + 1, meta)
    return metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='Previously downloaded ILO CSV (both codes and labels)')
    args = parser.parse_args()
    text = args.input.read_text(encoding='utf-8-sig') if args.input else urllib.request.urlopen(URL, timeout=120).read().decode('utf-8-sig')
    today = date.today()
    countries, excluded = select_wages(csv.DictReader(io.StringIO(text)), today.year - 1)
    if not countries:
        raise ValueError('No eligible wages returned; refusing to replace the snapshot')
    snapshot = {'sourceUrl': URL, 'methodologyUrl': METHOD_URL, 'retrieved': today.isoformat(),
                'selection': 'Latest eligible annual value from 2015 through the last complete calendar year. Total sex; 2021 PPP$. ILO default best source. Exclude explicitly labelled median, net, full-time-only, full-time-equivalent and unreliable observations. Unspecified coverage follows the ILO indicator definition; national coverage can still differ. No imputation or year extrapolation.',
                'countries': countries, 'excludedObservations': excluded}
    metrics_path = ROOT / 'public/data/metrics.json'
    metrics = apply_wages(json.loads(metrics_path.read_text(encoding='utf-8')), snapshot)
    (ROOT / 'data/ilo-wages.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    metrics_path.write_text(json.dumps(metrics, separators=(',', ':')), encoding='utf-8')
    print(f'Wages: {len(countries)} countries/territories; years {min(r["y"] for r in countries.values())}–{max(r["y"] for r in countries.values())}')


if __name__ == '__main__':
    main()
