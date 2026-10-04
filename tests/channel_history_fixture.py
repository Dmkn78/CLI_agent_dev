"""Browser-only fixture: 650 archived sample messages and a fake reply callback."""
import argparse
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.app import Application
from server.store import now, uid
from run import make_handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4342)
    args = parser.parse_args()
    app = Application(ROOT, ROOT / '.atelier' / 'channel-history-browser-fixture' / uid('run'))
    app.provider.update(connected=True, installed=True, authType='fixture', models=[{
        'model': 'fixture-code', 'displayName': 'Fournisseur fictif', 'isDefault': True,
        'defaultReasoningEffort': 'medium',
        'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
    app.discover = lambda: app.provider
    summary = app.channels.create({'projectId': 'atelier', 'name': 'Archive longue · recette fictive',
                                  'topic': 'Lire les messages anciens puis reprendre dans ce même canal.',
                                  'maxRounds': 1, 'roundMode': 'auto'})
    participant = app.channels.add_participant(summary['id'], {'name': 'Agent fictif', 'role': 'agent',
        'configuration': {'runtime': 'codex', 'model': 'fixture-code', 'effort': 'medium'}})
    channel = app.store.get('channel', summary['id'])
    for number in range(1, 651):
        message = app.channels._message(channel,
            '# Message public fictif ' + str(number).zfill(4) + '\n\nArchive **locale** de recette.',
            participant if number == 649 else None)
        if number == 649:
            message.update(recoveredFromSession='fixture-finalized-session', recoveryReason='history_capacity')
        channel['messages'].append(message)
    channel['rounds'] = [{'id': uid('round'), 'channelId': channel['id'], 'number': 1,
        'purpose': 'discussion', 'status': 'completed', 'participantIds': [participant['id']],
        'messageIds': [], 'startedAt': now(), 'completedAt': now()}]
    channel.update(status='stopped', runCount=1)
    app.channels._save(channel)
    calls = []

    def reply(current, public_messages, purpose):
        calls.append({'participant': current['id'], 'purpose': purpose})
        return {'text': '# Réponse du fournisseur fictif\n\nDiscussion reprise dans le canal.'
                if purpose != 'plan' else '# Plan fictif\n\n- Relire l’archive complète.'}

    app.channel_reply = reply
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, 'history-fixture-nonce'))
    server.daemon_threads = True
    print('Channel history browser fixture ready: 650 archived sample messages; no real provider.', flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        app.shutdown()


if __name__ == '__main__':
    main()
