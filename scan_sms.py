with open('api/auth/sms.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if 'SendSmsVerifyCode' in line or 'signName' in line.lower() or 'templateCode' in line.lower() or 'SignName' in line or 'TemplateCode' in line:
        start = max(0, i-3)
        end = min(len(lines), i+5)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j]}', end='')
        print('---')
