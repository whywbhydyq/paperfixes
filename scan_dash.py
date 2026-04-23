with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if 'tabRef' in line or 'scrollIntoView' in line:
        print(f'L{i}: {line}', end='')
