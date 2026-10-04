"""Complete SQLite channel history with bounded projections and older pages."""
import json

from .channel_context import public_context

VISIBLE_MESSAGES = 120
PAGE_MESSAGES = 100
VISIBLE_CHARACTERS = 240000
VISIBLE_ROUNDS = 80
ROUND_CHARACTERS = 240000
CONTEXT_RECENT_MESSAGES = 128
CONTEXT_RECENT_USERS = 64


class ChannelArchive:
    def __init__(self, store):
        self.store = store
        with store.lock:
            store.db.executescript('''
                CREATE TABLE IF NOT EXISTS channel_messages (
                    channel_id TEXT NOT NULL, id TEXT PRIMARY KEY, sequence INTEGER NOT NULL,
                    role TEXT NOT NULL, participant_id TEXT, characters INTEGER NOT NULL, body TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS channel_messages_sequence ON channel_messages(channel_id,sequence);
                CREATE INDEX IF NOT EXISTS channel_messages_user ON channel_messages(channel_id,role,sequence);
                CREATE INDEX IF NOT EXISTS channel_messages_participant ON channel_messages(channel_id,participant_id,sequence);
                CREATE INDEX IF NOT EXISTS channel_messages_session ON channel_messages(channel_id,json_extract(body,'$.sessionId'));
                CREATE TABLE IF NOT EXISTS channel_rounds (
                    channel_id TEXT NOT NULL, id TEXT PRIMARY KEY, position INTEGER NOT NULL,
                    status TEXT NOT NULL, body TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS channel_rounds_position ON channel_rounds(channel_id,position);
                CREATE INDEX IF NOT EXISTS channel_rounds_status ON channel_rounds(channel_id,status);
                CREATE TABLE IF NOT EXISTS channel_archive_stats (
                    channel_id TEXT PRIMARY KEY, message_count INTEGER NOT NULL DEFAULT 0,
                    message_characters INTEGER NOT NULL DEFAULT 0, user_count INTEGER NOT NULL DEFAULT 0,
                    round_count INTEGER NOT NULL DEFAULT 0);
                CREATE TRIGGER IF NOT EXISTS channel_message_added AFTER INSERT ON channel_messages BEGIN
                    INSERT INTO channel_archive_stats(channel_id,message_count,message_characters,user_count)
                    VALUES(NEW.channel_id,1,NEW.characters,CASE WHEN NEW.role='user' THEN 1 ELSE 0 END)
                    ON CONFLICT(channel_id) DO UPDATE SET message_count=message_count+1,
                        message_characters=message_characters+NEW.characters,
                        user_count=user_count+CASE WHEN NEW.role='user' THEN 1 ELSE 0 END;
                END;
                CREATE TRIGGER IF NOT EXISTS channel_message_changed AFTER UPDATE ON channel_messages BEGIN
                    UPDATE channel_archive_stats SET message_characters=message_characters+NEW.characters-OLD.characters,
                        user_count=user_count+CASE WHEN NEW.role='user' THEN 1 ELSE 0 END-CASE WHEN OLD.role='user' THEN 1 ELSE 0 END
                    WHERE channel_id=NEW.channel_id;
                END;
                CREATE TRIGGER IF NOT EXISTS channel_round_added AFTER INSERT ON channel_rounds BEGIN
                    INSERT INTO channel_archive_stats(channel_id,round_count) VALUES(NEW.channel_id,1)
                    ON CONFLICT(channel_id) DO UPDATE SET round_count=round_count+1;
                END;
            ''')
            store.db.commit()

    def save(self, channel: dict) -> None:
        """Archive replies/round transition and its bounded channel cache atomically."""
        with self.store.lock, self.store.db:
            for message in channel.get('messages', []):
                self.store.db.execute('''INSERT INTO channel_messages
                    (channel_id,id,sequence,role,participant_id,characters,body) VALUES(?,?,?,?,?,?,?)
                    ON CONFLICT(id) DO UPDATE SET characters=excluded.characters,role=excluded.role,
                        body=excluded.body WHERE body<>excluded.body''',
                    (channel['id'], message['id'], message['sequence'], message['role'], message.get('participantId'),
                     len(message['text']), json.dumps(message, ensure_ascii=False)))
            for record in channel.get('rounds', []):
                # Existing rounds retain their archive ordering across updates.
                self.store.db.execute('''INSERT INTO channel_rounds(channel_id,id,position,status,body)
                    VALUES(?,?,(SELECT COALESCE(MAX(position),0)+1 FROM channel_rounds WHERE channel_id=?),?,?)
                    ON CONFLICT(id) DO UPDATE SET status=excluded.status,body=excluded.body WHERE body<>excluded.body''',
                    (channel['id'], record['id'], channel['id'], record['status'], json.dumps(record, ensure_ascii=False)))
            messages = self._messages(channel['id'], limit=VISIBLE_MESSAGES)
            rounds = self._rounds(channel['id'])
            cached = dict(channel, archiveVersion=1, messages=messages, rounds=rounds)
            cached['history'] = self._metadata(channel['id'], messages)
            self.store.db.execute('INSERT OR REPLACE INTO objects(kind,id,body) VALUES(?,?,?)',
                                  ('channel', channel['id'], json.dumps(cached, ensure_ascii=False)))
        # Keep callers consistent with the persisted bounded projection.
        channel.update(cached)

    def page(self, channel_id: str, before: int | None = None, limit: int = 50, after: int | None = None) -> dict:
        if type(limit) is not int or not 1 <= limit <= PAGE_MESSAGES:
            raise ValueError('La page contient entre 1 et 100 messages.')
        if before is not None and after is not None:
            raise ValueError('Choisis un curseur avant ou après, pas les deux.')
        if any(cursor is not None and (type(cursor) is not int or cursor < 1 or cursor > 2 ** 63 - 1)
               for cursor in (before, after)):
            raise ValueError('Curseur d’historique invalide.')
        with self.store.lock:
            messages = self._messages(channel_id, before, limit, after)
            round_ids = list(dict.fromkeys(message.get('roundId') for message in messages if message.get('roundId')))
            rounds = []
            if round_ids:
                rows = self.store.db.execute('SELECT body FROM channel_rounds WHERE channel_id=? AND id IN ('
                    + ','.join('?' for _ in round_ids) + ') ORDER BY position', (channel_id, *round_ids)).fetchall()
                size = 0
                for (body,) in rows:
                    record = json.loads(body)
                    if size + len(body) > ROUND_CHARACTERS:
                        # Messages stay complete. A large page can reduce repeated
                        # round context/source metadata; its full record is archived.
                        record = {key: value for key, value in record.items() if key in (
                            'id', 'channelId', 'runId', 'number', 'purpose', 'status', 'startedAt', 'completedAt',
                            'participantIds', 'snapshotSequence', 'messageIds', 'error', 'preparedTaskId', 'recoveryReason')}
                        record['archiveDetailsOmitted'] = True
                    rounds.append(record)
                    size += len(json.dumps(record, ensure_ascii=False))
            return {'channelId': channel_id, 'messages': messages, 'rounds': rounds,
                    'history': self._metadata(channel_id, messages)}

    def context(self, channel_id: str, limit: int, participant_ids: list[str]) -> tuple[list[dict], dict]:
        """Select a bounded candidate set using archive indexes, not its full text."""
        with self.store.lock:
            rows = self.store.db.execute('SELECT body FROM channel_messages WHERE channel_id=? ORDER BY sequence DESC LIMIT ?',
                                        (channel_id, CONTEXT_RECENT_MESSAGES)).fetchall()
            rows += self.store.db.execute("SELECT body FROM channel_messages WHERE channel_id=? AND role='user' ORDER BY sequence LIMIT 1",
                                          (channel_id,)).fetchall()
            rows += self.store.db.execute("SELECT body FROM channel_messages WHERE channel_id=? AND role='user' ORDER BY sequence DESC LIMIT ?",
                                          (channel_id, CONTEXT_RECENT_USERS)).fetchall()
            for identifier in participant_ids:
                rows += self.store.db.execute('SELECT body FROM channel_messages WHERE channel_id=? AND participant_id=? ORDER BY sequence DESC LIMIT 1',
                                              (channel_id, identifier)).fetchall()
            candidates = {message['id']: message for message in (json.loads(row[0]) for row in rows)}
            context, report = public_context(sorted(candidates.values(), key=lambda message: message['sequence']), limit, participant_ids)
            stats = self._stats(channel_id)
            report.update(candidateMessages=len(candidates), totalMessages=stats['messageCount'],
                          originalCharacters=stats['messageCharacters'])
            report['omittedMessageCount'] = stats['messageCount'] - len(context)
            report['omittedUserMessageCount'] = stats['userCount'] - len(report['includedUserMessageIds'])
            report['omittedMessageIdsComplete'] = len(report['omittedMessageIds']) == report['omittedMessageCount']
            report['omittedUserMessageIdsComplete'] = len(report['omittedUserMessageIds']) == report['omittedUserMessageCount']
            report['truncated'] = bool(report['omittedMessageCount'] or report['excerptMessageIds'])
            return context, report

    def round_page(self, channel_id: str, before: int | None = None, limit: int = 50) -> dict:
        if type(limit) is not int or not 1 <= limit <= PAGE_MESSAGES:
            raise ValueError('La page contient entre 1 et 100 tours.')
        if before is not None and (type(before) is not int or before < 1 or before > 2 ** 63 - 1):
            raise ValueError('Curseur de tours invalide.')
        with self.store.lock:
            query, parameters = 'SELECT position,body FROM channel_rounds WHERE channel_id=?', [channel_id]
            if before is not None:
                query += ' AND position<?'
                parameters.append(before)
            rows = self.store.db.execute(query + ' ORDER BY position DESC LIMIT ?', (*parameters, limit)).fetchall()
            selected, size = [], 0
            for position, body in rows:
                if selected and size + len(body) > ROUND_CHARACTERS:
                    break
                selected.append(dict(json.loads(body), archivePosition=position))
                size += len(body)
            selected.reverse()
            first = selected[0]['archivePosition'] if selected else None
            last = selected[-1]['archivePosition'] if selected else None
            has_more = bool(first and self.store.db.execute('SELECT 1 FROM channel_rounds WHERE channel_id=? AND position<? LIMIT 1',
                                                           (channel_id, first)).fetchone())
            return {'channelId': channel_id, 'rounds': selected, 'history': {
                'roundCount': self._stats(channel_id)['roundCount'], 'loadedRoundCount': len(selected),
                'firstPosition': first, 'lastPosition': last, 'hasMore': has_more, 'before': first if has_more else None}}

    def has_session(self, channel_id: str, session_id: str) -> bool:
        with self.store.lock:
            return bool(self.store.db.execute("SELECT 1 FROM channel_messages WHERE channel_id=? AND json_extract(body,'$.sessionId')=? LIMIT 1",
                                             (channel_id, session_id)).fetchone())

    def running_rounds(self, channel_id: str) -> list[dict]:
        with self.store.lock:
            return [json.loads(row[0]) for row in self.store.db.execute(
                "SELECT body FROM channel_rounds WHERE channel_id=? AND status='running' ORDER BY position", (channel_id,)).fetchall()]

    def usage(self, channel_id: str) -> dict:
        totals, partial = {}, []
        with self.store.lock:
            count = self._stats(channel_id)['messageCount'] - self._stats(channel_id)['userCount']
            for field in ('inputTokens', 'outputTokens', 'totalTokens', 'cachedInputTokens'):
                path = '$.usage.' + field
                measured, total = self.store.db.execute('''SELECT COUNT(*),TOTAL(json_extract(body,?))
                    FROM channel_messages WHERE channel_id=? AND role<>'user'
                    AND json_type(body,?)='integer' AND json_extract(body,?) BETWEEN 0 AND ?''',
                    (path, channel_id, path, path, 2 ** 53 - 1)).fetchone()
                if measured and 0 <= total <= 2 ** 53 - 1:
                    totals[field] = int(total)
                    if measured < count:
                        partial.append(field)
        return {'total': totals, 'partialFields': partial}

    def _stats(self, channel_id: str) -> dict:
        row = self.store.db.execute('SELECT message_count,message_characters,user_count,round_count FROM channel_archive_stats WHERE channel_id=?',
                                    (channel_id,)).fetchone() or (0, 0, 0, 0)
        return dict(zip(('messageCount', 'messageCharacters', 'userCount', 'roundCount'), row))

    def _metadata(self, channel_id: str, messages: list[dict]) -> dict:
        stats = self._stats(channel_id)
        first = messages[0]['sequence'] if messages else None
        last = messages[-1]['sequence'] if messages else None
        has_more = bool(first and self.store.db.execute('SELECT 1 FROM channel_messages WHERE channel_id=? AND sequence<? LIMIT 1',
                                                       (channel_id, first)).fetchone())
        has_newer = bool(last and self.store.db.execute('SELECT 1 FROM channel_messages WHERE channel_id=? AND sequence>? LIMIT 1',
                                                      (channel_id, last)).fetchone())
        return {key: value for key, value in stats.items() if key != 'userCount'} | {
            'loadedMessageCount': len(messages), 'firstSequence': first, 'lastSequence': last,
            'hasMore': has_more, 'before': first if has_more else None,
            'hasNewer': has_newer, 'after': last if has_newer else None}

    def _messages(self, channel_id: str, before: int | None = None, limit: int = VISIBLE_MESSAGES,
                  after: int | None = None) -> list[dict]:
        query, parameters = 'SELECT body,characters FROM channel_messages WHERE channel_id=?', [channel_id]
        if before is not None:
            query += ' AND sequence<?'
            parameters.append(before)
        if after is not None:
            query += ' AND sequence>?'
            parameters.append(after)
        direction = 'ASC' if after is not None else 'DESC'
        rows = self.store.db.execute(query + ' ORDER BY sequence ' + direction + ' LIMIT ?', (*parameters, limit)).fetchall()
        selected, size = [], 0
        for body, characters in rows:
            if selected and size + characters > VISIBLE_CHARACTERS:
                break
            selected.append(json.loads(body))
            size += characters
        return selected if after is not None else list(reversed(selected))

    def _rounds(self, channel_id: str) -> list[dict]:
        rows = self.store.db.execute('SELECT body FROM channel_rounds WHERE channel_id=? ORDER BY position DESC LIMIT ?',
                                    (channel_id, VISIBLE_ROUNDS)).fetchall()
        selected, size = [], 0
        for (body,) in rows:
            if selected and size + len(body) > ROUND_CHARACTERS:
                break
            selected.append(json.loads(body))
            size += len(body)
        return list(reversed(selected))
