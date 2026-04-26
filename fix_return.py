import os

root = os.path.dirname(os.path.abspath(__file__))

def write_file(rel_path, content):
    abs_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ 写入 {rel_path}")

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️ 文件不存在: {filepath}")
        return False
    if old not in content:
        print(f"⚠️ [{label}] 未找到 in {filepath}")
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

# ═══════════════════════════════════════════
# 1. api/payment/create.ts - return_url 改为 /payment/done
# ═══════════════════════════════════════════
safe_replace('api/payment/create.ts',
    "    return_url:  `${site}/pricing?from_pay=1&order=${orderId}`,",
    "    return_url:  `${site}/payment/done`,",
    'create.ts return_url 改为 /payment/done')

# ═══════════════════════════════════════════
# 2. src/pages/PaymentDonePage.tsx - 中间页，自动关闭
# ═══════════════════════════════════════════
write_file('src/pages/PaymentDonePage.tsx', """import { useEffect } from 'react';

export default function PaymentDonePage() {
  useEffect(() => {
    // 尝试自动关闭标签页
    const timer = setTimeout(() => {
      window.close();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className=\"flex min-h-screen items-center justify-center bg-gray-50\">
      <div className=\"text-center\">
        <div className=\"mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100\">
          <svg className=\"h-8 w-8 text-green-600\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" strokeWidth={2}>
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" d=\"M5 13l4 4L19 7\" />
          </svg>
        </div>
        <h2 className=\"text-lg font-semibold text-gray-900\">支付处理中</h2>
        <p className=\"mt-2 text-sm text-gray-500\">请返回原页面查看结果</p>
        <p className=\"mt-4 text-xs text-gray-400\">此页面将自动关闭...</p>
        <button
          onClick={() => window.close()}
          className=\"mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100\"
        >
          关闭此页
        </button>
      </div>
    </div>
  );
}
""")

# ═══════════════════════════════════════════
# 3. src/App.tsx - 添加 /payment/done 路由
# ═══════════════════════════════════════════
safe_replace('src/App.tsx',
    "import LandingPage from './pages/LandingPage';",
    "import LandingPage from './pages/LandingPage';\nimport PaymentDonePage from './pages/PaymentDonePage';",
    'App.tsx import PaymentDonePage')

safe_replace('src/App.tsx',
    "          <Route path='/pricing' element={<PricingPage />} />",
    "          <Route path='/pricing' element={<PricingPage />} />\n          <Route path='/payment/done' element={<PaymentDonePage />} />",
    'App.tsx 添加 /payment/done 路由')

print("\n✅ 全部完成")
