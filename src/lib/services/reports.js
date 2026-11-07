import { bad } from '../errors.js';
import { day as vDay, int, money } from '../validate.js';
import { vehicleLabel } from '../schema.js';
import { clock } from '../clock.js';
import { dayOf, jLabel, toJ, JM, jMonthRange, jYearRange, jToday } from '../jalali.js';
import { listExpenses } from './expenses.js';

const sum = (a, f) => money(a.reduce((s, x) => s + f(x), 0));

function tally(bills) {
  const items = {}, veh = {};
  for (const p of bills) {
    for (const [name, qty, total] of JSON.parse(p.items_json)) { const o = items[name] ||= { name, qty: 0, total: 0 }; o.qty += qty; o.total = money(o.total + total); }
    const k = p.veh_cls || 'other'; const v = veh[k] ||= { cls: k, label: vehicleLabel(k), count: 0, collected: 0 };
    v.count += 1; v.collected = money(v.collected + p.pay);
  }
  return { items: Object.values(items).sort((a, b) => b.total - a.total), vehicles: Object.values(veh).sort((a, b) => b.count - a.count) };
}
function expenseTypes(exps) {
  const o = {}; for (const e of exps) { const t = o[e.type] ||= { type: e.type, count: 0, amount: 0 }; t.count++; t.amount = money(t.amount + e.amount); }
  return Object.values(o).sort((a, b) => b.amount - a.amount);
}
const payRow = (p) => ({ id: p.id, invoiceNo: p.invoice_no, kind: p.kind, name: p.name, vehicle: p.veh_cls ? { cls: p.veh_cls, label: vehicleLabel(p.veh_cls), plate: p.plate } : null, paidAt: p.paid_at, services: p.svc, discount: p.discount, credit: p.credit, paid: p.pay });

export function daily(db, q = {}) {
  const d = q.date ? vDay(q.date) : dayOf(clock.now());
  const pays = db.prepare('SELECT * FROM payments WHERE day=? ORDER BY id').all(d);
  const bills = pays.filter(p => p.kind === 'bill');
  const exps = listExpenses(db, { from: d, to: d }).expenses;
  const open = db.prepare("SELECT id,name,veh_cls,plate,bill_no,discount FROM bays WHERE status!='free'").all().map(b => {
    const svc = db.prepare('SELECT COALESCE(SUM(price*qty),0) s FROM bay_items WHERE bay_id=?').get(b.id).s;
    return { bay: b.name, billNo: b.bill_no, vehicle: { cls: b.veh_cls, label: vehicleLabel(b.veh_cls), plate: b.plate }, balance: money(svc - b.discount) };
  });
  const collected = sum(pays, p => p.pay), expenses = sum(exps, e => e.amount), openTotal = sum(open, o => o.balance);
  return {
    day: d, jalaliDay: jLabel(d),
    kpis: { vehicles: bills.length, bills: bills.length, services: sum(bills, p => p.svc), discounts: sum(bills, p => p.discount), collected, expenses },
    balance: { receivedOnDues: sum(pays.filter(p => p.kind === 'due'), p => p.pay), creditGiven: sum(bills, p => p.credit), collected, expenses, net: money(collected - expenses), openBills: openTotal, expectedIfSettled: money(collected + openTotal) },
    payments: pays.map(payRow), ...tally(bills), expenseTypes: expenseTypes(exps), expenses: exps, openBills: open,
  };
}

function period(db, from, to, groupBy) {
  const pays = db.prepare('SELECT * FROM payments WHERE day BETWEEN ? AND ?').all(from, to);
  const exps = listExpenses(db, { from, to }).expenses;
  const groups = {};
  const g = (dayIso) => { const j = toJ(dayIso); const k = groupBy === 'month' ? j.slice(0, 7) : j; return groups[k] ||= { key: k, label: k.replace(/-/g, '/'), bills: 0, services: 0, discounts: 0, collected: 0, expenses: 0, receivedOnDues: 0 }; };
  for (const p of pays) { const r = g(p.day); r.collected = money(r.collected + p.pay); if (p.kind === 'due') r.receivedOnDues = money(r.receivedOnDues + p.pay); else { r.bills++; r.services = money(r.services + p.svc); r.discounts = money(r.discounts + p.discount); } }
  for (const e of exps) { const r = g(e.day); r.expenses = money(r.expenses + e.amount); }
  const bills = pays.filter(p => p.kind === 'bill');
  const rows = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key)).map(r => ({ ...r, net: money(r.collected - r.expenses) }));
  const T = { bills: bills.length, services: sum(bills, p => p.svc), discounts: sum(bills, p => p.discount), collected: sum(pays, p => p.pay), expenses: sum(exps, e => e.amount) };
  return { rows, totals: { ...T, net: money(T.collected - T.expenses) }, ...tally(bills), expenseTypes: expenseTypes(exps), vehiclesServed: bills.length };
}

const jYear = (v) => int(Number(v ?? jToday(clock.now()).split('-')[0]), 'سال', { min: 1300, max: 1600 });
export function monthly(db, q = {}) {
  const [, cm] = jToday(clock.now()).split('-').map(Number);
  const year = jYear(q.year), month = int(Number(q.month ?? cm), 'ماه', { min: 1, max: 12 });
  const [from, to] = jMonthRange(year, month);
  const r = period(db, from, to, 'day');
  const active = r.rows.filter(x => x.bills > 0);
  return { year, month, monthName: JM[month - 1], from, to, ...r, averagePerTradingDay: active.length ? money(r.totals.collected / active.length) : 0 };
}
export function yearly(db, q = {}) {
  const year = jYear(q.year), [from, to] = jYearRange(year);
  const r = period(db, from, to, 'month');
  const byKey = Object.fromEntries(r.rows.map(x => [x.key, x]));
  const rows = JM.map((name, i) => { const k = `${year}-${String(i + 1).padStart(2, '0')}`; return { month: i + 1, name, ...(byKey[k] || { key: k, label: `${year}/${String(i + 1).padStart(2, '0')}`, bills: 0, services: 0, discounts: 0, collected: 0, expenses: 0, receivedOnDues: 0, net: 0 }) }; });
  const best = rows.filter(x => x.bills > 0).sort((a, b) => b.collected - a.collected)[0];
  return { year, from, to, ...r, rows, bestMonth: best ? best.name : null };
}
