import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

fpath = 'package.json'
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

if 'pop-core' in c:
    import re
    c = re.sub(r'\s*"[^"]*pop-core[^"]*"\s*:\s*"[^"]*"[,\n]*\n?', '\n', c)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] package.json: removed pop-core (regex)')
else:
    print('[OK] package.json: pop-core not present, already clean')
