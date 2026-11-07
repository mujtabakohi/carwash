import { notFound } from '../errors.js';
import { day as vDay, int } from '../validate.js';
import { vehicleLabel } from '../schema.js';
import { clock } from '../clock.js';
import { dayOf, jLabel } from '../jalali.js';
import { customerById } from './customers.js';

export function shape(db, p) {
  return {
    id: p.id, invoiceNo: p.invoice_no, kind: p.kind, name: p.name,
    vehicle: p.veh_cls ? { cls: p.veh_cls, label: vehicleLabel(p.veh_cls), plate: p.plate } : null,
    customer: customerById(db, p.customer_id), startedAt: p.started_at, paidAt: p.paid_at, day: p.day, jalaliDay: jLabel(p.day),
    services: p.svc, discount: p.discount, total: p.total, credit: p.credit, paid: p.pay, method: p.method,
    items: JSON.parse(p.items_json).map(([name, qty, total]) => ({ name, qty, total })), agent: p.agent,
  };
}
export function listPayments(db, q = {}) {
  const day = q.date ? vDay(q.date) : dayOf(clock.now());
  return db.prepare('SELECT * FROM payments WHERE day=? ORDER BY id DESC').all(day).map(p => shape(db, p));
}
export function getPayment(db, id) {
  const p = db.prepare('SELECT * FROM payments WHERE id=?').get(int(Number(id), 'شناسه'));
  if (!p) throw notFound('رسید پیدا نشد');
  return shape(db, p);
}
