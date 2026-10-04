"""Pure, conservative audit of an ASR transcript and a proposed correction.

This compares the two strings, never the model's declared corrections.  It
neither modifies nor approves either text.  ``minimal`` describes a small
lexical edit; it cannot establish that the meaning or recognition is correct.
The caller must retain the original independently of the bounded excerpts.
"""
import difflib
import re
import unicodedata


MAX_CHANGES = 12
MAX_EXCERPT = 400
MAX_DIFF_TOKENS = 2000
_LEXICAL = re.compile(r"[+-]?\d+(?:[.,]\d+)*|[^\W\d_]+(?:['’][^\W\d_]+)*", re.UNICODE)
_SURFACE = re.compile(r'\w+|\s+|[^\w\s]+', re.UNICODE)
_NEGATIONS = frozenset(('ne', 'pas', 'jamais', 'plus', 'aucun', 'aucune', 'ni', 'sans', 'non',
                        'not', 'no', 'never', 'none', 'nothing', 'nobody', 'without',
                        'neither', 'nor', 'cannot'))
_NUMBER_WORDS = {
    'zero': '0', 'un': '1', 'une': '1', 'deux': '2', 'trois': '3', 'quatre': '4',
    'cinq': '5', 'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9', 'dix': '10',
    'onze': '11', 'douze': '12', 'treize': '13', 'quatorze': '14', 'quinze': '15',
    'seize': '16', 'vingt': '20', 'trente': '30', 'quarante': '40', 'cinquante': '50',
    'soixante': '60', 'cent': '100', 'cents': '100', 'mille': '1000', 'million': '1000000',
    'millions': '1000000', 'milliard': '1000000000', 'milliards': '1000000000',
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'seven': '7',
    'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11', 'twelve': '12',
    'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16',
    'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
    'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
    'billion': '1000000000',
}


def _canonical(token):
    return unicodedata.normalize('NFKC', token).casefold().replace('’', "'")


def _opcodes(before, after):
    """Return a real edit script, with linear bounded fallback for long texts.

    SequenceMatcher is quadratic for repetitive inputs.  Above the token cap,
    retain exact matching edges and show the intervening change as one block.
    The fallback is deliberately conservative, not an optimal edit distance.
    """
    if before == after:
        return [('equal', 0, len(before), 0, len(after))], False
    if max(len(before), len(after)) <= MAX_DIFF_TOKENS:
        return difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes(), False
    start = 0
    while start < min(len(before), len(after)) and before[start] == after[start]:
        start += 1
    end_before, end_after = len(before), len(after)
    while end_before > start and end_after > start and before[end_before - 1] == after[end_after - 1]:
        end_before -= 1
        end_after -= 1
    tag = 'replace' if end_before > start and end_after > start else 'delete' if end_before > start else 'insert'
    result = []
    if start:
        result.append(('equal', 0, start, 0, start))
    result.append((tag, start, end_before, start, end_after))
    if end_before < len(before):
        result.append(('equal', end_before, len(before), end_after, len(after)))
    return result, True


def _numbers(tokens):
    result = []
    for token in tokens:
        if re.fullmatch(r'[+-]?\d+(?:[.,]\d+)*', token):
            result.append(token)
        else:
            word = ''.join(char for char in unicodedata.normalize('NFKD', token)
                           if not unicodedata.combining(char))
            if word in _NUMBER_WORDS:
                result.append(_NUMBER_WORDS[word])
    return result


def _negations(tokens):
    return [token if token in _NEGATIONS else "n'" if token.startswith("n'") else "n't"
            for token in tokens
            if token in _NEGATIONS or token.startswith("n'") or token.endswith("n't")]


def review_transcription(original, proposed):
    """Return a stable JSON-compatible audit, without changing either string.

    Counts use case-insensitive lexical tokens, including numeric signs and
    decimals. Replacements count as both deletions and insertions. The ratio
    is (insertions + deletions) / (originalTokens + proposedTokens), in [0, 1].
    Excerpts also show case, punctuation and whitespace edits. Numbers and
    negations are lexical warning markers, not a semantic interpretation.
    """
    if not isinstance(original, str) or not isinstance(proposed, str):
        raise ValueError('Deux transcriptions textuelles sont attendues pour la comparaison.')
    before = [_canonical(match.group()) for match in _LEXICAL.finditer(original)]
    after = [_canonical(match.group()) for match in _LEXICAL.finditer(proposed)]
    lexical, limited = _opcodes(before, after)
    insertions = sum(j2 - j1 for tag, _, _, j1, j2 in lexical if tag != 'equal')
    deletions = sum(i2 - i1 for tag, i1, i2, _, _ in lexical if tag != 'equal')
    denominator = len(before) + len(after)
    ratio = (insertions + deletions) / denominator if denominator else 0.0
    warnings = []
    if limited:
        warnings.append('Comparaison lexicale bornée pour un texte long : les changements regroupés sont à relire.')
    if _numbers(before) != _numbers(after):
        warnings.append('Les marqueurs numériques ont changé ; vérifie les nombres, dates et quantités dans l’original.')
    if _negations(before) != _negations(after):
        warnings.append('Les marqueurs de négation ont changé ; vérifie chaque passage concerné dans l’original.')
    if ratio >= .25:
        warnings.append('La proposition modifie une part importante des mots ; une réécriture est possible.')
    if deletions and deletions / max(len(before), 1) >= .20:
        warnings.append('Une part importante des mots de l’original a été supprimée ou remplacée.')
    if insertions and insertions / max(len(before), 1) >= .20:
        warnings.append('La proposition ajoute ou remplace une part importante des mots de l’original.')
    if original and not proposed:
        warnings.append('La proposition est vide ; conserve la transcription originale.')
    elif proposed and not original:
        warnings.append('Aucune transcription originale ne permet de vérifier la proposition.')

    surface_before = _SURFACE.findall(original)
    surface_after = _SURFACE.findall(proposed)
    surface, _ = _opcodes(surface_before, surface_after)
    passages = [code for code in surface if code[0] != 'equal']
    changes = []
    for tag, i1, i2, j1, j2 in passages[:MAX_CHANGES]:
        old, new = ''.join(surface_before[i1:i2]), ''.join(surface_after[j1:j2])
        changes.append({'type': tag, 'before': old[:MAX_EXCERPT], 'after': new[:MAX_EXCERPT],
                        'beforeTruncated': len(old) > MAX_EXCERPT, 'afterTruncated': len(new) > MAX_EXCERPT})
    changed = original != proposed
    return {
        'schemaVersion': 1,
        'status': 'unchanged' if not changed else 'review-required' if warnings else 'minimal',
        'changed': changed,
        'changedRatio': round(ratio, 6),
        'counts': {'originalTokens': len(before), 'proposedTokens': len(after),
                   'insertions': insertions, 'deletions': deletions,
                   'changedPassages': len(passages), 'shownPassages': len(changes),
                   'omittedPassages': max(0, len(passages) - len(changes))},
        'warnings': warnings,
        'changes': changes,
        'comparisonLimited': limited,
        'meaningVerified': False,
    }
