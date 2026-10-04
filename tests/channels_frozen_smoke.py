"""Exercise the shipped HTTP runtime offline, in a retained private fixture."""
import argparse
import json
import re
import select
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--service', type=Path, required=True)
    args = parser.parse_args()
    evidence = Path(__file__).resolve().parents[1] / '.atelier/channel-frozen-evidence'
    evidence.mkdir(parents=True, exist_ok=True)
    fixture = evidence / ('run-' + str(time.time_ns()))
    skill = fixture / 'skills/procedure/SKILL.md'
    skill.parent.mkdir(parents=True)
    skill.write_text('Compare les propositions aux critères utilisateur. Signale les inconnues.', encoding='utf-8')
    # Seed the old inline representation before the frozen service starts.
    # This checks its migration using only public fixture data, without a model.
    data = fixture / '.atelier'
    data.mkdir(parents=True)
    legacy_id = 'channel_legacy_archive_fixture'
    legacy_messages = [dict(id='legacy_message_' + str(index), channelId=legacy_id,
        participantId=None, author='Utilisateur', role='user', text='Archive %d : ' % index + 'preuve ' * 75,
        createdAt='2026-10-03T20:00:00Z', roundId=None, sequence=index + 1) for index in range(530)]
    legacy = dict(id=legacy_id, projectId='atelier', name='Archive ancienne fictive',
        topic='Conserver la demande initiale.', maxRounds=2, roundMode='auto', autoRoundLimit=50,
        execution=None, status='failed', sequence=len(legacy_messages), runCount=1, runId=None,
        plan=None, planParticipantId=None, preparedTaskId=None, participants=[], messages=legacy_messages,
        rounds=[], error='Historique public rempli ; crée un nouveau canal pour continuer.',
        createdAt='2026-10-03T20:00:00Z')
    database = sqlite3.connect(data / 'state.sqlite')
    database.execute('CREATE TABLE objects (kind TEXT, id TEXT, body TEXT, PRIMARY KEY(kind,id))')
    database.execute('INSERT INTO objects VALUES (?,?,?)', ('channel', legacy_id, json.dumps(legacy)))
    database.commit()
    database.close()
    process = subprocess.Popen([str(args.service.resolve()), '--port', '0', '--no-open',
                               '--no-discovery', '--desktop-managed', '--workspace', str(fixture),
                               '--data', str(fixture / '.atelier')],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, text=True)
    output = []
    try:
        deadline, port = time.monotonic() + 15, None
        while time.monotonic() < deadline:
            if select.select([process.stdout], [], [], 1)[0]:
                line = process.stdout.readline()
                if not line:
                    break
                output.append(line)
                match = re.search(r'"atelierReady"\s*:\s*\{\s*"port"\s*:\s*(\d+)', line)
                if match:
                    port = int(match.group(1))
                    break
        if port is None:
            raise RuntimeError('Le runtime livré ne démarre pas : ' + ''.join(output))
        base = 'http://127.0.0.1:' + str(port)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(base, timeout=5) as response:
            html = response.read().decode('utf-8')
        token = re.search(r'name="atelier-token" content="([^"]+)"', html).group(1)

        def api(route, data=None):
            request = urllib.request.Request(base + '/api/' + route,
                headers={'X-Atelier-Token': token, 'Content-Type': 'application/json'},
                data=json.dumps(data).encode() if data is not None else None)
            with opener.open(request, timeout=5) as response:
                return json.load(response)

        assert api('skills?project=atelier') == ['skills/procedure/SKILL.md']
        legacy_state = next(channel for channel in api('state')['discussions']['channels'] if channel['id'] == legacy_id)
        assert legacy_state['history']['messageCount'] == 530
        collected, before = [], None
        while True:
            page = api('channels/history?id=' + legacy_id + '&limit=100' +
                ('&before=' + str(before) if before is not None else ''))
            collected = page['messages'] + collected
            if not page['history']['hasMore']:
                break
            before = page['history']['before']
        assert [(message['id'], message['text']) for message in collected] == [
            (message['id'], message['text']) for message in legacy_messages]
        newer = api('channels/history?id=' + legacy_id + '&after=1&limit=100')
        assert [message['id'] for message in newer['messages']] == [message['id'] for message in legacy_messages[1:101]]
        assert newer['history']['hasNewer'] and newer['history']['after'] == 101
        assert api('channels/rounds?id=' + legacy_id)['rounds'] == []
        api('channels/messages', {'id': legacy_id, 'text': 'La suite reste dans le même canal.'})
        configured = api('channels/options', {'id': legacy_id, 'maxRounds': 81, 'autoRoundLimit': None})
        assert configured['maxRounds'] == 81 and configured['autoRoundLimit'] is None
        connection = api('api-connections', {'name': 'Fixture hors ligne', 'baseUrl': base + '/v1/chat/completions',
            'protocol': 'openai', 'modelIds': 'fixture-model', 'serverKind': 'custom'})
        assert connection['baseUrl'] == base + '/v1'
        channel = api('channels', {'projectId': 'atelier', 'name': 'Fixture critique', 'topic': 'Comparer sans accord automatique.'})
        participant = api('channels/participants', {'id': channel['id'], 'name': 'Questionneur', 'role': 'critic',
            'skills': ['skills/procedure/SKILL.md'], 'configuration': {'runtime': 'api',
                'connectionId': connection['id'], 'model': 'fixture-model'}})
        assert participant['role'] == 'critic'
        assert participant['instructionSources'][0]['sha256']
        try:
            api('channels/start', {'id': channel['id']})
        except urllib.error.HTTPError as error:
            assert error.code == 400
            assert 'construire le plan' in json.load(error)['error']
        else:
            raise AssertionError('Le contradicteur seul ne doit pas lancer de plan.')
        state = api('state')
        assert not state['requests'] and not state['sessions']
        assert next(entry for entry in state['discussions']['channels'] if entry['id'] == channel['id'])['status'] == 'draft'
        result = {'status': 'passed', 'runtime': str(args.service.resolve()), 'fixture': str(fixture),
                  'skills': 'selected and hashed', 'critic': 'accepted, never sole planner',
                  'api': 'normalized and saved offline', 'inferenceCalls': 0,
                  'history': '530 legacy messages migrated intact, paged, and continued',
                  'roundLimits': '81 fixed rounds accepted and no automatic ceiling selected'}
        (evidence / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False))
    finally:
        if process.poll() is None:
            process.stdin.write('shutdown\n')
            process.stdin.flush()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=5)
        (evidence / 'service.log').write_text(''.join(output) + process.stdout.read(), encoding='utf-8')


if __name__ == '__main__':
    main()
