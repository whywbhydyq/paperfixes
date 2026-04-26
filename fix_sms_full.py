import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

fpath = os.path.join('api', 'auth', 'sms.ts')

new_content = """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    console.log('[SMS-DEV] ', phone, ' => ', code);
    return true;
  }

  const signName = process.env.SMS_SIGN_NAME || '\u901f\u901a\u4e92\u8054\u9a8c\u8bc1\u7801';
  const templateCode = process.env.SMS_TEMPLATE_CODE || '100001';

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSmsVerifyCode',
    CodeLength: '6',
    CodeType: '1',
    Format: 'JSON',
    Interval: '60',
    PhoneNumber: phone,
    RegionId: 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code, min: '5' }),
    Timestamp: new Date().toISOString().replace(/\.\d+Z/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  const signature = crypto.createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    console.log('[SMS] \u963f\u91cc\u4e91\u8fd4\u56de:', JSON.stringify(data));
    return data.Code === 'OK' && data.Success === true;
  } catch (err) {
    console.error('[SMS] \u53d1\u9001\u5931\u8d25:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, code } = req.body || {};

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: '\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u624b\u673a\u53f7' });
  }

  if (action === 'send') {
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
  }

  if (action === 'verify') {
    if (!code) return res.status(400).json({ error: '\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801' });

    const smsCode = await prisma.smsCode.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode || smsCode.code !== code) {
      return res.status(400).json({ error: '\u9a8c\u8bc1\u7801\u9519\u8bef\u6216\u5df2\u8fc7\u671f' });
    }

    await prisma.smsCode.delete({ where: { id: smsCode.id } });

    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, plan: 'free', quota: 2, totalUsed: 0, role: 'user' },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

    return res.status(200).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        wechatName: user.wechatName,
        role: user.role,
        plan: user.plan,
        quota: user.quota,
        totalUsed: user.totalUsed,
      },
      token,
      needsPassword: !user.passwordHash,
    });
  }

  return res.status(400).json({ error: '\u65e0\u6548\u64cd\u4f5c' });
}
"""

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('[OK] api/auth/sms.ts: full rewrite with dypnsapi + SendSmsVerifyCode + percentEncode')
print('=== Done ===')
