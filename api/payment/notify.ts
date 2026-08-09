import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
  RETIRED_PAYMENT_PROVIDER_CODE,
} from '../../shared/payment-maintenance.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(410).json({
    code: RETIRED_PAYMENT_PROVIDER_CODE,
    error: ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
  });
}
