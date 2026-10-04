"""Read-only Fluid Voice discovery and its native, local dictation history.

Only allowlisted settings and raw dictations are returned. No provider account,
keychain, clipboard, log or credential is imported; no settings are changed.
Protocol verified against FluidVoice v1.6.9, not an OpenAI ASR endpoint.
"""
import json
import plistlib
import sys
from pathlib import Path

FLUID_DOMAIN = 'com.FluidApp.app'
DEFAULT_FLUID_PORT = 47733
MAX_PREFERENCES = 32 * 1024 * 1024


def fluid_preferences():
    path = Path.home() / 'Library' / 'Preferences' / (FLUID_DOMAIN + '.plist')
    if sys.platform != 'darwin' or not path.exists():
        raise ValueError('Fluid Voice n’est pas installé pour cet utilisateur macOS.')
    if path.is_symlink() or path.stat().st_size > MAX_PREFERENCES:
        raise ValueError('Les préférences Fluid Voice sont inaccessibles ou trop volumineuses.')
    try:
        with path.open('rb') as stream:
            values = plistlib.load(stream)
    except (plistlib.InvalidFileException, ValueError, OSError):
        raise ValueError('Les préférences Fluid Voice ne sont pas lisibles ; réessaie après la dictée.') from None
    if not isinstance(values, dict):
        raise ValueError('Préférences Fluid Voice invalides.')
    # Discard everything else immediately; never return/store provider settings.
    return {key: values.get(key) for key in ('SelectedSpeechModel', 'LocalAPIEnabled',
            'LocalAPIPort', 'SaveTranscriptionHistory', 'TranscriptionHistoryEntries')}


def fluid_history():
    preferences = fluid_preferences()
    if preferences['SaveTranscriptionHistory'] is not True:
        raise ValueError('Fluid Voice : active Save Transcription History dans Settings pour recevoir les nouvelles dictées. Aucun accès au presse-papiers n’est utilisé.')
    data = preferences['TranscriptionHistoryEntries']
    if data is None:
        return []
    if not isinstance(data, (bytes, str)) or len(data) > MAX_PREFERENCES:
        raise ValueError('Historique Fluid Voice invalide ou trop volumineux.')
    try:
        entries = json.loads(data)
    except (ValueError, UnicodeError):
        raise ValueError('Historique Fluid Voice illisible ; aucune dictée importée.') from None
    if not isinstance(entries, list) or len(entries) > 20000:
        raise ValueError('Historique Fluid Voice invalide ou trop volumineux.')
    result = []
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError('Entrée Fluid Voice invalide.')
        identifier, text, timestamp = item.get('id'), item.get('rawText'), item.get('timestamp')
        if (not isinstance(identifier, str) or not identifier or len(identifier) > 100
                or not isinstance(text, str) or isinstance(timestamp, bool)
                or not isinstance(timestamp, (int, float))):
            raise ValueError('Entrée Fluid Voice incompatible : id, rawText et timestamp attendus.')
        # Swift JSONEncoder dates are seconds from 2001-01-01, not Unix time.
        result.append({'id': identifier, 'text': text, 'timestamp': timestamp + 978307200})
    return sorted(result, key=lambda item: (item['timestamp'], item['id']))


def local_installation():
    result = {'fluidVoice': {'installed': False}, 'vaults': []}
    if sys.platform != 'darwin':
        return result
    application = Path('/Applications/FluidVoice.app')
    try:
        info = plistlib.loads((application / 'Contents/Info.plist').read_bytes())
        preferences = fluid_preferences()
        port = preferences['LocalAPIPort']
        if isinstance(port, bool) or not isinstance(port, int) or not 1 <= port <= 65535:
            port = DEFAULT_FLUID_PORT
        models = Path.home() / 'Library/Application Support/FluidAudio/Models/parakeet-tdt-0.6b-v3-coreml'
        expected = ['Preprocessor.mlmodelc', 'Encoder.mlmodelc', 'Decoder.mlmodelc',
                    'JointDecision.mlmodelc', 'parakeet_vocab.json']
        result['fluidVoice'] = {'installed': True, 'version': info.get('CFBundleShortVersionString'),
            'speechModel': preferences['SelectedSpeechModel'], 'modelPath': str(models),
            'modelPresent': all((models / name).exists() for name in expected),
            'historyEnabled': preferences['SaveTranscriptionHistory'] is True,
            'apiEnabled': preferences['LocalAPIEnabled'] is True,
            'apiUrl': 'http://127.0.0.1:' + str(port) + '/v1/transcribe'}
    except (OSError, ValueError, plistlib.InvalidFileException):
        pass
    config = Path.home() / 'Library/Application Support/obsidian/obsidian.json'
    try:
        if config.is_symlink() or config.stat().st_size > 256 * 1024:
            return result
        data = json.loads(config.read_text(encoding='utf-8'))
        for item in data.get('vaults', {}).values():
            path = Path(item.get('path', ''))
            if path.is_absolute() and path.is_dir() and not path.is_symlink():
                result['vaults'].append({'name': path.name, 'path': str(path)})
    except (OSError, ValueError, TypeError, AttributeError):
        pass
    return result
