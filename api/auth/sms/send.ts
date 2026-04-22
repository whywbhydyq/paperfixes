import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/prisma.js';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone } = req.body || {};
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  // 频率限制：60秒内只能发一次
  const recent = await prisma.smsCode.findFirst({
    where: {
      phone,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    return res.status(429).json({ error: '发送太频繁，请60秒后再试' });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效

  await prisma.smsCode.create({
    data: { phone, code, expiresAt },
  });

  // TODO: 接入真实短信服务商（阿里云/腾讯云）
  // 目前开发模式：直接返回验证码（生产环境删除code字段）
  const isDev = process.env.NODE_ENV !== 'production';
  
  console.log(`[SMS] phone=${phone} code=${code}`);

  return res.status(200).json({
    success: true,
    message: '验证码已发送',
    // 开发模式暴露验证码，生产环境去掉
    ...(isDev ? { devCode: code } : {}),
  });
}