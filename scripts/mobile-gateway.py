#!/usr/bin/env python3
"""Start the explicit Atelier mobile gateway; use --help for pairing and Serve."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.mobile_gateway import main

if __name__ == '__main__':
    raise SystemExit(main())
