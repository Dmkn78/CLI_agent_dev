"""Portable course documents: one offline HTML file, or an archive with originals."""
from __future__ import annotations

import base64
import copy
import hashlib
import io
import json
import re
import zipfile
from html import escape
from pathlib import Path

from .storage import Library, validate_id


APP_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_ROOT = APP_ROOT / "templates"
ASSET_MIME_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".pdf": "application/pdf",
    ".txt": "text/plain;charset=utf-8", ".md": "text/plain;charset=utf-8",
}
DOCUMENT_POLICY = (
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
    "img-src data:; frame-src blob:; connect-src 'none'; font-src 'none'; "
    "object-src 'none'; form-action 'none'; base-uri 'none'"
)


def render_course_html(course: dict, *, source_documents: list[dict] | None = None,
                       learning: dict | None = None) -> str:
    """Render an offline reader without a server, imports, or external assets.

    source_documents accepts source metadata plus optional imageData/originalData
    data URLs. render_library_course_html supplies these from the local library.
    The generated course text is always escaped; only the isolated lab executes
    author-supplied HTML. This does not assess the scientific content of that lab.
    """
    chapters = course.get("chapters", [])
    if not isinstance(chapters, list) or not chapters:
        raise ValueError("Crée d’abord le parcours avant de l’exporter.")
    sources = copy.deepcopy(source_documents if source_documents is not None else course.get("sources", []))
    for source in sources:
        source["originalData"] = _allowed_data_url(source.get("originalData"), set(ASSET_MIME_TYPES.values()))
        for page in source.get("pages", []):
            page["imageData"] = _allowed_data_url(page.get("imageData"), {"image/png", "image/jpeg", "image/webp"})
    payload = {"id": course.get("id", "document"), "chapters": chapters,
               "sources": sources, "learning": learning or {}}
    title = _text(course.get("title", "Cours interactif"))
    subtitle = _text(course.get("subtitle", ""))
    options = "".join(f'<option value="{index}">{index + 1:02d} · {_text(chapter.get("title", "Section"))}</option>'
                      for index, chapter in enumerate(chapters))
    sections = "".join(_render_chapter(chapter, index, sources) for index, chapter in enumerate(chapters))
    warnings = "".join(f"<li>{_text(warning)}</li>" for warning in course.get("warnings", []))
    warning_panel = f'<details class="course-limits"><summary>Limites du parcours</summary><ul>{warnings}</ul></details>' if warnings else ""
    stylesheet = (TEMPLATE_ROOT / "export.css").read_text(encoding="utf-8")
    runtime = _bundle_reader()
    # Script data is not executable; escaping every '<' also blocks </script>.
    serialized = json.dumps(payload, ensure_ascii=False, allow_nan=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    document = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{escape(DOCUMENT_POLICY, quote=True)}">
<meta name="referrer" content="no-referrer"><title>{title} · Prisme</title>
<style>{stylesheet}</style></head><body>
<header class="reader-header"><a class="brand" href="#chapter-1" aria-label="Début du cours">◈ <span>prisme</span></a>
<div class="document-title"><strong>{title}</strong><span>Document interactif · disponible hors ligne</span></div>
<label class="chapter-picker"><span class="sr-only">Chapitre</span><select id="chapter-picker" aria-label="Chapitre">{options}</select></label></header>
<main class="reader"><aside class="lab-shell" aria-label="Expérience du chapitre"><div id="lab"></div></aside>
<div class="course-scroll" id="course-scroll" tabindex="0" aria-label="Cours, défilement continu">
<div class="course-intro"><span class="eyebrow">COMPRENDRE EN MANIPULANT</span><h1>{title}</h1><p>{subtitle}</p>
<p class="reading-guide">Fais défiler le cours. L’expérience reste en place et change au passage à une nouvelle section.</p>{warning_panel}</div>
{sections}<footer class="course-footer">Parcours exporté avec Prisme. Les réponses et expériences générées restent à vérifier avec les sources.
<button id="download-notes" class="text-button" type="button">Télécharger mes notes</button></footer></div></main>
<dialog id="source-dialog" aria-labelledby="source-title"><div class="source-toolbar"><h2 id="source-title">Source</h2><button id="close-source" aria-label="Fermer la source">Fermer</button></div><div id="source-content"></div></dialog>
<noscript><div class="noscript">Active JavaScript pour manipuler les expériences. Le cours et les démonstrations restent lisibles ci-dessous.</div></noscript>
<script type="application/json" id="course-data">{serialized}</script><script>{runtime}</script>
</body></html>'''
    return document


def render_library_course_html(library: Library, course_id: str) -> str:
    """Render a complete HTML document with source page images and originals."""
    course = library.course(course_id)
    sources, _ = _collect_sources(library, course)
    learning = library.read(f"learning/{course_id}.json", {})
    return render_course_html(course, source_documents=sources, learning=learning)


def build_course_zip(library: Library, course_id: str) -> bytes:
    """Archive the offline reader, course, learning records, and referenced files."""
    course = library.course(course_id)
    sources, attachments = _collect_sources(library, course)
    learning = library.read(f"learning/{course_id}.json", {})
    html_document = render_course_html(course, source_documents=sources, learning=learning)
    exported_course = copy.deepcopy(course)
    for source in exported_course.get("sources", []):
        if source.get("file"):
            source["file"] = _archive_name(library, course_id, source["id"], source["file"])
        for page in source.get("pages", []):
            if page.get("image"):
                page["image"] = _archive_name(library, course_id, source["id"], page["image"])
    manifest = {"format": "prisme-portable-v1", "entrypoint": "index.html", "courseId": course_id,
                "files": [{"path": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
                          for name, content in attachments.items()]}
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("index.html", html_document.encode("utf-8"))
        archive.writestr("course.json", _json_bytes(exported_course))
        archive.writestr("learning.json", _json_bytes(learning))
        archive.writestr("manifest.json", _json_bytes(manifest))
        archive.writestr("LISEZ-MOI.txt", _archive_instructions(course))
        for name, content in attachments.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def _text(content: object) -> str:
    return escape(str(content if content is not None else ""), quote=True)


def _render_chapter(chapter: dict, index: int, sources: list[dict]) -> str:
    def paragraph(key: str, heading: str = "") -> str:
        content = chapter.get(key, "")
        if not content:
            return ""
        heading_html = f"<h3>{heading}</h3>" if heading else ""
        return f'<div class="lesson-block">{heading_html}<p>{_text(content)}</p></div>'

    variables = "".join(f'<div><dt>{_text(variable.get("symbol"))}</dt><dd>{_text(variable.get("meaning"))}</dd></div>'
                        for variable in chapter.get("variables", []))
    proof = "".join(f'<div class="proof-step"><h4>{_text(step.get("title"))}</h4><p>{_text(step.get("body"))}</p></div>'
                    for step in chapter.get("proof", []))
    references = []
    for reference in chapter.get("sourceRefs", []):
        source_index = next((position for position, source in enumerate(sources) if source.get("id") == reference.get("sourceId")), None)
        page_number = reference.get("page")
        if source_index is None or type(page_number) is not int or not any(page.get("number") == page_number for page in sources[source_index].get("pages", [])):
            references.append('<span class="source-missing">Référence source indisponible</span>')
        else:
            references.append(f'<button class="source-link" type="button" data-source="{source_index}" data-page="{page_number}">{_text(sources[source_index].get("name", "Source"))} · p. {page_number}</button>')
    source_links = "".join(references) or '<span class="source-missing">Aucune page source associée à cette section.</span>'
    exercise = chapter.get("exercise", {})
    questions = "".join(f"<li>{_text(question)}</li>" for question in chapter.get("questions", []))
    return f'''<section class="chapter" id="chapter-{index + 1}" data-chapter="{index}" aria-labelledby="chapter-title-{index}">
<span class="eyebrow">{_text(chapter.get("kicker", f"SECTION {index + 1:02d}"))}</span>
<h2 id="chapter-title-{index}">{_text(chapter.get("title", "Section"))}</h2>
<div class="source-links">{source_links}</div>{paragraph("intro")}
<div class="intuition"><span>LE POINT DE DÉPART</span><p>{_text(chapter.get("intuition"))}</p></div>
<details><summary>Les prérequis</summary><p>{_text(chapter.get("prerequisites"))}</p></details>
<div class="formula">{_text(chapter.get("formula"))}</div><dl class="variables">{variables}</dl>
<details class="proof"><summary>Reconstituer la démonstration <span>Déplier</span></summary>{proof or '<p>Aucune démonstration renseignée.</p>'}</details>
{paragraph("pitfall", "Ce qui peut nous tromper")}{paragraph("application", "Une application utile")}
<div class="exercise"><span class="eyebrow">À RECONSTRUIRE</span><h3>{_text(exercise.get("question"))}</h3>
<textarea data-note="{index}" aria-label="Ma réponse — {_text(chapter.get('title', 'Section'))}" rows="4" placeholder="Explique avec tes mots, puis compare avec la correction…"></textarea>
<span class="note-status" data-note-status="{index}" aria-live="polite">Notes conservées localement si le navigateur l’autorise.</span>
<details><summary>Un indice</summary><p>{_text(exercise.get("hint"))}</p></details>
<details><summary>Voir la correction</summary><p>{_text(exercise.get("solution"))}</p></details></div>
{f'<details><summary>Pour aller plus loin</summary><ul>{questions}</ul></details>' if questions else ''}
</section>'''


def _bundle_reader() -> str:
    # These three checked-in modules have no dependency beyond one another and
    # browser APIs. Bundle their native source instead of maintaining a second lab.
    modules = []
    for filename in ("math.js", "icons.js", "lab.js"):
        source = (APP_ROOT / "web" / filename).read_text(encoding="utf-8-sig")
        source = re.sub(r"^import\s+[^\n]+\s+from\s+['\"]\./(?:math|icons)\.js['\"];?\s*$", "", source, flags=re.MULTILINE)
        source = re.sub(r"^export (?=(?:function|class|const)\b)", "", source, flags=re.MULTILINE)
        if re.search(r"^\s*(?:import|export)\s", source, flags=re.MULTILINE):
            raise ValueError(f"Le module {filename} nécessite une mise à jour de l’export autonome.")
        modules.append(source)
    modules.append((TEMPLATE_ROOT / "export.js").read_text(encoding="utf-8"))
    bundled = "(() => {\n'use strict';\n" + "\n".join(modules) + "\n})();"
    # Preserve JS literals while preventing accidental HTML script termination.
    return re.sub(r"</script", r"<\/script", bundled, flags=re.IGNORECASE)


def _collect_sources(library: Library, course: dict) -> tuple[list[dict], dict[str, bytes]]:
    course_id = course["id"]
    validate_id(course_id)
    sources = copy.deepcopy(course.get("sources", []))
    attachments: dict[str, bytes] = {}
    for source in sources:
        validate_id(source["id"])
        if source.get("file"):
            name = _archive_name(library, course_id, source["id"], source["file"])
            content = library.path(source["file"]).read_bytes()
            attachments[name] = content
            source["originalData"] = _data_url(Path(name).suffix.lower(), content)
        for page in source.get("pages", []):
            if page.get("image"):
                name = _archive_name(library, course_id, source["id"], page["image"])
                if Path(name).suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                    raise ValueError("Une page source doit être une image PNG, JPEG ou WebP.")
                content = library.path(page["image"]).read_bytes()
                attachments[name] = content
                page["imageData"] = _data_url(Path(name).suffix.lower(), content)
    return sources, attachments


def _archive_name(library: Library, course_id: str, source_id: str, relative: str) -> str:
    validate_id(course_id)
    validate_id(source_id)
    # Keep the expected logical directory here. Resolving both sides would make
    # a source directory symlink into another course appear to be legitimate.
    source_root = library.root / "courses" / course_id / "sources" / source_id
    target = library.path(relative)
    if not target.is_relative_to(source_root) or not target.is_file() or target.suffix.lower() not in ASSET_MIME_TYPES:
        raise ValueError("Une source exportée doit appartenir à ce cours.")
    return "sources/" + source_id + "/" + target.relative_to(source_root).as_posix()


def _data_url(extension: str, content: bytes) -> str:
    return f"data:{ASSET_MIME_TYPES[extension]};base64," + base64.b64encode(content).decode("ascii")


def _allowed_data_url(candidate: object, mime_types: set[str]) -> str | None:
    if isinstance(candidate, str) and any(candidate.startswith(f"data:{mime_type};base64,") for mime_type in mime_types):
        return candidate
    return None


def _json_bytes(document: object) -> bytes:
    return json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False).encode("utf-8")


def _archive_instructions(course: dict) -> str:
    warnings = "\n".join("- " + str(warning) for warning in course.get("warnings", []))
    return (
        "PRISME — COURS PORTABLE\n\n"
        "Extrais cette archive puis ouvre index.html dans un navigateur récent.\n"
        "Tu peux aussi déplacer index.html seul : les expériences et les pages sources sont embarquées.\n"
        "Aucun serveur, compte, CDN ou connexion réseau n’est nécessaire pour cette lecture.\n\n"
        "CONTENU\n"
        "index.html : cours continu à droite, laboratoire synchronisé à gauche.\n"
        "course.json : contenu structuré ; les chemins pointent vers sources/.\n"
        "sources/ : originaux et images des pages, sans transformation à l’export.\n"
        "learning.json : réponses et notes enregistrées dans Prisme au moment de l’export.\n"
        "manifest.json : empreintes SHA-256 des fichiers sources.\n\n"
        "LIMITES\n"
        "Les contenus générés et leurs expériences ne constituent pas une validation scientifique.\n"
        "Les expériences personnalisées s’exécutent dans une iframe isolée, sans réseau.\n"
        "Les dépendances réseau d’une expérience ne fonctionneront pas hors ligne.\n"
        "L’export ne lance aucune création Codex. Il conserve le parcours déjà généré.\n"
        "Les notes locales dépendent du navigateur ; le bouton Télécharger mes notes permet de les garder.\n"
        "Les modifications faites dans ce document ne sont pas réimportées automatiquement dans Prisme.\n"
        + ("\nLIMITES SIGNALÉES DANS LE COURS\n" + warnings + "\n" if warnings else "")
    )
