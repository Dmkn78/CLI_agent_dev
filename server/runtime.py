"""Entrypoints shared by source runs and the packaged desktop service."""
import sys
from pathlib import Path


def memory_command(data: Path, project_id: str) -> list[str]:
    entry = ['--memory-mcp'] if getattr(sys, 'frozen', False) else [str(Path(__file__).with_name('memory_mcp.py'))]
    return [sys.executable, *entry, '--data', str(data), '--project', project_id]
