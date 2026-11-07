import { bad } from './errors.js';
import { isRealDay } from './jalali.js';

export const money = (n) => Math.round(n * 100) / 100;

export function str(v, field, { min = 0, max = 200, required = false } = {}) {
  const s = v == null ? '' : String(v).trim();
  if (required && !s) throw bad('VALIDATION', `${field} را وارد کنید`);
  if (s.length < min) throw bad('VALIDATION', `${field} باید حداقل ${min} حرف باشد`);
  if (s.length > max) throw bad('VALIDATION', `${field} نباید بیشتر از ${max} حرف باشد`);
  return s;
}
export function num(v, field, { min = 0, max = 1e9, gt } = {}) {
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw bad('VALIDATION', `${field} باید عدد باشد`);
  if (n < min || n > max) throw bad('VALIDATION', `${field} خارج از حد مجاز است`);
  if (gt !== undefined && !(n > gt)) throw bad('VALIDATION', `${field} باید بزرگتر از ${gt} باشد`);
  return n;
}
export function int(v, field, opts = {}) {
  const n = num(v, field, opts);
  if (!Number.isInteger(n)) throw bad('VALIDATION', `${field} باید عدد صحیح باشد`);
  return n;
}
export function day(v, field = 'تاریخ') {
  if (typeof v !== 'string' || !isRealDay(v)) throw bad('VALIDATION', `${field} نادرست است (قالب درست: 2026-11-02)`);
  return v;
}
export const pickOne = (v, list, field) => {
  if (!list.includes(v)) throw bad('VALIDATION', `${field} نادرست است`);
  return v;
};
export const phone = (v) => {
  const p = str(v, 'شماره تماس', { required: true, max: 20 }).replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(p)) throw bad('VALIDATION', 'شماره تماس نادرست است');
  return p;
};
