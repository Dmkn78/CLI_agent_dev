"""Pure source/date metadata for My Brain; never read files or trust model dates.

``source_metadata(data, source_name, source_type, imported_at, recorded_at=None)``
validates declared import metadata and returns these snake_case fields:
source_name, source_type, source_relative_path, imported_at,
source_modified_at, source_created_at, source_recorded_at, source_timezone,
source_timezone_basis. Modified/created numeric values are JavaScript epoch
milliseconds; recorded numeric values are legacy Unix seconds. All timestamps
are normalized ISO UTC. IANA timezone names are validated with ZoneInfo; an
absent zone explicitly uses UTC. Relative paths are syntax-checked, never
resolved: the filesystem importer must separately reject actual symlinks.

``extract_metadata(job, result)`` accepts ``job.sourceMetadata`` containing that
mapping, or existing camelCase job fields. It returns the flattened source
fields plus title, subject, description, file_number, note_date,
note_date_basis, note_date_timezone, date_candidates, metadata_uncertainties,
and provenance. Title preserves a usable source filename stem; otherwise it
is the chosen date. The model title becomes subject, never a replacement name.

Date precedence: an explicit summary date in the original transcription;
filename date; recorded timestamp; created timestamp; modified timestamp;
import timestamp. Complete ISO, day/month/year and French/English month dates
are recognized deterministically. Partial/relative dates never acquire an
invented year. Model-proposed dates and the corrected model text are not date
evidence. Contradictory explicit dates remain visible as candidates/uncertainty.
Timestamp calendar days are calculated in the declared source timezone; named
dates and filename dates remain calendar dates without an invented timezone.
"""
import math
import re
import unicodedata
from datetime import date, datetime, timezone
from pathlib import PurePosixPath
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


MAX_NAME = 500
MAX_PATH = 2000
MAX_TRANSCRIPTION = 160000
MONTHS = {
    1: ('janvier', 'janv', 'january', 'jan'),
    2: ('février', 'fevrier', 'févr', 'fevr', 'february', 'feb'),
    3: ('mars', 'march', 'mar'),
    4: ('avril', 'avr', 'april', 'apr'),
    5: ('mai', 'may'),
    6: ('juin', 'june', 'jun'),
    7: ('juillet', 'juil', 'july', 'jul'),
    8: ('août', 'aout', 'august', 'aug'),
    9: ('septembre', 'sept', 'september', 'sep'),
    10: ('octobre', 'october', 'oct'),
    11: ('novembre', 'november', 'nov'),
    12: ('décembre', 'decembre', 'déc', 'dec', 'december'),
}
MONTH_PATTERN = '(?:' + '|'.join(re.escape(item) for item in sorted(
    (name for names in MONTHS.values() for name in names), key=len, reverse=True)) + ')'
DATE_PATTERNS = (
    ('ymd', re.compile(r'(?<!\d)(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})(?!\d)')),
    ('dmy', re.compile(r'(?<!\d)(\d{1,2})[/.\-_](\d{1,2})[/.\-_](\d{4})(?!\d)')),
    ('named_dmy', re.compile(r'(?<!\w)(\d{1,2})(?:er|st|nd|rd|th)?[\s_.-]+(' + MONTH_PATTERN
                           + r')\.?[\s,_.-]+(\d{4})(?!\d)', re.I)),
    ('named_mdy', re.compile(r'(?<!\w)(' + MONTH_PATTERN
                           + r')\.?[\s_.-]+(\d{1,2})(?:er|st|nd|rd|th)?[\s,_.-]+(\d{4})(?!\d)', re.I)),
)
PARTIAL_PATTERNS = (
    re.compile(r'(?<!\w)\d{1,2}(?:er|st|nd|rd|th)?[\s_.-]+' + MONTH_PATTERN + r'\.?(?!\w)', re.I),
    re.compile(r'(?<!\w)' + MONTH_PATTERN + r'\.?[\s_.-]+\d{1,2}(?:st|nd|rd|th)?(?!\d)', re.I),
    re.compile(r'(?<!\d)\d{1,2}[/.-]\d{1,2}(?!\d)'),
)
SUMMARY_PREFIX = re.compile(r'(?:résumé|resume|summary)(?:\s+(?:daté|date|dated))?'
                            r'(?:\s+(?:du|de|pour|le|of|for|from|on)|\s+d[’\x27])?[\s:;,—-]*$', re.I)
RELATIVE = re.compile(r'\b(?:hier|demain|today|yesterday|tomorrow|aujourd[’\x27]hui)\b', re.I)


def _string(value, label, maximum, optional=False, multiline=False):
    if value is None and optional:
        return None
    forbidden = r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]' if multiline else r'[\x00-\x1f\x7f]'
    if not isinstance(value, str) or len(value) > maximum or re.search(forbidden, value):
        raise ValueError(label + ' invalide ou trop long.')
    if not value.strip() and not optional:
        raise ValueError(label + ' vide.')
    return value


def _declared(data, camel, snake):
    return data.get(camel, data.get(snake))


def _timestamp(value, label, numeric_unit=None, optional=False):
    if value is None or value == '':
        if optional:
            return None
        raise ValueError(label + ' requis.')
    try:
        if isinstance(value, bool):
            raise ValueError()
        if isinstance(value, (int, float)):
            if numeric_unit is None or not math.isfinite(value):
                raise ValueError()
            parsed = datetime.fromtimestamp(value / numeric_unit, timezone.utc)
        elif isinstance(value, str) and len(value) <= 100:
            parsed = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
            if parsed.tzinfo is None or parsed.utcoffset() is None:
                raise ValueError()
        else:
            raise ValueError()
        return parsed.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    except (ValueError, TypeError, OverflowError, OSError):
        raise ValueError(label + ' invalide : date ISO avec fuseau attendue.') from None


def _zone(value):
    if value is None or value == '':
        return 'UTC', 'fallback-utc'
    value = _string(value, 'Fuseau source', 100).strip()
    try:
        return ZoneInfo(value).key, 'provided'
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        raise ValueError('Fuseau source IANA inconnu.') from None


def source_metadata(data, source_name, source_type, imported_at, recorded_at=None):
    """Validate declared metadata without reading paths; see module contract."""
    if not isinstance(data, dict):
        raise ValueError('Métadonnées source invalides.')
    name = _string(source_name, 'Nom source', MAX_NAME, True) or ''
    kind = _string(source_type, 'Type source', 40)
    relative = _declared(data, 'sourceRelativePath', 'source_relative_path')
    if relative in (None, ''):
        relative = None
    else:
        relative = _string(relative, 'Chemin source relatif', MAX_PATH)
        if relative.startswith(('/', '\\')) or re.match(r'^[A-Za-z]:', relative):
            raise ValueError('Le chemin source doit être relatif.')
        relative = relative.replace('\\', '/')
        parts = relative.split('/')
        if any(not part or part in ('.', '..') or ':' in part for part in parts):
            raise ValueError('Chemin source relatif invalide ; aucune traversée de dossier permise.')
        if name and parts[-1] != name:
            raise ValueError('Le nom source doit correspondre au nom final du chemin relatif.')
        if not name:
            name = parts[-1]
    if data.get('sourceIsSymlink') is True or data.get('source_is_symlink') is True:
        raise ValueError('Une source déclarée comme lien symbolique est refusée.')
    zone, zone_basis = _zone(_declared(data, 'sourceTimeZone', 'source_timezone'))
    # Preserve an already validated explicit UTC fallback when extracting a job.
    if data.get('source_timezone_basis') == 'fallback-utc' and zone == 'UTC':
        zone_basis = 'fallback-utc'
    recorded = recorded_at if recorded_at is not None else _declared(data, 'sourceRecordedAt', 'source_recorded_at')
    return {
        'source_name': name, 'source_type': kind, 'source_relative_path': relative,
        'imported_at': _timestamp(imported_at, 'Date d’import'),
        'source_modified_at': _timestamp(_declared(data, 'sourceModifiedAt', 'source_modified_at'),
                                         'Date de modification source', 1000, True),
        'source_created_at': _timestamp(_declared(data, 'sourceCreatedAt', 'source_created_at'),
                                        'Date de création source', 1000, True),
        'source_recorded_at': _timestamp(recorded, 'Date du vocal source', 1, True),
        'source_timezone': zone, 'source_timezone_basis': zone_basis,
    }


def _ascii(value):
    return ''.join(char for char in unicodedata.normalize('NFKD', value.casefold())
                   if not unicodedata.combining(char))


MONTH_NUMBERS = {_ascii(name): number for number, names in MONTHS.items() for name in names}


def _summary(text, start):
    return bool(SUMMARY_PREFIX.search(text[max(0, start - 100):start]))


def _dates(text, origin):
    candidates, occupied, warnings = [], [], []
    matches = sorted(((match.start(), match.end(), kind, match) for kind, pattern in DATE_PATTERNS
                      for match in pattern.finditer(text)), key=lambda item: (item[0], -(item[1] - item[0])))
    for start, end, kind, match in matches:
        if any(start < other_end and end > other_start for other_start, other_end in occupied):
            continue
        occupied.append((start, end))
        basis = 'summary' if origin == 'transcription' and _summary(text, start) else origin
        try:
            first, second, third = match.groups()
            if kind == 'ymd':
                parsed = date(int(first), int(second), int(third))
            elif kind == 'dmy':
                parsed = date(int(third), int(second), int(first))
            elif kind == 'named_dmy':
                parsed = date(int(third), MONTH_NUMBERS[_ascii(second)], int(first))
            else:
                parsed = date(int(third), MONTH_NUMBERS[_ascii(first)], int(second))
        except (ValueError, KeyError):
            warnings.append('Date invalide conservée dans ' + origin + ' : « ' + match.group() + ' ».')
            continue
        candidates.append({'date': parsed.isoformat(), 'basis': basis, 'raw': match.group(), 'timezone': None})
    partial = sorted((match for pattern in PARTIAL_PATTERNS for match in pattern.finditer(text)),
                     key=lambda match: match.start())
    for match in partial:
        if any(match.start() < end and match.end() > start for start, end in occupied):
            continue
        occupied.append((match.start(), match.end()))
        warnings.append('Date partielle conservée sans année déduite dans ' + origin + ' : « ' + match.group() + ' ».')
    for match in RELATIVE.finditer(text):
        if origin == 'filename' or _summary(text, match.start()):
            warnings.append('Date relative conservée sans interprétation dans ' + origin + ' : « ' + match.group() + ' ».')
    return candidates, occupied, warnings


def _filename(name, kind):
    if not name or _ascii(name.strip()) in ('dictee collee', 'dictee importee', 'sans nom', 'untitled'):
        return None
    if re.match(r'^(?:Fluid\s*Voice|YouTube)\s*·\s*[^.]+$', name, re.I):
        return None
    basename = PurePosixPath(name.replace('\\', '/')).name
    # A supplied source filename is preserved; extension removal affects title only.
    known_suffixes = {'.mp3', '.wav', '.m4a', '.ogg', '.mp4', '.mov', '.aac', '.flac',
                      '.opus', '.webm', '.aiff', '.aif', '.wma', '.txt', '.md'}
    suffix = PurePosixPath(basename).suffix
    stem = PurePosixPath(basename).stem if suffix.casefold() in known_suffixes else basename
    return stem if stem and stem not in ('.', '..') else None


def _file_number(stem, occupied):
    if not stem:
        return None, []
    found = []
    patterns = (
        (True, re.compile(r'(?:^|[\s_.-])(?:n[°o]|no\.?|numéro|numero|fichier|file|note|audio|vocal|recording)'
                          r'[\s_.:-]*(\d{1,8})(?!\d)', re.I)),
        (False, re.compile(r'^\s*(\d{1,8})(?=$|[\s_.-])')),
        (False, re.compile(r'(?:^|[\s_.-])(\d{1,8})\s*$')),
    )
    for explicit, pattern in patterns:
        for match in pattern.finditer(stem):
            start, end = match.span(1)
            value = match.group(1)
            if (any(start < other_end and end > other_start for other_start, other_end in occupied)
                    or (not explicit and len(value) == 4 and 1600 <= int(value) <= 2999)):
                continue
            found.append((start, value))
    values = list(dict.fromkeys(value for _, value in sorted(found)))
    # Conflicting numbers do not justify guessing one; the full name survives.
    return (values[0] if len(values) == 1 else None), []


def extract_metadata(job, result):
    """Derive source-first header fields and observed date provenance only."""
    if not isinstance(job, dict) or not isinstance(result, dict):
        raise ValueError('Traitement ou résultat invalide.')
    declared = job.get('sourceMetadata', job.get('source_metadata', job))
    if not isinstance(declared, dict):
        raise ValueError('Métadonnées source invalides.')
    recorded = declared.get('source_recorded_at')
    if recorded is None:
        recorded = job.get('sourceRecordedAt')
    source = source_metadata(declared, declared.get('source_name', job.get('sourceName', '')),
                             declared.get('source_type', job.get('sourceType', 'text')),
                             declared.get('imported_at', job.get('createdAt')),
                             recorded)
    original = job.get('original', '')
    if not isinstance(original, str) or len(original) > MAX_TRANSCRIPTION or '\x00' in original:
        raise ValueError('Transcription originale invalide ou trop longue.')
    stem = _filename(source['source_name'], source['source_type'])
    filename_dates, spans, warnings = _dates(stem or '', 'filename')
    transcript_dates, _, transcript_warnings = _dates(original, 'transcription')
    warnings += transcript_warnings
    file_number, number_warnings = _file_number(stem, spans)
    warnings += number_warnings
    candidates = transcript_dates + filename_dates
    zone = ZoneInfo(source['source_timezone'])
    for field in ('source_recorded_at', 'source_created_at', 'source_modified_at', 'imported_at'):
        if source[field] is not None:
            local = datetime.fromisoformat(source[field].replace('Z', '+00:00')).astimezone(zone)
            candidates.append({'date': local.date().isoformat(), 'basis': field,
                               'raw': source[field], 'timezone': source['source_timezone']})
    chosen = next(item for basis in ('summary', 'filename', 'source_recorded_at', 'source_created_at',
                                     'source_modified_at', 'imported_at')
                  for item in candidates if item['basis'] == basis)
    explicit = [item for item in candidates if item['basis'] in ('summary', 'filename')]
    if len({item['date'] for item in explicit}) > 1:
        detail = '; '.join(item['basis'] + ' « ' + item['raw'] + ' » = ' + item['date'] for item in explicit)
        warnings.append('Dates explicites contradictoires : ' + detail + '. Priorité appliquée : ' + chosen['basis'] + '.')
    subject = _string(result.get('title'), 'Sujet', 500, True)
    description = _string(result.get('description'), 'Description', 4000, True, True)
    provenance = {key: source[key] for key in source}
    provenance.update(note_date_basis=chosen['basis'], note_date_raw=chosen['raw'],
                      note_date_timezone=chosen['timezone'])
    return {**source, 'title': stem or chosen['date'], 'subject': subject, 'description': description,
            'file_number': file_number, 'note_date': chosen['date'], 'note_date_basis': chosen['basis'],
            'note_date_timezone': chosen['timezone'], 'date_candidates': candidates,
            'metadata_uncertainties': list(dict.fromkeys(warnings)), 'provenance': provenance}
