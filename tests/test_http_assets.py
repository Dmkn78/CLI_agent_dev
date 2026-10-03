import threading
import unittest
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import urlopen

from run import make_handler


class AssetReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'script' and attributes.get('src'):
            self.paths.append(attributes['src'])
        elif tag == 'link' and attributes.get('rel') in ('stylesheet', 'icon'):
            self.paths.append(attributes['href'])


class HttpAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(None, 'asset-test'))
        cls.server.daemon_threads = True
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=3)
        cls.server.server_close()

    def test_every_asset_referenced_by_the_app_is_served(self):
        with urlopen(self.origin + '/', timeout=3) as response:
            document = response.read().decode('utf-8')
        references = AssetReferences()
        references.feed(document)
        self.assertTrue(references.paths)
        for path in references.paths:
            with self.subTest(path=path):
                with urlopen(self.origin + path, timeout=3) as response:
                    self.assertEqual(response.status, 200)
                    self.assertGreater(len(response.read()), 0)
                    self.assertNotEqual(response.headers.get_content_type(), 'application/json')

    def test_private_and_unlisted_files_are_not_served(self):
        for path in ('/run.py', '/.atelier/store.db', '/docs/memory/CORE.md', '/missing.js'):
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.origin + path, timeout=3)
                self.assertEqual(error.exception.code, 404)


if __name__ == '__main__':
    unittest.main()
