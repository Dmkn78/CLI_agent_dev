"""PyInstaller entry point: HTTP service or the read-only memory MCP."""
import sys

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--memory-mcp':
        del sys.argv[1]
        from server.memory_mcp import main
    else:
        from run import main
    main()
