import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# Fix 1: Free tier quota = 2
# ============================================================

# 1a: sms.ts - new user registration quota
fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_q1 = "data: { phone, plan: 'free', quota: 3, totalUsed: 0, role: 'user' },"
new_q1 = "data: { phone, plan: 'free', quota: 2, totalUsed: 0, role: 'user' },"
if old_q1 in c:
    c = c.replace(old_q1, new_q1, 1)
    changed = True
else:
    print('[WARNING] sms.ts: quota: 3 not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] sms.ts: new user quota 3 -> 2')

# 1b: admin/index.ts - default free plan quota
fpath = os.path.join('api', 'admin', 'index.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_q2 = "planKey: 'free', name: '\u514d\u8d39\u4f53\u9a8c', price: 0, quota: 5,"
new_q2 = "planKey: 'free', name: '\u514d\u8d39\u4f53\u9a8c', price: 0, quota: 2,"
if old_q2 in c:
    c = c.replace(old_q2, new_q2, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] admin/index.ts: free plan quota 5 -> 2')
else:
    print('[WARNING] admin/index.ts: free plan quota not found')

# ============================================================
# Fix 2: Backend char count excludes whitespace (align with frontend)
# ============================================================
fpath = os.path.join('api', 'rewrite', 'submit.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_ch1 = "  const trimmed = text.trim();\n\n  if (trimmed.length < limits.minChars) {"
new_ch1 = "  const trimmed = text.trim();\n  const charCount = trimmed.replace(/\\s/g, '').length;\n\n  if (charCount < limits.minChars) {"
if old_ch1 in c:
    c = c.replace(old_ch1, new_ch1, 1)
    changed = True
else:
    print('[WARNING] submit.ts: minChars check not found')

old_ch2 = "  if (trimmed.length > limits.maxChars) {"
new_ch2 = "  if (charCount > limits.maxChars) {"
if old_ch2 in c:
    c = c.replace(old_ch2, new_ch2, 1)
    changed = True
else:
    print('[WARNING] submit.ts: maxChars check not found')

old_ch3 = "data: { userId, inputText: trimmed, inputLen: trimmed.length, status: 'PENDING' },"
new_ch3 = "data: { userId, inputText: trimmed, inputLen: charCount, status: 'PENDING' },"
if old_ch3 in c:
    c = c.replace(old_ch3, new_ch3, 1)
    changed = True
else:
    print('[WARNING] submit.ts: inputLen not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] submit.ts: char count now excludes whitespace (aligned with frontend)')
else:
    print('[WARNING] submit.ts: no changes')

# ============================================================
# Fix 3: SMS - send first, save to DB only on success
# Prevents: send fails -> DB record blocks retries for 60s -> all 429
# ============================================================
fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace entire 'send' action block
old_send = """  if (action === 'send') {
    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        const recent = await tx.smsCode.findFirst({
          where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
          orderBy: { createdAt: 'desc' },
        });
        if (recent) {
          throw new Error('RATE_LIMIT_60S');
        }

        const dailyCount = await tx.smsCode.count({
          where: {
            phone,
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (dailyCount >= 10) {
          throw new Error('RATE_LIMIT_DAILY');
        }

        await tx.smsCode.deleteMany({ where: { phone, expiresAt: { lt: new Date() } } });
        await tx.smsCode.create({ data: { phone, code: newCode, expiresAt } });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'RATE_LIMIT_60S') {
        return res.status(429).json({ success: false, message: '\u53d1\u9001\u592a\u9891\u7e41\uff0c\u8bf760\u79d2\u540e\u518d\u8bd5' });
      }
      if (msg === 'RATE_LIMIT_DAILY') {
        return res.status(429).json({ success: false, message: '\u8be5\u624b\u673a\u53f7\u4eca\u65e5\u53d1\u9001\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u660e\u5929\u518d\u8bd5' });
      }
      console.error('[SMS] \u4e8b\u52a1\u9519\u8bef:', err);
      return res.status(500).json({ success: false, message: '\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' });
    }

    const ok = await sendSms(phone, newCode);
    if (!ok) {
      return res.status(500).json({ success: false, message: '\u9a8c\u8bc1\u7801\u53d1\u9001\u5931\u8d25' });
    }

    const isDev = !process.env.ALIYUN_ACCESS_KEY_ID;
    return res.status(200).json({
      success: true,
      message: '\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001',
      ...(isDev ? { devCode: newCode } : {}),
    });
  }"""

new_send = """  if (action === 'send') {
    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return res.status(429).json({ success: false, message: '\u53d1\u9001\u592a\u9891\u7e41\uff0c\u8bf760\u79d2\u540e\u518d\u8bd5' });
    }

    const dailyCount = await prisma.smsCode.count({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (dailyCount >= 10) {
      return res.status(429).json({ success: false, message: '\u8be5\u624b\u673a\u53f7\u4eca\u65e5\u53d1\u9001\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u660e\u5929\u518d\u8bd5' });
    }

    const newCode = generateCode();
    const ok = await sendSms(phone, newCode);
    if (!ok) {
      return res.status(500).json({ success: false, message: '\u9a8c\u8bc1\u7801\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.smsCode.deleteMany({ where: { phone, expiresAt: { lt: new Date() } } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });

    const isDev = !process.env.ALIYUN_ACCESS_KEY_ID;
    return res.status(200).json({
      success: true,
      message: '\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001',
      ...(isDev ? { devCode: newCode } : {}),
    });
  }"""

if old_send in c:
    c = c.replace(old_send, new_send, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] sms.ts: restructured - check limits -> send SMS -> save to DB only on success')
else:
    print('[WARNING] sms.ts: send action block not found')

print('\n=== Batch 6 done ===')
