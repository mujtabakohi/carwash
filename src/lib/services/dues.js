import { notFound, bad } from '../errors.js';
import { num, money } from '../validate.js';
import { tx } from '../db.js';
import { clock } from '../clock.js';
import { dayOf } from '../jalali.js';

const shape = (r) => ({
  invoiceNo: r.invoice_no, customer: { id: r.customer_id, first: r.first, last: r.last, phone: r.phone },
  billDate: r.bill_date, name: r.name, plate: r.plate, total: r.total, paid: r.paid, remaining: money(r.total - r.paid), lastPaymentAt: r.last_payment_at,
});
const SQL = `SELECT d.*, c.first, c.last, c.phone FROM dues d JOIN customers c ON c.id=d.customer_id`;

export function listDues(db) {
  const rows = db.prepare(`${SQL} WHERE d.total - d.paid > 0.005`).all().map(shape);
  rows.sort((a, b) => b.remaining - a.remaining || a.billDate.localeCompare(b.billDate));
  const sum = money(rows.reduce((a, d) => a + d.remaining, 0));
  return { totalOutstanding: sum, customers: new Set(rows.map(r => r.customer.phone)).size, dues: rows };
}

export function payDue(db, invoiceNo, body, agent = '') {
  const d = db.prepare(`${SQL} WHERE d.invoice_no=?`).get(Number(invoiceNo));
  if (!d) throw notFound('بل پیدا نشد');
  const remaining = money(d.total - d.paid);
  if (remaining <= 0.005) throw bad('NOTHING_DUE', 'این بل بقایا ندارد');
  const amt = num(body.amount, 'مبلغ دریافتی', { gt: 0 });
  if (amt > remaining + 0.005) throw bad('OVERPAY', `مبلغ نمی‌تواند از ${remaining} بیشتر باشد`);
  const now = clock.now();
  return tx(db, () => {
    db.prepare('UPDATE dues SET paid=paid+?, last_payment_at=? WHERE invoice_no=?').run(money(amt), now.toISOString(), d.invoice_no);
    const pid = db.prepare(`INSERT INTO payments(invoice_no,kind,name,customer_id,started_at,paid_at,day,svc,discount,total,credit,pay,method,items_json,agent)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(d.invoice_no, 'due', 'پرداخت بقایا', d.customer_id, now.toISOString(), now.toISOString(), dayOf(now), 0, 0, money(amt), 0, money(amt), 'Cash', '[]', agent).lastInsertRowid;
    return { paymentId: Number(pid), invoiceNo: d.invoice_no, received: money(amt), remaining: money(remaining - amt) };
  });
}
