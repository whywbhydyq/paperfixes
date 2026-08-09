import { createHmac, randomUUID } from 'node:crypto';

export type SmsDelivery = { mode: 'provider' | 'development' };

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

export async function sendSms(phone: string, code: string): Promise<SmsDelivery> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS provider is not configured');
    }
    console.info('[SMS] development delivery bypass enabled');
    return { mode: 'development' };
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSmsVerifyCode',
    CodeLength: '6',
    CodeType: '1',
    Format: 'JSON',
    Interval: '60',
    PhoneNumber: phone,
    RegionId: 'cn-hangzhou',
    SignName: process.env.SMS_SIGN_NAME || '速通互联验证码',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: process.env.SMS_TEMPLATE_CODE || '100001',
    TemplateParam: JSON.stringify({ code, min: '5' }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  const signature = createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');
  const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as { Code?: string; Success?: boolean };
    if (data.Code === 'OK' && data.Success === true) return { mode: 'provider' };
    console.error('[SMS] provider rejected request', { code: data.Code });
    throw new Error('SMS provider rejected the request');
  } catch (error) {
    console.error('[SMS] provider request failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    throw new Error('SMS provider rejected the request');
  }
}
