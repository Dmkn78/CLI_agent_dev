"""One read-only account poller, independent of browser activity."""
import threading
import time


class AccountLimitsRefresh:
    def __init__(self, read, interval=600, *, monotonic=time.monotonic):
        if interval <= 0:
            raise ValueError('La cadence des quotas doit être positive.')
        self.read = read
        self.interval = interval
        self.monotonic = monotonic
        self.condition = threading.Condition()
        self.thread = None
        self.stopped = False
        self.inflight = False
        self.result = None
        self.error = None
        self.next_at = None
        self.requested = False

    def start(self):
        with self.condition:
            if self.stopped or self.thread is not None:
                return
            if self.next_at is None:
                self.next_at = self.monotonic() + self.interval
            self.thread = threading.Thread(target=self._run, name='atelier-account-limits', daemon=True)
            self.thread.start()

    def refresh(self, *, scheduled=False):
        """Concurrent callers share the result of the active read."""
        with self.condition:
            if self.inflight:
                while self.inflight and not self.stopped:
                    self.condition.wait()
                if self.error is not None:
                    raise self.error
                return self.result
            if self.stopped:
                return self.result
            if scheduled and self.next_at > self.monotonic():
                return self.result
            self.inflight = True
            self.requested = False
            self.error = None
        try:
            result = self.read()
            with self.condition:
                self.result = result
            return result
        except Exception as exc:
            with self.condition:
                self.error = exc
            raise
        finally:
            with self.condition:
                self.inflight = False
                self.next_at = self.monotonic() + (0 if self.requested else self.interval)
                self.condition.notify_all()

    def request(self):
        """Wake an existing poller after a native account connection event."""
        with self.condition:
            if self.stopped or self.thread is None:
                return
            self.requested = True
            self.next_at = self.monotonic()
            self.condition.notify_all()

    def _run(self):
        while True:
            with self.condition:
                while not self.stopped:
                    delay = self.next_at - self.monotonic()
                    if not self.inflight and delay <= 0:
                        break
                    self.condition.wait(None if self.inflight else delay)
                if self.stopped:
                    return
            try:
                self.refresh(scheduled=True)
            except Exception:
                # The failed attempt already schedules the next bounded retry.
                pass

    def stop(self):
        with self.condition:
            self.stopped = True
            self.condition.notify_all()

    def join(self, timeout=2):
        if self.thread and self.thread is not threading.current_thread():
            self.thread.join(timeout=timeout)
