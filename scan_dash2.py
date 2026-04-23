with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    print(f'{i:3d} | {line}', end='')
