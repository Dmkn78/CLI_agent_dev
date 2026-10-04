"""Stable, flat Obsidian properties and a source-first note, without audit logs."""
import hashlib
import re

from .brain_metadata import extract_metadata


CONTENT_TYPES = ('reflection', 'dialogue', 'story', 'self-advice', 'idea',
                 'summary', 'daily-summary', 'meeting', 'task', 'other')
NOTE_VERSION = 3
PROPOSAL_MARKER = '<!-- my-brain:unreviewed-proposal:'
DATE_BASES = {'summary': 'summary', 'filename': 'filename',
              'source_recorded_at': 'recorded', 'source_created_at': 'created',
              'source_modified_at': 'modified', 'imported_at': 'imported'}


def scalar(value):
    """Emit only strings/null: single quotes preserve YAML types and punctuation."""
    if value is None:
        return 'null'
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]', '', str(value))
    value = ' '.join(value.split())
    return "'" + value.replace("'", "''") + "'"


def content_types(result):
    # Old stored jobs are readable without asking a model to classify them again.
    values = result.get('content_types')
    if values is None:
        old = result.get('content_type')
        values = [old] if old in CONTENT_TYPES else []
    return [value for value in CONTENT_TYPES if value in values]


def literal_text(value):
    fence = '`' * max(3, 1 + max((len(run) for run in re.findall(r'`+', value)), default=0))
    return fence + 'text\n' + value + '\n' + fence


def note_properties(job, result):
    metadata = job.get('noteMetadata') or extract_metadata(job, result)
    related = [item['path'] for item in job.get('contextSources', [])
               if not re.search(r'[\[\]\r\n]', item['path'])]
    return {
        'schema_version': NOTE_VERSION,
        'title': metadata['title'],
        'date': metadata['note_date'],
        'date_basis': DATE_BASES.get(metadata['note_date_basis'], 'imported'),
        'source': (job.get('sourceUrl') or metadata.get('source_relative_path')
                   or job.get('sourceApplication') or job['sourceName']),
        'file_number': metadata.get('file_number'),
        'subject': result['title'],
        'description': result.get('description', ''),
        'content_types': content_types(result),
        'topics': result.get('topics', []),
        'entities': result.get('entities', []),
        'tags': [tag for tag in result.get('tags', []) if not re.fullmatch(r'\d+', tag)],
        'related_notes': list(dict.fromkeys('[[' + path.removesuffix('.md') + ']]' for path in related)),
        'language': result.get('language', ''),
    }


def render_note(job, result):
    properties = note_properties(job, result)
    lines = []
    for key, value in properties.items():
        if key == 'schema_version':
            lines.append(key + ': ' + str(NOTE_VERSION))
        elif key == 'date':
            lines.append(key + ': ' + value)  # ISO calendar date for Obsidian.
        elif isinstance(value, list):
            lines.append(key + ':' + (' []' if not value else ''))
            lines.extend('  - ' + scalar(item) for item in value)
        else:
            lines.append(key + ': ' + scalar(value))
    original = job['original']
    token = hashlib.sha256((original + '\x00' + result['text']).encode('utf-8')).hexdigest()[:24]
    while token in original or token in result['text']:
        token = hashlib.sha256(token.encode()).hexdigest()[:24]
    title = ' '.join(properties['title'].split())
    document = '---\n' + '\n'.join(lines) + '\n---\n\n# ' + title + '\n\n'
    document += '<!-- my-brain:original:' + token + ' -->\n'
    document += '## Transcription originale\n\n' + literal_text(original)
    document += '\n\n' + PROPOSAL_MARKER + token + ' -->\n'
    review = job.get('transcriptionReview', {})
    if result['text'] != original:
        document += '\n## Proposition IA — à relire\n\n'
        document += '> Cette proposition ne remplace pas la transcription originale.\n\n'
        document += literal_text(result['text']) + '\n'
    else:
        document += '\nAucune modification du texte proposée.\n'
    warnings = list(dict.fromkeys(review.get('warnings', []) + result.get('uncertainties', [])
                   + (job.get('noteMetadata') or {}).get('metadata_uncertainties', [])))
    if warnings:
        document += '\n## Points à vérifier\n\n'
        document += '\n'.join('- ' + ' '.join(value.split()) for value in warnings) + '\n'
    return document


def retrieval_text(text):
    """Exclude the unreviewed proposal from retrieval of our source-first notes."""
    # Obsidian can reorder properties. Match the paired body markers instead;
    # the generated token occurs in neither text, so a quoted marker is harmless.
    body_start = text.find('\n---\n') + len('\n---\n') if text.startswith('---\n') else 0
    start = re.search(r'(?m)^<!-- my-brain:original:([a-f0-9]{24}) -->\n', text[body_start:])
    if start:
        end_marker = '\n\n' + PROPOSAL_MARKER + start.group(1) + ' -->\n'
        end = text.find(end_marker, body_start + start.end())
        if end >= 0:
            return text[:end]
    return text
