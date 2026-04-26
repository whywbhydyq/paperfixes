import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_func = """async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    console.log('[SMS-DEV] ', phone, ' => ', code);
    return true;
  }

  const params = new URLSearchParams();
  params.set('AccessKeyId', accessKeyId);
  params.set('Action', 'SendSms');
  params.set('Format', 'JSON');
  params.set('PhoneNumbers', phone);
  params.set('RegionId', 'cn-hangzhou');
  params.set('SignName', signName || '');
  params.set('SignatureMethod', 'HMAC-SHA1');
  params.set('SignatureNonce', crypto.randomUUID());
  params.set('SignatureVersion', '1.0');
  params.set('TemplateCode', templateCode || '');
  params.set('TemplateParam', JSON.stringify({ code }));
  params.set('Timestamp', new Date().toISOString().replace(/\\.\\d+Z/, 'Z'));
  params.set('Version', '2017-05-25');

  const sorted = [...params.entries()].sort(([a],[b]) => a.localeCompare(b));
  const canonicalized = sorted.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`;
  const signature = crypto.createHmac('sha1', accessKeySecret + '&').update(stringToSign).digest('base64');
  params.set('Signature', signature);

  try {
    const res = await fetch(`https://dysmsapi.aliyuncs.com/?${params.toString()}`);
    const data = await res.json() as any;
    console.log('[SMS] \\u963f\\u91cc\\u4e91\\u8fd4\\u56de:', JSON.stringify(data));
    return data.Code === 'OK';
  } catch (err) {
    console.error('[SMS] \\u53d1\\u9001\\u5931\\u8d25:', err);
    return false;
  }
}"""

new_func = """async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    console.log('[SMS-DEV] ', phone, ' => ', code);
    return true;
  }

  const signName = process.env.SMS_SIGN_NAME || '\\u901f\\u901a\\u4e92\\u8054\\u9a8c\\u8bc1\\u7801';
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
    Timestamp: new Date().toISOString().replace(/\\.\\d+Z/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQuery)}`;
  const signature = crypto.createHmac('sha1', accessKeySecret + '&').update(stringToSign).digest('base64');

  try {
    const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${encodeURIComponent(signature)}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    console.log('[SMS] \\u963f\\u91cc\\u4e91\\u8fd4\\u56de:', JSON.stringify(data));
    return data.Code === 'OK' && data.Success === true;
  } catch (err) {
    console.error('[SMS] \\u53d1\\u9001\\u5931\\u8d25:', err);
    return false;
  }
}"""

if old_func in c:
    c = c.replace(old_func, new_func, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api/auth/sms.ts: local sendSms replaced with dypnsapi + SendSmsVerifyCode')
else:
    print('[ERROR] old sendSms function not found!')

print('=== Done ===')
