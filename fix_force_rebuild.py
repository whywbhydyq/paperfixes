import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add version log at the very start of the handler to force rebuild
old_handler = 'export default async function handler(req: VercelRequest, res: VercelResponse) {\n  if (req.method !=='
new_handler = "export default async function handler(req: VercelRequest, res: VercelResponse) {\n  console.log('[SMS API] version=dypnsapi-v2');\n  if (req.method !=="

if old_handler in c:
    c = c.replace(old_handler, new_handler, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api/auth/sms.ts: added version log to force rebuild')
else:
    print('[WARNING] api/auth/sms.ts: handler not found')

print('=== Done ===')
