import sys

def fix(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f'[WARN] 未找到目标文本，跳过: {label}')
        return
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.replace(old, new, 1))
    print(f'[OK] 已修复: {label}')

# PricingPage.tsx: checkPayment 中动态 import 后错误地直接调用了
# api 模块的 fetchQuota 作为 updateQuota，正确做法是先 fetch 再
# 调用 store 的 updateQuota
fix(
    'src/pages/PricingPage.tsx',
    '''    const { fetchQuota, updateQuota } = await import('../lib/api');
        const quotaData = await fetchQuota(useAuthStoreRef.token);
        updateQuota(quotaData.quota, quotaData.totalUsed);''',
    '''    const { fetchQuota } = await import('../lib/api');
        const { updateQuota } = useAuthStore.getState();
        const quotaData = await fetchQuota(useAuthStoreRef.token);
        updateQuota(quotaData.quota, quotaData.totalUsed);''',
    'PricingPage checkPayment: 用 store.getState().updateQuota 替换错误的 api updateQuota'
)

sys.exit(0)
