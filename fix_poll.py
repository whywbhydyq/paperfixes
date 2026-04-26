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

ok = 0
fail = 0

# PricingPage - 增加最大轮询时间和提示
r = safe_replace('src/pages/PricingPage.tsx',
    "  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);",
    "  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);\n  const pollStartRef = useRef<number>(0);",
    'PricingPage 加 pollStartRef')
ok += r; fail += (not r)

r = safe_replace('src/pages/PricingPage.tsx',
    """      pollTimerRef.current = setInterval(() => {
        checkPayment(true);
      }, 3000);""",
    """      pollStartRef.current = Date.now();\n      pollTimerRef.current = setInterval(() => {\n        // 最多轮询5分钟\n        if (Date.now() - pollStartRef.current > 5 * 60 * 1000) {\n          if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }\n          return;\n        }\n        checkPayment(true);\n      }, 3000);""",
    'PricingPage 轮询5分钟')
ok += r; fail += (not r)

print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
