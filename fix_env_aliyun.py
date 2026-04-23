# 先检查 .env 里有没有阿里云配置
with open('.env', 'r', encoding='utf-8') as f:
    env = f.read()

if 'ALIYUN_ACCESS_KEY_ID' not in env:
    env += '\n# 阿里云号码认证短信服务\nALIYUN_ACCESS_KEY_ID=\nALIYUN_ACCESS_KEY_SECRET=\n'
    with open('.env', 'w', encoding='utf-8') as f:
        f.write(env)
    print('OK: 已在 .env 添加阿里云配置项，请填入你的 AccessKeyId 和 AccessKeySecret')
else:
    print('SKIP: .env 已有阿里云配置')
