"""PyInstaller entry point: HTTP service or the read-only memory MCP."""
import sys


def configure_utf8_stdio():
    # Frozen interpreters can ignore PYTHONUTF8; the desktop protocol uses UTF-8.
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        if stream is not None and hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors=stream.errors)


if __name__ == '__main__':
    configure_utf8_stdio()
    if len(sys.argv) > 1 and sys.argv[1] == '--memory-mcp':
        del sys.argv[1]
        from server.memory_mcp import main
    else:
        from run import main
    main()
