"""Standalone JSONL RPC adapter for the user's installed Codex CLI."""
from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Callable


class CodexError(RuntimeError):
    pass


def codex_command() -> list[str]:
    executable = os.environ.get("PRISME_CODEX_EXECUTABLE") or shutil.which("codex")
    if not executable:
        raise CodexError("Codex CLI est introuvable. Installe Codex puis connecte ton compte avec codex login.")
    path = Path(executable)
    if path.suffix.lower() in {".cmd", ".ps1"}:
        package = path.parent / "node_modules" / "@openai" / "codex"
        native = next(package.glob("**/codex.exe"), None)
        if native:
            return [str(native)]
        node = shutil.which("node")
        entrypoint = package / "bin" / "codex.js"
        if node and entrypoint.is_file():
            return [node, str(entrypoint)]
        raise CodexError("Installation Codex incomplète : exécutable natif ou Node introuvable.")
    return [str(path)]


class CodexClient:
    def __init__(self, callback: Callable[[dict], None] | None = None, command: list[str] | None = None):
        self.callback = callback or (lambda message: None)
        self.pending: dict[int, queue.Queue] = {}
        self.lock = threading.RLock()
        self.write_lock = threading.Lock()
        self.counter = 0
        self.closed = False
        arguments = (command or codex_command()) + ["app-server", "--listen", "stdio://", "-c", "features.multi_agent=false"]
        self.process = subprocess.Popen(arguments, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace", bufsize=1,
                                        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        self.stderr_reader = threading.Thread(target=self._drain_stderr, daemon=True)
        self.message_reader = threading.Thread(target=self._read, daemon=True)
        self.stderr_reader.start()
        self.message_reader.start()
        try:
            self.rpc("initialize", {"clientInfo": {"name": "prisme", "title": "Prisme", "version": "0.1.0"}}, timeout=30)
            self.send({"method": "initialized", "params": {}})
        except Exception:
            self.close()
            raise

    def send(self, message: dict) -> None:
        with self.write_lock:
            if self.process.poll() is not None:
                raise CodexError("Le processus Codex est arrêté.")
            try:
                self.process.stdin.write(json.dumps(message, ensure_ascii=False) + "\n")
                self.process.stdin.flush()
            except (OSError, ValueError) as error:
                raise CodexError("Connexion Codex interrompue.") from error

    def rpc(self, method: str, params: dict | None = None, timeout: float = 45) -> dict:
        with self.lock:
            self.counter += 1
            request_id = self.counter
            response_queue: queue.Queue = queue.Queue()
            self.pending[request_id] = response_queue
        try:
            self.send({"id": request_id, "method": method, "params": params or {}})
            try:
                response = response_queue.get(timeout=timeout)
            except queue.Empty as error:
                raise CodexError(f"Délai dépassé : {method}.") from error
            if "error" in response:
                raise CodexError(response["error"].get("message", "Erreur Codex."))
            return response.get("result", {})
        finally:
            with self.lock:
                self.pending.pop(request_id, None)

    def _read(self) -> None:
        try:
            for line in self.process.stdout:
                try:
                    message = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(message, dict):
                    continue
                if "method" not in message and "id" in message:
                    if type(message["id"]) not in {int, str}:
                        continue
                    with self.lock:
                        waiting = self.pending.get(message["id"])
                    if waiting:
                        waiting.put(message)
                else:
                    self.callback(message)
        finally:
            with self.lock:
                for waiting in self.pending.values():
                    waiting.put({"error": {"message": "Connexion Codex interrompue."}})
            self.callback({"method": "prisme/disconnected", "params": {}})

    def _drain_stderr(self) -> None:
        # Diagnostic streams can contain account details; never publish them in the UI.
        for _ in self.process.stderr:
            pass

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        for reader in (self.message_reader, self.stderr_reader):
            if reader is not threading.current_thread():
                reader.join(timeout=2)
        for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
            if stream and not stream.closed:
                stream.close()


def discover_models(factory=CodexClient) -> dict:
    client = factory()
    try:
        account = client.rpc("account/read", {"refreshToken": False}).get("account")
        models, cursors, cursor = [], set(), None
        while True:
            response = client.rpc("model/list", {"includeHidden": True, **({"cursor": cursor} if cursor else {})})
            for model in response.get("data", []):
                models.append({"id": model.get("model") or model["id"],
                               "name": model.get("displayName") or model.get("model") or model["id"],
                               "efforts": [effort["reasoningEffort"] for effort in model.get("supportedReasoningEfforts", [])],
                               "defaultEffort": model.get("defaultReasoningEffort"), "isDefault": model.get("isDefault", False)})
            cursor = response.get("nextCursor")
            if not cursor:
                break
            if cursor in cursors or len(cursors) > 100:
                raise CodexError("Pagination de modèles incohérente.")
            cursors.add(cursor)
        return {"available": True, "signedIn": account is not None,
                "accountType": account.get("type") if account else None, "models": models}
    finally:
        client.close()

