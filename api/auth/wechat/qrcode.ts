import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: '微信登录已停用，请使用手机号或邮箱登录',
    qrUrl: '',
    scene: '',
  });
}
