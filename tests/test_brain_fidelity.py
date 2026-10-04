"""Fidelity audits compare actual text, entirely without a model or service."""
import json
import unittest

from server.brain_fidelity import MAX_CHANGES, MAX_EXCERPT, review_transcription


class BrainFidelityTests(unittest.TestCase):
    def test_unchanged_is_exact_and_json_stable(self):
        original = '  Voici ma transcription.\nJe garde 12 fichiers, sans les supprimer.\n'
        audit = review_transcription(original, original)
        self.assertEqual(audit['status'], 'unchanged')
        self.assertFalse(audit['changed'])
        self.assertEqual(audit['changedRatio'], 0)
        self.assertEqual(audit['changes'], [])
        self.assertEqual(audit['warnings'], [])
        self.assertFalse(audit['meaningVerified'])
        self.assertEqual(audit, json.loads(json.dumps(audit)))
        self.assertEqual(audit, review_transcription(original, original))

    def test_punctuation_case_and_whitespace_are_shown_without_lexical_rewrite(self):
        audit = review_transcription('bonjour le monde\n', 'Bonjour, le monde.\n\n')
        self.assertEqual(audit['status'], 'minimal')
        self.assertTrue(audit['changed'])
        self.assertEqual(audit['changedRatio'], 0)
        self.assertEqual(audit['counts']['insertions'], 0)
        self.assertEqual(audit['counts']['deletions'], 0)
        self.assertTrue(audit['changes'])
        self.assertIn('bonjour', ''.join(change['before'] for change in audit['changes']))
        self.assertIn('Bonjour', ''.join(change['after'] for change in audit['changes']))

    def test_local_homophone_is_small_without_trusting_declared_corrections(self):
        original = 'Je conserve toutes mes notes dans mon coffre obsidienne chaque jour.'
        proposed = 'Je conserve toutes mes notes dans mon coffre Obsidian chaque jour.'
        audit = review_transcription(original, proposed)
        self.assertEqual(audit['status'], 'minimal')
        self.assertEqual((audit['counts']['insertions'], audit['counts']['deletions']), (1, 1))
        self.assertAlmostEqual(audit['changedRatio'], 1 / 11, places=6)
        self.assertEqual(audit['changes'][0]['before'], 'obsidienne')
        self.assertEqual(audit['changes'][0]['after'], 'Obsidian')
        self.assertEqual(original, 'Je conserve toutes mes notes dans mon coffre obsidienne chaque jour.')

    def test_large_summary_is_not_a_minimal_correction(self):
        audit = review_transcription(
            'Je parle du jardin puis du garage et de la toiture. Il faut préserver chaque détail de cette réunion.',
            'La réunion concerne les travaux.')
        self.assertEqual(audit['status'], 'review-required')
        self.assertGreater(audit['changedRatio'], .25)
        self.assertGreater(audit['counts']['deletions'], 10)
        self.assertTrue(any('supprimée' in warning for warning in audit['warnings']))

    def test_numeric_change_requires_review_even_when_ratio_is_small(self):
        original = 'Nous conservons tous les détails du projet et nous préparons encore les 12 fichiers pour demain.'
        audit = review_transcription(original, original.replace('12', '13'))
        self.assertEqual(audit['status'], 'review-required')
        self.assertLess(audit['changedRatio'], .1)
        self.assertTrue(any('numériques' in warning for warning in audit['warnings']))

    def test_spelled_numbers_signs_decimals_and_order_are_checked(self):
        for before, after in [('trois', 'quatre'), ('three', 'four'), ('-10', '10'),
                              ('2,5', '2,6'), ('12 puis 15', '15 puis 12')]:
            with self.subTest(before=before, after=after):
                audit = review_transcription('Les valeurs sont ' + before, 'Les valeurs sont ' + after)
                self.assertTrue(any('numériques' in warning for warning in audit['warnings']))
        audit = review_transcription('Nous gardons deux fichiers identiques dans ce dossier.',
                                     'Nous gardons 2 fichiers identiques dans ce dossier.')
        self.assertFalse(any('numériques' in warning for warning in audit['warnings']))

    def test_negation_change_requires_review_in_french_and_english(self):
        examples = [
            ('Je ne souhaite pas supprimer ces fichiers conservés dans mon dossier privé.',
             'Je souhaite supprimer ces fichiers conservés dans mon dossier privé.'),
            ('Je n’aime vraiment pas cette nouvelle couleur dans le dossier.',
             'J’aime vraiment cette nouvelle couleur dans le dossier.'),
            ("We don't want to delete the saved files from this private folder.",
             'We want to delete the saved files from this private folder.'),
            ('We will keep all these files in this folder.',
             'We will not keep all these files in this folder.'),
        ]
        for original, proposed in examples:
            with self.subTest(original=original):
                audit = review_transcription(original, proposed)
                self.assertEqual(audit['status'], 'review-required')
                self.assertTrue(any('négation' in warning for warning in audit['warnings']))

    def test_empty_proposal_does_not_discard_original(self):
        original = 'Une transcription à conserver intégralement.'
        audit = review_transcription(original, '')
        self.assertEqual(audit['status'], 'review-required')
        self.assertEqual(audit['changedRatio'], 1)
        self.assertEqual(audit['changes'][0]['before'], original)
        self.assertEqual(audit['changes'][0]['after'], '')
        self.assertTrue(any('vide' in warning for warning in audit['warnings']))
        self.assertEqual(review_transcription('', '')['status'], 'unchanged')
        self.assertEqual(review_transcription('', 'Ajout')['status'], 'review-required')

    def test_changed_passages_and_excerpts_are_bounded_and_report_omissions(self):
        original = ' '.join('ancienmot%d séparateur%d' % (i, i) for i in range(40))
        proposed = ' '.join('nouveaumot%d séparateur%d' % (i, i) for i in range(40))
        audit = review_transcription(original, proposed)
        self.assertEqual(len(audit['changes']), MAX_CHANGES)
        self.assertGreater(audit['counts']['omittedPassages'], 0)
        audit = review_transcription('a' * 2000, 'b' * 2000)
        self.assertEqual(len(audit['changes'][0]['before']), MAX_EXCERPT)
        self.assertTrue(audit['changes'][0]['beforeTruncated'])
        self.assertTrue(audit['changes'][0]['afterTruncated'])

    def test_long_repetitive_text_uses_bounded_comparison_with_a_warning(self):
        original = 'mot ' * 3000
        proposed = 'mot ' * 1000 + 'différent ' + 'mot ' * 1999
        audit = review_transcription(original, proposed)
        self.assertTrue(audit['comparisonLimited'])
        self.assertEqual(audit['status'], 'review-required')
        self.assertEqual((audit['counts']['insertions'], audit['counts']['deletions']), (1, 1))
        self.assertTrue(any('bornée' in warning for warning in audit['warnings']))
        self.assertLessEqual(len(audit['changes']), MAX_CHANGES)

    def test_long_punctuation_only_edit_keeps_equal_lexical_counts(self):
        original = 'mot ' * 3000
        audit = review_transcription(original, original.rstrip() + '.')
        self.assertEqual(audit['status'], 'minimal')
        self.assertFalse(audit['comparisonLimited'])
        self.assertEqual(audit['changedRatio'], 0)

    def test_short_complete_replacement_and_added_details_require_review(self):
        self.assertEqual(review_transcription('Oui.', 'Non.')['status'], 'review-required')
        audit = review_transcription('La réunion est demain.',
                                     'La réunion est demain et nous avons tous accepté ce nouveau contrat.')
        self.assertEqual(audit['status'], 'review-required')
        self.assertGreater(audit['counts']['insertions'], 3)

    def test_invalid_non_text_values_are_explicit(self):
        for original, proposed in [(None, 'texte'), ('texte', {}), (1, [])]:
            with self.subTest(original=original, proposed=proposed):
                with self.assertRaisesRegex(ValueError, 'textuelles'):
                    review_transcription(original, proposed)


if __name__ == '__main__':
    unittest.main()
