"""Run Prisme without any dependency on the parent project."""
import argparse
import json
import threading
import urllib.request
import webbrowser
from pathlib import Path

from prisme.http_server import PrismeServer


def running_instance(url: str, data: Path) -> bool:
    """Reuse only a Prisme instance serving the requested local library."""
    try:
        with urllib.request.urlopen(url + "/api/bootstrap", timeout=0.5) as response:
            metadata = json.load(response)
        return isinstance(metadata, dict) and metadata.get("application") == "prisme" and metadata.get("dataDirectory") == str(data.resolve())
    except (OSError, ValueError):
        return False


def main() -> None:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Prisme — comprendre en manipulant")
    parser.add_argument("--port", type=int, default=8731)
    parser.add_argument("--data", type=Path, default=root / ".prisme")
    parser.add_argument("--open", action="store_true")
    options = parser.parse_args()
    url = f"http://127.0.0.1:{options.port}"
    if options.open and running_instance(url, options.data):
        webbrowser.open(url)
        return
    server = PrismeServer(("127.0.0.1", options.port), root, options.data)
    url = f"http://127.0.0.1:{server.server_address[1]}"
    print(f"Prisme : {url}", flush=True)
    if options.open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

