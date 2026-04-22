import os

files = [
    'src/pages/PricingPage.tsx',
    'src/pages/DashboardPage.tsx', 
    'src/pages/HomePage.tsx',
    'api/user/jobs.ts',
]

for f in files:
    exists = os.path.exists(f)
    if exists:
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
        print(f"✓ {f} 存在，{len(content)}字节")
        # 检查关键内容
        if 'jobs' in f:
            print(f"  内容预览: {content[:100]}")
        if 'PricingPage' in f:
            print(f"  有无动态加载: {'useEffect' in content}")
        if 'DashboardPage' in f:
            print(f"  有无历史记录: {'jobRecord' in content or 'jobs' in content.lower()}")
        if 'HomePage' in f:
            print(f"  承诺内容: {'技术专有名词' in content}")
    else:
        print(f"✗ {f} 不存在")
