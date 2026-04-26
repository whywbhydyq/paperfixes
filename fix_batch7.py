import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# 1. Rewrite api/_lib/sms.ts - direct HTTP, no @alicloud/pop-core
# ============================================================
fpath = os.path.join('api', '_lib', 'sms.ts')
new_content = """import { createHmac, randomUUID } from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\\(/g, '%28')
    .replace(/\\)/g, '%29')
    .replace(/\\*/g, '%2A');
}

export async function sendSms(phone: string, code: string): Promise<boolean> {
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
    Timestamp: new Date().toISOString().replace(/\\.\\d{3}Z$/, 'Z'),
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
    console.log('[SMS] \u963f\u91cc\u4e91\u8fd4\u56de:', JSON.stringify(data));

    if (data.Code === 'OK') return true;
    console.error(`[SMS] \u53d1\u9001\u5931\u8d25: ${data.Code} - ${data.Message}`);
    return false;
  } catch (err) {
    console.error('[SMS] \u8bf7\u6c42\u5f02\u5e38:', err);
    return false;
  }
}
"""

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('[OK] api/_lib/sms.ts: rewritten with direct HTTP (removed @alicloud/pop-core)')

# ============================================================
# 2. Remove @alicloud/pop-core from package.json
# ============================================================
fpath = 'package.json'
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_dep = '    "@alicloud/pop-core": "^1.7.12",\n'
if old_dep in c:
    c = c.replace(old_dep, '')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] package.json: removed @alicloud/pop-core dependency')
else:
    print('[WARNING] package.json: @alicloud/pop-core not found')

print('\n=== Batch 7 done ===')
