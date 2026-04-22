import os
os.makedirs('api/user', exist_ok=True)

content = """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      inputText: true,
      outputText: true,
      status: true,
      inputLen: true,
      outputLen: true,
      createdAt: true,
      doneAt: true,
    },
  });

  return res.status(200).json({ jobs });
}
"""

with open('api/user/jobs.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ api/user/jobs.ts 创建完成")
