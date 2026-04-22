import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 微信扫码登录 - 获取二维码 (Stub)
 *
 * 生产环境需要:
 * 1. 注册微信公众号 (服务号)
 * 2. 获取 AppID + AppSecret
 * 3. 调用微信 API 生成带参数的二维码
 * 4. 用户扫码后通过公众号事件推送获取 OpenID
 *
 * 当前返回一个占位响应，前端会显示"二维码已过期"并提供刷新按钮
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: 对接微信公众号 API
  // const { createQrCode } = require('../_lib/wechat');
  // const { qrUrl, scene } = await createQrCode();

  return res.status(200).json({
    qrUrl: '',
    scene: '',
    message: '微信扫码登录功能尚未配置，请使用邮箱登录',
  });
}
