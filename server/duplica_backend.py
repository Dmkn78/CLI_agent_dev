"""Duplica supervises existing agents; the platform retains orchestration ownership."""
from typing import Protocol

from .duplica_policy import agent_status


class AgentBackend(Protocol):
    def observe(self) -> dict: ...
    def send_message(self, text: str) -> dict: ...
    def respond(self, request_id: str, answers: dict) -> dict: ...
    def approve(self, request_id: str, decision: str) -> dict: ...
    def interrupt(self) -> dict: ...
    def resume(self) -> dict: ...


class PlatformAgentBackend:
    def __init__(self, app, session_id: str) -> None:
        self.app, self.session_id = app, session_id

    def observe(self) -> dict:
        session = self.app.store.get('session', self.session_id)
        client = self.app.clients.get(self.session_id)
        process = getattr(client, 'process', None)
        session['processAlive'] = bool(client and (process is None or process.poll() is None))
        session['observedStatus'] = agent_status(session, self.app.store.all('approval'))
        return session

    def send_message(self, text: str) -> dict:
        return self.app.prompt(self.session_id, text)

    def respond(self, request_id: str, answers: dict) -> dict:
        return self.app.approve(request_id, 'accept', answers)

    def approve(self, request_id: str, decision: str) -> dict:
        return self.app.approve(request_id, decision)

    def interrupt(self) -> dict:
        return self.app.interrupt(self.session_id)

    def resume(self) -> dict:
        return self.app.resume(self.session_id)


class CodexBackend(PlatformAgentBackend):
    """Codex app-server events and on-request responses, without credential access."""
