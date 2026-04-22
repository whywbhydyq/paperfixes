export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '2922027393@qq.com';

export function isAdminUser(email: string | null | undefined, role: string | null | undefined): boolean {
  return role === 'admin' || email === ADMIN_EMAIL;
}
