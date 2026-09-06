import glob
import os
import re

SUPABASE_CDN = b'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n  '

files = glob.glob('tutorials/**/*.html', recursive=True)

updated = []
skipped = []
for f in files:
    name = f.replace('\\', '/')
    if name == 'tutorials/index.html':
        continue
    with open(f, 'rb') as fh:
        content = fh.read()

    if b'js/progress.js' in content:
        continue

    if b'</body>' not in content:
        skipped.append(name)
        continue

    rel = os.path.relpath('tutorials/js', os.path.dirname(f)).replace('\\', '/')
    tag = b'<script src="' + rel.encode() + b'/progress.js"></script>\n'

    insert = b''
    if b'supabase-js@2' not in content:
        insert += SUPABASE_CDN

    content = content.replace(b'</body>', insert + tag + b'</body>', 1)

    with open(f, 'wb') as fh:
        fh.write(content)
    updated.append(name)

print(f'Updated {len(updated)} files, skipped {len(skipped)} files')
for name in updated:
    print(f'  + {name}')
for name in skipped:
    print(f'  - skipped (no </body>): {name}')
