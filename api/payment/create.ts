import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rejectCrossOriginMutation } from '../_lib/http-security.js';
import {
  ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
  ONLINE_PAYMENT_UNAVAILABLE_CODE,
} from '../../shared/payment-maintenance.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rejectCrossOriginMutation(req, res)) return;

  return res.status(503).json({
    code: ONLINE_PAYMENT_UNAVAILABLE_CODE,
    error: ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
  });
}
