"""Check migration on a private copy, without starting Application or providers."""
import argparse
import json
import sqlite3
import sys
import time
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.channels import ChannelHub
from server.store import Store


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', type=Path, required=True)
    args = parser.parse_args()
    evidence = ROOT / '.atelier/channel-history-evidence'
    fixture = evidence / ('migration-' + str(time.time_ns()))
    fixture.mkdir(parents=True)
    source = sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True)
    expected = [json.loads(row[0]) for row in source.execute("SELECT body FROM objects WHERE kind='channel'")]
    target = sqlite3.connect(fixture / 'state.sqlite')
    source.backup(target)
    source.close()
    target.close()
    store = Store(fixture)
    # No adapters, client, discover(), prompt(), scheduler or worker queue.
    app = SimpleNamespace(store=store)
    hub = ChannelHub(app)
    results = []
    try:
        for channel in expected:
            collected, before = [], None
            while True:
                page = hub.history(channel['id'], before=before, limit=100)
                collected = page['messages'] + collected
                if not page['history']['hasMore']:
                    break
                before = page['history']['before']
            expected_messages = channel.get('messages', [])
            assert collected[:len(expected_messages)] == expected_messages, 'Une contribution publiée a changé.'
            assert len({message['id'] for message in collected}) == len(collected)
            current = store.get('channel', channel['id'])
            summary = next(entry for entry in hub.snapshot()['channels'] if entry['id'] == channel['id'])
            assert summary['history']['messageCount'] == len(collected)
            recovered = collected[len(expected_messages):]
            for message in recovered:
                assert message.get('sessionId'), 'Une réponse récupérée doit avoir sa session observée.'
                session = store.get('session', message['sessionId'])
                assert session['lastTurnStatus'] == 'completed'
                assert session['channelId'] == channel['id']
                assert session['channelParticipantId'] == message['participantId']
            results.append({'channelId': channel['id'], 'publishedMessagesPreserved': len(expected_messages),
                'publishedObjectsIdentical': True, 'recoveredCompletedReplies': len(recovered),
                'messageCount': len(collected), 'roundCount': current['history']['roundCount'],
                'messageCharacters': current['history']['messageCharacters']})
        hub.close()
        hub = ChannelHub(app)
        for result in results:
            current = store.get('channel', result['channelId'])
            assert current['history']['messageCount'] == result['messageCount'], 'La reprise a dupliqué une réponse.'
        result = {'status': 'passed', 'source': str(args.database.resolve()), 'fixture': str(fixture),
            'channels': results, 'restartIdempotent': True, 'inferenceCalls': 0, 'installedDataModified': False}
        (evidence / 'installed-migration-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(json.dumps(result, ensure_ascii=False))
    finally:
        hub.close()
        store.db.close()


if __name__ == '__main__':
    main()
