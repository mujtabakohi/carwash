import { bad } from '../errors.js';
import { str, num, money } from '../validate.js';
import { tx } from '../db.js';
import { monthly } from './reports.js';

export const listInvestors = (db) => db.prepare('SELECT id,name,share,amount FROM investors ORDER BY sort,id').all();

export function replaceInvestors(db, body) {
  if (!Array.isArray(body.investors) || body.investors.length > 30) throw bad('VALIDATION', 'فهرست سرمایه‌گذاران نادرست است');
  const list = body.investors.map(i => ({ name: str(i.name, 'نام سرمایه‌گذار', { required: true, max: 60 }), share: num(i.share, 'سهم', { min: 0, max: 100 }), amount: num(i.amount ?? 0, 'سرمایه', { min: 0 }) }));
  tx(db, () => { db.prepare('DELETE FROM investors').run(); list.forEach((i, n) => db.prepare('INSERT INTO investors(name,share,amount,sort) VALUES(?,?,?,?)').run(i.name, i.share, i.amount, n)); });
  return listInvestors(db);
}

/** Profit split for one Jalali month: net = collected - expenses. */
export function monthShare(db, q = {}) {
  const m = monthly(db, q), net = money(m.totals.collected - m.totals.expenses), inv = listInvestors(db);
  const totalShare = money(inv.reduce((a, i) => a + i.share, 0));
  return {
    year: m.year, month: m.month, monthName: m.monthName, collected: m.totals.collected, expenses: m.totals.expenses, netProfit: net, totalSharePercent: totalShare,
    warning: Math.abs(totalShare - 100) > 0.001 ? `مجموع سهم‌ها ${totalShare}٪ است، نه ۱۰۰٪` : null,
    investors: inv.map(i => ({ ...i, profit: money(net * i.share / 100) })),
  };
}
