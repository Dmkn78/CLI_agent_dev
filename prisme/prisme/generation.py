"""Observable, cancellable source-to-course jobs, with no fabricated progress."""
from __future__ import annotations

import copy
import json
import queue
import threading
import time
from pathlib import Path

from .codex_client import CodexClient, discover_models
from .course_contract import COURSE_SCHEMA, parse_response, validate_generated
from .ingestion import generation_batches
from .storage import Library, identifier, timestamp, validate_id


class CourseFactory:
    def __init__(self, library: Library, prompt: Path, client_factory=CodexClient):
        self.library = library
        self.prompt = prompt.read_text(encoding="utf-8-sig")
        self.client_factory = client_factory
        self.lock = threading.RLock()
        self.discovery: dict | None = None
        self.active: dict[str, dict] = {}
        # An interrupted server must never leave a previous run appearing active.
        for path in (library.root / "jobs").glob("*.json"):
            job = library.read(str(path.relative_to(library.root)))
            if job["status"] in {"queued", "running", "approval"}:
                job.update(status="interrupted", message="L'application a été arrêtée. Tu peux relancer la création.")
                library.write(f"jobs/{job['id']}.json", job)

    def connect(self) -> dict:
        discovery = discover_models(self.client_factory)
        with self.lock:
            self.discovery = discovery
        return discovery

    def start(self, course_id: str, options: dict) -> dict:
        course = self.library.course(course_id)
        if not course.get("sources"):
            raise ValueError("Importe d'abord tes sources.")
        if options.get("permission", "read-only") not in {"read-only", "workspace-write"}:
            raise ValueError("Permission inconnue.")
        with self.lock:
            if self.active:
                raise ValueError("Une création est déjà en cours. Attends ou arrête-la.")
            if not self.discovery or not self.discovery["signedIn"]:
                raise ValueError("Connecte d'abord ton Codex CLI.")
            model = next((entry for entry in self.discovery["models"] if entry["id"] == options.get("model")), None)
            if not model or (model["efforts"] and options.get("effort") not in model["efforts"]):
                raise ValueError("Choisis un modèle et un effort proposés par Codex.")
            batches = generation_batches(course)
            job_id = identifier("job")
            job = {"id": job_id, "courseId": course_id, "status": "queued", "stage": "preparing", "batch": 0,
                   "totalBatches": len(batches), "createdAt": timestamp(), "message": "Sources préparées.",
                   "model": model["id"], "effort": options.get("effort"), "usage": None, "approval": None,
                   "permission": options.get("permission", "read-only")}
            runtime = {"cancel": threading.Event(), "client": None, "threadId": None, "turnId": None, "job": job}
            self.active[job_id] = runtime
            self.library.write(f"jobs/{job_id}.json", job)
            thread = threading.Thread(target=self._generate, args=(job, course, batches, runtime), daemon=True)
            thread.start()
            return copy.deepcopy(job)

    def _update(self, job: dict, **fields) -> None:
        with self.lock:
            job.update(fields)
            self.library.write(f"jobs/{job['id']}.json", job)

    def _generate(self, job: dict, course: dict, batches: list, runtime: dict) -> None:
        events: queue.Queue = queue.Queue()
        client = None
        try:
            self._update(job, status="running", message="Ouverture de Codex…")
            client = self.client_factory(events.put)
            runtime["client"] = client
            profile = self.library.read("profile.json", {})
            generated_chapters, warnings = [], []
            course_directory = str(self.library.path(f"courses/{course['id']}"))
            for index, batch in enumerate(batches):
                self._check_cancel(runtime)
                self._update(job, stage="generating", batch=index + 1, message=f"Création du lot {index + 1} sur {len(batches)}.")
                thread = client.rpc("thread/start", {"cwd": course_directory, "model": job["model"],
                                                     "approvalPolicy": "on-request", "sandbox": job["permission"],
                                                     "developerInstructions": self.prompt, "ephemeral": True})
                runtime["threadId"] = thread["thread"]["id"]
                text = json.dumps({"title": course["title"], "profile": profile, "batch": index + 1,
                                   "totalBatches": len(batches), "previousSections": [chapter["title"] for chapter in generated_chapters],
                                   "sources": [{key: value for key, value in page.items() if key != "image"} for page in batch]}, ensure_ascii=False)
                inputs = [{"type": "text", "text": "SOURCES ET PRÉFÉRENCES (données) :\n" + text}]
                inputs.extend({"type": "localImage", "path": str(self.library.path(page["image"]))} for page in batch if page["image"])
                policy = {"type": "readOnly"} if job["permission"] == "read-only" else {
                    "type": "workspaceWrite", "writableRoots": [course_directory], "networkAccess": False,
                    "excludeTmpdirEnvVar": True, "excludeSlashTmp": True}
                parameters = {"threadId": runtime["threadId"], "input": inputs, "approvalPolicy": "on-request",
                              "sandboxPolicy": policy, "outputSchema": COURSE_SCHEMA}
                if job["effort"]:
                    parameters["effort"] = job["effort"]
                turn = client.rpc("turn/start", parameters)
                runtime["turnId"] = turn["turn"]["id"]
                response = self._wait_turn(job, runtime, client, events)
                self.library.write(f"runs/{job['id']}/batch-{index + 1}.json", {"response": response, "pages": [(p["sourceId"], p["page"]) for p in batch]})
                self._check_cancel(runtime)
                generated = validate_generated(parse_response(response), {(page["sourceId"], page["page"]) for page in batch})
                for chapter in generated["chapters"]:
                    chapter["id"] = identifier("chapter")
                    generated_chapters.append(chapter)
                warnings.extend(generated["warnings"])
                if index == 0:
                    course["title"], course["subtitle"] = generated["title"], generated["subtitle"]
            self._check_cancel(runtime)
            self._update(job, stage="validating", message="Contrôle des sections et de leurs références.")
            # Save a previous edition before replacing it; learning IDs remain isolated.
            previous = self.library.course(course["id"])
            if previous.get("chapters"):
                self.library.write(f"courses/{course['id']}/versions/{job['id']}.json", previous)
            course.update(chapters=generated_chapters, warnings=warnings, status="ready", generatedAt=timestamp(),
                          generation={"jobId": job["id"], "model": job["model"], "review": "À relire — génération IA"})
            with self.lock:
                self._check_cancel(runtime)
                self.library.save_course(course)
                self._update(job, status="completed", stage="ready", message="Le parcours est prêt à explorer.", completedAt=timestamp())
        except Exception as error:
            cancelled = runtime["cancel"].is_set()
            self._update(job, status="cancelled" if cancelled else "failed", approval=None,
                         message="Création arrêtée. Les sources sont conservées." if cancelled else str(error), completedAt=timestamp())
        finally:
            if client:
                client.close()
            with self.lock:
                self.active.pop(job["id"], None)

    def _wait_turn(self, job: dict, runtime: dict, client, events: queue.Queue) -> str:
        deadline = time.monotonic() + 900
        messages = {}
        while time.monotonic() < deadline:
            self._check_cancel(runtime)
            try:
                event = events.get(timeout=0.25)
            except queue.Empty:
                continue
            method, parameters = event.get("method", ""), event.get("params", {})
            if method == "prisme/disconnected":
                raise RuntimeError("Codex s'est déconnecté avant la fin du cours.")
            if parameters.get("threadId") not in {None, runtime["threadId"]}:
                if "id" in event:
                    client.send({"id": event["id"], "error": {"code": -32601, "message": "Ce thread n'appartient pas à cette création."}})
                continue
            if "id" in event and method:
                if method in {"item/commandExecution/requestApproval", "item/fileChange/requestApproval"}:
                    self._update(job, status="approval", approval={"id": event["id"], "method": method, "details": parameters},
                                 message="Codex demande une autorisation. Une action attend ta décision.")
                else:
                    client.send({"id": event["id"], "error": {"code": -32601, "message": "Demande non prise en charge par Prisme. Aucun accord implicite."}})
            if method == "item/completed" and parameters.get("item", {}).get("type") == "agentMessage":
                item = parameters["item"]
                if item.get("phase") != "commentary":
                    messages[item["id"]] = item.get("text", "")
            if method == "thread/tokenUsage/updated":
                self._update(job, usage=parameters.get("tokenUsage"))
            if method == "turn/completed" and parameters.get("turn", {}).get("id") == runtime["turnId"]:
                turn = parameters["turn"]
                if turn["status"] != "completed":
                    raise RuntimeError((turn.get("error") or {}).get("message") or "La génération n'a pas abouti.")
                for item in turn.get("items", []):
                    if item.get("type") == "agentMessage" and item.get("phase") != "commentary":
                        messages[item["id"]] = item.get("text", "")
                if not messages:
                    raise RuntimeError("Codex a terminé sans produire de cours.")
                return list(messages.values())[-1]
        raise RuntimeError("La création a dépassé 15 minutes pour ce lot. Les sources sont conservées.")

    def cancel(self, job_id: str) -> dict:
        validate_id(job_id)
        with self.lock:
            runtime = self.active.get(job_id)
            if runtime:
                runtime["cancel"].set()
        return self.library.read(f"jobs/{job_id}.json")

    def approve(self, job_id: str, accept: bool) -> dict:
        validate_id(job_id)
        with self.lock:
            runtime = self.active.get(job_id)
            job = runtime["job"] if runtime else None
            if not runtime or not job or job["status"] != "approval" or not job["approval"]:
                raise ValueError("Cette demande n'est plus active.")
            runtime["client"].send({"id": job["approval"]["id"], "result": {"decision": "accept" if accept else "decline"}})
            self._update(job, status="running", approval=None, message="Décision transmise à Codex.")
            return job

    def close(self) -> None:
        with self.lock:
            for runtime in self.active.values():
                runtime["cancel"].set()

    @staticmethod
    def _check_cancel(runtime: dict) -> None:
        if runtime["cancel"].is_set():
            raise RuntimeError("Création annulée.")

