import os

root = os.path.dirname(os.path.abspath(__file__))

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f"⚠️ [{label}] 未找到 in {filepath}")
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

# 找到 PricingPage 的 import 行，在它后面加 PaymentDonePage
safe_replace('src/App.tsx',
    'import PricingPage from',
    'import PaymentDonePage from "./pages/PaymentDonePage";\nimport PricingPage from',
    'App.tsx import PaymentDonePage')

# 找到 pricing 路由，在它后面加 /payment/done 路由
safe_replace('src/App.tsx',
    '<Route path="/pricing" element={<PricingPage />} />',
    '<Route path="/pricing" element={<PricingPage />} />\n          <Route path="/payment/done" element={<PaymentDonePage />} />',
    'App.tsx 添加 /payment/done 路由')
