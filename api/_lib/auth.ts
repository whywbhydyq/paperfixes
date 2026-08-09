import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'paperfix_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'dev-secret-change-in-production';
  }
  return secret;
}

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// 密码验证
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成 JWT
export function signToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '30d' });
}

// 验证 JWT
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string };
  } catch {
    return null;
  }
}

function readHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join('='));
    } catch {
      return null;
    }
  }
  return null;
}

export function createSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function createExpiredSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function setSessionCookie(
  res: { setHeader(name: string, value: string): void },
  token: string,
): void {
  res.setHeader('Set-Cookie', createSessionCookie(token));
}

export function clearSessionCookie(
  res: { setHeader(name: string, value: string): void },
): void {
  res.setHeader('Set-Cookie', createExpiredSessionCookie());
}

// Cookie is authoritative for browsers; Bearer remains temporarily compatible.
export function getUserFromRequest(
  req: {
    headers: {
      cookie?: string | string[];
      authorization?: string | string[];
    };
  },
): string | null {
  const cookieToken = readCookie(readHeader(req.headers.cookie), SESSION_COOKIE_NAME);
  const cookieUser = cookieToken ? verifyToken(cookieToken) : null;
  if (cookieUser) return cookieUser.userId;

  const authorization = readHeader(req.headers.authorization);
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;
  const bearerUser = bearerToken ? verifyToken(bearerToken) : null;
  return bearerUser?.userId ?? null;
}
