import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDb } from './helpers.js';
import { clock } from '../src/lib/clock.js';
import * as account from '../src/lib/services/account.js';
import * as bays from '../src/lib/services/bays.js';
import * as dues from '../src/lib/services/dues.js';
import * as payments from '../src/lib/services/payments.js';
import * as expenses from '../src/lib/services/expenses.js';
import * as reports from '../src/lib/services/reports.js';
import * as investors from '../src/lib/services/investors.js';
import * as catalog from '../src/lib/services/catalog.js';
import { g2j, j2g, jMonthRange, jYearRange, dayOf } from '../src/lib/jalali.js';
import { readToken, createToken } from '../src/lib/auth.js';

const rejects = (fn, code) => assert.throws(fn, e => e.code === code, `expected ${code}`);
// 2026-11-02 12:00 Kabul time = 1405/08/11
const T0 = '2026-11-02T07:30:00.000Z';

test('jalali conversion + ranges', () => {
  assert.deepEqual(g2j(2026, 11, 2), [1405, 8, 11]);
  assert.deepEqual(j2g(1405, 1, 1), [2026, 3, 21]);
  assert.deepEqual(jMonthRange(1405, 8), ['2026-10-23', '2026-11-21']);
  assert.deepEqual(jYearRange(1405), ['2026-03-21', '2027-03-20']);
  assert.equal(dayOf(new Date('2026-11-01T20:00:00Z')), '2026-11-02'); // Kabul is UTC+4:30
});

test('seed data', () => {
  const db = makeDb();
  assert.equal(bays.listBays(db).length, 6);
  assert.equal(catalog.getCatalog(db).length, 4);
  assert.equal(expenses.listTypes(db).length, 6);
  assert.equal(investors.listInvestors(db).length, 2);
});

test('account: setup, login, password change, token', () => {
  const db = makeDb();
  assert.equal(account.status(db, null).setupRequired, true);
  rejects(() => account.setup(db, { name: 'م', username: 'Ab', password: '123456' }), 'VALIDATION');
  rejects(() => account.setup(db, { name: 'م', username: 'mojtaba', password: '123' }), 'WEAK_PASSWORD');
  const s = account.setup(db, { name: 'مجتبی کوهی', username: 'Mojtaba', password: 'secret123' });
  assert.equal(s.user.username, 'mojtaba');
  rejects(() => account.setup(db, { name: 'x', username: 'other', password: 'secret123' }), 'ALREADY_SETUP');
  assert.ok(readToken(s.token));
  rejects(() => account.login(db, { username: 'mojtaba', password: 'wrong' }, 'ip1'), 'INVALID_CREDENTIALS');
  const l = account.login(db, { username: 'MOJTABA', password: 'secret123' }, 'ip1');
  assert.equal(l.user.name, 'مجتبی کوهی');
  const c = account.changePassword(db, s.user.id, { currentPassword: 'secret123', newPassword: 'newpass456' });
  assert.notEqual(readToken(c.token).pv, readToken(l.token).pv); // old tokens invalid after change
  rejects(() => account.changePassword(db, s.user.id, { currentPassword: 'bad', newPassword: 'newpass456' }), 'WRONG_PASSWORD');
  assert.equal(readToken(createToken({ id: 1, pass_ver: 1 }, 0)), null); // expired
  // lockout after 5 failures
  for (let i = 0; i < 5; i++) assert.throws(() => account.login(db, { username: 'mojtaba', password: 'x' }, 'ip2'));
  rejects(() => account.login(db, { username: 'mojtaba', password: 'newpass456' }, 'ip2'), 'TOO_MANY_ATTEMPTS');
});

test('bill flow: checkin -> items -> discount -> pay (full)', () => {
  const db = makeDb(); clock.set(T0);
  let b = bays.checkin(db, 1, { cls: 'sedan', plate: 'تویوتا کرولا' });
  assert.equal(b.status, 'run'); assert.equal(b.billNo, 64327);
  rejects(() => bays.checkin(db, 1, { cls: 'sedan' }), 'BAY_BUSY');
  rejects(() => bays.checkin(db, 2, { cls: 'truck' }), 'VALIDATION');
  rejects(() => bays.pay(db, 1, {}), 'NO_ITEMS');
  bays.addItem(db, 1, { name: 'شستشوی بیرونی', price: 100 });
  b = bays.addItem(db, 1, { name: 'شستشوی بیرونی', price: 100, qty: 2 });
  assert.equal(b.items.length, 1); assert.equal(b.items[0].qty, 3);
  b = bays.addItem(db, 1, { name: 'پالش و موم', price: 500 });
  assert.equal(b.services, 800);
  rejects(() => bays.setDiscount(db, 1, { amount: 900 }), 'VALIDATION');
  b = bays.setDiscount(db, 1, { amount: 50 }); assert.equal(b.total, 750);
  b = bays.updateItem(db, 1, b.items[0].id, { qty: 1 }); assert.equal(b.total, 550);
  const r = bays.pay(db, 1, {}, 'مجتبی');
  assert.deepEqual([r.total, r.received, r.credit], [550, 550, 0]);
  assert.equal(bays.getBay(db, 1).status, 'free');
  assert.equal(bays.checkin(db, 1, { cls: 'bike' }).billNo, 64328); // counter advances
  const p = payments.getPayment(db, r.paymentId);
  assert.equal(p.paid, 550); assert.equal(p.jalaliDay, '1405/08/11'); assert.equal(p.items.length, 2);
});

test('credit sale -> dues -> repayment', () => {
  const db = makeDb(); clock.set(T0);
  bays.checkin(db, 1, { cls: 'sedan' });
  bays.addItem(db, 1, { name: 'پالش و موم', price: 500 });
  rejects(() => bays.pay(db, 1, { amount: 200 }), 'CUSTOMER_REQUIRED');
  bays.setCustomer(db, 1, { first: 'احمد', last: 'شاه', phone: '0700123456' });
  const r = bays.pay(db, 1, { amount: 200 });
  assert.equal(r.credit, 300);
  let d = dues.listDues(db);
  assert.equal(d.totalOutstanding, 300); assert.equal(d.dues[0].customer.first, 'احمد');
  rejects(() => dues.payDue(db, r.invoiceNo, { amount: 400 }), 'OVERPAY');
  rejects(() => dues.payDue(db, r.invoiceNo, { amount: 0 }), 'VALIDATION');
  const p = dues.payDue(db, r.invoiceNo, { amount: 100 }, 'مجتبی');
  assert.equal(p.remaining, 200);
  dues.payDue(db, r.invoiceNo, { amount: 200 });
  assert.equal(dues.listDues(db).dues.length, 0);
  rejects(() => dues.payDue(db, r.invoiceNo, { amount: 1 }), 'NOTHING_DUE');
  const day = reports.daily(db, {});
  assert.equal(day.balance.collected, 500); assert.equal(day.balance.receivedOnDues, 300); assert.equal(day.balance.creditGiven, 300);
  assert.equal(day.kpis.bills, 1);
});

test('cancel, remove bay, duplicate bay', () => {
  const db = makeDb();
  bays.checkin(db, 3, { cls: 'bike' });
  rejects(() => bays.removeBay(db, 3), 'BAY_BUSY');
  assert.equal(bays.cancel(db, 3).status, 'free');
  rejects(() => bays.cancel(db, 3), 'BAY_FREE');
  rejects(() => bays.addBay(db, { name: 'بل 1' }), 'DUPLICATE');
  const n = bays.addBay(db, { name: 'بل 7', kind: 'detail' }); bays.removeBay(db, n.id);
  assert.equal(bays.listBays(db).length, 6);
});

test('expenses + types', () => {
  const db = makeDb(); clock.set(T0);
  const e = expenses.createExpense(db, { title: 'برق', amount: 120, type: 'آب و برق' });
  assert.equal(e.day, '2026-11-02'); assert.equal(e.jalaliDay, '1405/08/11');
  rejects(() => expenses.createExpense(db, { title: 'x', amount: 0, type: 'سایر' }), 'VALIDATION');
  rejects(() => expenses.createExpense(db, { title: 'x', amount: 5, type: 'سایر', date: '2026-02-30' }), 'VALIDATION');
  expenses.createExpense(db, { title: 'تیل', amount: 30, type: 'نوع جدید', date: '2026-11-01' });
  assert.ok(expenses.listTypes(db).some(t => t.name === 'نوع جدید'));
  assert.equal(expenses.listExpenses(db, { from: '2026-11-02', to: '2026-11-02' }).total, 120);
  rejects(() => expenses.removeType(db, expenses.listTypes(db).find(t => t.name === 'آب و برق').id), 'IN_USE');
  const u = expenses.updateExpense(db, e.id, { amount: 150 }); assert.equal(u.amount, 150);
  expenses.deleteExpense(db, e.id); rejects(() => expenses.deleteExpense(db, e.id), 'NOT_FOUND');
});

test('monthly / yearly reports + investor share (Jalali)', () => {
  const db = makeDb();
  const sell = (iso, price) => { clock.set(iso); bays.checkin(db, 1, { cls: 'sedan' }); bays.addItem(db, 1, { name: 'شستشو', price }); bays.pay(db, 1, {}); };
  sell('2026-10-25T07:00:00Z', 100);   // 1405/08/03
  sell('2026-11-02T07:00:00Z', 300);   // 1405/08/11
  sell('2026-11-25T07:00:00Z', 1000);  // 1405/09/04 (next month)
  clock.set('2026-11-02T07:00:00Z');
  expenses.createExpense(db, { title: 'کرایه', amount: 100, type: 'کرایه', date: '2026-11-02' });
  const m = reports.monthly(db, { year: 1405, month: 8 });
  assert.equal(m.totals.collected, 400); assert.equal(m.totals.expenses, 100); assert.equal(m.totals.net, 300);
  assert.equal(m.rows.length, 2); assert.equal(m.averagePerTradingDay, 200); assert.equal(m.monthName, 'عقرب');
  const y = reports.yearly(db, { year: 1405 });
  assert.equal(y.rows.length, 12); assert.equal(y.totals.collected, 1400); assert.equal(y.bestMonth, 'قوس');
  const sh = investors.monthShare(db, { year: 1405, month: 8 });
  assert.equal(sh.netProfit, 300); assert.equal(sh.investors[0].profit, 150); assert.equal(sh.warning, null);
  investors.replaceInvestors(db, { investors: [{ name: 'الف', share: 60 }, { name: 'ب', share: 20 }] });
  assert.ok(investors.monthShare(db, { year: 1405, month: 8 }).warning);
  rejects(() => reports.monthly(db, { year: 1405, month: 13 }), 'VALIDATION');
});

test('order screen save + state snapshot', async () => {
  const db = makeDb(); clock.set(T0);
  const { snapshot } = await import('../src/lib/services/state.js');
  bays.checkin(db, 2, { cls: 'sedan', plate: 'a' });
  const b = bays.replaceOrder(db, 2, { items: [{ name: 'الف', price: 100, qty: 2 }, { name: 'ب', price: 50, qty: 1 }], discount: 999, vehicle: { cls: 'bike', plate: 'ز' } });
  assert.equal(b.services, 250); assert.equal(b.discount, 250); assert.equal(b.vehicle.cls, 'bike'); assert.equal(b.vehicle.plate, 'ز');
  rejects(() => bays.replaceOrder(db, 2, { items: [{ name: 'x', price: 1, qty: 0 }] }), 'VALIDATION');
  rejects(() => bays.replaceOrder(db, 1, { items: [] }), 'BAY_FREE');
  bays.setCustomer(db, 2, { first: 'ع', last: '', phone: '0799000111' });
  const s = snapshot(db);
  assert.equal(s.bays.length, 6); assert.equal(s.catalog.length, 4); assert.equal(s.customers.length, 1); assert.equal(s.expenseTypes.length, 6);
});

test('catalog replace + customers', () => {
  const db = makeDb();
  const c = catalog.replaceCatalog(db, { categories: [{ name: 'شستشو', emoji: '🚿', items: [{ name: 'الف', price: 10 }] }] });
  assert.equal(c.length, 1); assert.equal(c[0].items[0].price, 10);
  rejects(() => catalog.replaceCatalog(db, { categories: [{ name: '', items: [] }] }), 'VALIDATION');
});
