// Solar Hijri (Afghan) calendar helpers + business-day helpers (Asia/Kabul).
export const JM = ['حمل','ثور','جوزا','سرطان','اسد','سنبله','میزان','عقرب','قوس','جدی','دلو','حوت'];
export const TZ = 'Asia/Kabul';

export function g2j(gy, gm, gd) {
  const g = [0,31,59,90,120,151,181,212,243,273,304,334], gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365*gy + ~~((gy2+3)/4) - ~~((gy2+99)/100) + ~~((gy2+399)/400) + gd + g[gm-1];
  let jy = -1595 + 33*~~(days/12053); days %= 12053;
  jy += 4*~~(days/1461); days %= 1461;
  if (days > 365) { jy += ~~((days-1)/365); days = (days-1) % 365; }
  const jm = days < 186 ? 1 + ~~(days/31) : 7 + ~~((days-186)/30);
  const jd = 1 + (days < 186 ? days % 31 : (days-186) % 30);
  return [jy, jm, jd];
}
export function j2g(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365*jy + ~~(jy/33)*8 + ~~(((jy%33)+3)/4) + jd + (jm < 7 ? (jm-1)*31 : ((jm-7)*30)+186);
  let gy = 400*~~(days/146097); days %= 146097;
  if (days > 36524) { gy += 100*~~(--days/36524); days %= 36524; if (days >= 365) days++; }
  gy += 4*~~(days/1461); days %= 1461;
  if (days > 365) { gy += ~~((days-1)/365); days = (days-1) % 365; }
  let gd = days + 1;
  const sal = [0,31,((gy%4===0&&gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm; for (gm = 0; gm < 13 && gd > sal[gm]; gm++) gd -= sal[gm];
  return [gy, gm, gd];
}
const p2 = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${p2(m)}-${p2(d)}`;

/** Date -> 'YYYY-MM-DD' in Kabul time (the business day). */
export const dayOf = (date) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(date);
/** 'YYYY-MM-DD' (gregorian) -> 'YYYY-MM-DD' (Jalali). */
export const toJ = (isoDay) => { const [a,b,c] = isoDay.split('-').map(Number); const [y,m,d] = g2j(a,b,c); return iso(y,m,d); };
export const jLabel = (isoDay) => toJ(isoDay).replace(/-/g, '/');
export const isRealDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m-1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m-1 && t.getUTCDate() === d;
};
export const addDays = (isoDay, n) => {
  const [y,m,d] = isoDay.split('-').map(Number); const t = new Date(Date.UTC(y, m-1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth()+1, t.getUTCDate());
};
const gIso = ([y,m,d]) => iso(y,m,d);
/** Gregorian [from,to] (inclusive) covering one Jalali month. */
export function jMonthRange(jy, jm) {
  const from = gIso(j2g(jy, jm, 1));
  const next = jm === 12 ? gIso(j2g(jy + 1, 1, 1)) : gIso(j2g(jy, jm + 1, 1));
  return [from, addDays(next, -1)];
}
/** Gregorian [from,to] (inclusive) covering one Jalali year. */
export function jYearRange(jy) { return [gIso(j2g(jy, 1, 1)), addDays(gIso(j2g(jy + 1, 1, 1)), -1)]; }
export const jToday = (now = new Date()) => toJ(dayOf(now));
