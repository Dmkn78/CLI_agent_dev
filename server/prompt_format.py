"""Readable Markdown inside explicit XML boundaries for agent instructions."""
import json
import re
from xml.sax.saxutils import escape


def xml_markdown(tag: str, markdown: str) -> str:
    """Tag names are constants owned by the caller; content is always escaped."""
    return '<' + tag + '>\n' + escape(markdown.strip()) + '\n</' + tag + '>'


def fenced_markdown(content: str, language: str = '') -> str:
    longest = max((len(match.group()) for match in re.finditer(r'`+', content)), default=0)
    fence = '`' * max(3, longest + 1)
    return fence + language + '\n' + content + '\n' + fence


def json_markdown(value: object, maximum: int | None = None) -> str:
    content = json.dumps(value, ensure_ascii=False, indent=2)
    if maximum is not None and len(content) > maximum:
        return fenced_markdown(content[:maximum], 'text') + '\n\nExtrait tronqué à ' + str(maximum) + ' caractères.'
    return fenced_markdown(content, 'json')


def duplica_prompt(instructions: str, sections: list[tuple[str, str]]) -> str:
    blocks = [xml_markdown('instructions', '# Consignes\n\n' + instructions)]
    blocks.extend(xml_markdown(tag, markdown) for tag, markdown in sections if markdown.strip())
    return '<duplica_prompt>\n\n' + '\n\n'.join(blocks) + '\n\n</duplica_prompt>'
