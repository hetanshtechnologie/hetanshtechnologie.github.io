# Hetansh Password Vault

A small, single-file desktop password manager. Open source, no account, no
network calls, no telemetry. Your vault is a single JSON file in your user data
directory and never leaves the machine unless you copy it yourself.

## Run it from source

Only Python 3.10 or newer is required.

```bash
python pwvault.py
```

Encryption of the vault file needs one package:

```bash
pip install -r requirements.txt
```

The vault is always encrypted, so `cryptography` is required. Without it the app
refuses to create a vault instead of quietly writing passwords in plain text.

## What it does

| | |
|---|---|
| Table view | Name, masked password, details, last updated |
| Add / Edit / Delete | Modal dialog, with a *Suggest* button for strong passwords |
| Copy | Copies to the clipboard without showing the text, then wipes it after 20s |
| Reveal | Per-entry, or *Reveal all* |
| Search | Live filter on name |
| Sort | Name A-Z, Name Z-A, newest, oldest |
| Auto-lock | Locks the vault after 5 minutes of inactivity |
| Audit log | `access.log` records unlocks, locks and failures - never a password |
| Export | Writes a plain JSON backup, with a warning about what it contains |

## Where things are stored

`vault.json` and `access.log` live in:

- Windows - `%APPDATA%\HetanshPasswordVault`
- macOS - `~/Library/Application Support/HetanshPasswordVault`
- Linux - `~/.local/share/HetanshPasswordVault` (or `$XDG_DATA_HOME`)

## Read this before storing anything important

**The passwords in `vault.json` are always encrypted.** The whole file is sealed
with AES-256-GCM using a key derived from your passphrase with
PBKDF2-HMAC-SHA256 at 240,000 rounds, so nothing readable is left on disk. The
trade-offs:

- **The passphrase cannot be recovered.** There is no reset, no recovery email,
  no backdoor. Forget it and the data is gone.
- **It does not defend against malware.** Anything running as you can read the
  file while the vault is open, and the passphrase while you type it.
- **It does not protect backups or exports.** *Export JSON* deliberately writes
  plain text, and tells you so.

Vault files from version 1.0.0, where encryption was a choice you could decline,
still open normally. They are flagged as unencrypted in the status bar, and you
cannot add a new profile to one: a legacy file is sealed with the passphrase of
the profile already inside it, so a second profile would lock the first one out.
Move your entries into a new vault file to get an encrypted one.

Clipboard managers are a separate problem: wiping the clipboard after 20
seconds does not stop a clipboard history tool from keeping its own copy.

## Build a binary

PyInstaller cannot cross-compile, so each platform must be built on that
platform.

### Windows

```bat
build-windows.bat
```

Produces `dist\PasswordVault.exe` and copies it to `../downloads/`.

### Linux

```bash
pip install pyinstaller cryptography
pyinstaller --clean --noconfirm PasswordVault.spec
chmod +x dist/PasswordVault
```

### macOS

```bash
pip install pyinstaller cryptography
pyinstaller --clean --noconfirm PasswordVault.spec
```

All three are automated in `.github/workflows/build-desktop.yml` at the repo
root. Run it from the Actions tab, or just push a change under
`password-generator/desktop/`.

The binaries are **not code-signed**, so Windows SmartScreen and macOS Gatekeeper
will warn on first run. On macOS an unsigned app also needs a right-click → Open
the first time. Signing requires a paid developer certificate.

## Tests

```bash
python test_pwvault.py        # 36 checks, no GUI, runs anywhere
python test_pwvault_gui.py    # 39 checks, drives the real widgets
```

The second one opens and closes real windows, so it needs a desktop session.
On a headless Linux box: `xvfb-run -a python test_pwvault_gui.py`.

## Licence

MIT. Do what you like with it.
