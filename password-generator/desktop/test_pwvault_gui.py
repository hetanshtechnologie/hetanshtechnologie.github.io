"""Drive the real Tk widgets: builds the window, clicks through the flows.

Runs on a normal desktop session. Destroys everything before exiting so it can
be used as a smoke test in CI without leaving a window open.
"""

import sys
import json
import tempfile

from pathlib import Path

sys.argv = ["pwvault"]
DESKTOP = Path(r"C:\snehal\edu\HetanshTechnologie\hetanshtechnologie.github.io\password-generator\desktop")
sys.path.insert(0, str(DESKTOP))

import pwvault as pv

passed = failed = 0


def check(label, condition, extra=""):
    global passed, failed
    if condition:
        passed += 1
        print("PASS  " + label)
    else:
        failed += 1
        print("FAIL  " + label + "   " + extra)


tmp = Path(tempfile.mkdtemp())
vault_file = tmp / "gui-vault.json"
access_log = tmp / "access.log"

pv.vault_path = lambda: vault_file
pv.log_path = lambda: access_log

app = pv.App()
app.update()

# ---- gate renders ------------------------------------------------------
check("gate is showing", app.gate.winfo_exists() == 1)
check("no vault yet", app.vault.has_profiles() is False)
check("create path is active", not hasattr(app, "gate_encrypt"))
check("no encryption checkbox is offered any more", not hasattr(app, "gate_encrypt_box"))

# ---- create a profile through the widgets ------------------------------
app.gate_profile.insert(0, "Work")
app.gate_pass.insert(0, "hunter2pass")
app._create()
app.update()
check("vault view after create", app.vault_view.winfo_exists() == 1)
check("tree widget built", app.tree.winfo_exists() == 1)
check("new profile starts empty", len(app.vault.items()) == 0, str(len(app.vault.items())))
check("a new vault is encrypted without being asked", app.vault.encrypted is True)
check("the file on disk is a sealed envelope",
      json.loads(app.vault.path.read_text(encoding="utf-8")).get("encrypted") is True)


# ---- add entries through the editor dialog ----------------------------
def add_via_editor(name, password, details):
    ed = pv.Editor(app, None)
    ed.win.update()
    ed.name.insert(0, name)
    ed.password.insert(0, password)
    ed.details.insert("1.0", details)
    ed._save()
    ed.win.update()
    return ed

add_via_editor("GitHub", "gh-plaintext", "work account")
add_via_editor("Bank", "bank-plaintext", "savings")
add_via_editor("Router", "router-plaintext", "")
app.update()
check("three entries added via dialogs", len(app.vault.items()) == 3,
      str(len(app.vault.items())))
check("tree shows three rows", len(app.tree.get_children()) == 3,
      str(len(app.tree.get_children())))

# ---- masking -----------------------------------------------------------
rows = {app.tree.item(i)["values"][0]: app.tree.item(i)["values"] for i in app.tree.get_children()}
check("password masked by default", rows["GitHub"][1] == pv.MASK, rows["GitHub"][1])
check("details shown", rows["GitHub"][2] == "work account", rows["GitHub"][2])

app.reveal_var.set(True)
app.refresh()
app.update()
rows = {app.tree.item(i)["values"][0]: app.tree.item(i)["values"] for i in app.tree.get_children()}
check("reveal all shows plaintext", rows["GitHub"][1] == "gh-plaintext", rows["GitHub"][1])
app.reveal_var.set(False)
app.refresh()
app.update()

# ---- search ------------------------------------------------------------
app.search_var.set("ban")
app.refresh()
app.update()
check("search filters by name", len(app.tree.get_children()) == 1)
check("search kept the right row",
      app.tree.item(app.tree.get_children()[0])["values"][0] == "Bank")
app.search_var.set("zzz")
app.refresh()
app.update()
check("search with no match is empty", len(app.tree.get_children()) == 0)
app.search_var.set("")
app.refresh()
app.update()

# ---- sorting -----------------------------------------------------------
app.sort_var.set("Name Z-A")
app.refresh()
app.update()
order = [app.tree.item(i)["values"][0] for i in app.tree.get_children()]
check("sort name Z-A", order == ["Router", "GitHub", "Bank"], str(order))
app.sort_var.set("Newest first")
app.refresh()
app.update()
check("sort newest first", app.tree.item(app.tree.get_children()[0])["values"][0] == "Router")
app.sort_var.set("Name A-Z")
app.refresh()
app.update()

# ---- select + copy without revealing ----------------------------------
target = [i for i in app.tree.get_children()
          if app.tree.item(i)["values"][0] == "GitHub"][0]
app.tree.selection_set(target)
app._on_select()
app.update()
check("selection tracked", app.selected_id == target)
check("selected row resolves", app._selected()["password"] == "gh-plaintext")
app.copy_selected()
app.update()
check("clipboard holds the password", app.clipboard_get() == "gh-plaintext", app.clipboard_get())
check("still masked after copy", app.tree.item(target)["values"][1] == pv.MASK)
check("clipboard wipe scheduled", app.clip._after_id is not None)

# cancel the pending wipe so the test does not sit waiting
app.clip.cancel()
app.clip._wipe()
app.update()
check("wipe clears the clipboard", app.clipboard_get() in ("", None), repr(app.clipboard_get()))

# ---- edit --------------------------------------------------------------
row = app._selected()
ed = pv.Editor(app, row)
ed.win.update()
check("editor prefills name", ed.name.get() == "GitHub")
check("editor prefills password", ed.password.get() == "gh-plaintext")
check("editor prefills details", ed.details.get("1.0", "end").strip() == "work account")
ed.name.delete(0, "end")
ed.name.insert(0, "GitHub EE")
ed._save()
app.update()
check("edit applied", any(i["name"] == "GitHub EE" for i in app.vault.items()))

# ---- suggest button ----------------------------------------------------
ed = pv.Editor(app, None)
ed.win.update()
ed.name.insert(0, "Temp")
ed._suggest()
suggested = ed.password.get()
check("suggest fills a strong password", len(suggested) == 20 and suggested != "Temp")
ed.win.destroy()
app.update()

# ---- delete ------------------------------------------------------------
victim = [i for i in app.vault.items() if i["name"] == "Bank"][0]
app.tree.selection_set(victim["id"])
app._on_select()
pv.messagebox.askyesno = lambda *a, **k: True
app.delete_selected()
app.update()
check("delete applied", not any(i["name"] == "Bank" for i in app.vault.items()))
check("tree refreshed after delete", len(app.tree.get_children()) == 2,
      str(len(app.tree.get_children())))

# ---- lock / unlock cycle ----------------------------------------------
app.lock_vault()
app.update()
check("locked clears the profile", app.vault.profile is None)
check("locked clears the passphrase", app.passphrase is None)
check("gate returns after lock", app.gate.winfo_exists() == 1)
check("vault persisted through lock", app.vault.has_profiles())

app.gate_profile.delete(0, "end")
app.gate_profile.insert(0, "Work")
app.gate_pass.delete(0, "end")
app.gate_pass.insert(0, "hunter2pass")
app._unlock()
app.update()
check("reunlock restores entries", len(app.vault.items()) == 2, str(len(app.vault.items())))
check("reunlock keeps encryption on", app.vault.encrypted is True)

# wrong passphrase must not open it
app.lock_vault()
app.update()
app.gate_profile.delete(0, "end")
app.gate_profile.insert(0, "Work")
app.gate_pass.delete(0, "end")
app.gate_pass.insert(0, "wrongpass")
app._unlock()
app.update()
check("wrong passphrase leaves it locked", app.vault.profile is None)
check("wrong passphrase shows a message", app.gate_status.cget("text") != "")

app.destroy()

# ---- typing a long passphrase must not blow up the event bindings -------
# Regression: _idle used to re-register bind_all(add="+") on every keystroke,
# so the binding script doubled per character and froze the windowed build.
app2 = pv.App()
app2.update()


def key_binding_bytes(w):
    return len(w.tk.call("bind", "all", "<Key>") or "")


app2.gate_profile.insert(0, "LongTyping")
app2.gate_pass.insert(0, "x" * 40)
before = key_binding_bytes(app2)
for _ in range(40):
    app2.event_generate("<Key>")
    app2.update()
after = key_binding_bytes(app2)
check("40 keystrokes do not grow the <Key> binding", after == before,
      f"{before} -> {after} bytes")
check("binding stays small while typing", after < 4096, f"{after} bytes")
app2.destroy()

print("\n{} passed, {} failed".format(passed, failed))
sys.exit(1 if failed else 0)


