"""Archive changes commit together and do not lose bounded pages' messages."""
import copy
import tempfile
import unittest
from pathlib import Path

from server.channel_archive import ChannelArchive, VISIBLE_CHARACTERS, VISIBLE_MESSAGES
from server.channels import ChannelHub
from test_channels import FakeChannelApplication


class ChannelArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.app = FakeChannelApplication(Path(self.temporary.name))
        self.hub = ChannelHub(self.app)
        self.identifier = self.hub.create({'topic': 'Archive locale complète.'})['id']

    def tearDown(self):
        self.hub.close()
        self.app.store.db.close()
        self.temporary.cleanup()

    def test_failed_round_serialization_rolls_back_new_messages_counts_and_channel(self):
        before = self.app.store.get('channel', self.identifier)
        changed = copy.deepcopy(before)
        changed['messages'].append(self.hub._message(changed, 'Cette réponse doit rester atomique.'))
        changed['rounds'].append({'id': 'bad-round', 'status': 'completed', 'invalid': object()})
        with self.assertRaises(TypeError):
            self.hub._save(changed)
        self.assertEqual(self.app.store.get('channel', self.identifier), before)
        page = self.hub.history(self.identifier)
        self.assertEqual(page['messages'], [])
        self.assertEqual(page['history']['messageCount'], 0)
        self.assertEqual(page['history']['roundCount'], 0)

    def test_editing_a_cached_record_updates_stats_without_duplicate_and_older_rows_remain(self):
        original = self.hub.post_message(self.identifier, {'text': 'Ancienne précision.'})
        channel = self.app.store.get('channel', self.identifier)
        channel['messages'][0]['text'] = 'Précision corrigée et conservée.'
        self.hub._save(channel)
        self.hub._save(channel)
        page = self.hub.history(self.identifier)
        self.assertEqual(page['history']['messageCount'], 1)
        self.assertEqual(page['history']['messageCharacters'], len('Précision corrigée et conservée.'))
        self.assertEqual(page['messages'][0]['id'], original['id'])
        self.assertEqual(page['messages'][0]['text'], 'Précision corrigée et conservée.')

    def test_page_character_limit_changes_page_size_without_cutting_or_skipping_text(self):
        expected = []
        for index in range(35):
            expected.append(self.hub.post_message(self.identifier, {'text': str(index) + ' ' + 'x' * 15900}))
        cached = self.app.store.get('channel', self.identifier)
        self.assertLessEqual(len(cached['messages']), VISIBLE_MESSAGES)
        self.assertLessEqual(sum(len(message['text']) for message in cached['messages']), VISIBLE_CHARACTERS)
        before, archived = None, []
        while True:
            page = self.hub.history(self.identifier, before=before, limit=100)
            self.assertLessEqual(sum(len(message['text']) for message in page['messages']), VISIBLE_CHARACTERS)
            archived = page['messages'] + archived
            if not page['history']['hasMore']:
                break
            before = page['history']['before']
        self.assertEqual(archived, expected)

    def test_page_arguments_validate_without_provider_calls(self):
        for before in (True, 0, -1, '1', 2 ** 63):
            with self.subTest(before=before), self.assertRaises(ValueError):
                self.hub.history(self.identifier, before=before)
            with self.subTest(after=before), self.assertRaises(ValueError):
                self.hub.history(self.identifier, after=before)
        with self.assertRaises(ValueError):
            self.hub.history(self.identifier, before=2, after=1)
        for limit in (True, 0, -1, 101, '50', None):
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                self.hub.history(self.identifier, limit=limit)
        self.assertFalse(self.app.calls)

    def test_forward_pages_preserve_gapped_sequences_and_complete_long_text(self):
        channel = self.app.store.get('channel', self.identifier)
        expected = []
        for index in range(35):
            expected.append(self.hub._message(channel, str(index) + ' ' + 'x' * 15900))
            channel['sequence'] += 3
        channel['messages'] = copy.deepcopy(expected)
        self.hub._save(channel)
        first = self.hub.history(self.identifier, before=2, limit=1)
        self.assertEqual(first['messages'], expected[:1])
        self.assertTrue(first['history']['hasNewer'])
        self.assertFalse(first['history']['hasMore'])
        archived = list(first['messages'])
        after = first['history']['after']
        while after is not None:
            page = self.hub.history(self.identifier, after=after, limit=100)
            self.assertEqual(page['messages'][0]['sequence'], after + 4)
            self.assertTrue(page['history']['hasMore'])
            self.assertLessEqual(sum(len(message['text']) for message in page['messages']), VISIBLE_CHARACTERS)
            archived.extend(page['messages'])
            after = page['history']['after']
        self.assertEqual(archived, expected)
        self.assertFalse(page['history']['hasNewer'])
        empty = self.hub.history(self.identifier, after=expected[-1]['sequence'])
        self.assertEqual(empty['messages'], [])
        self.assertFalse(empty['history']['hasNewer'])

    def test_restart_interrupts_archived_running_round_evicted_from_cache(self):
        channel = self.app.store.get('channel', self.identifier)
        channel['rounds'] = [{'id': 'old-round', 'status': 'running', 'runId': 'old', 'purpose': 'discussion',
                              'number': 1, 'channelId': self.identifier}]
        channel['rounds'] += [{'id': 'round-' + str(index), 'status': 'completed', 'purpose': 'discussion',
                              'number': index + 2, 'channelId': self.identifier} for index in range(100)]
        channel.update(status='running', runId='old')
        self.hub._save(channel)
        self.assertNotIn('old-round', [record['id'] for record in channel['rounds']])
        restarted = ChannelHub(self.app)
        try:
            row = self.app.store.db.execute("SELECT body FROM channel_rounds WHERE id='old-round'").fetchone()
            self.assertIn('"status": "interrupted"', row[0])
            self.assertEqual(restarted.snapshot()['channels'][0]['status'], 'interrupted')
            self.assertFalse(self.app.calls)
        finally:
            restarted.close()

    def test_round_pagination_includes_old_failed_rounds_without_public_messages(self):
        channel = self.app.store.get('channel', self.identifier)
        expected = [{'id': 'round-' + str(index), 'status': 'failed' if index % 2 else 'stopped',
                     'purpose': 'discussion', 'number': index % 3 + 1, 'channelId': self.identifier,
                     'messageIds': [], 'error': 'Échec fictif.'} for index in range(181)]
        channel['rounds'] = copy.deepcopy(expected)
        self.hub._save(channel)
        archived, before = [], None
        while True:
            page = self.hub.round_history(self.identifier, before=before, limit=50)
            self.assertEqual(page['history']['roundCount'], 181)
            archived = page['rounds'] + archived
            if not page['history']['hasMore']:
                break
            before = page['history']['before']
        self.assertEqual([record.pop('archivePosition') for record in archived], list(range(1, 182)))
        self.assertEqual(archived, expected)
        self.assertFalse(self.hub.history(self.identifier)['messages'])
        for cursor in (0, True, '1'):
            with self.subTest(cursor=cursor), self.assertRaises(ValueError):
                self.hub.round_history(self.identifier, before=cursor)


if __name__ == '__main__':
    unittest.main()
