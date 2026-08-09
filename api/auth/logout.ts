import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../_lib/auth.js';
import { rejectCrossOriginMutation } from '../_lib/http-security.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rejectCrossOriginMutation(req, res)) return;
  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}
