"""Repeat launching must reuse only the intended library, without new agents."""
import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import run


class LauncherTests(unittest.TestCase):
    def test_running_instance_must_identify_prisme_and_the_same_library(self):
        data = Path(".prisme")
        metadata = {"application": "prisme", "dataDirectory": str(data.resolve())}
        with patch.object(run.urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(metadata).encode())) as request:
            self.assertTrue(run.running_instance("http://127.0.0.1:8731", data))
            request.assert_called_once_with("http://127.0.0.1:8731/api/bootstrap", timeout=0.5)

    def test_another_application_or_library_cannot_be_reused(self):
        for metadata in ({"application": "other"}, {"application": "prisme", "dataDirectory": "elsewhere"}, []):
            with self.subTest(metadata=metadata), patch.object(run.urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(metadata).encode())):
                self.assertFalse(run.running_instance("http://127.0.0.1:8731", Path(".prisme")))

    def test_absent_or_invalid_service_is_not_a_running_instance(self):
        with patch.object(run.urllib.request, "urlopen", side_effect=OSError("unavailable")):
            self.assertFalse(run.running_instance("http://127.0.0.1:8731", Path(".prisme")))
        with patch.object(run.urllib.request, "urlopen", return_value=io.BytesIO(b"not JSON")):
            self.assertFalse(run.running_instance("http://127.0.0.1:8731", Path(".prisme")))

    def test_open_reuses_a_running_instance_without_starting_another_server(self):
        with patch.object(sys, "argv", ["run.py", "--open"]), patch.object(run, "running_instance", return_value=True), patch.object(run.webbrowser, "open") as browser, patch.object(run, "PrismeServer") as server:
            run.main()
            browser.assert_called_once_with("http://127.0.0.1:8731")
            server.assert_not_called()


if __name__ == "__main__":
    unittest.main()
