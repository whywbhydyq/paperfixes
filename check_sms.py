import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

fpath = os.path.join('api', '_lib', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

if 'dypnsapi' in c:
    print('[OK] sms.ts contains dypnsapi — code is correct')
elif 'dysmsapi' in c:
    print('[ERROR] sms.ts still has dysmsapi — batch 8 did NOT apply!')
else:
    print('[UNKNOWN] neither domain found')

if 'SendSmsVerifyCode' in c:
    print('[OK] Action = SendSmsVerifyCode')
elif 'SendSms' in c and 'VerifyCode' not in c:
    print('[ERROR] Action still = SendSms')

if 'PhoneNumber' in c and 'PhoneNumbers' not in c:
    print('[OK] Parameter = PhoneNumber')
elif 'PhoneNumbers' in c:
    print('[ERROR] Parameter still = PhoneNumbers')

print('\n--- File content (first 20 lines) ---')
for i, line in enumerate(c.split('\n')[:20], 1):
    print(f'{i:3}: {line}')
