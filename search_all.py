import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

print("=== passwordHash references ===")
for dirpath, dirnames, filenames in os.walk('src'):
    for fn in filenames:
        if not fn.endswith(('.tsx', '.ts')): continue
        fp = os.path.join(dirpath, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if 'passwordHash' in line:
                print(f'  {fp}:{i+1}: {line.strip()}')

print("\n=== char count display ===")
for dirpath, dirnames, filenames in os.walk('src'):
    for fn in filenames:
        if not fn.endswith(('.tsx', '.ts')): continue
        fp = os.path.join(dirpath, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            s = line.strip()
            if '/' in s and ('字' in s) and ('max' in s.lower() or '3000' in s or '500' in s):
                print(f'  {fp}:{i+1}: {s}')

print("\n=== char count logic ===")
for dirpath, dirnames, filenames in os.walk('src'):
    for fn in filenames:
        if not fn.endswith(('.tsx', '.ts')): continue
        fp = os.path.join(dirpath, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            s = line.strip()
            if ('countChar' in s or 'charCount' in s) and 'function' not in s.lower():
                print(f'  {fp}:{i+1}: {s}')

print('\n=== Done ===')
