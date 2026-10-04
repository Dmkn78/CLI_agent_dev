"""Durable browser file manifests, projected from actual My Brain jobs.

Manifest paths are metadata only. This module never opens a user file, starts a
provider, or treats an unreceived entry as complete. Imports remain owned by
Brain; a batch can reference deduplicated jobs without copying their contents.
"""
import base64
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import PurePosixPath
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .store import now, uid


MAX_ENTRIES = 1000
MAX_SIZE = 2 ** 53 - 1
ACTIVE = {'queued', 'downloading', 'transcribing', 'correcting'}
COMPLETED = {'review', 'exported'}
FAILED = {'failed', 'interrupted', 'cancelled'}


def _name(value, label, maximum=200):
    if (not isinstance(value, str) or not value.strip() or len(value) > maximum
            or re.search(r'[\x00-\x1f\x7f]', value)):
        raise ValueError(label + ' vide, trop long ou invalide.')
    return value


def _relative_path(value):
    value = _name(value, 'Chemin relatif', 500)
    parts = value.split('/')
    if ('\\' in value or ':' in value or len(parts) > 40
            or any(not part or part.startswith('.') for part in parts)
            or PurePosixPath(value).is_absolute()):
        raise ValueError('Utilise un chemin relatif sans dossier caché, traversée ni chemin absolu.')
    _name(parts[-1], 'Nom du fichier')
    return value


def _modified_at(value):
    if value is None:
        return None
    try:
        if isinstance(value, bool):
            raise ValueError()
        if isinstance(value, (int, float)):
            if not math.isfinite(value) or not 0 <= value <= 253402300799999:
                raise ValueError()
            date = datetime.fromtimestamp(value / 1000, timezone.utc)
        elif isinstance(value, str) and len(value) <= 100:
            date = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if date.tzinfo is None:
                raise ValueError()
            date = date.astimezone(timezone.utc)
        else:
            raise ValueError()
        return date.isoformat(timespec='milliseconds')
    except (ValueError, OverflowError, OSError):
        raise ValueError('Date de modification invalide ; utilise un horodatage de fichier ou une date ISO avec fuseau.') from None


def _time_zone(value):
    if value is None:
        value = 'UTC'
    try:
        if not isinstance(value, str) or not value or len(value) > 100:
            raise ValueError()
        return ZoneInfo(value).key
    except (ValueError, ZoneInfoNotFoundError):
        raise ValueError('Fuseau horaire IANA invalide ou indisponible.') from None


class BrainBatches:
    def __init__(self, brain):
        self.brain, self.store, self.lock = brain, brain.store, brain.lock

    def _batch(self, identifier):
        if not isinstance(identifier, str) or not re.fullmatch(r'batch_[a-f0-9]{12}', identifier):
            raise ValueError('Identifiant de lot invalide.')
        return self.store.get('brainBatch', identifier)

    def _entry(self, batch, index):
        if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(batch['entries']):
            raise ValueError('Index de fichier invalide pour ce lot.')
        return batch['entries'][index]

    def _job(self, identifier):
        if not identifier:
            return None
        try:
            return self.store.get('brainJob', identifier)
        except ValueError:
            return None

    def create(self, data):
        if not isinstance(data, dict):
            raise ValueError('Manifest de dossier invalide.')
        project = _name(data.get('projectId', 'atelier'), 'Projet')
        name = _name(data.get('name'), 'Nom du lot')
        time_zone = _time_zone(data.get('timeZone'))
        supplied = data.get('entries')
        if not isinstance(supplied, list) or not 1 <= len(supplied) <= MAX_ENTRIES:
            raise ValueError('Un lot doit contenir de 1 à 1 000 fichiers.')
        entries, paths, total_size = [], set(), 0
        for index, item in enumerate(supplied):
            if not isinstance(item, dict):
                raise ValueError('Entrée du manifest invalide.')
            relative = _relative_path(item.get('relativePath'))
            if relative in paths:
                raise ValueError('Un chemin de fichier figure plusieurs fois dans le manifest.')
            paths.add(relative)
            size = item.get('size')
            if isinstance(size, bool) or not isinstance(size, int) or not 0 <= size <= MAX_SIZE:
                raise ValueError('Taille de fichier invalide dans le manifest.')
            total_size += size
            if total_size > MAX_SIZE:
                raise ValueError('La taille totale du manifest est trop grande.')
            entries.append({'index': index, 'relativePath': relative, 'sourceName': relative.rsplit('/', 1)[-1],
                            'size': size, 'modifiedAt': _modified_at(item.get('modifiedAt')),
                            'jobId': None, 'error': None, 'duplicate': False})
        fingerprint_data = {'projectId': project, 'name': name, 'timeZone': time_zone,
                            'entries': sorted([(e['relativePath'], e['size'], e['modifiedAt']) for e in entries])}
        fingerprint = hashlib.sha256(json.dumps(fingerprint_data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        with self.lock:
            self.brain.config(project)  # Validate project without a provider request.
            existing = next((batch for batch in self.store.all('brainBatch')
                             if batch.get('fingerprint') == fingerprint), None)
            if existing:
                return dict(self._project(existing), duplicate=True)
            stamp = now()
            batch = {'id': uid('batch'), 'projectId': project, 'name': name, 'timeZone': time_zone,
                     'entries': entries, 'totalBytes': total_size, 'fingerprint': fingerprint,
                     'createdAt': stamp, 'updatedAt': stamp}
            self.store.put('brainBatch', batch)
            self.store.event('brain.batch_created', {'id': batch['id'], 'total': len(entries), 'totalBytes': total_size}, project_id=project)
            return self._project(batch)

    def _project(self, batch, details=True):
        counts = dict(total=len(batch['entries']), received=0, receivedBytes=0, pending=0,
                      active=0, completed=0, failed=0, duplicates=0)
        projected, stamp = [], batch['updatedAt']
        for entry in batch['entries']:
            item = dict(entry)
            job = self._job(entry['jobId'])
            if entry['jobId']:
                counts['received'] += 1
                counts['receivedBytes'] += entry['size']
            if entry.get('duplicate'):
                counts['duplicates'] += 1
            if job is not None and job.get('projectId') == batch['projectId']:
                status = job.get('status')
                item['status'] = status
                item['error'] = job.get('error') or job.get('exportError')
                item['retryable'] = status in FAILED
                stamp = max(stamp, job.get('updatedAt') or stamp)
                if status in ACTIVE:
                    counts['active'] += 1
                elif status in COMPLETED:
                    counts['completed'] += 1
                else:
                    counts['failed'] += 1
                    if status not in FAILED:
                        item.update(status='failed', error='Statut du traitement indisponible ou incompatible.', retryable=False)
            elif entry['jobId']:
                counts['failed'] += 1
                item.update(status='failed', error='Le traitement lié au fichier est introuvable ou hors du projet.', retryable=False)
            elif entry.get('error'):
                counts['failed'] += 1
                item.update(status='failed', retryable=True)
            else:
                counts['pending'] += 1
                item.update(status='pending', retryable=False)
            projected.append(item)
        if counts['pending']:
            state = 'uploading'
        elif counts['active']:
            state = 'processing'
        else:
            state = 'failed' if counts['failed'] else 'completed'
        result = {key: batch[key] for key in ('id', 'projectId', 'name', 'timeZone', 'totalBytes', 'createdAt')}
        result.update(counts, state=state, updatedAt=stamp,
                      completedAt=stamp if state in ('completed', 'failed') else None)
        if details:
            result['entries'] = projected
        return result

    def get(self, identifier):
        with self.lock:
            return self._project(self._batch(identifier))

    def snapshot(self, project=None):
        with self.lock:
            if project is not None:
                self.brain.config(project)
            return sorted([self._project(batch, details=False) for batch in self.store.all('brainBatch')
                           if project is None or batch['projectId'] == project],
                          key=lambda batch: (batch['updatedAt'], batch['id']), reverse=True)

    def validate_import(self, data, source_name, size):
        with self.lock:
            if not data.get('batchId'):
                if 'batchIndex' in data:
                    raise ValueError('Identifiant de lot requis avec l’index de fichier.')
                return {}
            batch = self._batch(data['batchId'])
            entry = self._entry(batch, data.get('batchIndex'))
            if data.get('projectId', 'atelier') != batch['projectId']:
                raise ValueError('Le fichier ne correspond pas au projet du lot.')
            if (source_name != entry['sourceName'] or isinstance(size, bool)
                    or not isinstance(size, int) or size != entry['size']):
                raise ValueError('Le nom ou la taille du fichier ne correspond pas au manifest ; sélectionne le dossier à nouveau.')
            if 'sourceRelativePath' in data and data['sourceRelativePath'] != entry['relativePath']:
                raise ValueError('Le chemin relatif ne correspond pas au manifest.')
            if 'sourceModifiedAt' in data and _modified_at(data['sourceModifiedAt']) != entry['modifiedAt']:
                raise ValueError('La date du fichier ne correspond pas au manifest.')
            if 'sourceTimeZone' in data and _time_zone(data['sourceTimeZone']) != batch['timeZone']:
                raise ValueError('Le fuseau du fichier ne correspond pas au lot.')
            job = self._job(entry['jobId'])
            if job is not None and job.get('status') not in FAILED:
                try:
                    raw = (base64.b64decode(data.get('audioBase64', ''), validate=True)
                           if data.get('sourceType', 'text') == 'audio' else data.get('text', '').encode('utf-8'))
                except (ValueError, TypeError, AttributeError):
                    raise ValueError('Cette entrée est déjà reçue ; consulte son traitement.') from None
                if (job.get('sourceType') != data.get('sourceType', 'text')
                        or hashlib.sha256(raw).hexdigest() != job.get('sourceSha256')):
                    raise ValueError('Cette entrée est déjà reçue avec un contenu différent ; crée un nouveau lot.')
            return {'batchId': batch['id'], 'batchIndex': entry['index'],
                    'sourceRelativePath': entry['relativePath'], 'sourceModifiedAt': entry['modifiedAt'],
                    'sourceTimeZone': batch['timeZone']}

    def record_import(self, data, job):
        if not data.get('batchId'):
            return None
        with self.lock:
            batch = self._batch(data['batchId'])
            entry = self._entry(batch, data.get('batchIndex'))
            observed = self._job(job.get('id'))
            if observed is None or observed.get('projectId') != batch['projectId']:
                raise ValueError('Le traitement importé est introuvable ou hors du projet du lot.')
            if data.get('projectId', 'atelier') != batch['projectId']:
                raise ValueError('Le fichier ne correspond pas au projet du lot.')
            if entry['jobId'] == job['id']:
                return self._project(batch)
            previous = self._job(entry['jobId'])
            if entry['jobId'] and (previous is None or previous.get('status') not in FAILED):
                raise ValueError('Cette entrée du lot possède déjà un traitement ; relance-le depuis son aperçu.')
            entry.update(jobId=job['id'], error=None, duplicate=bool(job.get('duplicate')))
            batch['updatedAt'] = now()
            self.store.put('brainBatch', batch)
            self.store.event('brain.batch_received', {'id': batch['id'], 'index': entry['index'], 'jobId': job['id'],
                                                    'duplicate': entry['duplicate']}, project_id=batch['projectId'])
            return self._project(batch)

    def entry_error(self, data):
        if not isinstance(data, dict):
            raise ValueError('Erreur de fichier invalide.')
        error = _name(data.get('error'), 'Erreur du fichier', 2000)
        with self.lock:
            batch = self._batch(data.get('id'))
            entry = self._entry(batch, data.get('index'))
            if entry['jobId']:
                # An upload retry may lose its HTTP response. Do not let a
                # browser/network error replace the actual job's result.
                return self._project(batch)
            if entry.get('error') == error:
                return self._project(batch)
            entry['error'] = error
            batch['updatedAt'] = now()
            self.store.put('brainBatch', batch)
            self.store.event('brain.batch_entry_failed', {'id': batch['id'], 'index': entry['index'], 'error': error},
                             project_id=batch['projectId'])
            return self._project(batch)
