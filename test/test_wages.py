import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_wages import select_wages, apply_wages


def row(**changes):
    return dict({'indicator': 'EAR_EMTA_SEX_CUR_NB', 'sex': 'SEX_T',
                 'classif1': 'CUR_TYPE_PPP', 'ref_area': 'AUT', 'ref_area.label': 'Austria',
                 'time': '2023', 'obs_value': '3000', 'source': 'BA:1',
                 'source.label': 'Labour force survey'}, **changes)


class WagesTest(unittest.TestCase):
    def test_latest_eligible_not_latest_incompatible(self):
        rows = [row(), row(time='2024', **{'note_indicator.label': 'Central tendency measure: Median'}),
                row(time='2025', **{'note_indicator.label': 'Accounting concept: Net'})]
        selected, excluded = select_wages(rows, 2025)
        self.assertEqual(selected['aut']['y'], 2023)
        self.assertEqual(len(excluded), 2)

    def test_wrong_units_sex_dates_and_nonfinite_excluded(self):
        rows = [row(classif1='CUR_TYPE_USD'), row(sex='SEX_F'), row(time='2014'),
                row(time='2026'), row(obs_value='NaN'), row(obs_value='inf'), row(obs_value='0'),
                row(obs_status='U'), row(**{'note_indicator.label': 'Working time arrangement coverage: Full-time workers'}),
                row(**{'note_indicator.label': 'Working time arrangement coverage: Full-time equivalents'})]
        self.assertEqual(select_wages(rows, 2025)[0], {})

    def test_conflicting_source_cannot_silently_win(self):
        with self.assertRaises(ValueError):
            select_wages([row(), row(obs_value='4000')], 2025)

    def test_update_preserves_other_indicators_and_is_idempotent(self):
        metrics = {'indicators': [{'id': 'avgIncome'}], 'countries': [
            {'id': 'aut', 'values': {'avgIncome': {'v': 100, 'y': 2023}}},
            {'id': 'xyz', 'values': {}}]}
        snapshot = {'countries': select_wages([row()], 2025)[0]}
        apply_wages(metrics, snapshot)
        apply_wages(metrics, snapshot)
        self.assertEqual(len(metrics['indicators']), 2)
        self.assertEqual(metrics['countries'][0]['values']['avgIncome'], {'v': 100, 'y': 2023})
        self.assertEqual(metrics['countries'][0]['values']['avgWages']['v'], 3000)
        self.assertNotIn('avgWages', metrics['countries'][1]['values'])


if __name__ == '__main__':
    unittest.main()
