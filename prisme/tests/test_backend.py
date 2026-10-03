"""Behavior tests for portable ingestion, generation, local HTTP and JSONL RPC."""
from __future__ import annotations

import base64
import copy
import hashlib
import http.client
import io
import json
import queue
import sys
import tempfile
import threading
import time
import unittest
import zipfile
from datetime import datetime
from pathlib import Path

import fitz
from PIL import Image

from fake_codex import FakeCodexFactory, generated_document
from prisme.codex_client import CodexClient, CodexError, discover_models
from prisme.course_contract import parse_response, validate_generated
from prisme.generation import CourseFactory
from prisme.http_server import MAX_REQUEST_BYTES, PrismeServer
from prisme.ingestion import generation_batches, import_sources
from prisme.storage import Library, validate_id

PRODUCT_ROOT = Path(__file__).resolve().parents[1]
FAKE_SERVER = Path(__file__).with_name("fake_codex.py")
TERMINAL_STATUSES = {"completed", "failed", "cancelled", "interrupted"}


def upload(name: str, content: bytes) -> dict:
    return {"name": name, "content": base64.b64encode(content).decode("ascii")}


def image_bytes() -> bytes:
    pixels = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 80, 80), False)
    pixels.clear_with(190)
    return pixels.tobytes("png")


def pdf_bytes(kinds: tuple[str, ...]) -> bytes:
    with fitz.open() as document:
        for kind in kinds:
            page = document.new_page(width=420, height=600)
            if kind in {"text", "mixed", "vector"}:
                page.insert_textbox(fitz.Rect(20, 20, 400, 240),
                    "Chapter source. A complete explanation of the theorem, assumptions and proof. " * 5, fontsize=11)
            if kind in {"vision", "mixed"}:
                page.insert_image(fitz.Rect(40, 270, 360, 580), stream=image_bytes())
            if kind == "vector":
                page.draw_line(fitz.Point(30, 500), fitz.Point(380, 500))
                page.draw_rect(fitz.Rect(100, 290, 250, 430))
        return document.tobytes()


def wait_until(predicate, timeout: float = 8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = predicate()
        if result:
            return result
        time.sleep(0.01)
    raise AssertionError("L'état attendu n'a pas été atteint dans le délai du test.")


class LibraryFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="prisme-test-", dir=PRODUCT_ROOT / "tests")
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)
        self.library = Library(self.work / ".prisme")

    def imported_course(self, text: str = "Mes sources de cours. ", name: str = "cours.txt") -> dict:
        return import_sources(self.library, [upload(name, text.encode("utf-8"))], "Mon cours")


class IngestionTests(LibraryFixture):
    def test_utf8_chunks_preserve_every_character_and_original_hash(self) -> None:
        text = "\ufeff# Chapitre\nÉquations, hypothèses et preuve.\n" + "α × é\n" * 5000
        content = text.encode("utf-8")
        course = import_sources(self.library, [upload("../dossier\\cours.md", content)], "  Mon cours  ")
        source = course["sources"][0]
        self.assertEqual(course["title"], "Mon cours")
        self.assertEqual(source["name"], "cours.md")
        self.assertEqual(self.library.path(source["file"]).read_bytes(), content)
        self.assertEqual(source["sha256"], hashlib.sha256(content).hexdigest())
        self.assertEqual(source["bytes"], len(content))
        self.assertEqual("".join(page["text"] for page in source["pages"]), text.removeprefix("\ufeff"))
        self.assertEqual([page["number"] for page in source["pages"]], list(range(1, course["pageCount"] + 1)))
        self.assertTrue(all(page["kind"] == "text" and page["image"] is None for page in source["pages"]))
        self.assertEqual(course["visionPages"], 0)
        self.assertEqual(self.library.course(course["id"]), course)

    def test_pdf_native_text_scan_and_mixed_page_keep_provenance(self) -> None:
        original = pdf_bytes(("text", "vision", "mixed"))
        course = import_sources(self.library, [upload("chapter.pdf", original)])
        source = course["sources"][0]
        self.assertEqual(course["pageCount"], 3)
        self.assertEqual(course["visionPages"], 2)
        self.assertEqual([page["kind"] for page in source["pages"]], ["text", "vision", "mixed"])
        self.assertEqual([page["number"] for page in source["pages"]], [1, 2, 3])
        self.assertTrue(source["pages"][0]["text"].startswith("Chapter source."))
        self.assertEqual(source["pages"][1]["text"], "")
        self.assertEqual(source["sha256"], hashlib.sha256(original).hexdigest())
        self.assertEqual(self.library.path(source["file"]).read_bytes(), original)
        for page in source["pages"]:
            self.assertTrue(self.library.path(page["image"]).read_bytes().startswith(b"\x89PNG"))
        batch_pages = [page for batch in generation_batches(course) for page in batch]
        self.assertIsNone(batch_pages[0]["image"])
        self.assertIsNotNone(batch_pages[1]["image"])
        self.assertIsNotNone(batch_pages[2]["image"])

    def test_pdf_vector_diagrams_are_also_supplied_to_vision(self) -> None:
        course = import_sources(self.library, [upload("vector.pdf", pdf_bytes(("vector",)))])
        self.assertEqual(course["sources"][0]["pages"][0]["kind"], "mixed")
        self.assertIsNotNone(generation_batches(course)[0][0]["image"])

    def test_image_is_a_vision_page_and_keeps_its_original(self) -> None:
        original = image_bytes()
        course = import_sources(self.library, [upload("photo.png", original)])
        source = course["sources"][0]
        self.assertEqual(course["visionPages"], 1)
        self.assertEqual(source["pages"][0]["kind"], "vision")
        self.assertEqual(source["pages"][0]["text"], "")
        self.assertEqual(self.library.path(source["file"]).read_bytes(), original)

    def test_webp_and_rotated_jpeg_render_portable_normalized_pages(self) -> None:
        for extension, image_format in [("webp", "WEBP"), ("jpg", "JPEG")]:
            with self.subTest(extension=extension):
                original_image = Image.new("RGB", (80, 40), "white")
                encoded = io.BytesIO()
                if image_format == "JPEG":
                    exif = Image.Exif()
                    exif[274] = 6
                    original_image.save(encoded, format=image_format, exif=exif)
                else:
                    original_image.save(encoded, format=image_format)
                content = encoded.getvalue()
                course = import_sources(self.library, [upload(f"photo.{extension}", content)])
                source = course["sources"][0]
                self.assertEqual(self.library.path(source["file"]).read_bytes(), content)
                self.assertEqual(source["sha256"], hashlib.sha256(content).hexdigest())
                with Image.open(self.library.path(source["pages"][0]["image"])) as rendered:
                    self.assertEqual(rendered.format, "PNG")
                    self.assertEqual(rendered.mode, "RGB")
                    self.assertEqual(rendered.size, (40, 80) if image_format == "JPEG" else (80, 40))

    def test_invalid_upload_does_not_publish_a_course(self) -> None:
        cases = [[], [{}], [{"name": "bad.txt", "content": "%%%"}], [upload("bad.exe", b"text")],
                 [upload("empty.txt", b"")], [upload("blank.txt", b" \n")], [upload("bad.pdf", b"not PDF")],
                 [upload("encoding.txt", b"\xff\xfe")]]
        for files in cases:
            with self.subTest(files=[file.get("name") for file in files]):
                with self.assertRaises(ValueError):
                    import_sources(self.library, files)
                self.assertEqual(self.library.courses(), [])

    def test_failed_import_leaves_no_orphan_sources(self) -> None:
        with self.assertRaises(ValueError):
            import_sources(self.library, [upload("valid.txt", b"Valid source."), upload("bad.txt", b"\xff")])
        self.assertEqual(list((self.library.root / "courses").glob("*")), [])

    def test_rejected_dense_pdf_leaves_no_orphan_sources(self) -> None:
        with fitz.open() as document:
            page = document.new_page()
            page.insert_text((20, 20), "x" * 51000, fontsize=0.001)
            dense_pdf = document.tobytes()
        with self.assertRaisesRegex(ValueError, "dense"):
            import_sources(self.library, [upload("dense.pdf", dense_pdf)])
        self.assertEqual(list((self.library.root / "courses").glob("*")), [])

    def test_encrypted_pdf_is_rejected_before_any_original_is_written(self) -> None:
        with fitz.open() as document:
            document.new_page()
            encrypted = document.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner-test", user_pw="user-test")
        with self.assertRaisesRegex(ValueError, "mot de passe"):
            import_sources(self.library, [upload("protected.pdf", encrypted)])
        self.assertEqual(list((self.library.root / "courses").glob("*")), [])

    def test_page_limit_rejects_oversized_pdf(self) -> None:
        with fitz.open() as document:
            for _ in range(101):
                document.new_page()
            oversized = document.tobytes()
        with self.assertRaisesRegex(ValueError, "100 pages"):
            import_sources(self.library, [upload("too-many.pdf", oversized)])

    def test_batches_obey_limits_without_losing_text_or_page_images(self) -> None:
        text = "a" * 45000
        pages = [{"number": 1, "kind": "mixed", "text": text, "image": "dense.png"}]
        pages.extend({"number": number, "kind": "vision", "text": "", "image": f"{number}.png"} for number in range(2, 13))
        course = {"sources": [{"id": "source-one", "name": "dense.pdf", "pages": pages}]}
        batches = generation_batches(course)
        flattened = [page for batch in batches for page in batch]
        self.assertEqual("".join(page["text"] for page in flattened), text)
        self.assertEqual([page["image"] for page in flattened if page["image"]], [page["image"] for page in pages])
        for batch in batches:
            self.assertLessEqual(sum(len(page["text"]) for page in batch), 26000)
            self.assertLessEqual(sum(bool(page["image"]) for page in batch), 8)
            self.assertLessEqual(len(batch), 12)


class ContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pages = [{"sourceId": "source-one", "page": 1}, {"sourceId": "source-two", "page": 3}]
        self.allowed = {("source-one", 1), ("source-two", 3)}
        self.document = generated_document(self.pages)

    def test_exact_course_contract_accepts_complete_references(self) -> None:
        self.assertEqual(validate_generated(copy.deepcopy(self.document), self.allowed), self.document)
        encoded = json.dumps(self.document, ensure_ascii=False)
        self.assertEqual(parse_response(encoded), self.document)
        self.assertEqual(parse_response("```json\n" + encoded + "\n```"), self.document)

    def test_types_unknown_fields_and_structural_errors_are_rejected(self) -> None:
        variants = []
        unknown = copy.deepcopy(self.document)
        unknown["execute"] = "Run an arbitrary command."
        variants.append(unknown)
        missing = copy.deepcopy(self.document)
        del missing["chapters"][0]["proof"]
        variants.append(missing)
        boolean_answer = copy.deepcopy(self.document)
        boolean_answer["chapters"][0]["prediction"]["answer"] = True
        variants.append(boolean_answer)
        invalid_answer = copy.deepcopy(self.document)
        invalid_answer["chapters"][0]["prediction"]["answer"] = 2
        variants.append(invalid_answer)
        empty_html = copy.deepcopy(self.document)
        empty_html["chapters"][0]["lab"]["html"] = "  "
        variants.append(empty_html)
        missing_proof = copy.deepcopy(self.document)
        missing_proof["chapters"][0]["proof"] = []
        variants.append(missing_proof)
        empty_chapters = copy.deepcopy(self.document)
        empty_chapters["chapters"] = []
        variants.append(empty_chapters)
        oversized = copy.deepcopy(self.document)
        oversized["title"] = "x" * 20001
        variants.append(oversized)
        for variant in variants:
            with self.subTest(variant=variants.index(variant)):
                with self.assertRaises(ValueError):
                    validate_generated(variant, self.allowed)

    def test_references_cannot_fabricate_or_silently_omit_pages(self) -> None:
        invalid_references = [[], [{"sourceId": "unknown", "page": 1}], [{"sourceId": "source-one", "page": 2}],
                              [{"sourceId": "source-one", "page": True}], [self.pages[0]]]
        for references in invalid_references:
            variant = copy.deepcopy(self.document)
            variant["chapters"][0]["sourceRefs"] = references
            with self.subTest(references=references):
                with self.assertRaises(ValueError):
                    validate_generated(variant, self.allowed)

    def test_non_json_and_non_object_responses_cannot_be_published(self) -> None:
        with self.assertRaises(ValueError):
            parse_response("Not a JSON lesson")
        for text in ["null", "[]", "42", "true"]:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    validate_generated(parse_response(text), self.allowed)


class StorageTests(LibraryFixture):
    def test_paths_and_identifiers_cannot_escape_the_library(self) -> None:
        for relative in ["..", "../outside.txt", str(self.work / "outside.txt"), "."]:
            with self.subTest(relative=relative):
                with self.assertRaises(ValueError):
                    self.library.path(relative)
        for course_id in ["../bad", "", "two words", "a" * 81, None]:
            with self.subTest(course_id=course_id):
                with self.assertRaises(ValueError):
                    validate_id(course_id)

    def test_learning_persists_notes_attempts_and_self_assessment_without_marking_mastery(self) -> None:
        course = self.imported_course()
        course["chapters"] = [{"id": "chapter-one"}]
        self.library.save_course(course)
        self.library.record_learning(course["id"], "chapter-one", {"notes": "Ma reconstruction personnelle."})
        entry = self.library.record_learning(course["id"], "chapter-one", {
            "attempt": {"kind": "recall", "answer": "  Une réponse sans regarder.  "}, "review": "partial"})
        reopened = Library(self.library.root)
        stored = reopened.read(f"learning/{course['id']}.json")["chapter-one"]
        self.assertEqual(stored, entry)
        self.assertEqual(stored["notes"], "Ma reconstruction personnelle.")
        self.assertEqual(stored["attempts"][0]["answer"], "Une réponse sans regarder.")
        self.assertEqual(stored["attempts"][0]["kind"], "recall")
        self.assertEqual(stored["review"]["selfAssessment"], "partial")
        interval = datetime.fromisoformat(stored["review"]["due"]) - datetime.fromisoformat(stored["review"]["at"])
        self.assertAlmostEqual(interval.total_seconds(), 3 * 86400, delta=1)
        self.assertNotIn("mastered", stored)

    def test_invalid_learning_update_cannot_overwrite_saved_notes(self) -> None:
        course = self.imported_course()
        course["chapters"] = [{"id": "chapter-one"}]
        self.library.save_course(course)
        self.library.record_learning(course["id"], "chapter-one", {"notes": "Keep this note."})
        for update in [{"notes": 3}, {"attempt": {"answer": " "}}, {"attempt": {"answer": "a", "kind": "mastery"}}, {"review": "perfect"}]:
            with self.subTest(update=update):
                with self.assertRaises(ValueError):
                    self.library.record_learning(course["id"], "chapter-one", update)
        with self.assertRaises(ValueError):
            self.library.record_learning(course["id"], "unknown", {"notes": "Wrong chapter."})
        self.assertEqual(self.library.read(f"learning/{course['id']}.json")["chapter-one"]["notes"], "Keep this note.")


class DiscoveryTests(unittest.TestCase):
    def test_discovers_hidden_models_all_pages_and_provider_efforts(self) -> None:
        factory = FakeCodexFactory()
        discovery = discover_models(factory)
        self.assertTrue(discovery["available"])
        self.assertTrue(discovery["signedIn"])
        self.assertEqual(discovery["accountType"], "chatgpt")
        self.assertEqual([model["id"] for model in discovery["models"]], ["alpha", "beta"])
        self.assertEqual(discovery["models"][0]["efforts"], ["max"])
        model_calls = [parameters for method, parameters in factory.instances[0].calls if method == "model/list"]
        self.assertEqual(model_calls, [{"includeHidden": True}, {"includeHidden": True, "cursor": "page-2"}])
        self.assertTrue(factory.instances[0].closed)

    def test_repeating_cursor_is_an_error_and_closes_the_client(self) -> None:
        factory = FakeCodexFactory(model_pages=[{"data": [], "nextCursor": "loop"}, {"data": [], "nextCursor": "loop"}])
        with self.assertRaisesRegex(CodexError, "Pagination"):
            discover_models(factory)
        self.assertTrue(factory.instances[0].closed)

    def test_no_account_is_not_reported_as_signed_in(self) -> None:
        discovery = discover_models(FakeCodexFactory(signed_in=False))
        self.assertFalse(discovery["signedIn"])
        self.assertIsNone(discovery["accountType"])


class GenerationTests(LibraryFixture):
    def create_factory(self, mode: str = "completed", client_factory=None) -> tuple[CourseFactory, FakeCodexFactory]:
        fake = client_factory or FakeCodexFactory(mode)
        factory = CourseFactory(self.library, PRODUCT_ROOT / "prompts/course-factory.txt", client_factory=fake)
        self.addCleanup(factory.close)
        factory.connect()
        return factory, fake

    def wait_job(self, factory: CourseFactory, job_id: str) -> dict:
        def completed():
            job = self.library.read(f"jobs/{job_id}.json")
            return job if job["status"] in TERMINAL_STATUSES and job_id not in factory.active else None
        return wait_until(completed)

    def test_generation_publishes_valid_course_evidence_and_observed_usage(self) -> None:
        course = self.imported_course()
        factory, fake = self.create_factory()
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        completed = self.wait_job(factory, job["id"])
        self.assertEqual(completed["status"], "completed")
        self.assertEqual(completed["usage"]["total"]["totalTokens"], 73)
        result = self.library.course(course["id"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["sources"], course["sources"])
        self.assertEqual(result["chapters"][0]["lab"]["kind"], "custom")
        self.assertEqual(result["generation"]["jobId"], job["id"])
        self.assertTrue(result["chapters"][0]["id"].startswith("chapter_"))
        self.assertIn("relire", result["generation"]["review"])
        evidence = self.library.read(f"runs/{job['id']}/batch-1.json")
        self.assertEqual(parse_response(evidence["response"])["title"], result["title"])
        self.assertEqual(evidence["pages"], [[course["sources"][0]["id"], 1]])
        self.assertTrue(fake.generation_client.closed)

    def test_permissions_are_explicit_and_confined_on_thread_and_turn(self) -> None:
        for permission in ["read-only", "workspace-write"]:
            with self.subTest(permission=permission):
                course = self.imported_course()
                factory, fake = self.create_factory()
                job = factory.start(course["id"], {"model": "alpha", "effort": "max", "permission": permission})
                self.assertEqual(self.wait_job(factory, job["id"])["status"], "completed")
                thread_parameters = next(parameters for method, parameters in fake.generation_client.calls if method == "thread/start")
                turn_parameters = next(parameters for method, parameters in fake.generation_client.calls if method == "turn/start")
                course_directory = str(self.library.path(f"courses/{course['id']}"))
                self.assertEqual(thread_parameters["cwd"], course_directory)
                self.assertEqual(thread_parameters["approvalPolicy"], "on-request")
                self.assertEqual(thread_parameters["sandbox"], permission)
                self.assertTrue(thread_parameters["ephemeral"])
                self.assertEqual(turn_parameters["approvalPolicy"], "on-request")
                self.assertEqual(turn_parameters["effort"], "max")
                self.assertIn("outputSchema", turn_parameters)
                if permission == "read-only":
                    self.assertEqual(turn_parameters["sandboxPolicy"], {"type": "readOnly"})
                else:
                    self.assertEqual(turn_parameters["sandboxPolicy"]["type"], "workspaceWrite")
                    self.assertEqual(turn_parameters["sandboxPolicy"]["writableRoots"], [course_directory])
                    self.assertFalse(turn_parameters["sandboxPolicy"]["networkAccess"])
                    self.assertTrue(turn_parameters["sandboxPolicy"]["excludeTmpdirEnvVar"])
                    self.assertTrue(turn_parameters["sandboxPolicy"]["excludeSlashTmp"])

    def test_scans_are_sent_as_local_images_with_page_provenance(self) -> None:
        course = import_sources(self.library, [upload("scan.pdf", pdf_bytes(("vision", "mixed")))])
        factory, fake = self.create_factory()
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertEqual(self.wait_job(factory, job["id"])["status"], "completed")
        parameters = next(parameters for method, parameters in fake.generation_client.calls if method == "turn/start")
        paths = [entry["path"] for entry in parameters["input"] if entry["type"] == "localImage"]
        self.assertEqual(paths, [str(self.library.path(page["image"])) for page in course["sources"][0]["pages"]])
        payload = json.loads(parameters["input"][0]["text"].split("\n", 1)[1])
        self.assertEqual([page["page"] for page in payload["sources"]], [1, 2])
        self.assertTrue(all("image" not in page for page in payload["sources"]))

    def test_multiple_batches_keep_all_sources_and_publish_only_after_completion(self) -> None:
        course = self.imported_course("a" * 27000)
        factory, fake = self.create_factory()
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertEqual(self.wait_job(factory, job["id"])["totalBatches"], 2)
        result = self.library.course(course["id"])
        self.assertEqual(len(result["chapters"]), 2)
        references = {(ref["sourceId"], ref["page"]) for chapter in result["chapters"] for ref in chapter["sourceRefs"]}
        self.assertEqual(references, {(course["sources"][0]["id"], 1), (course["sources"][0]["id"], 2), (course["sources"][0]["id"], 3)})
        turns = [parameters for method, parameters in fake.generation_client.calls if method == "turn/start"]
        second_payload = json.loads(turns[1]["input"][0]["text"].split("\n", 1)[1])
        self.assertEqual(second_payload["previousSections"], [result["chapters"][0]["title"]])

    def test_failed_malformed_empty_or_disconnected_provider_keeps_original_course(self) -> None:
        for mode in ["failed", "malformed", "empty", "disconnect"]:
            with self.subTest(mode=mode):
                course = self.imported_course()
                factory, fake = self.create_factory(mode)
                job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
                completed = self.wait_job(factory, job["id"])
                self.assertEqual(completed["status"], "failed")
                self.assertEqual(self.library.course(course["id"]), course)
                self.assertIsNone(completed["approval"])
                self.assertTrue(fake.generation_client.closed)
                if mode == "malformed":
                    self.assertEqual(self.library.read(f"runs/{job['id']}/batch-1.json")["response"], "Ce n'est pas du JSON")

    def test_cancel_stops_active_generation_and_preserves_sources(self) -> None:
        course = self.imported_course()
        factory, fake = self.create_factory("wait")
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertTrue(fake.turn_started.wait(timeout=2))
        factory.cancel(job["id"])
        self.assertEqual(self.wait_job(factory, job["id"])["status"], "cancelled")
        self.assertEqual(self.library.course(course["id"]), course)
        self.assertTrue(fake.generation_client.closed)

    def test_approval_accept_and_decline_are_explicit_decisions(self) -> None:
        for accept in [True, False]:
            with self.subTest(accept=accept):
                course = self.imported_course()
                factory, fake = self.create_factory("approval")
                job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
                wait_until(lambda: self.library.read(f"jobs/{job['id']}.json")["status"] == "approval")
                self.assertEqual(fake.generation_client.sent, [])
                factory.approve(job["id"], accept)
                final = self.wait_job(factory, job["id"])
                self.assertEqual(final["status"], "completed" if accept else "failed")
                self.assertIsNone(final["approval"])
                self.assertEqual(fake.generation_client.sent, [{"id": 701, "result": {"decision": "accept" if accept else "decline"}}])
                with self.assertRaises(ValueError):
                    factory.approve(job["id"], accept)

    def test_unknown_request_is_declined_without_implicit_permission(self) -> None:
        course = self.imported_course()
        factory, fake = self.create_factory("unsupported")
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertEqual(self.wait_job(factory, job["id"])["status"], "completed")
        self.assertEqual(fake.generation_client.sent[0]["id"], 702)
        self.assertEqual(fake.generation_client.sent[0]["error"]["code"], -32601)

    def test_foreign_thread_approval_cannot_change_current_job(self) -> None:
        factory, fake = self.create_factory()
        client = fake()
        job = {"id": "job-foreign", "status": "running", "approval": None}
        events = queue.Queue()
        events.put({"id": 999, "method": "item/fileChange/requestApproval", "params": {"threadId": "another-thread"}})
        events.put({"method": "turn/completed", "params": {"threadId": "own-thread", "turn": {"id": "own-turn", "status": "completed",
                    "items": [{"type": "agentMessage", "id": "final", "text": "a course response"}]}}})
        runtime = {"threadId": "own-thread", "turnId": "own-turn", "cancel": threading.Event()}
        self.assertEqual(factory._wait_turn(job, runtime, client, events), "a course response")
        self.assertEqual(job["status"], "running")
        self.assertIsNone(job["approval"])
        self.assertFalse(any(message.get("result", {}).get("decision") == "accept" for message in client.sent))

    def test_start_rejects_unavailable_model_effort_permission_and_unsigned_account(self) -> None:
        course = self.imported_course()
        factory, _ = self.create_factory()
        for options in [{"model": "invented", "effort": "max"}, {"model": "alpha", "effort": "low"},
                        {"model": "alpha", "effort": "max", "permission": "bypass"}]:
            with self.subTest(options=options):
                with self.assertRaises(ValueError):
                    factory.start(course["id"], options)
        factory.discovery["signedIn"] = False
        with self.assertRaises(ValueError):
            factory.start(course["id"], {"model": "alpha", "effort": "max"})

    def test_second_generation_cannot_overlap_an_active_job(self) -> None:
        course = self.imported_course()
        factory, fake = self.create_factory("wait")
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertTrue(fake.turn_started.wait(timeout=2))
        with self.assertRaisesRegex(ValueError, "déjà en cours"):
            factory.start(course["id"], {"model": "alpha", "effort": "max"})
        factory.cancel(job["id"])
        self.assertEqual(self.wait_job(factory, job["id"])["status"], "cancelled")

    def test_restart_marks_previous_active_job_interrupted(self) -> None:
        self.library.write("jobs/job-old.json", {"id": "job-old", "status": "approval", "approval": {"id": 3}})
        self.create_factory()
        self.assertEqual(self.library.read("jobs/job-old.json")["status"], "interrupted")

    def test_new_edition_keeps_previous_course_and_learning_record(self) -> None:
        course = self.imported_course()
        previous = generated_document([{"sourceId": course["sources"][0]["id"], "page": 1}])
        course.update(previous)
        course["chapters"][0]["id"] = "previous-chapter"
        course["status"] = "ready"
        self.library.save_course(course)
        self.library.record_learning(course["id"], "previous-chapter", {"notes": "Ma note de la première édition."})
        factory, _ = self.create_factory()
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        self.assertEqual(self.wait_job(factory, job["id"])["status"], "completed")
        self.assertEqual(self.library.read(f"courses/{course['id']}/versions/{job['id']}.json"), course)
        self.assertEqual(self.library.read(f"learning/{course['id']}.json")["previous-chapter"]["notes"], "Ma note de la première édition.")
        self.assertNotEqual(self.library.course(course["id"])["chapters"][0]["id"], "previous-chapter")


class TransportTests(LibraryFixture):
    def client(self, callback=None) -> CodexClient:
        client = CodexClient(callback=callback, command=[sys.executable, "-u", str(FAKE_SERVER), "--trace", str(self.work / "rpc.jsonl")])
        self.addCleanup(client.close)
        return client

    def test_initialize_notifications_and_rpc_use_a_real_jsonl_subprocess(self) -> None:
        client = self.client()
        echoed = client.rpc("test/echo", {"text": "Équations depuis ma source."})
        self.assertEqual(echoed, {"echo": {"text": "Équations depuis ma source."}})
        trace = [json.loads(line) for line in (self.work / "rpc.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertEqual([message["method"] for message in trace], ["initialize", "initialized", "test/echo"])
        self.assertEqual(trace[0]["params"]["clientInfo"]["name"], "prisme")
        client.close()
        client.close()
        self.assertIsNotNone(client.process.poll())

    def test_rpc_error_timeout_and_disconnect_do_not_leave_pending_requests(self) -> None:
        client = self.client()
        with self.assertRaisesRegex(CodexError, "RPC fictive"):
            client.rpc("test/error")
        with self.assertRaisesRegex(CodexError, "Délai dépassé"):
            client.rpc("test/timeout", timeout=0.05)
        self.assertEqual(client.pending, {})
        with self.assertRaisesRegex(CodexError, "interrompue"):
            client.rpc("test/disconnect", timeout=2)
        self.assertEqual(client.pending, {})

    def test_malformed_json_line_is_ignored_while_rpc_connection_stays_usable(self) -> None:
        client = self.client()
        self.assertEqual(client.rpc("test/malformed", {"a": 1}), {"echo": {"a": 1}})
        self.assertEqual(client.rpc("test/echo", {"b": 2}), {"echo": {"b": 2}})

    def test_nonobject_json_cannot_crash_the_rpc_reader(self) -> None:
        client = self.client()
        self.assertEqual(client.rpc("test/nonobject", {"a": 1}, timeout=2), {"echo": {"a": 1}})

    def test_course_generation_runs_end_to_end_over_real_subprocess_transport(self) -> None:
        course = self.imported_course()
        clients = []
        def transport_factory(callback=None):
            client = CodexClient(callback=callback, command=[sys.executable, "-u", str(FAKE_SERVER)])
            clients.append(client)
            self.addCleanup(client.close)
            return client
        factory = CourseFactory(self.library, PRODUCT_ROOT / "prompts/course-factory.txt", client_factory=transport_factory)
        self.addCleanup(factory.close)
        factory.connect()
        job = factory.start(course["id"], {"model": "alpha", "effort": "max"})
        final = wait_until(lambda: (stored if (stored := self.library.read(f"jobs/{job['id']}.json"))["status"] in TERMINAL_STATUSES and job["id"] not in factory.active else None))
        self.assertEqual(final["status"], "completed")
        self.assertEqual(self.library.course(course["id"])["title"], "Mon cours transformé")
        self.assertTrue(all(client.closed for client in clients))


class HttpTests(LibraryFixture):
    def setUp(self) -> None:
        super().setUp()
        self.fake = FakeCodexFactory()
        self.server = PrismeServer(("127.0.0.1", 0), PRODUCT_ROOT, self.library.root, client_factory=self.fake)
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.01), daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.port = self.server.server_address[1]

    def stop_server(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method: str, path: str, payload=None, headers: dict | None = None, with_token: bool = True):
        request_headers = dict(headers or {})
        body = payload if isinstance(payload, (str, bytes)) else json.dumps(payload) if payload is not None else None
        if method == "POST":
            request_headers.setdefault("Content-Type", "application/json")
            if with_token:
                request_headers.setdefault("X-Prisme-Token", self.server.nonce)
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        try:
            connection.request(method, path, body=body, headers=request_headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def request_json(self, method: str, path: str, payload=None, **kwargs):
        status, headers, body = self.request(method, path, payload, **kwargs)
        return status, headers, json.loads(body)

    def test_bootstrap_is_local_and_serves_observable_course_metadata(self) -> None:
        status, headers, bootstrap = self.request_json("GET", "/api/bootstrap")
        self.assertEqual(status, 200)
        self.assertEqual(bootstrap["token"], self.server.nonce)
        self.assertIsNone(bootstrap["codex"])
        self.assertEqual(bootstrap["jobs"], [])
        self.assertEqual(bootstrap["courses"][0]["origin"], "example")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_cross_site_origin_host_and_fetch_headers_are_rejected(self) -> None:
        for headers in [{"Host": "external.example"}, {"Origin": "https://external.example"}, {"Sec-Fetch-Site": "cross-site"}]:
            with self.subTest(headers=headers):
                self.assertEqual(self.request("GET", "/api/bootstrap", headers=headers)[0], 403)
        self.assertEqual(self.request("GET", "/api/bootstrap", headers={"Origin": f"http://localhost:{self.port}"})[0], 200)

    def test_mutations_require_the_session_nonce(self) -> None:
        self.assertEqual(self.request("POST", "/api/connect", {}, with_token=False)[0], 403)
        self.assertEqual(self.request("POST", "/api/connect", {}, headers={"X-Prisme-Token": "wrong"})[0], 403)
        status, _, discovery = self.request_json("POST", "/api/connect", {})
        self.assertEqual(status, 200)
        self.assertTrue(discovery["signedIn"])
        self.assertEqual([model["id"] for model in discovery["models"]], ["alpha", "beta"])

    def test_boundary_rejects_invalid_json_type_length_and_upload_title(self) -> None:
        cases = [("/api/import", {}, {"Content-Type": "text/plain"}), ("/api/import", "[]", {}),
                 ("/api/import", "not JSON", {}), ("/api/import", None, {"Content-Length": "0"}),
                 ("/api/import", "{}", {"Content-Length": str(MAX_REQUEST_BYTES + 1)}),
                 ("/api/import", {"title": 3, "files": [upload("course.txt", b"text")]}, {}),
                 ("/api/jobs/unknown/approve", {"accept": "yes"}, {})]
        for path, payload, headers in cases:
            with self.subTest(payload=payload, headers=headers):
                self.assertEqual(self.request("POST", path, payload, headers=headers)[0], 400)

    def test_import_persists_original_and_only_manifest_sources_can_be_downloaded(self) -> None:
        status, _, course = self.request_json("POST", "/api/import", {"title": "Mon dépôt", "files": [upload("source.txt", b"My source text.")]})
        self.assertEqual(status, 201)
        original_path = course["sources"][0]["file"]
        status, _, body = self.request("GET", "/files/" + original_path)
        self.assertEqual(status, 200)
        self.assertEqual(body, b"My source text.")
        self.library.path(f"courses/{course['id']}/secret.txt").write_text("private", encoding="utf-8")
        traversal = original_path.rsplit("/", 1)[0] + "/../../secret.txt"
        self.assertEqual(self.request("GET", "/files/" + traversal)[0], 403)
        unknown = original_path.rsplit("/", 1)[0] + "/unlisted.txt"
        self.library.path(unknown).write_text("unlisted private source", encoding="utf-8")
        self.assertEqual(self.request("GET", "/files/" + unknown)[0], 403)

    def test_static_and_course_path_traversal_are_rejected(self) -> None:
        self.assertEqual(self.request("GET", "/%2e%2e/AGENTS.md")[0], 403)
        self.assertEqual(self.request("GET", "/api/courses/%2e%2e")[0], 400)
        self.assertIn(self.request("GET", "/files/%2e%2e/AGENTS.md")[0], {400, 403})
        self.assertEqual(self.request("GET", "/missing-file.js")[0], 404)
        self.assertEqual(self.request("GET", "/math.js")[1]["Content-Type"], "text/javascript")

    def test_notes_are_saved_and_reloaded_through_the_http_boundary(self) -> None:
        status, _, entry = self.request_json("POST", "/api/courses/demo-intuition/learning/brownian", {
            "notes": "Mon raisonnement.", "attempt": {"kind": "reconstruction", "answer": "Une explication personnelle."}})
        self.assertEqual(status, 200)
        self.assertEqual(entry["notes"], "Mon raisonnement.")
        status, _, learning = self.request_json("GET", "/api/courses/demo-intuition/learning")
        self.assertEqual(status, 200)
        self.assertEqual(learning["brownian"], entry)

    def test_upload_connect_generate_and_read_course_work_through_http(self) -> None:
        status, _, course = self.request_json("POST", "/api/import", {"files": [upload("my-course.txt", b"My full course source.")]})
        self.assertEqual(status, 201)
        self.assertEqual(self.request("POST", "/api/connect", {})[0], 200)
        status, _, job = self.request_json("POST", f"/api/courses/{course['id']}/generate", {"model": "alpha", "effort": "max"})
        self.assertEqual(status, 202)
        def finished():
            response_status, _, polled = self.request_json("GET", f"/api/jobs/{job['id']}")
            self.assertEqual(response_status, 200)
            return polled if polled["status"] in TERMINAL_STATUSES else None
        self.assertEqual(wait_until(finished)["status"], "completed")
        status, _, result = self.request_json("GET", f"/api/courses/{course['id']}")
        self.assertEqual(status, 200)
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["chapters"][0]["sourceRefs"], [{"sourceId": course["sources"][0]["id"], "page": 1}])

    def test_profile_preferences_are_persisted_without_inventing_a_diagnosis(self) -> None:
        preferences = {"approach": "Manipuler puis démontrer.", "goal": "Comprendre mon cours.",
                       "applications": "Finance si utile.", "difficulties": "Mes erreurs observées uniquement."}
        status, _, profile = self.request_json("POST", "/api/profile", preferences)
        self.assertEqual(status, 200)
        for key, value in preferences.items():
            self.assertEqual(profile[key], value)
        self.assertIn("source", profile)
        self.assertEqual(Library(self.library.root).read("profile.json"), profile)

    def test_custom_lab_is_sandboxed_and_export_contains_sources_and_notes(self) -> None:
        course = self.imported_course()
        generated = generated_document([{"sourceId": course["sources"][0]["id"], "page": 1}])
        course.update(generated)
        course["chapters"][0]["id"] = "custom-chapter"
        self.library.save_course(course)
        self.library.record_learning(course["id"], "custom-chapter", {"notes": "Mes notes exportées."})
        status, headers, html = self.request("GET", f"/api/courses/{course['id']}/labs/custom-chapter")
        self.assertEqual(status, 200)
        self.assertIn(b"Exp\xc3\xa9rience", html)
        self.assertIn("sandbox allow-scripts", headers["Content-Security-Policy"])
        self.assertIn("connect-src 'none'", headers["Content-Security-Policy"])
        status, headers, content = self.request("GET", f"/api/courses/{course['id']}/export")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "application/zip")
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            self.assertEqual(json.loads(archive.read("course.json"))["id"], course["id"])
            self.assertEqual(json.loads(archive.read("learning.json"))["custom-chapter"]["notes"], "Mes notes exportées.")
            original_name = "sources/" + course["sources"][0]["file"].split("/sources/", 1)[1]
            self.assertEqual(archive.read(original_name), self.library.path(course["sources"][0]["file"]).read_bytes())
            self.assertTrue(all(not name.startswith(("/", "..")) for name in archive.namelist()))


if __name__ == "__main__":
    unittest.main()
