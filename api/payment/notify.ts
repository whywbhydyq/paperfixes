import type { VercelRequest, VercelResponse } from '@vercel/node';
import { finalizePaidOrder } from '../_lib/order-settlement.js';
import { genSign } from '../_lib/payment.js';

const validationErrors = new Set([
  'PAYMENT_IDENTIFIERS_REQUIRED',
  'PAYMENT_AMOUNT_INVALID',
  'PAYMENT_AMOUNT_MISMATCH',
  'PAYMENT_TRADE_MISMATCH',
  'PAYMENT_TRADE_REUSED',
  'ORDER_NOT_FOUND',
  'ORDER_NOT_PAYABLE',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const params: Record<string, string> = {};
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') params[key] = value;
      else if (Array.isArray(value) && value.length > 0) params[key] = value[0];
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
      if (value != null && !params[key]) params[key] = String(value);
    }
  }

  const key = process.env.EPAY_KEY;
  if (!key || !process.env.EPAY_PID) return res.status(500).send('config error');
  if (params.sign !== genSign(params, key)) return res.status(400).send('sign error');
  if (params.pid !== process.env.EPAY_PID) return res.status(400).send('merchant error');

  const { trade_no, out_trade_no, trade_status, money } = params;
  if (trade_status !== 'TRADE_SUCCESS') return res.status(400).send('trade status error');
  if (!trade_no || !out_trade_no || money === undefined || money === '') {
    return res.status(400).send('payment fields missing');
  }

  try {
    await finalizePaidOrder({
      orderId: out_trade_no,
      providerTradeNo: trade_no,
      paidAmount: money,
    });
    return res.send('success');
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYMENT_SETTLEMENT_FAILED';
    console.error('[payment notify] settlement failed', { orderId: out_trade_no, code });
    if (validationErrors.has(code)) return res.status(400).send('payment validation error');
    return res.status(500).send('settlement error');
  }
}
