"""Exports preserve the generated course and sources without executing source text."""
from __future__ import annotations

import copy
import io
import json
import tempfile
import unittest
import zipfile
from html.parser import HTMLParser
from pathlib import Path

from prisme.exporter import build_course_zip, render_course_html, render_library_course_html
from prisme.storage import Library


class DocumentReader(HTMLParser):
    def __init__(self, document: str):
        super().__init__()
        self.elements: list[tuple[str, dict]] = []
        self.scripts: list[str] = []
        self.script = None
        self.feed(document)

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        self.elements.append((tag, dict(attributes)))
        if tag == "script":
            self.script = ""

    def handle_data(self, content: str) -> None:
        if self.script is not None:
            self.script += content

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.script is not None:
            self.scripts.append(self.script)
            self.script = None


def generated_course() -> dict:
    return {
        "id": "course-export", "title": "Un concept quelconque", "subtitle": "Mes documents, mes expériences.",
        "status": "ready", "origin": "import", "warnings": ["Hypothèse à vérifier."], "sources": [],
        "chapters": [{
            "id": "section-one", "title": "Une relation à explorer", "kicker": "SECTION 01",
            "intro": "Modifier un paramètre pour comparer deux cas.", "intuition": "Observer une relation.",
            "prerequisites": "Les définitions du chapitre.", "formula": "a + b = c",
            "variables": [{"symbol": "a", "meaning": "Un paramètre."}],
            "proof": [{"title": "Étape complète", "body": "La preuve est conservée."}],
            "prediction": {"question": "Quel changement ?", "choices": ["A", "B"], "answer": 0, "explanation": "Observer A."},
            "exercise": {"question": "Reconstruire.", "hint": "Un indice.", "solution": "La correction."},
            "pitfall": "Ne pas confondre les hypothèses.", "application": "Une application motivée.", "questions": ["Pourquoi ?"],
            "lab": {"kind": "custom", "title": "Le concept du document", "description": "Manipule le cours importé.",
                    "html": "<input type=range><p id=output></p><script>document.querySelector('input').oninput=e=>document.querySelector('#output').textContent=e.target.value;</script>"},
            "sourceRefs": [],
        }],
    }


class ExporterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.library = Library(Path(self.directory.name))
        self.course = generated_course()

    def add_source(self) -> None:
        original = "courses/course-export/sources/source-a/original.txt"
        target = self.library.path(original)
        target.parent.mkdir(parents=True)
        target.write_text("La source exacte, avec <script>texte non exécuté</script>.", encoding="utf-8")
        self.course["sources"] = [{"id": "source-a", "name": "Mon cours.txt", "file": original,
                                   "pages": [{"number": 1, "kind": "text", "text": "Une page de cours.", "image": None}]}]
        self.course["chapters"][0]["sourceRefs"] = [{"sourceId": "source-a", "page": 1}]

    def test_html_is_offline_and_keeps_generic_experience_and_sections(self) -> None:
        second = copy.deepcopy(self.course["chapters"][0])
        second["id"] = "section-two"
        second["title"] = "Un autre concept"
        self.course["chapters"].append(second)
        document = render_course_html(self.course)
        reader = DocumentReader(document)
        sections = [attributes for tag, attributes in reader.elements if tag == "section"]
        self.assertEqual([section["id"] for section in sections], ["chapter-1", "chapter-2"])
        self.assertEqual(len(reader.scripts), 2)
        payload = json.loads(reader.scripts[0])
        self.assertEqual(payload["chapters"][0]["lab"]["html"], self.course["chapters"][0]["lab"]["html"])
        self.assertNotIn('type="module"', document)
        self.assertNotRegex(reader.scripts[1], r"(?m)^\s*(?:import|export)\s")
        self.assertIn("if (index === activeChapterIndex", reader.scripts[1])
        self.assertIn("La preuve est conservée.", document)
        self.assertIn("Reconstituer la démonstration", document)
        self.assertIn("Voir la correction", document)
        self.assertIn('sandbox="allow-scripts"', reader.scripts[1])
        policy = next(attributes["content"] for tag, attributes in reader.elements if tag == "meta" and attributes.get("http-equiv") == "Content-Security-Policy")
        self.assertIn("frame-src blob:", policy)
        self.assertIn("connect-src 'none'", policy)
        self.assertNotIn("allow-same-origin", reader.scripts[1])

    def test_course_text_cannot_escape_markup_or_script_data(self) -> None:
        attack = '</script><img src="https://example.invalid/leak" onerror="alert(1)">'
        self.course["title"] = attack
        self.course["chapters"][0]["intro"] = attack
        self.course["chapters"][0]["lab"]["html"] = attack
        document = render_course_html(self.course)
        reader = DocumentReader(document)
        self.assertFalse(any(tag == "img" for tag, _ in reader.elements))
        self.assertEqual(len(reader.scripts), 2)
        self.assertEqual(json.loads(reader.scripts[0])["chapters"][0]["intro"], attack)
        self.assertNotIn(attack, document)
        self.assertIn("&lt;/script&gt;&lt;img", document)

    def test_sources_are_linked_by_known_page_and_bad_urls_are_removed(self) -> None:
        self.add_source()
        self.course["sources"][0]["pages"][0]["imageData"] = "https://example.invalid/remote.png"
        self.course["sources"][0]["originalData"] = "javascript:alert(1)"
        self.course["chapters"][0]["sourceRefs"].append({"sourceId": "unknown", "page": 99})
        document = render_course_html(self.course)
        reader = DocumentReader(document)
        references = [attributes for tag, attributes in reader.elements if tag == "button" and "data-source" in attributes]
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0]["data-page"], "1")
        self.assertIn("Référence source indisponible", document)
        source = json.loads(reader.scripts[0])["sources"][0]
        self.assertIsNone(source["originalData"])
        self.assertIsNone(source["pages"][0]["imageData"])

    def test_zip_contains_self_contained_reader_originals_and_rewritten_paths(self) -> None:
        self.add_source()
        self.library.save_course(self.course)
        self.library.write("learning/course-export.json", {"section-one": {"notes": "Ma réponse."}})
        private = self.library.path("courses/course-export/evidence/private.json")
        private.parent.mkdir(parents=True)
        private.write_text("private", encoding="utf-8")
        with zipfile.ZipFile(io.BytesIO(build_course_zip(self.library, "course-export"))) as archive:
            self.assertEqual(set(archive.namelist()), {"index.html", "course.json", "learning.json", "manifest.json", "LISEZ-MOI.txt", "sources/source-a/original.txt"})
            exported = json.loads(archive.read("course.json"))
            self.assertEqual(exported["sources"][0]["file"], "sources/source-a/original.txt")
            self.assertEqual(archive.read("sources/source-a/original.txt"), self.library.path(self.course["sources"][0]["file"]).read_bytes())
            reader = DocumentReader(archive.read("index.html").decode("utf-8"))
            payload = json.loads(reader.scripts[0])
            self.assertTrue(payload["sources"][0]["originalData"].startswith("data:text/plain;charset=utf-8;base64,"))
            self.assertEqual(payload["learning"]["section-one"]["notes"], "Ma réponse.")
            self.assertIn("Hypothèse à vérifier.", archive.read("LISEZ-MOI.txt").decode("utf-8"))
            self.assertEqual(len(json.loads(archive.read("manifest.json"))["files"]), 1)
        self.assertEqual(self.library.course("course-export")["sources"][0]["file"], self.course["sources"][0]["file"])

    def test_image_pages_are_embedded_without_runtime_file_requests(self) -> None:
        self.add_source()
        image_path = "courses/course-export/sources/source-a/page-0001.png"
        self.library.path(image_path).write_bytes(b"\x89PNG\r\n\x1a\nimage fixture")
        self.course["sources"][0]["pages"][0]["image"] = image_path
        self.library.save_course(self.course)
        document = render_library_course_html(self.library, "course-export")
        payload = json.loads(DocumentReader(document).scripts[0])
        self.assertTrue(payload["sources"][0]["pages"][0]["imageData"].startswith("data:image/png;base64,"))

    def test_export_cannot_read_sources_from_another_course(self) -> None:
        self.add_source()
        private_source = self.library.path("courses/other/sources/source-a/original.txt")
        private_source.parent.mkdir(parents=True)
        private_source.write_text("other private course", encoding="utf-8")
        self.course["sources"][0]["file"] = "courses/other/sources/source-a/original.txt"
        self.library.save_course(self.course)
        with self.assertRaisesRegex(ValueError, "appartenir à ce cours"):
            build_course_zip(self.library, "course-export")

    def test_unfinished_course_has_no_misleading_export(self) -> None:
        self.course["chapters"] = []
        with self.assertRaisesRegex(ValueError, "parcours"):
            render_course_html(self.course)


if __name__ == "__main__":
    unittest.main()
