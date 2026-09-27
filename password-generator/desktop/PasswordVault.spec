# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the Hetansh Password Vault.

Builds a single windowed binary. PyInstaller does not cross-compile, so this
must be run on each target OS - see ../.github/workflows/build-desktop.yml for
the automated Windows, Linux and macOS builds.
"""

block_cipher = None

a = Analysis(
    ['pwvault.py'],
    pathex=[],
    binaries=[],
    # cryptography is a hard requirement: the vault file is always encrypted.
    # PyInstaller's own hook collects it, so nothing extra is needed here.
    datas=[],
    hiddenimports=[],
    hookspath=[],
    runtime_hooks=[],
    excludes=[
        'pytest', 'IPython', 'jupyter', 'notebook', 'setuptools',
        'pip', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'numpy', 'pandas',
    ],
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PasswordVault',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    # console=False keeps the terminal window away for end users. Set
    # console=True temporarily if you need to see tracebacks while debugging.
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
