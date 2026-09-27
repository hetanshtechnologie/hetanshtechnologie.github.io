"""Headless checks for pwvault. Creates no GUI, so it runs anywhere."""

import json
import sys
import tempfile
from pathlib import Path

sys.argv = ["pwvault"]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pwvault as pv

passed = failed = 0


def _try(fn):
    """Call fn and return the exception it raised, or None if it did not."""
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - the point is to inspect it
        return exc
    return None


def check(label, condition, extra=""):
    global passed, failed
    if condition:
        passed += 1
        print("PASS  " + label)
    else:
        failed += 1
        print("FAIL  " + label + "   " + extra)


tmp = Path(tempfile.mkdtemp())
plain_file = tmp / "plain.json"
locked_file = tmp / "locked.json"

# ---- passphrase hashing ------------------------------------------------
stored = pv.hash_passphrase("correct horse")
check("passphrase verifies", pv.verify_passphrase("correct horse", stored))
check("wrong passphrase rejected", not pv.verify_passphrase("wrong", stored))
check("salt makes hashes differ", pv.hash_passphrase("x") != pv.hash_passphrase("x"))
check("malformed hash returns False", not pv.verify_passphrase("x", "garbage"))

# ---- AES round trip ----------------------------------------------------
env = pv.encrypt_bytes(b"top secret payload", "hunter2")
check("envelope marked encrypted", env.get("encrypted") is True)
check("ciphertext hides the plaintext", b"top secret" not in env["data"].encode())
check("decrypt round trip", pv.decrypt_bytes(env, "hunter2") == b"top secret payload")
try:
    pv.decrypt_bytes(env, "wrong")
    check("wrong key rejected", False)
except Exception:
    check("wrong key rejected", True)

# ---- encryption is mandatory, so its dependency is too -------------------
check("cryptography is installed", pv.HAVE_CRYPTO is True)
if not pv.HAVE_CRYPTO:
    print("FAIL  cannot continue: the vault cannot be encrypted without cryptography")
    raise SystemExit(1)

# ---- a normal vault (always encrypted) ----------------------------------
v = pv.Vault(plain_file)
check("fresh vault has no profiles", not v.has_profiles())
v.create_profile("Work", "pass1234")
v.add_item("GitHub", "gh-secret", "personal")
v.add_item("Bank", "bank-secret", "savings")
v.add_item("Email", "mail-secret", "")
v.save("pass1234")
check("vault file written", plain_file.exists())
check("has profiles after create", pv.Vault(plain_file).has_profiles())
check("create_profile reports encrypted", v.encrypted is True)
check("new vault file is encrypted on disk",
      json.loads(plain_file.read_text(encoding="utf-8")).get("encrypted") is True)
check("new vault hides entry names",
      "GitHub" not in plain_file.read_text(encoding="utf-8"))
check("new vault hides passwords",
      "gh-secret" not in plain_file.read_text(encoding="utf-8"))

reopened = pv.Vault(plain_file)
check("vault unlocks", reopened.unlock("work", "pass1234"))
check("entry count survives reload", len(reopened.items()) == 3)
check("wrong passphrase fails on reload", not pv.Vault(plain_file).unlock("Work", "nope"))
check("unknown vault name fails", not pv.Vault(plain_file).unlock("Ghost", "pass1234"))

item = reopened.items()[0]
reopened.update_item(item["id"], "GitHub2", "gh2", "edited")
reopened.delete_item(reopened.items()[2]["id"])
reopened.save("pass1234")
after = pv.Vault(plain_file)
after.unlock("Work", "pass1234")
check("edit persisted",
      any(r["name"] == "GitHub2" and r["password"] == "gh2" for r in after.items()))
check("delete persisted", not any(r["name"] == "Email" for r in after.items()))

# ---- encrypted vault ---------------------------------------------------
e = pv.Vault(locked_file)
e.create_profile("Private", "unlockme")
e.add_item("Router", "admin-admin", "192.168.1.1")
e.save("unlockme")
raw = locked_file.read_text(encoding="utf-8")
check("encrypted file hides entry name", "Router" not in raw)
check("encrypted file hides password", "admin-admin" not in raw)
check("encrypted flag on disk", json.loads(raw).get("encrypted") is True)

e2 = pv.Vault(locked_file)
check("encrypted vault unlocks", e2.unlock("Private", "unlockme"))
check("encrypted payload intact", e2.items()[0]["password"] == "admin-admin")
check("encrypted wrong passphrase fails", not pv.Vault(locked_file).unlock("Private", "bad"))
e2.add_item("NAS", "nas-secret", "storage")
e2.save("unlockme")
e3 = pv.Vault(locked_file)
e3.unlock("Private", "unlockme")
check("encrypted add persists", len(e3.items()) == 2)
check("encrypted add stays hidden", "NAS" not in locked_file.read_text(encoding="utf-8"))

# Repeated saves must not nest one sealed envelope inside another: that is what
# previously made an encrypted vault unopenable after a single save.
e3.add_item("Camera", "cam-secret", "")
e3.save("unlockme")
e3.add_item("NAS2", "nas2-secret", "")
e3.save("unlockme")
e4 = pv.Vault(locked_file)
check("encrypted vault survives repeated saves", e4.unlock("Private", "unlockme"))
check("all encrypted edits survive", len(e4.items()) == 4)
check("no nested envelope on disk",
      "encrypted" not in json.loads(
          pv.decrypt_bytes(json.loads(locked_file.read_text(encoding="utf-8")),
                           "unlockme").decode("utf-8")))
check("encrypted has_profiles detects the vault", pv.Vault(locked_file).has_profiles())

# ---- legacy plaintext files must still open ------------------------------
# Encryption is now mandatory, but files written by the previous version are
# plain JSON. Refusing to read them would lock real users out of their data, so
# _open() still accepts them and the UI flags them as unprotected.
legacy_file = tmp / "legacy-plain.json"
legacy_file.write_text(json.dumps({
    "version": 1,
    "profiles": [{
        "id": "abc123",
        "name": "Old",
        "passhash": pv.hash_passphrase("oldpass"),
        "created_at": pv.now_iso(),
        "items": [{"id": "i1", "name": "Router", "password": "legacy-secret",
                   "username": "admin", "notes": "", "tags": "",
                   "created_at": pv.now_iso(), "updated_at": pv.now_iso()}],
    }],
}, indent=2), encoding="utf-8")

legacy = pv.Vault(legacy_file)
check("legacy plaintext file is detected as unencrypted", legacy.is_encrypted() is False)
check("legacy plaintext vault still unlocks", legacy.unlock("Old", "oldpass"))
check("legacy entries are readable", len(legacy.items()) == 1)
check("legacy entry password intact", legacy.items()[0]["password"] == "legacy-secret")
check("legacy vault reports itself unencrypted", legacy.encrypted is False)

# Adding a profile to a legacy file is refused: one passphrase has to seal the
# file and match the profile hash, so a second profile would re-key the file and
# lock the first one out.
refused = _try(lambda: pv.Vault(legacy_file).create_profile("New", "pw1234567"))
check("create_profile on a populated legacy file is refused",
      isinstance(refused, RuntimeError), type(refused).__name__)
check("the refusal explains why", refused is not None
      and "lock" in str(refused).lower(), str(refused))
check("legacy file left untouched by the refusal",
      "legacy-secret" in legacy_file.read_text(encoding="utf-8"))
check("legacy file still opens afterwards",
      pv.Vault(legacy_file).unlock("Old", "oldpass"))

# ---- password suggestions ---------------------------------------------
sug = pv.suggest_password(24)
check("suggestion is long enough", len(sug) == 24)
check("suggestion has mixed classes",
      any(c.islower() for c in sug) and any(c.isupper() for c in sug)
      and any(c.isdigit() for c in sug) and any(not c.isalnum() for c in sug))
check("suggestions differ", pv.suggest_password(24) != sug)

# ---- formatting --------------------------------------------------------
check("format_when handles junk", isinstance(pv.format_when("not-a-date"), str))
check("format_when handles iso", bool(pv.format_when(pv.now_iso())))

# ---- audit log ---------------------------------------------------------
log = pv.log_path()
check("log file created", log.exists())
check("log never contains a password", "gh-secret" not in log.read_text(encoding="utf-8"))

print("\n{} passed, {} failed".format(passed, failed))
sys.exit(1 if failed else 0)
