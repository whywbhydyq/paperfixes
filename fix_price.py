import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

fpath = os.path.join('src', 'pages', 'AdminPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old = "updated[idx] = { ...updated[idx], [field]: parseInt(e.target.value) || 0 };"
new = "updated[idx] = { ...updated[idx], [field]: parseFloat(e.target.value) || 0 };"

if old in c:
    c = c.replace(old, new)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] AdminPage.tsx: parseInt -> parseFloat (supports decimal prices)')
else:
    print('[WARNING] not found')

print('=== Done ===')
