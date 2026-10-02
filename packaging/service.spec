from pathlib import Path

root = Path(SPECPATH).parent
analysis = Analysis(
    [str(root / 'scripts/service_entry.py')],
    pathex=[str(root)],
    binaries=[],
    datas=[(str(root / 'web'), 'web'), (str(root / 'package.json'), '.')],
    hiddenimports=[],
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'unittest'],
    noarchive=False,
)
archive = PYZ(analysis.pure)
executable = EXE(archive, analysis.scripts, [], exclude_binaries=True,
                 name='atelier-service', console=True, debug=False, strip=False, upx=False)
collection = COLLECT(executable, analysis.binaries, analysis.datas,
                     strip=False, upx=False, name='atelier-service')
