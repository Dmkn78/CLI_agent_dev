"""Local projections in SQLite; observable actions in append-only JSONL."""
import hashlib
import json
import re
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + '_' + uuid.uuid4().hex[:12]


def redact(value):
    if isinstance(value, dict):
        return {k: '[REDACTED]' if re.search(r'(token$|password|secret|authorization|api.?key)', k, re.I)
                and not (k == 'read_secrets' and isinstance(v, str) and v in ('auto', 'ask', 'deny'))
                and k not in ('inputTokens', 'outputTokens', 'totalTokens') else redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str):
        value = re.sub(r'\bsk-[A-Za-z0-9_-]{12,}', '[REDACTED]', value)
        value = re.sub(r'(?i)Bearer\s+[A-Za-z0-9._-]+', 'Bearer [REDACTED]', value)
    return value


class Store:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(str(self.root / 'state.sqlite'), check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript('''
          CREATE TABLE IF NOT EXISTS objects (kind TEXT, id TEXT, body TEXT, PRIMARY KEY(kind,id));
          CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT);
        ''')
        self.db.commit()

    def put(self, kind, obj):
        with self.lock:
            self.db.execute('INSERT OR REPLACE INTO objects VALUES (?,?,?)', (kind, obj['id'], json.dumps(obj, ensure_ascii=False)))
            self.db.commit()
        return obj

    def get(self, kind, id):
        with self.lock:
            row = self.db.execute('SELECT body FROM objects WHERE kind=? AND id=?', (kind, id)).fetchone()
        if not row:
            raise ValueError('Élément introuvable.')
        return json.loads(row[0])

    def all(self, kind):
        with self.lock:
            return [json.loads(r[0]) for r in self.db.execute('SELECT body FROM objects WHERE kind=? ORDER BY rowid', (kind,))]

    def update(self, kind, id, **changes):
        with self.lock:
            obj = self.get(kind, id)
            obj.update(changes)
            return self.put(kind, obj)

    def delete(self, kind, id):
        with self.lock:
            self.db.execute('DELETE FROM objects WHERE kind=? AND id=?', (kind, id))
            self.db.commit()

    def event(self, type, data=None, session_id=None, project_id=None):
        event = dict(id=uid('evt'), ts=now(), type=type, sessionId=session_id, projectId=project_id, data=redact(data or {}))
        # Never persist private reasoning deltas or credentials.
        with self.lock:
            line = json.dumps(event, ensure_ascii=False)
            self.db.execute('INSERT INTO events(body) VALUES (?)', (line,))
            event['seq'] = self.db.execute('SELECT last_insert_rowid()').fetchone()[0]
            self.db.commit()
            directory = self.root / 'logs'
            directory.mkdir(exist_ok=True)
            with (directory / ((session_id or 'application') + '.jsonl')).open('a', encoding='utf-8') as out:
                out.write(json.dumps(event, ensure_ascii=False) + '\n')
        return event

    def events(self, after=0, limit=300, session=None):
        with self.lock:
            if session:
                rows = self.db.execute("SELECT seq,body FROM events WHERE seq>? AND json_extract(body,'$.sessionId')=? ORDER BY seq LIMIT ?", (after, session, limit)).fetchall()
            else:
                rows = self.db.execute('SELECT seq,body FROM events WHERE seq>? ORDER BY seq LIMIT ?', (after, limit)).fetchall()
        values = [dict(json.loads(body), seq=seq) for seq, body in rows]
        return values

    def latest_events(self, limit=120):
        with self.lock:
            rows = self.db.execute('SELECT seq,body FROM events ORDER BY seq DESC LIMIT ?', (limit,)).fetchall()
        return [dict(json.loads(body), seq=seq) for seq, body in rows]

    def artifact(self, session_id, name, data):
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', session_id) or not re.fullmatch(r'[a-zA-Z0-9_.-]+', name):
            raise ValueError('Nom d’artefact invalide.')
        directory = self.root / 'runs' / session_id
        directory.mkdir(parents=True, exist_ok=True)
        content = (data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, indent=2)).encode('utf-8')
        file = directory / name
        file.write_bytes(content)
        return {'path': str(file), 'sha256': hashlib.sha256(content).hexdigest()}
