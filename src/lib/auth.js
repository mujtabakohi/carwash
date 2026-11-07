import crypto from 'node:crypto';
import { ApiError } from './errors.js';

/* ---------- passwords (scrypt, no external deps) ---------- */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(keyHex, 'hex');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

/* ---------- signed session tokens (HMAC-SHA256) ---------- */
const TTL_SECONDS = 60 * 60 * 12;
function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set (16+ characters) in production');
  return 'dev-only-secret-change-me';
}
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function createToken(user, nowMs = Date.now()) {
  const body = b64(JSON.stringify({ uid: user.id, pv: user.pass_ver, exp: Math.floor(nowMs / 1000) + TTL_SECONDS }));
  return `${body}.${sign(body)}`;
}
export function readToken(token, nowMs = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const good = Buffer.from(sign(body)), got = Buffer.from(sig || '');
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p.exp > nowMs / 1000 ? p : null;
  } catch { return null; }
}

export const COOKIE = 'cw_token';
export const cookieHeader = (token) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
export const clearCookieHeader = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function tokenFromRequest(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

/** Returns the logged-in user row or throws 401. */
export function requireUser(db, request) {
  const p = readToken(tokenFromRequest(request));
  const user = p && db.prepare('SELECT id,name,username,pass_ver FROM users WHERE id=?').get(p.uid);
  if (!user || user.pass_ver !== p.pv) throw new ApiError(401, 'UNAUTHORIZED', 'لطفاً وارد سیستم شوید');
  return user;
}

/* ---------- brute-force guard (in-memory, per username+IP) ---------- */
const attempts = new Map();
export function guardLogin(key, nowMs = Date.now()) {
  const a = attempts.get(key);
  if (a && a.until > nowMs) throw new ApiError(429, 'TOO_MANY_ATTEMPTS', `تلاش‌های ناموفق زیاد بود. ${Math.ceil((a.until - nowMs) / 1000)} ثانیه بعد دوباره امتحان کنید`);
}
export function recordLogin(key, ok, nowMs = Date.now()) {
  if (ok) return attempts.delete(key);
  const a = attempts.get(key) || { n: 0, until: 0 };
  a.n += 1;
  if (a.n >= 5) { a.until = nowMs + 30_000; a.n = 0; }
  attempts.set(key, a);
}
