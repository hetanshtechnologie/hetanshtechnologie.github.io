"""
Hetansh Password Vault - a small, single-file desktop password manager.

Open source. No network calls, no telemetry, no account required. Your vault is
one JSON file in your user data directory and never leaves the machine unless
you copy it somewhere yourself.

Run it:            python pwvault.py
Build a binary:    pyinstaller --onefile --windowed --name PasswordVault pwvault.py

The one dependency is `cryptography` (pip install cryptography). The vault file is
always encrypted with AES-256-GCM, so the app refuses to create a vault without
it rather than falling back to writing passwords in plain text.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import platform
import secrets
import sys
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

APP_NAME = "Hetansh Password Vault"
APP_VERSION = "1.0.0"
VAULT_FILENAME = "vault.json"
LOG_FILENAME = "access.log"

PBKDF2_ROUNDS = 240_000
CLIPBOARD_CLEAR_SECONDS = 20
IDLE_TIMEOUT_SECONDS = 300
MASK = "•" * 10

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    HAVE_CRYPTO = True
except Exception:  # pragma: no cover - exercised only without the extra installed
    HAVE_CRYPTO = False


# --------------------------------------------------------------------------
# locations
# --------------------------------------------------------------------------

def data_dir() -> Path:
    system = platform.system()
    if system == "Windows":
        base = Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming")
    elif system == "Darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    path = base / "HetanshPasswordVault"
    path.mkdir(parents=True, exist_ok=True)
    return path


def vault_path() -> Path:
    return data_dir() / VAULT_FILENAME


def log_path() -> Path:
    return data_dir() / LOG_FILENAME


def write_log(event: str, **fields: Any) -> None:
    """Append-only local audit trail. Never contains a password."""
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    parts = [f"{stamp}  {event}"]
    for key, value in fields.items():
        parts.append(f"{key}={value}")
    try:
        with log_path().open("a", encoding="utf-8") as handle:
            handle.write("  ".join(parts) + "\n")
    except OSError:
        pass


# --------------------------------------------------------------------------
# secrets
# --------------------------------------------------------------------------

def hash_passphrase(passphrase: str, salt: Optional[bytes] = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", passphrase.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ROUNDS,
        base64.b64encode(salt).decode(),
        base64.b64encode(digest).decode(),
    )


def verify_passphrase(passphrase: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt_b64, digest_b64 = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
    except (ValueError, binascii.Error):
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", passphrase.encode("utf-8"), salt, int(rounds))
    return hmac.compare_digest(candidate, expected)


def derive_key(passphrase: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", passphrase.encode("utf-8"), salt, PBKDF2_ROUNDS, dklen=32)


def encrypt_bytes(plaintext: bytes, passphrase: str) -> Dict[str, str]:
    if not HAVE_CRYPTO:
        raise RuntimeError("The 'cryptography' package is required for encryption.")
    salt = secrets.token_bytes(16)
    nonce = secrets.token_bytes(12)
    blob = AESGCM(derive_key(passphrase, salt)).encrypt(nonce, plaintext, None)
    return {
        "encrypted": True,
        "kdf": "pbkdf2_sha256",
        "rounds": str(PBKDF2_ROUNDS),
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "data": base64.b64encode(blob).decode(),
    }


def decrypt_bytes(envelope: Dict[str, str], passphrase: str) -> bytes:
    if not HAVE_CRYPTO:
        raise RuntimeError("The 'cryptography' package is required for decryption.")
    salt = base64.b64decode(envelope["salt"])
    nonce = base64.b64decode(envelope["nonce"])
    blob = base64.b64decode(envelope["data"])
    return AESGCM(derive_key(passphrase, salt)).decrypt(nonce, blob, None)


# --------------------------------------------------------------------------
# storage
# --------------------------------------------------------------------------

class Vault:
    """One JSON file holding every profile and its entries.

    The whole payload is always sealed with AES-256-GCM, so no password is ever
    written to disk in plain text. Files produced by version 1.0.0, which let the
    user decline encryption, still open and are flagged as unprotected in the UI.
    See the note in the README about what the encryption does and does not
    protect against.
    """

    def __init__(self, path: Path):
        self.path = path
        self.locked = True
        self.profile: Optional[Dict[str, Any]] = None
        self.encrypted = False

    # -- disk -----------------------------------------------------------
    def _read_raw(self) -> Dict[str, Any]:
        """Whatever is on disk: either the document, or a sealed envelope."""
        if not self.path.exists():
            return {"version": 1, "profiles": []}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            raise RuntimeError(f"Could not read the vault file:\n{exc}") from exc

    def _open(self, passphrase: Optional[str]) -> Dict[str, Any]:
        """Unseal the file, returning the plain document.

        Every read/write goes through here. Doing it in one place is what stops
        save() from sealing an already-sealed envelope and nesting layers.
        """
        document = self._read_raw()
        if not document.get("encrypted"):
            document.setdefault("profiles", [])
            return document
        if not HAVE_CRYPTO:
            raise RuntimeError(
                "This vault is encrypted but the 'cryptography' package is missing.\n"
                "Install it with:  pip install cryptography"
            )
        if not passphrase:
            raise RuntimeError("The vault is locked.")
        try:
            document = json.loads(decrypt_bytes(document, passphrase).decode("utf-8"))
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("Wrong passphrase, or the vault file is damaged.") from exc
        document.setdefault("profiles", [])
        return document

    def _store(self, document: Dict[str, Any], passphrase: Optional[str]) -> None:
        """Seal if needed, then write atomically."""
        document["version"] = 1
        if self.encrypted:
            if not HAVE_CRYPTO or not passphrase:
                raise RuntimeError("Cannot write an encrypted vault without its passphrase.")
            document = encrypt_bytes(
                json.dumps(document, indent=2, ensure_ascii=False).encode("utf-8"), passphrase
            )
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(document, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, self.path)
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass

    def has_profiles(self) -> bool:
        raw = self._read_raw()
        if raw.get("encrypted"):
            # Sealed, so the contents cannot be counted without a passphrase.
            # A sealed file only exists because a profile was created in it.
            return True
        return bool(raw.get("profiles"))

    def is_encrypted(self) -> bool:
        return bool(self._read_raw().get("encrypted"))

    # -- sessions -------------------------------------------------------
    def create_profile(self, name: str, passphrase: str) -> None:
        """Create a vault. The file is always encrypted.

        There is no plaintext option: a password manager that can be told not to
        encrypt will eventually be told not to. Plaintext files written by an
        earlier version are still readable - see _open() - they just cannot be
        created any more.
        """
        if not HAVE_CRYPTO:
            raise RuntimeError(
                "This app encrypts every vault, and the 'cryptography' package "
                "is not installed.\n\n"
                "Install it with:  pip install cryptography"
            )
        raw = self._read_raw()
        if raw.get("encrypted"):
            raise RuntimeError(
                "This file already holds an encrypted vault. Start a new vault file instead."
            )
        if raw.get("profiles"):
            # A legacy plaintext file is sealed with whichever passphrase created
            # it, and unlock() needs one passphrase to satisfy both the file key
            # and the profile hash. Adding a second profile here would re-key the
            # whole file and lock the existing profile out, so it is refused.
            raise RuntimeError(
                "This is an older unencrypted vault file that already contains "
                "entries.\n\nIt is sealed with the passphrase of the profile "
                "already in it, so a new profile cannot be added without locking "
                "that one out.\n\nKeep using it as it is, or move your entries "
                "into a new vault file."
            )
        self.encrypted = True
        document = raw
        document.setdefault("profiles", [])
        profile = {
            "id": uuid.uuid4().hex,
            "name": name.strip() or "Vault",
            "passhash": hash_passphrase(passphrase),
            "created_at": now_iso(),
            "items": [],
        }
        document["profiles"].append(profile)
        self._store(document, passphrase)
        self.profile = profile
        self.locked = False
        write_log("profile_created", profile=profile["name"], encrypted=True)

    def unlock(self, name: str, passphrase: str) -> bool:
        try:
            document = self._open(passphrase)
        except RuntimeError:
            write_log("unlock_failed", profile=name, reason="cannot_open")
            return False
        for profile in document.get("profiles", []):
            if profile["name"].strip().lower() == name.strip().lower():
                if not verify_passphrase(passphrase, profile.get("passhash", "")):
                    write_log("unlock_failed", profile=name, reason="bad_passphrase")
                    return False
                self.profile = profile
                self.locked = False
                self.encrypted = bool(self._read_raw().get("encrypted"))
                write_log("unlock_ok", profile=profile["name"])
                return True
        return False

    def save(self, passphrase: Optional[str]) -> None:
        """Write the in-memory profile back into the file."""
        if self.profile is None:
            return
        # Unseal first, swap our profile in, then re-seal exactly once. Sealing
        # the raw envelope here is what previously produced nested ciphertext.
        document = self._open(passphrase)
        for index, profile in enumerate(document.get("profiles", [])):
            if profile.get("id") == self.profile.get("id"):
                document["profiles"][index] = self.profile
                break
        else:
            document.setdefault("profiles", []).append(self.profile)
        self._store(document, passphrase)

    def lock(self) -> None:
        if self.profile is not None:
            write_log("lock", profile=self.profile.get("name", ""))
        self.profile = None
        self.locked = True

    # -- entries --------------------------------------------------------
    def items(self) -> List[Dict[str, Any]]:
        return list(self.profile.get("items", [])) if self.profile else []

    def add_item(self, name: str, password: str, details: str) -> None:
        self.profile["items"].append({
            "id": uuid.uuid4().hex,
            "name": name,
            "password": password,
            "details": details,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })

    def update_item(self, item_id: str, name: str, password: str, details: str) -> None:
        for item in self.profile["items"]:
            if item["id"] == item_id:
                item.update(name=name, password=password, details=details, updated_at=now_iso())
                return

    def delete_item(self, item_id: str) -> None:
        self.profile["items"] = [i for i in self.profile["items"] if i["id"] != item_id]


def now_iso() -> str:
    # Microseconds, not seconds: three entries added in the same second would
    # otherwise share a created_at and "Newest first" would order them by
    # whatever the sort happened to receive.
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


# --------------------------------------------------------------------------
# clipboard
# --------------------------------------------------------------------------

class Clipboard:
    """Copies without rendering, then wipes the clipboard on a timer.

    Note: on Windows and Linux a clipboard history tool or manager can keep its
    own copy even after this wipes the buffer. That is a limitation of the
    clipboard, not of this app.
    """

    def __init__(self, root: tk.Misc, on_wiped=None):
        self.root = root
        self.on_wiped = on_wiped
        self._after_id: Optional[str] = None

    def copy(self, text: str) -> None:
        self.cancel()
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.root.update()
        self._after_id = self.root.after(
            CLIPBOARD_CLEAR_SECONDS * 1000, self._wipe
        )

    def _wipe(self) -> None:
        self.root.clipboard_clear()
        self.root.clipboard_append("")
        self._after_id = None
        if self.on_wiped:
            self.on_wiped()

    def cancel(self) -> None:
        if self._after_id is not None:
            try:
                self.root.after_cancel(self._after_id)
            except tk.TclError:
                pass
            self._after_id = None


# --------------------------------------------------------------------------
# UI
# --------------------------------------------------------------------------

class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_NAME} {APP_VERSION}")
        self.geometry("940x620")
        self.minsize(760, 480)
        self.configure(bg="#0f172a")

        self.vault = Vault(vault_path())
        self.passphrase: Optional[str] = None
        self.revealed: set[str] = set()
        self.selected_id: Optional[str] = None
        # Named clip to keep it distinct from Tk's own clipboard_get /
        # clipboard_clear / clipboard_append, which this class also calls.
        self.clip = Clipboard(self, on_wiped=self._flash)

        self._configure_style()
        self._build()
        self._install_idle_bindings()
        self.show_gate()
        self.protocol("WM_DELETE_WINDOW", self.quit_app)
        self._reset_idle_timer()

    # -- error reporting -------------------------------------------------
    def report_callback_exception(self, exc, val, tb) -> None:
        """Show callback errors instead of swallowing them.

        The packaged build is windowed, so sys.stderr is None and Tk's default
        handler has nowhere to write. An unhandled error in a button callback
        would leave the window on screen doing nothing, which reads as a hang
        with no way to diagnose it. Surface it in a dialog instead.
        """
        detail = "".join(traceback.format_exception(exc, val, tb))
        try:
            messagebox.showerror(APP_NAME, f"{val}\n\n{detail}")
        except Exception:
            pass
        write_log("error", detail=f"{type(val).__name__}: {val}"[:300])

    # -- style ----------------------------------------------------------
    def _configure_style(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", background="#0f172a", foreground="#e2e8f0",
                        fieldbackground="#1e293b", borderwidth=0, focuscolor="#1e293b")
        style.configure("TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#1e293b")
        style.configure("TLabel", background="#0f172a", foreground="#e2e8f0")
        style.configure("Card.TLabel", background="#1e293b", foreground="#e2e8f0")
        style.configure("Muted.TLabel", background="#0f172a", foreground="#94a3b8",
                        font=("Segoe UI", 9))
        style.configure("CardMuted.TLabel", background="#1e293b", foreground="#94a3b8",
                        font=("Segoe UI", 9))
        style.configure("Title.TLabel", font=("Segoe UI", 20, "bold"))
        style.configure("H1.TLabel", font=("Segoe UI", 15, "bold"))
        style.configure("H1Card.TLabel", background="#1e293b", font=("Segoe UI", 15, "bold"))
        style.configure("Accent.TButton", background="#2563eb", foreground="#ffffff",
                        font=("Segoe UI", 10, "bold"), padding=(14, 8))
        style.map("Accent.TButton",
                  background=[("active", "#1d4ed8"), ("disabled", "#334155")])
        style.configure("Ghost.TButton", background="#1e293b", foreground="#e2e8f0",
                        padding=(10, 6))
        style.map("Ghost.TButton", background=[("active", "#334155")])
        style.configure("Danger.TButton", background="#7f1d1d", foreground="#fecaca",
                        padding=(10, 6))
        style.map("Danger.TButton", background=[("active", "#991b1b")])
        style.configure("Treeview", background="#1e293b", fieldbackground="#1e293b",
                        foreground="#e2e8f0", rowheight=30, borderwidth=0)
        style.configure("Treeview.Heading", background="#0f172a", foreground="#94a3b8",
                        font=("Segoe UI", 9, "bold"), relief="flat")
        style.map("Treeview", background=[("selected", "#2563eb")])
        style.configure("TEntry", fieldbackground="#0b1220", foreground="#e2e8f0",
                        insertcolor="#e2e8f0", padding=6)
        style.configure("TCheckbutton", background="#0f172a", foreground="#e2e8f0")
        style.configure("TCombobox", fieldbackground="#0b1220", foreground="#e2e8f0")

    # -- layout ---------------------------------------------------------
    def _build(self) -> None:
        self.gate = ttk.Frame(self, padding=40)
        self.gate.pack(fill="both", expand=True)
        self.vault_view = ttk.Frame(self, padding=18)
        self.toast = ttk.Label(self, text="", style="Muted.TLabel", anchor="center")

    # -- gate (create profile / unlock) ---------------------------------
    def _clear(self) -> None:
        for child in self.winfo_children():
            child.destroy()
        self.toast = ttk.Label(self, text="", style="Muted.TLabel", anchor="center")

    def show_gate(self) -> None:
        self._clear()
        self.gate = ttk.Frame(self, padding=40)
        self.gate.pack(fill="both", expand=True)

        card = ttk.Frame(self.gate, style="Card.TFrame", padding=28)
        card.pack(anchor="center")
        ttk.Label(card, text=APP_NAME, style="H1Card.TLabel").pack(anchor="w")
        ttk.Label(
            card,
            text="Stored only on this computer. Nothing is uploaded.",
            style="CardMuted.TLabel",
        ).pack(anchor="w", pady=(2, 18))

        exists = False
        try:
            exists = self.vault.has_profiles()
        except RuntimeError as exc:
            messagebox.showerror(APP_NAME, str(exc))
            return

        self.gate_profile = ttk.Entry(card, width=34, font=("Segoe UI", 11))
        self.gate_pass = ttk.Entry(card, width=34, show="•", font=("Segoe UI", 11))
        self.gate_status = ttk.Label(card, text="", style="CardMuted.TLabel",
                                     foreground="#fca5a5", wraplength=320)

        ttk.Label(card, text="Vault name", style="Card.TLabel").pack(anchor="w", pady=(0, 2))
        self.gate_profile.pack(fill="x", pady=(0, 10))
        ttk.Label(card, text="Passphrase", style="Card.TLabel").pack(anchor="w", pady=(0, 2))
        self.gate_pass.pack(fill="x", pady=(0, 10))

        if exists:
            ttk.Label(card, text="Unlock an existing vault", style="Card.TLabel",
                      font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(8, 0))
            self.gate_pass.bind("<Return>", lambda _e: self._unlock())
        else:
            # Not a choice: the vault file is always encrypted, so this is a
            # statement of fact rather than a checkbox the user can clear.
            ttk.Label(
                card,
                text="The vault file is always encrypted with AES-256-GCM."
                     if HAVE_CRYPTO else
                     "Encryption is required, but the 'cryptography' package is "
                     "missing.\nInstall it with:  pip install cryptography",
                style="CardMuted.TLabel",
                wraplength=320,
            ).pack(anchor="w", pady=(0, 4))
            ttk.Label(
                card,
                text="A passphrase cannot be recovered if you forget it.",
                style="CardMuted.TLabel",
            ).pack(anchor="w", pady=(0, 10))
            self.gate_pass.bind("<Return>", lambda _e: self._create())

        row = ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w")
        ttk.Button(row, text="Unlock", style="Accent.TButton",
                   command=self._unlock if exists else self._create).pack(side="left")
        if exists:
            ttk.Button(row, text="New vault", style="Ghost.TButton",
                       command=lambda: self._reset_file()).pack(side="left", padx=8)

        self.gate_status.pack(anchor="w", pady=(10, 0))
        ttk.Label(self.gate, text=f"v{APP_VERSION}  •  {vault_path()}",
                  style="Muted.TLabel").pack(side="bottom")
        self.gate_pass.focus_set()

    def _reset_file(self) -> None:
        if messagebox.askyesno(APP_NAME, "Start a brand new vault file?\n"
                                           "Existing vaults in this file are kept."):
            self.vault = Vault(self.vault.path)
            self.vault.encrypted = True
            self.show_gate()

    def _create(self) -> None:
        name = self.gate_profile.get().strip() or "Vault"
        passphrase = self.gate_pass.get()
        if len(passphrase) < 4:
            self.gate_status.configure(text="Use at least 4 characters.")
            return
        try:
            self.vault.create_profile(name, passphrase)
        except RuntimeError as exc:
            messagebox.showerror(APP_NAME, str(exc))
            return
        except Exception as exc:
            self._report("Could not create the vault", exc)
            return
        self.passphrase = passphrase
        self._reset_idle_timer()
        self.show_vault()

    def _report(self, what: str, exc: BaseException) -> None:
        """Log and show a failure instead of leaving a dead window behind."""
        write_log("error", where=what, detail=f"{type(exc).__name__}: {exc}"[:300])
        messagebox.showerror(APP_NAME, f"{what}:\n\n{type(exc).__name__}: {exc}")

    def _unlock(self) -> None:
        name = self.gate_profile.get().strip() or "Vault"
        passphrase = self.gate_pass.get()
        try:
            ok = self.vault.unlock(name, passphrase)
        except RuntimeError as exc:
            messagebox.showerror(APP_NAME, str(exc))
            return
        except Exception as exc:
            self._report("Could not open the vault", exc)
            return
        if not ok:
            self.gate_status.configure(text="Wrong vault name or passphrase.")
            return
        self.passphrase = passphrase
        self._reset_idle_timer()
        self.gate_status.configure(text="")
        self.show_vault()

    # -- vault ----------------------------------------------------------
    def show_vault(self) -> None:
        self._clear()
        self.vault_view = ttk.Frame(self, padding=18)
        self.vault_view.pack(fill="both", expand=True)

        header = ttk.Frame(self.vault_view)
        header.pack(fill="x")
        ttk.Label(header, text=APP_NAME, style="H1.TLabel").pack(side="left")
        right = ttk.Frame(header)
        right.pack(side="right")
        ttk.Label(right, text=f"Locks after {IDLE_TIMEOUT_SECONDS // 60} min idle",
                  style="Muted.TLabel").pack(side="left", padx=10)
        ttk.Button(right, text="Lock", style="Ghost.TButton",
                   command=self.lock_vault).pack(side="left")
        ttk.Button(right, text="Add", style="Accent.TButton",
                   command=lambda: self.open_editor()).pack(side="left", padx=6)

        tools = ttk.Frame(self.vault_view)
        tools.pack(fill="x", pady=12)
        self.search_var = tk.StringVar()
        search = ttk.Entry(tools, textvariable=self.search_var, width=30)
        search.pack(side="left")
        search.bind("<KeyRelease>", lambda _e: self.refresh())
        ttk.Label(tools, text="Search", style="Muted.TLabel").pack(side="left", padx=6)

        self.sort_var = tk.StringVar(value="Name A-Z")
        sort = ttk.Combobox(tools, textvariable=self.sort_var, width=16, state="readonly",
                            values=["Name A-Z", "Name Z-A", "Newest first", "Oldest first"])
        sort.pack(side="left", padx=8)
        sort.bind("<<ComboboxSelected>>", lambda _e: self.refresh())

        self.reveal_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(tools, text="Reveal all", variable=self.reveal_var,
                        command=self.refresh).pack(side="left", padx=4)
        ttk.Button(tools, text="Export JSON", style="Ghost.TButton",
                   command=self.export_json).pack(side="right")

        columns = ("name", "password", "details", "updated")
        self.tree = ttk.Treeview(self.vault_view, columns=columns, show="headings", selectmode="browse")
        self.tree.heading("name", text="Name")
        self.tree.heading("password", text="Password")
        self.tree.heading("details", text="Details")
        self.tree.heading("updated", text="Updated")
        self.tree.column("name", width=220, anchor="w")
        self.tree.column("password", width=150, anchor="w")
        self.tree.column("details", width=330, anchor="w")
        self.tree.column("updated", width=140, anchor="w")
        self.tree.pack(fill="both", expand=True)
        self.tree.bind("<<TreeviewSelect>>", self._on_select)
        self.tree.bind("<Delete>", lambda _e: self.delete_selected())
        self.tree.bind("<Return>", lambda _e: self.open_editor())
        self.tree.bind("<Double-1>", lambda _e: self.open_editor())

        actions = ttk.Frame(self.vault_view)
        actions.pack(fill="x", pady=(10, 0))
        ttk.Button(actions, text="Copy password", style="Accent.TButton",
                   command=self.copy_selected).pack(side="left")
        ttk.Button(actions, text="Copy username", style="Ghost.TButton",
                   command=self.copy_username).pack(side="left", padx=8)
        ttk.Button(actions, text="Edit", style="Ghost.TButton",
                   command=self.open_editor).pack(side="left")
        ttk.Button(actions, text="Delete", style="Danger.TButton",
                   command=self.delete_selected).pack(side="left", padx=8)

        self.status = ttk.Label(self.vault_view, text="", style="Muted.TLabel")
        self.status.pack(anchor="w", pady=(8, 0))

        self.refresh()
        self._reset_idle_timer()

    def _flash(self) -> None:
        self._set_status("Clipboard cleared.")

    def _set_status(self, text: str) -> None:
        if hasattr(self, "status"):
            self.status.configure(text=text)

    # -- list rendering --------------------------------------------------
    def _visible(self) -> List[Dict[str, Any]]:
        needle = self.search_var.get().strip().lower()
        rows = self.vault.items()
        if needle:
            rows = [r for r in rows if needle in r["name"].lower()]
        order = self.sort_var.get()
        # id is the tiebreaker so the order never wobbles between refreshes.
        if order == "Name A-Z":
            rows.sort(key=lambda r: (r["name"].lower(), r["id"]))
        elif order == "Name Z-A":
            rows.sort(key=lambda r: (r["name"].lower(), r["id"]), reverse=True)
        elif order == "Newest first":
            rows.sort(key=lambda r: (r["created_at"], r["id"]), reverse=True)
        else:
            rows.sort(key=lambda r: (r["created_at"], r["id"]))
        return rows

    def refresh(self) -> None:
        if not hasattr(self, "tree"):
            return
        for existing in self.tree.get_children():
            self.tree.delete(existing)
        reveal_all = self.reveal_var.get()
        rows = self._visible()
        for row in rows:
            revealed = reveal_all or row["id"] in self.revealed
            self.tree.insert(
                "", "end", iid=row["id"],
                values=(
                    row["name"],
                    row["password"] if revealed else MASK,
                    row["details"],
                    format_when(row["updated_at"]),
                ),
            )
        total = len(self.vault.items())
        # A plaintext branch is still reachable here: a file created by an older
        # version opens fine, and the user deserves to be told it is unprotected.
        self._set_status(f"{len(rows)} of {total} entries." +
                         ("  Vault file is encrypted." if self.vault.encrypted else
                          "  WARNING: this is a legacy unencrypted file. New vaults are "
                          "always encrypted."))

    def _on_select(self, _event=None) -> None:
        selection = self.tree.selection()
        self.selected_id = selection[0] if selection else None

    def _selected(self) -> Optional[Dict[str, Any]]:
        for row in self.vault.items():
            if row["id"] == self.selected_id:
                return row
        return None

    # -- actions ---------------------------------------------------------
    def copy_selected(self) -> None:
        row = self._selected()
        if not row:
            self._set_status("Select an entry first.")
            return
        self.clip.copy(row["password"])
        self._set_status(f"Copied. Clipboard clears in {CLIPBOARD_CLEAR_SECONDS}s.")

    def copy_username(self) -> None:
        row = self._selected()
        if not row:
            self._set_status("Select an entry first.")
            return
        self.clip.copy(row["name"])
        self._set_status(f"Copied. Clipboard clears in {CLIPBOARD_CLEAR_SECONDS}s.")

    def open_editor(self) -> None:
        row = self._selected()
        Editor(self, row)

    def delete_selected(self) -> None:
        row = self._selected()
        if not row:
            self._set_status("Select an entry first.")
            return
        if not messagebox.askyesno(APP_NAME, f"Delete '{row['name']}'?\nThis cannot be undone."):
            return
        self.vault.delete_item(row["id"])
        self.vault.save(self.passphrase)
        self.selected_id = None
        self.refresh()
        self._set_status("Deleted.")
        self._reset_idle_timer()

    def export_json(self) -> None:
        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("All files", "*.*")],
            initialfile="vault-export.json",
        )
        if not path:
            return
        try:
            Path(path).write_text(
                json.dumps({"items": self.vault.items()}, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            messagebox.showerror(APP_NAME, f"Could not write the file:\n{exc}")
            return
        if not messagebox.askokcancel(
            APP_NAME,
            "Exported. This file contains your passwords in plain text.\n"
            "Delete it as soon as you have moved it somewhere safe.",
        ):
            try:
                os.remove(path)
            except OSError:
                pass

    # -- idle timeout ----------------------------------------------------
    def _install_idle_bindings(self) -> None:
        """Bind the activity handlers exactly once.

        These used to be re-registered inside _reset_idle_timer, but _idle
        itself calls _reset_idle_timer, so every keystroke appended another
        <Key> callback. The binding script doubled per character and reached
        megabytes after a dozen keystrokes, which froze the windowed app the
        moment you typed a passphrase.
        """
        for seq in ("<Key>", "<Button>", "<MouseWheel>"):
            self.bind_all(seq, self._idle, add="+")

    def _reset_idle_timer(self) -> None:
        if hasattr(self, "_idle_job"):
            try:
                self.after_cancel(self._idle_job)
            except tk.TclError:
                pass
        self._idle_job = self.after(IDLE_TIMEOUT_SECONDS * 1000, self._idle_expired)

    def _idle(self, _event=None) -> None:
        self._reset_idle_timer()

    def _idle_expired(self) -> None:
        self.lock_vault(auto=True)

    def lock_vault(self, auto: bool = False) -> None:
        self.clip.cancel()
        self.vault.save(self.passphrase)
        self.vault.lock()
        self.passphrase = None
        self.revealed.clear()
        self.selected_id = None
        self._set_status("")
        if auto:
            write_log("lock", reason="idle_timeout")
        self.show_gate()

    def quit_app(self) -> None:
        if not self.vault.locked:
            if messagebox.askyesno(APP_NAME, "Lock the vault and quit?"):
                self.lock_vault()
        self.clip.cancel()
        self.destroy()


class Editor:
    """Modal add/edit dialog. The password field is masked unless revealed."""

    def __init__(self, app: App, row: Optional[Dict[str, Any]]):
        self.app = app
        self.row = row
        self.win = tk.Toplevel(app)
        self.win.title("Edit entry" if row else "Add entry")
        self.win.transient(app)
        self.win.resizable(False, False)
        self.win.configure(bg="#0f172a")
        self.show = tk.BooleanVar(value=False)

        frame = ttk.Frame(self.win, style="Card.TFrame", padding=22)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Name", style="Card.TLabel").grid(
            row=0, column=0, sticky="w", pady=(0, 2))
        self.name = ttk.Entry(frame, width=38)
        self.name.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(0, 12))
        if row:
            self.name.insert(0, row["name"])

        ttk.Label(frame, text="Password", style="Card.TLabel").grid(
            row=2, column=0, sticky="w", pady=(0, 2))
        self.password = ttk.Entry(frame, width=38, show="•")
        self.password.grid(row=3, column=0, sticky="ew", pady=(0, 4))
        if row:
            self.password.insert(0, row["password"])

        reveal_row = ttk.Frame(frame, style="Card.TFrame")
        reveal_row.grid(row=4, column=0, sticky="w", pady=(0, 12))
        ttk.Checkbutton(reveal_row, text="Show", variable=self.show,
                        command=self._toggle).pack(side="left")
        ttk.Button(reveal_row, text="Suggest", style="Ghost.TButton",
                   command=self._suggest).pack(side="left", padx=8)

        ttk.Label(frame, text="Details", style="Card.TLabel").grid(
            row=5, column=0, sticky="w", pady=(0, 2))
        self.details = tk.Text(frame, width=38, height=5, wrap="word",
                               bg="#0b1220", fg="#e2e8f0", insertbackground="#e2e8f0",
                               relief="flat", font=("Segoe UI", 10))
        self.details.grid(row=6, column=0, columnspan=2, sticky="ew", pady=(0, 14))
        if row:
            self.details.insert("1.0", row.get("details", ""))

        buttons = ttk.Frame(frame, style="Card.TFrame")
        buttons.grid(row=7, column=0, columnspan=2, sticky="e")
        ttk.Button(buttons, text="Cancel", style="Ghost.TButton",
                   command=self.win.destroy).pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Save", style="Accent.TButton",
                   command=self._save).pack(side="left")

        self.win.bind("<Escape>", lambda _e: self.win.destroy())
        self.win.bind("<Return>", lambda _e: self._save())
        self.name.focus_set()
        self.win.grab_set()

    def _toggle(self) -> None:
        self.password.configure(show="" if self.show.get() else "•")

    def _suggest(self) -> None:
        self.password.delete(0, "end")
        self.password.insert(0, suggest_password(20))
        self.password.icursor("end")

    def _save(self) -> None:
        # The idle timer can lock the vault while this dialog is open, which
        # clears the in-memory profile out from under us.
        if self.app.vault.profile is None:
            messagebox.showerror(
                APP_NAME,
                "The vault was locked while this dialog was open, so the entry "
                "was not saved.\n\nUnlock again and re-enter it.",
                parent=self.win,
            )
            self.win.destroy()
            return
        name = self.name.get().strip()
        if not name:
            messagebox.showerror(APP_NAME, "A name is required.", parent=self.win)
            return
        password = self.password.get()
        if not password:
            if not messagebox.askyesno(APP_NAME, "Save with an empty password?",
                                       parent=self.win):
                return
        details = self.details.get("1.0", "end").strip()
        try:
            if self.row:
                self.app.vault.update_item(self.row["id"], name, password, details)
            else:
                self.app.vault.add_item(name, password, details)
            self.app.vault.save(self.app.passphrase)
        except Exception as exc:
            self.app._report("Could not save that entry", exc)
            return
        self.app.refresh()
        self.app._set_status("Saved.")
        self.app._reset_idle_timer()
        self.win.destroy()


def suggest_password(length: int = 20) -> str:
    import string

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{};:,.?"
    while True:
        candidate = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in candidate) and any(c.isupper() for c in candidate)
                and any(c.isdigit() for c in candidate)
                and any(c in "!@#$%^&*()-_=+[]{};:,.?" for c in candidate)):
            return candidate


def format_when(stamp: str) -> str:
    try:
        moment = datetime.fromisoformat(stamp)
    except ValueError:
        return stamp
    delta = datetime.now(timezone.utc) - moment
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return moment.astimezone().strftime("%d %b %Y")


def main() -> int:
    if not HAVE_CRYPTO:
        write_log("startup", note="cryptography_missing")
    app = App()
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
