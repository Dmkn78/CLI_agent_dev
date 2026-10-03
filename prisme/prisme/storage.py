"""Atomic, local documents; paths never depend on the parent checkout."""
from __future__ import annotations

import copy
import json
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def identifier(prefix: str) -> str:
    return prefix + "_" + uuid.uuid4().hex[:16]


class Library:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()

    def path(self, relative: str) -> Path:
        candidate = (self.root / relative).resolve()
        if not candidate.is_relative_to(self.root) or candidate == self.root:
            raise ValueError("Chemin hors de la bibliothèque.")
        return candidate

    def read(self, relative: str, default=None):
        with self.lock:
            target = self.path(relative)
            if not target.exists():
                return copy.deepcopy(default)
            return json.loads(target.read_text(encoding="utf-8-sig"))

    def write(self, relative: str, document: dict | list) -> None:
        with self.lock:
            target = self.path(relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".pending")
            temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
            temporary.replace(target)

    def course(self, course_id: str) -> dict:
        validate_id(course_id)
        course = self.read(f"courses/{course_id}/course.json")
        if course is None:
            raise FileNotFoundError("Cours introuvable.")
        return course

    def save_course(self, course: dict) -> None:
        validate_id(course["id"])
        self.write(f"courses/{course['id']}/course.json", course)

    def courses(self) -> list[dict]:
        with self.lock:
            return [json.loads(path.read_text(encoding="utf-8-sig"))
                    for path in sorted((self.root / "courses").glob("*/course.json"), reverse=True)]

    def record_learning(self, course_id: str, chapter_id: str, update: dict) -> dict:
        course = self.course(course_id)
        if chapter_id not in {chapter["id"] for chapter in course.get("chapters", [])}:
            raise ValueError("Chapitre inconnu.")
        with self.lock:
            relative = f"learning/{course_id}.json"
            learning = self.read(relative, {})
            entry = learning.setdefault(chapter_id, {"notes": "", "attempts": [], "review": None})
            if "notes" in update:
                if not isinstance(update["notes"], str) or len(update["notes"]) > 20000:
                    raise ValueError("Notes trop longues.")
                entry["notes"] = update["notes"]
            if "attempt" in update:
                attempt = update["attempt"]
                if not isinstance(attempt, dict) or not isinstance(attempt.get("answer"), str):
                    raise ValueError("Réponse attendue.")
                answer = attempt["answer"].strip()
                if not 1 <= len(answer) <= 10000:
                    raise ValueError("Réponse vide ou trop longue.")
                kind = attempt.get("kind", "reconstruction")
                if kind not in {"prediction", "reconstruction", "recall"}:
                    raise ValueError("Type de réponse inconnu.")
                entry["attempts"].append({"kind": kind, "answer": answer, "at": timestamp()})
                entry["attempts"] = entry["attempts"][-200:]
            if "review" in update:
                review = update["review"]
                if review not in {"again", "partial", "remembered"}:
                    raise ValueError("Auto-évaluation inconnue.")
                from datetime import timedelta
                days = {"again": 1, "partial": 3, "remembered": 7}[review]
                entry["review"] = {"selfAssessment": review, "at": timestamp(),
                                   "due": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()}
            self.write(relative, learning)
            return entry


def validate_id(value: str) -> None:
    if not isinstance(value, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", value):
        raise ValueError("Identifiant invalide.")

