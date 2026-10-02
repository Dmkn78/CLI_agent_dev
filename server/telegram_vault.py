"""Windows user-bound encryption for an explicitly entered Telegram bot token."""
import ctypes
import os
from pathlib import Path
from ctypes import wintypes


class DataBlob(ctypes.Structure):
    _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_ubyte))]


def transform_token(content: bytes, operation: str) -> bytes:
    if os.name != 'nt':
        raise ValueError('Sur cet OS, configure le token dans l’environnement du service.')
    buffer = ctypes.create_string_buffer(content)
    source = DataBlob(len(content), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    destination = DataBlob()
    function = getattr(ctypes.windll.crypt32, operation)
    function.argtypes = [ctypes.POINTER(DataBlob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                         ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(DataBlob)]
    function.restype = wintypes.BOOL
    if not function(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(destination)):
        raise ValueError('Le compte Windows du service ne peut pas ouvrir le coffre Telegram.')
    try:
        return ctypes.string_at(destination.data, destination.size)
    finally:
        ctypes.windll.kernel32.LocalFree.argtypes = [ctypes.c_void_p]
        ctypes.windll.kernel32.LocalFree(destination.data)


def save_token(path: Path, token: str) -> None:
    encrypted = transform_token(token.encode('utf-8'), 'CryptProtectData')
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_bytes(encrypted)
    temporary.replace(path)


def load_token(path: Path) -> str:
    return transform_token(path.read_bytes(), 'CryptUnprotectData').decode('utf-8')
