with open('api/admin/users.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, wechatName: true, role: true, plan: true,
      quota: true, totalUsed: true, createdAt: true,
    },
  });
  return res.status(200).json({ users });"""

new = """  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, wechatName: true, role: true, plan: true,
      quota: true, totalUsed: true, createdAt: true,
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, status: true, inputLen: true, outputLen: true,
          createdAt: true, doneAt: true,
        },
      },
    },
  });
  return res.status(200).json({ users });"""

if old in content:
    content = content.replace(old, new)
    print("✓ admin/users 替换成功")
else:
    print("⚠ 未找到，检查文件内容")

with open('api/admin/users.ts', 'w', encoding='utf-8') as f:
    f.write(content)
