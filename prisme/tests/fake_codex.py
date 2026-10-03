"""Deterministic Codex stand-ins: injectable client and real JSONL subprocess."""
from __future__ import annotations

import argparse
import json
import sys
import threading
from pathlib import Path
from typing import Callable


MODEL_PAGES = [
    {"data": [{"id": "provider-alpha", "model": "alpha", "displayName": "Alpha découvert",
               "supportedReasoningEfforts": [{"reasoningEffort": "max"}],
               "defaultReasoningEffort": "max", "isDefault": True}], "nextCursor": "page-2"},
    {"data": [{"id": "beta", "displayName": "Beta découvert", "supportedReasoningEfforts": [],
               "defaultReasoningEffort": None, "isDefault": False}], "nextCursor": None},
]


def generated_document(pages: list[dict]) -> dict:
    """Create a full, independent fixture referring only to supplied pages."""
    references = [{"sourceId": page["sourceId"], "page": page["page"]} for page in pages]
    references = list({(entry["sourceId"], entry["page"]): entry for entry in references}.values())
    chapter = {
        "title": "Une idée issue de mes sources", "kicker": "EXPLORER", "intro": "Une introduction précise.",
        "intuition": "Changer le paramètre modifie la forme.", "prerequisites": "Lire les axes.",
        "formula": "y = ax", "variables": [{"symbol": "a", "meaning": "La pente."}],
        "proof": [{"title": "Une étape", "body": "Les deux membres suivent le même calcul."}],
        "prediction": {"question": "Que change a ?", "choices": ["La pente", "Le temps"],
                       "answer": 0, "explanation": "Le coefficient multiplie x."},
        "exercise": {"question": "Reconstruire la relation.", "hint": "Comparer deux points.",
                     "solution": "La variation est proportionnelle à a."},
        "pitfall": "Une représentation n'est pas une preuve.", "application": "Comparer deux scénarios.",
        "questions": ["Que devient le graphe quand a vaut zéro ?"],
        "lab": {"kind": "custom", "title": "Comparer les pentes", "description": "Faire varier a.",
                "html": "<!doctype html><html lang=\"fr\"><body><p>Expérience de test</p><script>document.body.dataset.ready='true'</script></body></html>"},
        "sourceRefs": references,
    }
    return {"title": "Mon cours transformé", "subtitle": "Un parcours à vérifier.",
            "chapters": [chapter], "warnings": ["Fixture synthétique, aucun acquis validé."]}


def input_pages(parameters: dict) -> list[dict]:
    text = parameters["input"][0]["text"].split("\n", 1)[1]
    return json.loads(text)["sources"]


def completion_events(parameters: dict, turn_id: str, mode: str) -> list[dict]:
    thread_id = parameters["threadId"]
    if mode == "failed":
        return [{"method": "turn/completed", "params": {"threadId": thread_id,
                 "turn": {"id": turn_id, "status": "failed", "error": {"message": "Échec fictif du fournisseur."}, "items": []}}}]
    response = "Ce n'est pas du JSON" if mode == "malformed" else json.dumps(generated_document(input_pages(parameters)), ensure_ascii=False)
    message = {"id": "final-" + turn_id, "type": "agentMessage", "phase": "final_answer", "text": response}
    return [
        {"method": "item/completed", "params": {"threadId": thread_id, "item": {"id": "commentary-" + turn_id,
            "type": "agentMessage", "phase": "commentary", "text": "Cette annonce n'est pas un cours."}}},
        {"method": "thread/tokenUsage/updated", "params": {"threadId": thread_id,
            "tokenUsage": {"total": {"totalTokens": 73, "inputTokens": 41, "outputTokens": 32}}}},
        {"method": "item/completed", "params": {"threadId": thread_id, "item": message}},
        {"method": "turn/completed", "params": {"threadId": thread_id,
            "turn": {"id": turn_id, "status": "completed", "items": [] if mode == "empty" else [message]}}},
    ] if mode != "empty" else [{"method": "turn/completed", "params": {"threadId": thread_id,
            "turn": {"id": turn_id, "status": "completed", "items": []}}}]


class FakeCodexFactory:
    def __init__(self, mode: str = "completed", model_pages: list[dict] | None = None, signed_in: bool = True):
        self.mode = mode
        self.model_pages = model_pages or MODEL_PAGES
        self.signed_in = signed_in
        self.instances: list[FakeCodexClient] = []
        self.turn_started = threading.Event()

    def __call__(self, callback: Callable[[dict], None] | None = None) -> "FakeCodexClient":
        client = FakeCodexClient(self, callback or (lambda message: None))
        self.instances.append(client)
        return client

    @property
    def generation_client(self) -> "FakeCodexClient":
        return next(client for client in reversed(self.instances) if any(method == "turn/start" for method, _ in client.calls))


class FakeCodexClient:
    def __init__(self, factory: FakeCodexFactory, callback: Callable[[dict], None]):
        self.factory = factory
        self.callback = callback
        self.calls: list[tuple[str, dict]] = []
        self.sent: list[dict] = []
        self.closed = False
        self.thread_count = 0
        self.turn_count = 0
        self.pending_turn: tuple[dict, str] | None = None

    def rpc(self, method: str, parameters: dict | None = None, timeout: float = 45) -> dict:
        parameters = parameters or {}
        self.calls.append((method, parameters))
        if method == "account/read":
            return {"account": {"type": "chatgpt"} if self.factory.signed_in else None}
        if method == "model/list":
            return self.factory.model_pages[1 if parameters.get("cursor") else 0]
        if method == "thread/start":
            self.thread_count += 1
            return {"thread": {"id": f"thread-{self.thread_count}"}}
        if method == "turn/start":
            self.turn_count += 1
            turn_id = f"turn-{self.turn_count}"
            self.pending_turn = (parameters, turn_id)
            self.factory.turn_started.set()
            if self.factory.mode == "approval":
                self.callback({"id": 701, "method": "item/fileChange/requestApproval",
                               "params": {"threadId": parameters["threadId"], "turnId": turn_id, "reason": "Test local."}})
            elif self.factory.mode == "unsupported":
                self.callback({"id": 702, "method": "item/unknown/requestApproval", "params": {"threadId": parameters["threadId"]}})
                self._complete()
            elif self.factory.mode == "disconnect":
                self.callback({"method": "prisme/disconnected", "params": {}})
            elif self.factory.mode != "wait":
                self._complete()
            return {"turn": {"id": turn_id}}
        if method == "turn/interrupt":
            return {}
        raise AssertionError(f"Méthode non prévue dans la fixture : {method}")

    def _complete(self, mode: str | None = None) -> None:
        assert self.pending_turn is not None
        parameters, turn_id = self.pending_turn
        for event in completion_events(parameters, turn_id, mode or self.factory.mode):
            self.callback(event)

    def send(self, message: dict) -> None:
        self.sent.append(message)
        if message.get("id") == 701 and "result" in message:
            self._complete("completed" if message["result"]["decision"] == "accept" else "failed")

    def close(self) -> None:
        self.closed = True


def run_jsonl_server() -> None:
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--trace")
    parser.add_argument("--mode", default="completed")
    arguments, _ = parser.parse_known_args()
    turn_count = 0
    for line in sys.stdin:
        request = json.loads(line)
        if arguments.trace:
            with Path(arguments.trace).open("a", encoding="utf-8") as trace:
                trace.write(json.dumps(request) + "\n")
        method = request.get("method")
        parameters = request.get("params", {})
        if "id" not in request:
            continue
        if method == "test/disconnect":
            return
        if method == "test/timeout":
            continue
        if method == "test/error":
            print(json.dumps({"id": request["id"], "error": {"message": "Erreur RPC fictive."}}), flush=True)
            continue
        if method == "test/malformed":
            print("This is not JSON", flush=True)
        if method == "test/nonobject":
            print("1", flush=True)
        if method == "initialize":
            result = {"userAgent": "prisme-test"}
        elif method == "account/read":
            result = {"account": {"type": "chatgpt"}}
        elif method == "model/list":
            result = MODEL_PAGES[1 if parameters.get("cursor") else 0]
        elif method == "thread/start":
            result = {"thread": {"id": "transport-thread"}}
        elif method == "turn/start":
            turn_count += 1
            result = {"turn": {"id": f"transport-turn-{turn_count}"}}
        else:
            result = {"echo": parameters}
        print(json.dumps({"id": request["id"], "result": result}), flush=True)
        if method == "turn/start":
            for event in completion_events(parameters, result["turn"]["id"], arguments.mode):
                print(json.dumps(event, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    run_jsonl_server()
