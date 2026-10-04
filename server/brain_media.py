"""Bounded, explicit public YouTube imports into My Brain's private inputs.

Only this module chooses downloader options. It never loads user downloader
configuration, browser cookies, netrc, plugins or remote JavaScript components.
The caller queues work and supplies an attempt-aware cancellation callback.
"""
import hashlib
import importlib.util
import json
import math
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


MAX_AUDIO_BYTES = 20 * 1024 * 1024
MAX_DURATION_SECONDS = 20 * 60
TIMEOUT_SECONDS = 180
MAX_SOURCE_BYTES = 40 * 1024 * 1024
MAX_WORK_BYTES = 64 * 1024 * 1024
MAX_LOG_BYTES = 2 * 1024 * 1024
VIDEO_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')


class MediaCancelled(ValueError):
    """An explicit cancellation or stale attempt stopped the subprocess."""


def normalize_youtube_url(value):
    """Return a single canonical video URL; never hand arbitrary URLs to yt-dlp."""
    if not isinstance(value, str) or not value.strip() or len(value) > 2048:
        raise ValueError('Indique le lien YouTube d’une seule vidéo.')
    value = value.strip()
    if re.search(r'[\s\x00-\x1f\x7f\\]', value):
        raise ValueError('Lien YouTube invalide.')
    try:
        parsed = urlsplit(value)
        host, port = parsed.hostname, parsed.port
        if (parsed.scheme not in ('http', 'https') or parsed.username is not None
                or parsed.password is not None or port is not None):
            raise ValueError()
    except ValueError:
        raise ValueError('Utilise un lien YouTube HTTP ou HTTPS sans identifiants ni port.') from None
    if host not in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'):
        raise ValueError('Seuls les liens youtube.com et youtu.be sont acceptés.')
    query = parse_qs(parsed.query, keep_blank_values=True)
    if any(key in query for key in ('list', 'playlist', 'index')):
        raise ValueError('Les playlists ne sont pas importées ; utilise le lien d’une seule vidéo sans list=.')
    if host in ('youtu.be', 'www.youtu.be'):
        identifier = parsed.path.removeprefix('/')
    elif parsed.path == '/watch':
        values = query.get('v', [])
        identifier = values[0] if len(values) == 1 else ''
    else:
        match = re.fullmatch(r'/(?:shorts|live|embed)/([A-Za-z0-9_-]{11})/?', parsed.path)
        identifier = match.group(1) if match else ''
    if not VIDEO_ID.fullmatch(identifier):
        raise ValueError('Lien vidéo YouTube invalide : /watch?v=, youtu.be, shorts ou live attendu.')
    return 'https://www.youtube.com/watch?v=' + identifier


def _tool_directories(storage_root=None):
    candidates = []
    configured = os.environ.get('ATELIER_BRAIN_MEDIA_BIN', '')
    if configured and Path(configured).is_absolute():
        candidates.append(Path(configured))
    if storage_root is not None:
        candidates.append(Path(storage_root) / 'tools' / 'media' / 'bin')
    candidates.append(Path(__file__).resolve().parents[1] / '.atelier' / 'tools' / 'media' / 'bin')
    return list(dict.fromkeys(candidates))


def _find_executable(name, storage_root=None):
    for folder in _tool_directories(storage_root):
        for filename in ((name + '.exe', name) if os.name == 'nt' else (name,)):
            candidate = folder / filename
            if candidate.is_file() and os.access(candidate, os.X_OK):
                return str(candidate.absolute())
    return shutil.which(name)


def _tools(storage_root=None):
    downloader = _find_executable('yt-dlp', storage_root)
    command = [downloader] if downloader else None
    if command is None:
        try:
            if importlib.util.find_spec('yt_dlp') is not None:
                command = [sys.executable, '-m', 'yt_dlp']
        except (ImportError, ValueError):
            pass
    return {'command': command, 'ffmpeg': _find_executable('ffmpeg', storage_root),
            'ffprobe': _find_executable('ffprobe', storage_root),
            'node': _find_executable('node', storage_root)}


def media_dependencies(storage_root=None):
    """Read executable availability only; do not install anything or contact YouTube."""
    tools = _tools(storage_root)
    missing = [name for name, present in (('yt-dlp', tools['command']), ('ffmpeg', tools['ffmpeg']),
                                          ('ffprobe', tools['ffprobe'])) if not present]
    return {'available': not missing, 'ytDlp': bool(tools['command']), 'ffmpeg': bool(tools['ffmpeg']),
            'ffprobe': bool(tools['ffprobe']), 'nodeRuntime': bool(tools['node']), 'missing': missing,
            'limits': {'maxAudioBytes': MAX_AUDIO_BYTES, 'maxDurationSeconds': MAX_DURATION_SECONDS,
                       'timeoutSeconds': TIMEOUT_SECONDS}}


def _cancel_check(cancelled):
    if cancelled is not None and cancelled():
        raise MediaCancelled('Import YouTube annulé ; le téléchargement a été arrêté.')


def _stop_process(process):
    # yt-dlp launches ffmpeg as a child. A private process group stops both on POSIX.
    try:
        if os.name == 'posix':
            os.killpg(process.pid, signal.SIGTERM)
        else:
            process.terminate()
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        try:
            if os.name == 'posix':
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            process.wait(timeout=1)
        except (OSError, subprocess.TimeoutExpired):
            pass
    except OSError:
        # A completed child can lose its process group just before cancellation.
        # Reap it even when killpg no longer finds the group.
        try:
            process.wait(timeout=1)
        except (OSError, subprocess.TimeoutExpired):
            pass


def _work_size(folder):
    size = 0
    for path in folder.rglob('*'):
        if path.is_symlink():
            raise ValueError('Le téléchargement a produit un lien symbolique inattendu.')
        if path.is_file():
            length = path.stat().st_size
            if length > MAX_SOURCE_BYTES:
                raise ValueError('L’audio source dépasse 40 Mo ; import interrompu.')
            size += length
    return size


def _run(command, folder, deadline, cancelled, environment):
    """Poll file-backed output to bound both subprocess logs and local media."""
    _cancel_check(cancelled)
    with tempfile.TemporaryFile(dir=folder) as output, tempfile.TemporaryFile(dir=folder) as errors:
        try:
            process = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=output, stderr=errors,
                                       cwd=str(folder), env=environment, shell=False,
                                       start_new_session=os.name == 'posix')
        except OSError:
            raise ValueError('Impossible de lancer yt-dlp ; vérifie les dépendances audio locales.') from None
        try:
            while True:
                _cancel_check(cancelled)
                if time.monotonic() >= deadline:
                    raise ValueError('Délai d’import YouTube dépassé (180 secondes). Réessaie avec une vidéo plus courte.')
                if max(os.fstat(output.fileno()).st_size, os.fstat(errors.fileno()).st_size) > MAX_LOG_BYTES:
                    raise ValueError('Réponse yt-dlp trop volumineuse ; import interrompu.')
                if _work_size(folder) > MAX_WORK_BYTES:
                    raise ValueError('Téléchargement trop volumineux ; import interrompu.')
                code = process.poll()
                if code is not None:
                    output.seek(0)
                    errors.seek(0)
                    return code, output.read(MAX_LOG_BYTES + 1), errors.read(MAX_LOG_BYTES + 1).decode('utf-8', 'replace')
                time.sleep(.1)
        except BaseException:
            _stop_process(process)
            raise


def _download_error(detail, stage):
    lowered = detail.casefold()
    if any(term in lowered for term in ('sign in', 'sign-in', 'login', 'cookies', 'private video', 'members-only', 'age-restricted', 'bot')):
        return 'YouTube demande une connexion ou bloque cette vidéo. Choisis une vidéo publique accessible sans cookies.'
    if any(term in lowered for term in ('unavailable', 'not available', 'removed', 'copyright', 'geo restricted')):
        return 'Cette vidéo YouTube est indisponible ou restreinte.'
    if 'ffmpeg' in lowered or 'ffprobe' in lowered:
        return 'Conversion MP3 impossible ; vérifie ffmpeg et ffprobe locaux.'
    if 'filesize' in lowered or 'too large' in lowered or 'larger than' in lowered:
        return 'L’audio source est trop volumineux ; choisis une vidéo plus courte.'
    if 'no such option' in lowered or 'unrecognized arguments' in lowered:
        return 'La version de yt-dlp est incompatible ; installe une version récente avec ses composants locaux.'
    return 'Import YouTube impossible (' + stage + '). Vérifie la connexion et la disponibilité de la vidéo, puis réessaie.'


def _metadata(raw, identifier):
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, UnicodeError):
        raise ValueError('YouTube n’a pas retourné des métadonnées valides.') from None
    if (not isinstance(data, dict) or data.get('id') != identifier
            or data.get('_type', 'video') != 'video' or data.get('entries') is not None):
        raise ValueError('La source YouTube ne correspond pas à une seule vidéo.')
    duration = data.get('duration')
    if (isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration)
            or duration <= 0 or duration > MAX_DURATION_SECONDS):
        raise ValueError('Import limité aux vidéos d’une durée connue, de 20 minutes maximum.')
    if data.get('is_live') or data.get('live_status') in ('is_live', 'is_upcoming', 'post_live'):
        raise ValueError('Les directs en cours ou à venir ne sont pas importés.')
    title = data.get('title')
    if not isinstance(title, str) or not title.strip() or len(title) > 1000:
        raise ValueError('Le titre de la vidéo YouTube est absent ou invalide.')
    title = re.sub(r'[\x00-\x1f\x7f]', ' ', title).strip()[:500]
    return title, duration


def _destination(value, storage_root):
    path = Path(value).absolute()
    if storage_root is None and len(path.parents) < 3:
        raise ValueError('Destination MP3 invalide : utilise le stockage privé My Brain.')
    root = Path(storage_root).absolute() if storage_root is not None else path.parents[2]
    parent = root / 'brain' / 'inputs'
    if ('..' in path.parts or '..' in root.parts or path.parent != parent
            or not re.fullmatch(r'voice_[A-Za-z0-9_-]+\.mp3', path.name)):
        raise ValueError('Destination MP3 invalide : utilise un fichier My Brain privé choisi par le service.')
    # Check the designated storage and its descendants; macOS /var itself is a
    # system alias, which does not move a destination outside that storage.
    if any(item.is_symlink() for item in (path, parent, parent.parent, root)):
        raise ValueError('La destination audio ne peut pas contenir de lien symbolique.')
    if path.exists():
        raise ValueError('Le fichier audio existe déjà ; aucune source existante ne sera écrasée.')
    parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    return path, root


def download_youtube_mp3(url, destination, cancelled=None, storage_root=None):
    """Download one public short video and publish its MP3 without overwriting.

    The returned metadata is observed; caller persists it in the queued job.
    Dependencies and media live in the application's designated private storage.
    Temporary files are removed on failure; completed original MP3s are retained.
    """
    canonical = normalize_youtube_url(url)
    path, root = _destination(destination, storage_root)
    tools = _tools(root)
    missing = [name for name, present in (('yt-dlp', tools['command']), ('ffmpeg', tools['ffmpeg']),
                                          ('ffprobe', tools['ffprobe'])) if not present]
    if missing:
        raise ValueError('Import YouTube indisponible : installe ' + ', '.join(missing) + ' localement.')
    deadline = time.monotonic() + TIMEOUT_SECONDS
    environment = {key: os.environ[key] for key in ('PATH', 'SYSTEMROOT', 'WINDIR', 'TMPDIR', 'TEMP', 'TMP',
                                                   'LANG', 'LC_ALL', 'LC_CTYPE', 'SSL_CERT_FILE', 'SSL_CERT_DIR')
                   if key in os.environ}
    bins = [str(Path(tools[key]).parent) for key in ('ffmpeg', 'ffprobe', 'node') if tools[key]]
    environment['PATH'] = os.pathsep.join(list(dict.fromkeys(bins)) + [environment.get('PATH', '')])
    common = tools['command'] + ['--ignore-config', '--no-plugin-dirs', '--no-remote-components',
            '--no-cache-dir', '--no-playlist', '--no-progress', '--socket-timeout', '15',
            '--retries', '1', '--fragment-retries', '1', '--extractor-retries', '1',
            '--use-extractors', 'youtube']
    if tools['node']:
        common += ['--js-runtimes', 'node:' + tools['node']]
    with tempfile.TemporaryDirectory(prefix='.youtube-', dir=path.parent) as temporary:
        folder = Path(temporary)
        code, raw, detail = _run(common + ['--skip-download', '--dump-single-json', '--', canonical],
                                  folder, deadline, cancelled, environment)
        if code:
            raise ValueError(_download_error(detail, 'lecture de la vidéo'))
        title, duration = _metadata(raw, canonical.rsplit('=', 1)[1])
        command = common + ['--format', 'bestaudio', '--max-filesize', str(MAX_SOURCE_BYTES),
                '--match-filters', '!is_live & duration <= ' + str(MAX_DURATION_SECONDS),
                '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '96K',
                '--output', str(folder / 'audio.%(ext)s'), '--', canonical]
        code, _, detail = _run(command, folder, deadline, cancelled, environment)
        if code:
            raise ValueError(_download_error(detail, 'téléchargement ou conversion MP3'))
        _cancel_check(cancelled)
        audio = folder / 'audio.mp3'
        if audio.is_symlink() or not audio.is_file():
            raise ValueError('Aucun MP3 produit. Vérifie la durée, la taille et les dépendances audio.')
        size = audio.stat().st_size
        if not 0 < size <= MAX_AUDIO_BYTES:
            raise ValueError('Le MP3 est vide ou dépasse 20 Mo ; choisis une vidéo plus courte.')
        digest = hashlib.sha256(audio.read_bytes()).hexdigest()
        _cancel_check(cancelled)
        # Hard-link publication is atomic and refuses an existing destination.
        try:
            audio.chmod(0o600)
            os.link(audio, path)
        except FileExistsError:
            raise ValueError('Le fichier audio existe déjà ; aucune source existante ne sera écrasée.') from None
        except OSError:
            raise ValueError('Impossible de conserver le MP3 dans le stockage privé My Brain.') from None
    name = re.sub(r'[/\\]', '-', title)[:195] + '.mp3'
    return {'inputFile': str(path), 'sourceUrl': canonical, 'sourceVideoId': canonical.rsplit('=', 1)[1],
            'sourceTitle': title, 'sourceDuration': duration, 'sourceBytes': size,
            'sourceSha256': digest, 'sourceName': name}
