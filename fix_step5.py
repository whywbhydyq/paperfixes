# ============================================================
# 更新 .env - 添加码支付配置（不删除现有配置）
# ============================================================
with open('.env', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复OpenRouter模型名
if 'google/gemini-3-flash-preview' in content:
    content = content.replace('google/gemini-3-flash-preview', 'google/gemini-2.0-flash-001')
    print('✅ 修复 .env OPENROUTER_MODEL')

# 添加码支付配置
epay_config = """
# 码支付配置
EPAY_PID=11177
EPAY_KEY=LoUYaj45n4iQTf4yNdpT
EPAY_API=https://xpay.com
"""
if 'EPAY_PID' not in content:
    content = content.rstrip() + '\n' + epay_config
    print('✅ 添加码支付环境变量')
else:
    print('ℹ️ 码支付配置已存在')

# 移除末尾多余的 ?sslmode=require
if '\n?sslmode=require' in content:
    content = content.replace('\n?sslmode=require', '')
    print('✅ 移除多余的 ?sslmode=require')

with open('.env', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n.env 更新完成！')
print('\n⚠️  重要提示：')
print('1. 请在 Vercel 项目设置 → Environment Variables 中添加：')
print('   EPAY_PID=11177')
print('   EPAY_KEY=LoUYaj45n4iQTf4yNdpT')
print('   EPAY_API=https://xpay.com  (替换为你的实际域名)')
print('   OPENROUTER_MODEL=google/gemini-2.0-flash-001')
print('   OPENROUTER_API_KEY=<你的新Key>')
print('2. OpenRouter Key 已失效(401)，需要在 openrouter.ai 重新获取')
