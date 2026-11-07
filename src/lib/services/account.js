import { bad, conflict, ApiError } from '../errors.js';
import { str } from '../validate.js';
import { hashPassword, verifyPassword, createToken, guardLogin, recordLogin } from '../auth.js';
import { clock } from '../clock.js';

const pub = (u) => ({ id: u.id, name: u.name, username: u.username });
const userCount = (db) => db.prepare('SELECT COUNT(*) c FROM users').get().c;

export const status = (db, user) => ({ setupRequired: userCount(db) === 0, user: user ? pub(user) : null });

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6) throw bad('WEAK_PASSWORD', 'رمز عبور باید حداقل ۶ حرف باشد');
  if (pw.length > 200) throw bad('VALIDATION', 'رمز عبور بسیار طولانی است');
}

export function setup(db, body) {
  if (userCount(db) > 0) throw conflict('ALREADY_SETUP', 'حساب مدیر از قبل ساخته شده است');
  const name = str(body.name, 'نام کامل', { required: true, max: 40 });
  const username = str(body.username, 'نام کاربری', { required: true }).toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) throw bad('VALIDATION', 'نام کاربری حداقل ۳ حرف و فقط با حروف انگلیسی، عدد، نقطه یا _ باشد');
  checkPassword(body.password);
  const id = db.prepare('INSERT INTO users(name,username,pass_hash,created_at) VALUES(?,?,?,?)')
    .run(name, username, hashPassword(body.password), clock.now().toISOString()).lastInsertRowid;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  return { user: pub(user), token: createToken(user) };
}

export function login(db, body, ip = '') {
  const username = String(body.username || '').trim().toLowerCase(), pw = String(body.password || '');
  if (!username || !pw) throw bad('VALIDATION', 'نام کاربری و رمز عبور را وارد کنید');
  const key = username + '|' + ip;
  guardLogin(key);
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  const ok = !!user && verifyPassword(pw, user.pass_hash);
  recordLogin(key, ok);
  if (!ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'نام کاربری یا رمز عبور اشتباه است');
  return { user: pub(user), token: createToken(user) };
}

export function changePassword(db, userId, body) {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!verifyPassword(String(body.currentPassword || ''), user.pass_hash)) throw new ApiError(403, 'WRONG_PASSWORD', 'رمز عبور فعلی اشتباه است');
  checkPassword(body.newPassword);
  db.prepare('UPDATE users SET pass_hash=?, pass_ver=pass_ver+1 WHERE id=?').run(hashPassword(body.newPassword), userId);
  const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  return { user: pub(fresh), token: createToken(fresh) }; // new token; old ones stop working
}
