import { createHmac, randomUUID } from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

export async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    console.log(`[SMS] 开发模式：未配置阿里云密钥，验证码 = ${code}`);
    return true;
  }

  const signName = process.env.SMS_SIGN_NAME || '速通互联验证码';
  const templateCode = process.env.SMS_TEMPLATE_CODE || '100001';

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  };

  // Step 1: Sort and percent-encode parameters
  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  // Step 2: Construct string to sign
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;

  // Step 3: HMAC-SHA1 signature
  const signature = createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  // Step 4: Build final URL
  const url = `https://dysmsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('[SMS] 阿里云返回:', JSON.stringify(data));

    if (data.Code === 'OK') return true;
    console.error(`[SMS] 发送失败: ${data.Code} - ${data.Message}`);
    return false;
  } catch (err) {
    console.error('[SMS] 请求异常:', err);
    return false;
  }
}
