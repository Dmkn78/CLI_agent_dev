"""Bounded local segmentation for FluidVoice's 300-second file API.

The original audio remains untouched. The caller owns the local HTTP endpoint
and its timeout; this module only passes absolute file paths to that callback.
No models, codecs, tools or credentials are downloaded or installed here.
"""
import json
import math
import os
import subprocess
import tempfile
import time
import wave
from pathlib import Path

from . import brain_media


MAX_TEXT = 16000
MAX_AUDIO_BYTES = 20 * 1024 * 1024
MAX_DURATION_SECONDS = 20 * 60
FLUID_MAX_SECONDS = 300
SEGMENT_SECONDS = 240
MAX_SEGMENT_BYTES = 8 * 1024 * 1024
MAX_LOG_BYTES = 64 * 1024
TIMEOUT_SECONDS = 180


class AudioCancelled(ValueError):
    """A cancelled or stale attempt must not publish partial text."""


def _check(cancelled, deadline=None):
    if cancelled is not None and cancelled():
        raise AudioCancelled('Transcription audio annulée ; les segments temporaires sont supprimés.')
    if deadline is not None and time.monotonic() >= deadline:
        raise ValueError('Traitement audio trop long (180 secondes). Réessaie avec un fichier plus court.')


def _source(path, storage_root):
    path = Path(path).absolute()
    root = Path(storage_root).absolute() if storage_root is not None else path.parent
    if '..' in path.parts or '..' in root.parts:
        raise ValueError('Chemin audio invalide.')
    try:
        path.relative_to(root)
    except ValueError:
        raise ValueError('La source audio doit rester dans le stockage privé My Brain.') from None
    current = path
    while True:
        if current.is_symlink():
            raise ValueError('La source audio ne peut pas contenir de lien symbolique.')
        if current == root:
            break
        current = current.parent
    try:
        if not path.is_file() or not 0 < path.stat().st_size <= MAX_AUDIO_BYTES:
            raise ValueError('Le fichier audio est vide, absent ou dépasse 20 Mo.')
    except OSError:
        raise ValueError('Le fichier audio n’est pas accessible.') from None
    return path, root


def _work_size(folder):
    size = 0
    for path in folder.iterdir():
        if path.is_symlink() or path.is_dir():
            raise ValueError('La conversion audio a produit un chemin inattendu.')
        if path.is_file():
            size += path.stat().st_size
    return size


def _run(command, folder, deadline, cancelled):
    """Use bounded file-backed output, a private group and no inherited secrets."""
    _check(cancelled, deadline)
    environment = {key: os.environ[key] for key in ('PATH', 'SYSTEMROOT', 'WINDIR', 'TMPDIR',
                                                   'TEMP', 'TMP', 'LANG', 'LC_ALL', 'LC_CTYPE')
                   if key in os.environ}
    with tempfile.TemporaryFile(dir=folder) as output, tempfile.TemporaryFile(dir=folder) as errors:
        try:
            process = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=output, stderr=errors,
                                       cwd=str(folder), env=environment, shell=False,
                                       start_new_session=os.name == 'posix')
        except OSError:
            raise ValueError('Impossible de lancer ffmpeg ou ffprobe ; vérifie les outils audio locaux.') from None
        try:
            while True:
                _check(cancelled, deadline)
                if max(os.fstat(output.fileno()).st_size, os.fstat(errors.fileno()).st_size) > MAX_LOG_BYTES:
                    raise ValueError('La réponse de l’outil audio est trop volumineuse.')
                if _work_size(folder) > MAX_SEGMENT_BYTES:
                    raise ValueError('Le segment audio dépasse la taille autorisée.')
                code = process.poll()
                if code is not None:
                    output.seek(0)
                    if code:
                        raise ValueError('Lecture ou conversion audio impossible ; vérifie le fichier source.')
                    return output.read(MAX_LOG_BYTES + 1)
                time.sleep(.05)
        except BaseException:
            brain_media._stop_process(process)
            raise


def _duration(path, ffprobe, folder, deadline, cancelled):
    raw = _run([ffprobe, '-v', 'error', '-protocol_whitelist', 'file',
                '-show_entries', 'format=duration', '-of', 'json', '-i', str(path)],
               folder, deadline, cancelled)
    try:
        value = json.loads(raw)['format']['duration']
        if isinstance(value, bool) or not isinstance(value, (str, int, float)):
            raise ValueError()
        duration = float(value)
        if not math.isfinite(duration) or not 0 < duration <= MAX_DURATION_SECONDS:
            raise ValueError()
    except (ValueError, TypeError, KeyError, UnicodeError):
        raise ValueError('Durée audio inconnue ou supérieure à 20 minutes ; découpe le fichier avant import.') from None
    return duration


def _text(response):
    value = response.get('text') if isinstance(response, dict) else None
    if not isinstance(value, str):
        raise ValueError('FluidVoice n’a pas retourné de transcription textuelle pour un segment.')
    if len(value) > MAX_TEXT or '\x00' in value:
        raise ValueError('Transcription FluidVoice invalide ou supérieure à 16 000 caractères.')
    return value.strip()


def _segment(path):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= MAX_SEGMENT_BYTES:
        raise ValueError('Le segment WAV est absent, vide ou trop volumineux.')
    try:
        with wave.open(str(path), 'rb') as audio:
            if (audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 16000
                    or audio.getcomptype() != 'NONE' or not 0 < audio.getnframes() <= SEGMENT_SECONDS * 16000):
                raise ValueError()
    except (OSError, EOFError, wave.Error, ValueError):
        raise ValueError('Le segment audio n’est pas un WAV PCM mono 16 kHz valide.') from None
    path.chmod(0o600)


def transcribe_fluid_audio(path, request_callable, cancelled=None, storage_root=None):
    """Return complete ASR text for one retained private audio file.

    ``request_callable(absolute_path_string)`` returns FluidVoice's JSON object
    with ``text`` and must enforce its own HTTP timeout. ffprobe always validates
    the actual source duration. All files use sequential PCM WAV segments of at
    most 240 seconds, including one WAV for short sources. This avoids the
    compressed-audio decoder and resampler in FluidVoice's API. Cancellation
    is checked before/after each HTTP call and while local subprocesses run.
    A failure returns no partial transcript and always removes temporary WAVs.
    """
    _check(cancelled)
    path, root = _source(path, storage_root)
    tools = brain_media._tools(root)
    if not tools['ffprobe'] or not tools['ffmpeg']:
        missing = [name for name in ('ffprobe', 'ffmpeg') if not tools[name]]
        raise ValueError('Préparation audio indisponible : ' + ', '.join(missing) + ' local requis.')
    deadline = time.monotonic() + TIMEOUT_SECONDS
    # A native app can block inside macOS file authorization when a source is
    # under Desktop/Documents. Only these ephemeral WAVs are passed to it; the
    # original stays in My Brain. The OS temporary directory is private (0700)
    # and is outside those protected folders, with cleanup on every exit.
    with tempfile.TemporaryDirectory(prefix='atelier-brain-audio-') as temporary:
        folder = Path(temporary)
        folder.chmod(0o700)
        duration = _duration(path, tools['ffprobe'], folder, deadline, cancelled)
        parts = []
        for index in range(math.ceil(duration / SEGMENT_SECONDS)):
            _check(cancelled, deadline)
            segment = folder / ('segment-' + str(index + 1).zfill(2) + '.wav')
            start = index * SEGMENT_SECONDS
            length = min(SEGMENT_SECONDS, duration - start)
            command = [tools['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error',
                       '-n', '-protocol_whitelist', 'file', '-ss', str(start), '-i', str(path),
                       '-t', format(length, '.6f'), '-map', '0:a:0', '-vn', '-threads', '1',
                       '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav',
                       '-fs', str(MAX_SEGMENT_BYTES), str(segment)]
            _run(command, folder, deadline, cancelled)
            _segment(segment)
            _check(cancelled, deadline)
            text = _text(request_callable(str(segment)))
            if text:
                parts.append(text)
            _check(cancelled, deadline)
            if sum(len(part) for part in parts) + len(parts) - 1 > MAX_TEXT:
                raise ValueError('La transcription complète dépasse 16 000 caractères ; découpe le fichier avant import.')
            segment.unlink()
        if not parts:
            raise ValueError('FluidVoice n’a pas retourné de transcription textuelle pour ce fichier.')
        return '\n'.join(parts)
