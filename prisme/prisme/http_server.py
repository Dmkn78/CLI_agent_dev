"""Loopback HTTP boundary, CSRF protection, and static app assets."""
from __future__ import annotations

import json
import mimetypes
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from .generation import CourseFactory
from .exporter import build_course_zip, render_library_course_html
from .ingestion import import_sources
from .storage import Library, validate_id

MAX_REQUEST_BYTES = 58 * 1024 * 1024
DEFAULT_PROFILE = {
    "approach": "Intuition visuelle, puis dérivation complète et reconstruction sans regarder.",
    "goal": "Comprendre en profondeur et résoudre les exercices.",
    "applications": "Finance quantitative et IA, seulement quand le lien est utile.",
    "difficulties": "À préciser par mes réponses ; aucun diagnostic automatique.",
    "source": "Préférences déclarées le 2 octobre 2026, rapprochées du profil corporate finance du 4 septembre 2026."
}
LAB_READER_BRIDGE = """<style>
html{color-scheme:dark}body{background:#151718;color:#e8e9e3;font:14px/1.6 system-ui;margin:16px}canvas,svg{max-width:100%}
</style><script>
window.addEventListener('wheel',function(event){
  if(event.ctrlKey||event.target.closest('input,select,textarea,canvas,svg'))return;
  event.preventDefault();
  window.parent.postMessage({type:'prisme-lab-scroll',delta:event.deltaY,mode:event.deltaMode},'*');
},{passive:false});
</script>"""


class PrismeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], root: Path, data: Path, client_factory=None):
        self.root = root.resolve()
        self.library = Library(data)
        self.nonce = secrets.token_urlsafe(32)
        self.import_lock = threading.Lock()
        if not self.library.read("courses/demo-intuition/course.json"):
            self.library.save_course(json.loads((root / "examples/demo-course.json").read_text(encoding="utf-8-sig")))
        if self.library.read("profile.json") is None:
            self.library.write("profile.json", DEFAULT_PROFILE)
        self.factory = CourseFactory(self.library, root / "prompts/course-factory.txt", **({"client_factory": client_factory} if client_factory else {}))
        super().__init__(address, PrismeHandler)

    def server_close(self) -> None:
        self.factory.close()
        super().server_close()


class PrismeHandler(BaseHTTPRequestHandler):
    server: PrismeServer

    def log_message(self, format: str, *args) -> None:
        pass

    def _validate_origin(self, mutation: bool = False) -> None:
        port = self.server.server_address[1]
        allowed = {f"127.0.0.1:{port}", f"localhost:{port}"}
        if self.headers.get("Host") not in allowed:
            raise PermissionError("Hôte local requis.")
        origin = self.headers.get("Origin")
        if origin and origin not in {f"http://{host}" for host in allowed}:
            raise PermissionError("Origine locale requise.")
        if self.headers.get("Sec-Fetch-Site") == "cross-site":
            raise PermissionError("Requête externe refusée.")
        if mutation and not secrets.compare_digest(self.headers.get("X-Prisme-Token", ""), self.server.nonce):
            raise PermissionError("Rouvre Prisme pour renouveler la session locale.")

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    def _dispatch(self, method: str) -> None:
        self.request_body_consumed = method != "POST"
        try:
            self._validate_origin(method == "POST")
            route = unquote(urlsplit(self.path).path)
            if method == "GET":
                self._get(route)
            else:
                if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise ValueError("Corps JSON attendu.")
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= MAX_REQUEST_BYTES:
                    raise ValueError("Requête vide ou trop volumineuse.")
                self.connection.settimeout(90)
                raw_body = self.rfile.read(length)
                self.request_body_consumed = True
                payload = json.loads(raw_body)
                if not isinstance(payload, dict):
                    raise ValueError("Objet JSON attendu.")
                self._post(route, payload)
        except PermissionError as error:
            self._json({"error": str(error)}, 403)
        except (ValueError, TypeError, KeyError) as error:
            self._json({"error": str(error)}, 400)
        except FileNotFoundError as error:
            self._json({"error": str(error)}, 404)
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as error:
            self._json({"error": str(error)}, 500)

    def _get(self, route: str) -> None:
        library = self.server.library
        parts = route.strip("/").split("/")
        if route == "/api/bootstrap":
            courses = [{key: course.get(key) for key in ("id", "title", "subtitle", "status", "origin", "createdAt", "pageCount", "visionPages")}
                       | {"chapterCount": len(course["chapters"])} for course in library.courses()]
            jobs = [library.read(str(path.relative_to(library.root))) for path in sorted((library.root / "jobs").glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:10]]
            self._json({"application": "prisme", "dataDirectory": str(library.root),
                        "token": self.server.nonce, "courses": courses, "profile": library.read("profile.json"),
                        "codex": self.server.factory.discovery, "jobs": jobs})
        elif len(parts) == 3 and parts[:2] == ["api", "courses"]:
            self._json(library.course(parts[2]))
        elif len(parts) == 4 and parts[:2] == ["api", "courses"] and parts[3] == "learning":
            library.course(parts[2])
            self._json(library.read(f"learning/{parts[2]}.json", {}))
        elif len(parts) == 4 and parts[:2] == ["api", "courses"] and parts[3] == "export":
            self._export(parts[2])
        elif len(parts) == 4 and parts[:2] == ["api", "courses"] and parts[3] == "document":
            document = render_library_course_html(library, parts[2])
            self._bytes(document.encode("utf-8"), "text/html; charset=utf-8", extra={"Content-Disposition": f'attachment; filename="prisme-{parts[2]}.html"'})
        elif len(parts) == 5 and parts[:2] == ["api", "courses"] and parts[3] == "labs":
            course = library.course(parts[2])
            chapter = next((chapter for chapter in course["chapters"] if chapter["id"] == parts[4]), None)
            if not chapter or chapter["lab"]["kind"] != "custom":
                raise FileNotFoundError("Expérience introuvable.")
            policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'; sandbox allow-scripts"
            self._bytes((chapter["lab"]["html"] + LAB_READER_BRIDGE).encode("utf-8"), "text/html; charset=utf-8", extra={"Content-Security-Policy": policy})
        elif len(parts) == 3 and parts[:2] == ["api", "jobs"]:
            validate_id(parts[2])
            job = library.read(f"jobs/{parts[2]}.json")
            if not job:
                raise FileNotFoundError("Création introuvable.")
            self._json(job)
        elif route.startswith("/files/"):
            relative = route.removeprefix("/files/")
            target = library.path(relative)
            segments = relative.split("/")
            if len(segments) < 5 or segments[0] != "courses" or segments[2] != "sources":
                raise PermissionError("Ressource non accessible.")
            course = library.course(segments[1])
            allowed_files = {source["file"] for source in course["sources"]}
            allowed_files.update(page["image"] for source in course["sources"] for page in source["pages"] if page.get("image"))
            if relative not in allowed_files:
                raise PermissionError("Ressource non accessible.")
            self._file(target)
        elif route == "/" or not route.startswith("/api/"):
            relative = "index.html" if route == "/" else route.lstrip("/")
            static_root = (self.server.root / "web").resolve()
            target = (static_root / relative).resolve()
            if not target.is_relative_to(static_root):
                raise PermissionError("Chemin invalide.")
            self._file(target)
        else:
            raise FileNotFoundError("Page introuvable.")

    def _post(self, route: str, payload: dict) -> None:
        library = self.server.library
        parts = route.strip("/").split("/")
        if route == "/api/import":
            title = payload.get("title", "")
            if not isinstance(title, str):
                raise ValueError("Titre invalide.")
            with self.server.import_lock:
                course = import_sources(library, payload.get("files"), title)
            self._json(course, 201)
        elif route == "/api/connect":
            self._json(self.server.factory.connect())
        elif route == "/api/profile":
            profile = library.read("profile.json")
            for key in ("approach", "goal", "applications", "difficulties"):
                if not isinstance(payload.get(key), str) or len(payload[key]) > 3000:
                    raise ValueError("Préférence invalide ou trop longue.")
                profile[key] = payload[key]
            library.write("profile.json", profile)
            self._json(profile)
        elif len(parts) == 4 and parts[:2] == ["api", "courses"] and parts[3] == "generate":
            self._json(self.server.factory.start(parts[2], payload), 202)
        elif len(parts) == 5 and parts[:2] == ["api", "courses"] and parts[3] == "learning":
            self._json(library.record_learning(parts[2], parts[4], payload))
        elif len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] == "cancel":
            self._json(self.server.factory.cancel(parts[2]))
        elif len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] == "approve":
            if type(payload.get("accept")) is not bool:
                raise ValueError("Décision attendue.")
            self._json(self.server.factory.approve(parts[2], payload["accept"]))
        else:
            raise FileNotFoundError("Action introuvable.")

    def _export(self, course_id: str) -> None:
        archive = build_course_zip(self.server.library, course_id)
        self._bytes(archive, "application/zip", extra={"Content-Disposition": f'attachment; filename="prisme-{course_id}.zip"'})

    def _file(self, path: Path) -> None:
        if not path.is_file():
            raise FileNotFoundError("Ressource introuvable.")
        content_type = {".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css"}.get(path.suffix) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self._bytes(path.read_bytes(), content_type)

    def _json(self, document, status: int = 200) -> None:
        self._bytes(json.dumps(document, ensure_ascii=False, allow_nan=False).encode("utf-8"), "application/json; charset=utf-8", status)

    def _bytes(self, content: bytes, content_type: str, status: int = 200, extra: dict | None = None) -> None:
        self._discard_small_unread_body()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if not extra or "Content-Security-Policy" not in extra:
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(content)

    def _discard_small_unread_body(self) -> None:
        # Closing with unread bytes can reset the socket on Windows and hide a
        # rejection from the client. Drain small local requests with a short bound.
        if self.request_body_consumed:
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if 0 < length <= 65536:
                self.connection.settimeout(0.2)
                self.rfile.read(length)
        except (ValueError, OSError):
            pass
        self.request_body_consumed = True

