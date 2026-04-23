with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 在 import submitRewriteJob 后面加 fetchPlanLimits 的 API 调用
old_import = "import { submitRewriteJob } from '../lib/api';"
new_import = """import { submitRewriteJob } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchPlanMaxChars(plan: string, token: string | null): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/admin?resource=config`);
    const data = await res.json();
    if (data.plans) {
      const found = data.plans.find((p: { planKey: string; maxChars: number }) => p.planKey === plan);
      if (found) return found.maxChars;
    }
  } catch {}
  // 兜底
  const defaults: Record<string, number> = { free: 500, basic: 3000, pro: 5000 };
  return defaults[plan] ?? 500;
}"""

if old_import in content and 'fetchPlanMaxChars' not in content:
    content = content.replace(old_import, new_import)
    print('OK: 添加 fetchPlanMaxChars')
else:
    print('SKIP/WARN: import 替换跳过')

# 2. 删除硬编码的 PLAN_MAX_CHARS
old_const = """const MIN_CHARS = 40;
const PLAN_MAX_CHARS: Record<string, number> = {
  free: 500,
  basic: 3000,
  pro: 5000,
};"""
new_const = "const MIN_CHARS = 40;"

if old_const in content:
    content = content.replace(old_const, new_const)
    print('OK: 删除硬编码 PLAN_MAX_CHARS')
else:
    print('WARN: 未找到 PLAN_MAX_CHARS 定义')

# 3. 把 MAX_CHARS 改成 state，初始值用兜底
old_max = "  const MAX_CHARS = PLAN_MAX_CHARS[user?.plan ?? 'free'] ?? 500;"
new_max = """  const [MAX_CHARS, setMaxChars] = useState(500);

  // 动态拉取当前套餐的 maxChars
  useEffect(() => {
    fetchPlanMaxChars(user?.plan ?? 'free', token).then(setMaxChars);
  }, [user?.plan, token]);"""

if old_max in content:
    content = content.replace(old_max, new_max)
    print('OK: MAX_CHARS 改为动态 state')
else:
    print('WARN: 未找到 MAX_CHARS 定义行')

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('=== Fix2 完成 ===')
