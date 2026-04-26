import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# api.ts - 综合修复（export request / type import / any→User / 添加函数）
# ============================================================
fpath = os.path.join('src', 'lib', 'api.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

# 1. Add type import (before const API_BASE)
old_c1 = """ */

const API_BASE ="""
new_c1 = """ */

import type { User } from '../store/useAuthStore';

const API_BASE ="""
if old_c1 in c:
    c = c.replace(old_c1, new_c1, 1)
    changed = True
else:
    print('[WARNING] api.ts: comment anchor not found')

# 2. Export request function
old_c2 = "async function request<T>(\n  path: string,\n  options: RequestInit = {},\n  token?: string | null\n): Promise<T> {"
new_c2 = "export async function request<T>(\n  path: string,\n  options: RequestInit = {},\n  token?: string | null\n): Promise<T> {"
if old_c2 in c:
    c = c.replace(old_c2, new_c2, 1)
    changed = True
else:
    print('[WARNING] api.ts: request function not found')

# 3. any -> User
for oa, na in [
    ("request<{ user: any; token: string; needsPassword?: boolean }>", "request<{ user: User; token: string; needsPassword?: boolean }>"),
    ("request<{ user: any; token: string }>('/api/auth/phone-login'", "request<{ user: User; token: string }>('/api/auth/phone-login'"),
]:
    if oa in c:
        c = c.replace(oa, na, 1)
        changed = True

# 4. Add JobRecord / fetchJobs / changePassword before CreatePaymentResponse
anchor4 = 'export interface CreatePaymentResponse {'
if anchor4 in c:
    ins = (
        "export interface JobRecord {\n"
        "  id: string;\n"
        "  inputText: string;\n"
        "  outputText: string | null;\n"
        "  status: string;\n"
        "  inputLen: number | null;\n"
        "  outputLen: number | null;\n"
        "  createdAt: string;\n"
        "  doneAt: string | null;\n"
        "}\n"
        "\n"
        "export async function fetchJobs(token: string | null): Promise<{ jobs: JobRecord[] }> {\n"
        "  return request<{ jobs: JobRecord[] }>('/api/user?action=jobs', {}, token);\n"
        "}\n"
        "\n"
        "export async function changePassword(\n"
        "  oldPassword: string,\n"
        "  newPassword: string,\n"
        "  token: string | null\n"
        "): Promise<{ success: boolean }> {\n"
        "  return request<{ success: boolean }>('/api/user?action=password', {\n"
        "    method: 'POST',\n"
        "    body: JSON.stringify({ oldPassword, newPassword }),\n"
        "  }, token);\n"
        "}\n"
        "\n"
    )
    c = c.replace(anchor4, ins + anchor4, 1)
    changed = True
else:
    print('[WARNING] api.ts: CreatePaymentResponse anchor not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api.ts: export request + type import + any->User + JobRecord/fetchJobs/changePassword')
else:
    print('[WARNING] api.ts: no changes')

# ============================================================
# useAuthStore.ts - export User interface
# ============================================================
fpath = os.path.join('src', 'store', 'useAuthStore.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_u = 'interface User {'
new_u = 'export interface User {'
if old_u in c:
    c = c.replace(old_u, new_u, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] useAuthStore.ts: exported User interface')
else:
    print('[WARNING] useAuthStore.ts: interface User not found')

# ============================================================
# LoginModal.tsx - any -> User | null
# ============================================================
fpath = os.path.join('src', 'components', 'LoginModal.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_li = "import { useAuthStore } from '../store/useAuthStore';"
new_li = "import { useAuthStore, type User } from '../store/useAuthStore';"
if old_li in c:
    c = c.replace(old_li, new_li, 1)
    changed = True
else:
    print('[WARNING] LoginModal.tsx: useAuthStore import not found')

old_an = "const [tempUser, setTempUser] = useState<any>(null);"
new_an = "const [tempUser, setTempUser] = useState<User | null>(null);"
if old_an in c:
    c = c.replace(old_an, new_an, 1)
    changed = True
else:
    print('[WARNING] LoginModal.tsx: useState<any> not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] LoginModal.tsx: any -> User | null')
else:
    print('[WARNING] LoginModal.tsx: no changes')

# ============================================================
# PricingPage.tsx - remove module-level cache
# ============================================================
fpath = os.path.join('src', 'pages', 'PricingPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_cv = "let _cachedPlans: PlanConfig[] | null = null;\n\nexport default function PricingPage()"
new_cv = "export default function PricingPage()"
if old_cv in c:
    c = c.replace(old_cv, new_cv, 1)
    changed = True
else:
    print('[WARNING] PricingPage.tsx: _cachedPlans var not found')

old_cc = """    if (_cachedPlans) {
      setPlans(_cachedPlans);
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/admin?resource=config`)"""
new_cc = "    fetch(`${API_BASE}/api/admin?resource=config`)"
if old_cc in c:
    c = c.replace(old_cc, new_cc, 1)
    changed = True
else:
    print('[WARNING] PricingPage.tsx: cache check block not found')

old_cs = "        _cachedPlans = plans;\n        "
new_cs = "        "
if old_cs in c:
    c = c.replace(old_cs, new_cs, 1)
    changed = True
else:
    print('[WARNING] PricingPage.tsx: cache assignment not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] PricingPage.tsx: removed module-level cache')
else:
    print('[WARNING] PricingPage.tsx: no cache changes')

# ============================================================
# PricingPage.tsx - remove redundant unmount-only useEffect
# ============================================================
fpath = os.path.join('src', 'pages', 'PricingPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_um = """  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingOrderId && !paySuccess && token) {"""
new_um = """  useEffect(() => {
    if (pendingOrderId && !paySuccess && token) {"""
if old_um in c:
    c = c.replace(old_um, new_um, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] PricingPage.tsx: removed redundant unmount-only useEffect')
else:
    print('[WARNING] PricingPage.tsx: redundant useEffect not found')

# ============================================================
# AdminPage.tsx - use request from api.ts
# ============================================================
fpath = os.path.join('src', 'pages', 'AdminPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

# Step 1: Replace API_BASE + apiFetch body
old_ab = """const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ error: '\u8bf7\u6c42\u5931\u8d25' }));
    throw new Error(d.error || `\u9519\u8bef ${res.status}`);
  }
  return res.json();
}"""
new_ab = """async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  return request(path, options, token);
}"""
if old_ab in c:
    c = c.replace(old_ab, new_ab, 1)
    changed = True
else:
    print('[WARNING] AdminPage.tsx: API_BASE + apiFetch block not found')

# Step 2: Add import
old_ai = "} from 'lucide-react';\n\nasync function apiFetch"
new_ai = "} from 'lucide-react';\nimport { request } from '../lib/api';\n\nasync function apiFetch"
if old_ai in c:
    c = c.replace(old_ai, new_ai, 1)
    changed = True
else:
    print('[WARNING] AdminPage.tsx: lucide import anchor not found')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] AdminPage.tsx: uses api.ts request (removed API_BASE + raw fetch)')
else:
    print('[WARNING] AdminPage.tsx: no changes')

print('\n=== Batch 4 done ===')
