import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

fpath = os.path.join('api', 'auth', 'phone-login.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old = '      totalUsed: user.totalUsed,\n    },\n    token,'
new = '      totalUsed: user.totalUsed,\n      hasPassword: !!user.passwordHash,\n    },\n    token,'

if old in c:
    c = c.replace(old, new, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] phone-login.ts: added hasPassword')
else:
    print('[WARNING] not found')

print('=== Done ===')
