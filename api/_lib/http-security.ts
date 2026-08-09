import type { VercelResponse } from '@vercel/node';

type HeaderValue = string | string[] | undefined;

export interface RequestWithHeaders {
  headers: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string | undefined };
}

function first(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIp(req: RequestWithHeaders): string {
  const forwarded = first(req.headers['x-forwarded-for']);
  const direct = first(req.headers['x-real-ip']);
  return (forwarded?.split(',')[0] || direct || req.socket?.remoteAddress || 'unknown')
    .trim()
    .slice(0, 64);
}

export function isAllowedBrowserOrigin(req: RequestWithHeaders): boolean {
  const origin = first(req.headers.origin);
  if (!origin) return true;
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const protocol = first(req.headers['x-forwarded-proto']) || 'https';
  const allowed = new Set<string>();
  if (host) allowed.add(`${protocol}://${host}`);
  if (process.env.SITE_URL) {
    try {
      allowed.add(new URL(process.env.SITE_URL).origin);
    } catch {
      // Invalid optional configuration cannot make an unrelated origin valid.
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function rejectCrossOriginMutation(
  req: RequestWithHeaders,
  res: VercelResponse,
): boolean {
  if (isAllowedBrowserOrigin(req)) return false;
  res.status(403).json({ error: '请求来源无效' });
  return true;
}
