"""Source dates and names are tested without files, models, UI or network."""
import unittest
from datetime import datetime, timezone

from server.brain_metadata import extract_metadata, source_metadata


IMPORTED = '2026-10-03T10:00:00Z'


class BrainMetadataTests(unittest.TestCase):
    def metadata(self, data=None, name='001 - Jardin 2026-10-02.mp3', **kwargs):
        return source_metadata(data or {}, name, 'audio', IMPORTED, **kwargs)

    def extract(self, name='001 - Jardin 2026-10-02.mp3', original='', data=None, result=None, **job):
        source = self.metadata(data, name)
        return extract_metadata({'sourceMetadata': source, 'original': original, **job},
                                result or {'title': 'Le jardin', 'description': 'Une idée de jardin.'})

    def test_source_first_title_subject_description_number_and_complete_provenance(self):
        value = self.extract(data={'sourceRelativePath': 'Voix/001 - Jardin 2026-10-02.mp3',
                                   'sourceTimeZone': 'Europe/Paris'})
        self.assertEqual(value['title'], '001 - Jardin 2026-10-02')
        self.assertEqual(value['subject'], 'Le jardin')
        self.assertEqual(value['description'], 'Une idée de jardin.')
        self.assertEqual(value['file_number'], '001')
        self.assertEqual(value['note_date'], '2026-10-02')
        self.assertEqual(value['note_date_basis'], 'filename')
        self.assertEqual(value['source_relative_path'], 'Voix/001 - Jardin 2026-10-02.mp3')
        self.assertEqual(value['provenance']['imported_at'], IMPORTED)
        self.assertEqual(value['provenance']['note_date_raw'], '2026-10-02')
        self.assertIsNone(value['note_date_timezone'])

    def test_explicit_summary_date_takes_priority_and_preserves_contradiction(self):
        value = self.extract(original='Voici mon résumé du 3 octobre 2026. Je parle du jardin.')
        self.assertEqual(value['note_date'], '2026-10-03')
        self.assertEqual(value['note_date_basis'], 'summary')
        self.assertEqual(value['title'], '001 - Jardin 2026-10-02')
        self.assertEqual([item['date'] for item in value['date_candidates'] if item['basis'] in ('summary', 'filename')],
                         ['2026-10-03', '2026-10-02'])
        self.assertTrue(any('contradictoires' in item for item in value['metadata_uncertainties']))

    def test_complete_date_formats_french_english_iso_and_leap_day(self):
        for raw, expected in (('2024-02-29', '2024-02-29'), ('29/02/2024', '2024-02-29'),
                              ('03.10.2026', '2026-10-03'), ('03_10_2026', '2026-10-03'),
                              ('3 octobre 2026', '2026-10-03'), ('1er février 2024', '2024-02-01'),
                              ('October 3rd, 2026', '2026-10-03'), ('3 Oct. 2026', '2026-10-03')):
            with self.subTest(raw=raw):
                value = self.extract(name='Sujet ' + raw.replace('/', '-') + '.mp3')
                self.assertEqual(value['note_date'], expected)
                self.assertEqual(value['note_date_basis'], 'filename')
                self.assertIsNone(value['file_number'])

    def test_invalid_dates_and_partial_relative_dates_do_not_invent_years(self):
        for name in ('Sujet 2023-02-29.mp3', 'Sujet 31-04-2026.mp3', 'Sujet 3 octobre.mp3', 'Sujet 03-10.mp3'):
            with self.subTest(name=name):
                value = self.extract(name=name)
                self.assertEqual(value['note_date'], '2026-10-03')
                self.assertEqual(value['note_date_basis'], 'imported_at')
                self.assertIsNone(value['file_number'])
                self.assertTrue(any('invalide' in item or 'partielle' in item for item in value['metadata_uncertainties']))
        value = self.extract(name='', original='Résumé d’hier. Je prépare celui du 3 octobre.')
        self.assertEqual(value['note_date_basis'], 'imported_at')
        self.assertTrue(any('relative' in item for item in value['metadata_uncertainties']))

    def test_transcript_dates_and_model_dates_do_not_replace_filename_or_source_date(self):
        value = self.extract(original='La société est née le 1 janvier 2020.',
                             result={'title': 'Résumé du 9 octobre 2030', 'text': 'Résumé du 9 octobre 2030', 'date': '2030-10-09'})
        self.assertEqual(value['note_date'], '2026-10-02')
        self.assertIn('2020-01-01', [item['date'] for item in value['date_candidates']])
        self.assertNotIn('2030-10-09', [item['date'] for item in value['date_candidates']])
        self.assertEqual(value['metadata_uncertainties'], [])

    def test_missing_or_generic_filename_falls_back_to_date_never_model_title(self):
        for name in (None, '', 'Dictée collée', 'Fluid Voice · 57d9f2e5-e68d-4c09-943b-2c6b061cb22e', 'YouTube · BaW_jenozKc'):
            with self.subTest(name=name):
                value = self.extract(name=name)
                self.assertEqual(value['title'], '2026-10-03')
                self.assertEqual(value['subject'], 'Le jardin')
        self.assertEqual(self.extract(name='Un titre YouTube valide')['title'], 'Un titre YouTube valide')
        self.assertEqual(self.extract(name='Un titre YouTube 2.0')['title'], 'Un titre YouTube 2.0')
        self.assertEqual(self.extract(name='Mon.nom.de.fichier.mp3')['title'], 'Mon.nom.de.fichier')

    def test_filename_numbers_exclude_dates_years_and_partial_dates(self):
        for name, expected in (('007 - Idée.mp3', '007'), ('Idée - 012.mp3', '012'),
                               ('Fichier no. 42.mp3', '42'), ('Note 2026.mp3', '2026'),
                               ('2026-10-03.mp3', None), ('03-10-2026.mp3', None),
                               ('3 octobre 2026.mp3', None), ('3 octobre.mp3', None), ('2026.mp3', None)):
            with self.subTest(name=name):
                self.assertEqual(self.extract(name=name)['file_number'], expected)

    def test_declared_source_dates_are_distinct_and_prioritized(self):
        value = self.extract(name='', data={'sourceTimeZone': 'UTC',
                    'sourceCreatedAt': '2026-09-01T10:00:00+00:00', 'sourceModifiedAt': '2026-09-02T10:00:00Z'},
                    sourceRecordedAt=1788170400)
        self.assertEqual(value['source_created_at'], '2026-09-01T10:00:00Z')
        self.assertEqual(value['source_modified_at'], '2026-09-02T10:00:00Z')
        # Legacy recorded-at is Unix seconds, never UI milliseconds.
        self.assertTrue(value['source_recorded_at'].startswith('2026-'))
        self.assertEqual(value['note_date_basis'], 'source_recorded_at')
        self.assertEqual(value['note_date_timezone'], 'UTC')

    def test_epoch_milliseconds_offset_normalization_and_invalid_timestamp(self):
        milliseconds = datetime(2026, 10, 3, 10, tzinfo=timezone.utc).timestamp() * 1000
        value = self.metadata({'sourceModifiedAt': milliseconds, 'sourceCreatedAt': '2026-10-03T12:00:00+02:00'})
        self.assertEqual(value['source_modified_at'], IMPORTED)
        self.assertEqual(value['source_created_at'], IMPORTED)
        for timestamp in ('2023-02-29T12:00:00Z', '2026-10-03', '2026-10-03T10:00:00',
                          '2026-10-03T10:00:00+25:00', True, float('inf'), {}, 10**100):
            with self.subTest(timestamp=timestamp), self.assertRaises(ValueError):
                self.metadata({'sourceModifiedAt': timestamp})

    def test_local_calendar_date_in_paris_and_dst_boundaries(self):
        for timestamp, expected in (('2026-10-02T23:30:00Z', '2026-10-03'),
                                    ('2026-03-28T23:30:00Z', '2026-03-29'),
                                    ('2026-03-29T22:30:00Z', '2026-03-30'),
                                    ('2026-10-25T22:30:00Z', '2026-10-25')):
            with self.subTest(timestamp=timestamp):
                value = self.extract(name='', data={'sourceModifiedAt': timestamp, 'sourceTimeZone': 'Europe/Paris'})
                self.assertEqual(value['note_date'], expected)
                self.assertEqual(value['note_date_basis'], 'source_modified_at')
                self.assertEqual(value['note_date_timezone'], 'Europe/Paris')
                self.assertEqual(value['source_modified_at'], timestamp)

    def test_unknown_timezone_rejected_and_absent_timezone_is_explicit(self):
        for zone in ('Europe/NoSuchPlace', '../Europe/Paris', True):
            with self.subTest(zone=zone), self.assertRaises(ValueError):
                self.metadata({'sourceTimeZone': zone})
        value = self.extract(name='', data={'sourceModifiedAt': '2026-10-02T23:30:00Z'})
        self.assertEqual(value['note_date'], '2026-10-02')
        self.assertEqual(value['source_timezone'], 'UTC')
        self.assertEqual(value['source_timezone_basis'], 'fallback-utc')
        self.assertEqual(value['metadata_uncertainties'], [])

    def test_relative_paths_match_basename_and_reject_traversal_or_symlink_declaration(self):
        self.assertEqual(self.metadata({'sourceRelativePath': 'Voix\\001 - Jardin 2026-10-02.mp3'})['source_relative_path'],
                         'Voix/001 - Jardin 2026-10-02.mp3')
        for path in ('../voice.mp3', '/voice.mp3', 'C:\\voice.mp3', '\\server\\voice.mp3',
                     'folder/../voice.mp3', 'folder//voice.mp3', './voice.mp3', 'folder/voice.mp3', 'folder/voice\x00.mp3'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.metadata({'sourceRelativePath': path})
        with self.assertRaisesRegex(ValueError, 'symbolique'):
            self.metadata({'sourceIsSymlink': True})

    def test_legacy_job_fields_and_explicit_english_summary_date(self):
        value = extract_metadata({'sourceName': 'Meeting.mp3', 'sourceType': 'audio', 'createdAt': IMPORTED,
                                  'sourceModifiedAt': '2026-09-30T10:00:00Z', 'sourceTimeZone': 'Europe/Paris',
                                  'original': 'My summary for October 3rd, 2026.'}, {'title': 'Project notes'})
        self.assertEqual(value['title'], 'Meeting')
        self.assertEqual(value['note_date'], '2026-10-03')
        self.assertEqual(value['note_date_basis'], 'summary')
        self.assertIsNone(value['description'])
        self.assertEqual(value['source_modified_at'], '2026-09-30T10:00:00Z')


if __name__ == '__main__':
    unittest.main()
