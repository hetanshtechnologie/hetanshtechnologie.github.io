import glob

files = glob.glob('tutorials/**/*.html', recursive=True)

GARBLED = b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x80\x9a\xc2\xac\xc3\xa2\xe2\x82\xac\xc2\x9d'
PROPER = b'\xe2\x80\x94'

fixed = []
for f in files:
    with open(f, 'rb') as fh:
        content = fh.read()
    if GARBLED not in content:
        continue
    content = content.replace(GARBLED, PROPER)
    with open(f, 'wb') as fh:
        fh.write(content)
    fixed.append(f)

print(f'Fixed {len(fixed)} files')
for f in fixed:
    name = f.replace('tutorials/', '').replace('\\', '/')
    print(f'  {name}')
