import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 微信扫码登录 - 轮询扫码状态 (Stub)
 *
 * 生产环境逻辑:
 * 1. 用 scene ID 查询 Redis/DB 中的扫码状态
 * 2. 如果用户已扫码确认，创建/查找用户并返回 JWT
 *
 * 当前返回过期状态，引导用户使用邮箱登录
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scene } = req.query;

  if (!scene || typeof scene !== 'string') {
    return res.status(400).json({ error: '缺少 scene 参数' });
  }

  // TODO: 对接微信公众号扫码回调
  // const status = await checkScanStatus(scene);
  // if (status === 'confirmed') { ... }

  return res.status(200).json({
    status: 'expired',
    message: '微信扫码登录功能尚未配置，请使用邮箱登录',
  });
}
