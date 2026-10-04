"""The skill picker shares the bounded project catalogue, including .agents."""
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from run import make_handler
from server.app import Application


class SkillHttpTests(unittest.TestCase):
    def test_picker_exposes_project_libraries_and_rejects_linked_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for folder in ('skills/public', '.agents/skills/agent-procedure', 'build/bundle/copied'):
                skill = root / folder / 'SKILL.md'
                skill.parent.mkdir(parents=True)
                skill.write_text('Local procedure.', encoding='utf-8')
            linked = root / 'skills/linked/SKILL.md'
            linked.parent.mkdir(parents=True)
            linked.symlink_to(root / 'skills/public/SKILL.md')
            app = Application(root)
            server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(app, 'skill-fixture'))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            url = 'http://127.0.0.1:' + str(server.server_port) + '/api/skills?project=atelier'
            try:
                with self.assertRaises(HTTPError) as denied:
                    urlopen(url, timeout=3)
                self.assertEqual(denied.exception.code, 403)
                with urlopen(Request(url, headers={'X-Atelier-Token': 'skill-fixture'}), timeout=3) as response:
                    paths = json.load(response)
                self.assertEqual(set(paths), {'skills/public/SKILL.md', '.agents/skills/agent-procedure/SKILL.md'})
            finally:
                server.shutdown()
                thread.join(timeout=3)
                server.server_close()
                app.shutdown()
                app.store.db.close()


if __name__ == '__main__':
    unittest.main()
