import { createHash } from 'crypto';

export function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const sign = createHash('md5').update(str + key).digest('hex');
  console.log('[支付] 待签名字符串:', str + key);
  console.log('[支付] 签名结果:', sign);
  return sign;
}
