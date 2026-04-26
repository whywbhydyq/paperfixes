import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace: import { sendSms } -> inline the entire function
old_imp = "import { sendSms } from '../_lib/sms.js';"
new_imp = """import { createHmac, randomUUID } from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\\(/g, '%28')
    .replace(/\\)/g, '%29')
    .replace(/\\*/g, '%2A');
}

async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    console.log(`[SMS] \u5f00\u53d1\u6a21\u5f0f\uff1a\u672a\u914d\u7f6e\u963f\u91cc\u4e91\u5bc6\u94a5\uff0c\u9a8c\u8bc1\u7801 = ${code}`);
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
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code, min: '5' }),
    Timestamp: new Date().toISOString().replace(/\\.\\d{3}Z$/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;

  const signature = createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('[SMS] \u963f\u91cc\u4e91\u8fd4\u56de:', JSON.stringify(data));

    if (data.Code === 'OK' && data.Success) return true;
    console.error(`[SMS] \u53d1\u9001\u5931\u8d25: ${data.Code} - ${data.Message}`);
    return false;
  } catch (err) {
    console.error('[SMS] \u8bf7\u6c42\u5f02\u5e38:', err);
    return false;
  }
}"""

if old_imp in c:
    c = c.replace(old_imp, new_imp, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api/auth/sms.ts: sendSms inlined, no more import from _lib')
else:
    print('[ERROR] import line not found!')

print('=== Done ===')
