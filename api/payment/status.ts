import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { finalizePaidOrder } from '../_lib/order-settlement.js';

interface ProviderOrderQuery {
  code?: number;
  status?: string | number;
  pid?: string;
  out_trade_no?: string;
  trade_no?: string;
  money?: string | number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) return res.status(200).json({ status: 'NOT_FOUND' });
  if (order.status === 'PAID') return res.status(200).json({ status: 'PAID' });

  if (order.status === 'PENDING') {
    const elapsed = Date.now() - order.createdAt.getTime();
    if (elapsed > 10_000) {
      try {
        const pid = process.env.EPAY_PID;
        const key = process.env.EPAY_KEY;
        const base = process.env.EPAY_API;
        if (pid && key && base) {
          const baseUrl = base.replace(/\/?$/, '/');
          const queryParams = new URLSearchParams({
            act: 'order',
            pid,
            key,
            out_trade_no: orderId,
          });
          const queryRes = await fetch(`${baseUrl}api.php?${queryParams.toString()}`);
          if (!queryRes.ok) throw new Error(`PAYMENT_QUERY_HTTP_${queryRes.status}`);
          const queryData = (await queryRes.json()) as ProviderOrderQuery;

          const providerConfirmsPayment = queryData.code === 1
            && Number(queryData.status) === 1
            && queryData.pid === process.env.EPAY_PID
            && queryData.out_trade_no === orderId
            && typeof queryData.trade_no === 'string'
            && queryData.trade_no.trim().length > 0
            && queryData.money !== undefined;
          if (providerConfirmsPayment) {
            await finalizePaidOrder({
              orderId,
              providerTradeNo: queryData.trade_no as string,
              paidAmount: queryData.money as string | number,
            });
            return res.status(200).json({ status: 'PAID' });
          }
        }
      } catch (error) {
        console.error('[payment status] provider query or settlement failed', {
          orderId,
          code: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  const latest = await prisma.order.findFirst({ where: { id: orderId, userId } });
  return res.status(200).json({ status: latest?.status ?? 'NOT_FOUND' });
}
