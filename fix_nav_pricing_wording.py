import re

# ============================================================
# Fix 6: "正在思考中..." -> "正在思考..."
# ============================================================
with open('src/components/JobPoller.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = "'正在思考中...'"
new = "'正在思考...'"
if old in content:
    content = content.replace(old, new)
    with open('src/components/JobPoller.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK Fix6: JobPoller 文案已修改')
else:
    print('WARN Fix6: 未找到目标文案')

# ============================================================
# Fix 1: Navbar 加"修改历史"链接（指向 /dashboard 的 history tab）
# ============================================================
with open('src/components/Navbar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = "  const navLinks = [\n    { to: '/', label: '开始改写', matchExact: true },\n    { to: '/home', label: '了解更多' },\n    { to: '/pricing', label: '定价' },\n  ];"
new = "  const navLinks = [\n    { to: '/', label: '开始改写', matchExact: true },\n    { to: '/home', label: '了解更多' },\n    { to: '/pricing', label: '定价' },\n    { to: '/dashboard?tab=history', label: '修改历史' },\n  ];"

if old in content:
    content = content.replace(old, new)
    with open('src/components/Navbar.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK Fix1: Navbar 已添加修改历史')
else:
    print('WARN Fix1: 未找到 navLinks，尝试备用定位...')
    # 备用：精确找到定价那行后面插入
    old2 = "    { to: '/pricing', label: '定价' },\n  ];"
    new2 = "    { to: '/pricing', label: '定价' },\n    { to: '/dashboard?tab=history', label: '修改历史' },\n  ];"
    if old2 in content:
        content = content.replace(old2, new2)
        with open('src/components/Navbar.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK Fix1(备用): Navbar 已添加修改历史')
    else:
        print('WARN Fix1: 两种方式都未找到，请手动检查')

# ============================================================
# Fix 4: 定价页 - 加模块级缓存，避免每次点进来都重新请求
# ============================================================
with open('src/pages/PricingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old4 = "const API_BASE = import.meta.env.VITE_API_BASE || '';"
new4 = """const API_BASE = import.meta.env.VITE_API_BASE || '';

// 模块级缓存，整个 session 只请求一次
let _cachedPlans: PlanConfig[] | null = null;"""

if old4 in content and '_cachedPlans' not in content:
    content = content.replace(old4, new4)

    # 替换 fetch 逻辑，使用缓存
    old4b = """  useEffect(() => {
    fetch(`${API_BASE}/api/admin?resource=config`)
      .then(r => r.json())
      .then(d => { setPlans(d.plans || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);"""

    new4b = """  useEffect(() => {
    if (_cachedPlans) {
      setPlans(_cachedPlans);
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/admin?resource=config`)
      .then(r => r.json())
      .then(d => {
        const plans = d.plans || [];
        _cachedPlans = plans;
        setPlans(plans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);"""

    if old4b in content:
        content = content.replace(old4b, new4b)
        with open('src/pages/PricingPage.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK Fix4: 定价页已添加缓存')
    else:
        print('WARN Fix4: useEffect fetch 未找到精确匹配')
else:
    if '_cachedPlans' in content:
        print('SKIP Fix4: 缓存已存在')
    else:
        print('WARN Fix4: API_BASE 未找到')

print('\n=== 完成 ===')
