import { bad, notFound, conflict } from '../errors.js';
import { str, num, int, pickOne, money } from '../validate.js';
import { VEHICLE_CLASSES, vehicleLabel } from '../schema.js';
import { tx } from '../db.js';
import { clock } from '../clock.js';
import { dayOf } from '../jalali.js';
import { upsertCustomer, customerById } from './customers.js';

const CLASS_KEYS = VEHICLE_CLASSES.map(v => v.key);

function view(db, b) {
  const items = db.prepare('SELECT id,name,price,qty FROM bay_items WHERE bay_id=? ORDER BY id').all(b.id)
    .map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, lineTotal: money(i.price * i.qty) }));
  const services = money(items.reduce((a, i) => a + i.lineTotal, 0));
  return {
    id: b.id, name: b.name, kind: b.kind, status: b.status,
    vehicle: b.veh_cls ? { cls: b.veh_cls, label: vehicleLabel(b.veh_cls), plate: b.plate } : null,
    billNo: b.bill_no, startedAt: b.started_at, discount: b.discount,
    customer: customerById(db, b.customer_id), items, services, total: money(services - b.discount),
  };
}
const row = (db, id) => {
  const b = db.prepare('SELECT * FROM bays WHERE id=?').get(Number(id));
  if (!b) throw notFound('بل پیدا نشد');
  return b;
};
const needOpen = (b) => { if (b.status === 'free') throw conflict('BAY_FREE', 'این بل خالی است. ابتدا وسیله را ثبت ورود کنید'); };
const resetBay = (db, id) => {
  db.prepare('DELETE FROM bay_items WHERE bay_id=?').run(id);
  db.prepare("UPDATE bays SET status='free', veh_cls=NULL, plate='', bill_no=NULL, started_at=NULL, discount=0, customer_id=NULL WHERE id=?").run(id);
};

export const listBays = (db) => db.prepare('SELECT * FROM bays ORDER BY id').all().map(b => view(db, b));
export const getBay = (db, id) => view(db, row(db, id));

export function addBay(db, body) {
  const name = str(body.name, 'نام بل', { required: true, max: 16 });
  const kind = body.kind === undefined ? 'wash' : pickOne(body.kind, ['wash', 'detail'], 'نوع بل');
  if (db.prepare('SELECT 1 FROM bays WHERE lower(name)=lower(?)').get(name)) throw conflict('DUPLICATE', `${name} از قبل وجود دارد`);
  const id = db.prepare('INSERT INTO bays(name,kind) VALUES(?,?)').run(name, kind).lastInsertRowid;
  return getBay(db, id);
}
export function removeBay(db, id) {
  const b = row(db, id);
  if (b.status !== 'free') throw conflict('BAY_BUSY', 'بلِ فعال را نمی‌توان حذف کرد');
  db.prepare('DELETE FROM bays WHERE id=?').run(b.id);
}

export function checkin(db, id, body) {
  const b = row(db, id);
  if (b.status !== 'free') throw conflict('BAY_BUSY', 'این بل قبلاً ثبت ورود شده است');
  const cls = pickOne(body.cls, CLASS_KEYS, 'نوع وسیله');
  const plate = str(body.plate, 'مدل موتر', { max: 30 });
  tx(db, () => {
    const no = db.prepare("UPDATE counters SET value=value+1 WHERE name='bill' RETURNING value").get().value - 1;
    db.prepare("UPDATE bays SET status='run', veh_cls=?, plate=?, bill_no=?, started_at=?, discount=0, customer_id=NULL WHERE id=?")
      .run(cls, plate, no, clock.now().toISOString(), b.id);
  });
  return getBay(db, b.id);
}
export function updateVehicle(db, id, body) {
  const b = row(db, id); needOpen(b);
  const cls = pickOne(body.cls ?? b.veh_cls, CLASS_KEYS, 'نوع وسیله');
  db.prepare('UPDATE bays SET veh_cls=?, plate=? WHERE id=?').run(cls, body.plate === undefined ? b.plate : str(body.plate, 'مدل موتر', { max: 30 }), b.id);
  return getBay(db, b.id);
}
export function setCustomer(db, id, body) {
  const b = row(db, id); needOpen(b);
  if (body === null || body.remove) { db.prepare('UPDATE bays SET customer_id=NULL WHERE id=?').run(b.id); return getBay(db, b.id); }
  const cid = tx(db, () => upsertCustomer(db, body));
  db.prepare('UPDATE bays SET customer_id=? WHERE id=?').run(cid, b.id);
  return getBay(db, b.id);
}
export function addItem(db, id, body) {
  const b = row(db, id); needOpen(b);
  const name = str(body.name, 'نام خدمت', { required: true, max: 80 });
  const price = num(body.price, 'قیمت', { min: 0 }), qty = body.qty === undefined ? 1 : int(body.qty, 'تعداد', { min: 1, max: 999 });
  const ex = db.prepare('SELECT id FROM bay_items WHERE bay_id=? AND name=? AND price=?').get(b.id, name, price);
  if (ex) db.prepare('UPDATE bay_items SET qty=qty+? WHERE id=?').run(qty, ex.id);
  else db.prepare('INSERT INTO bay_items(bay_id,name,price,qty) VALUES(?,?,?,?)').run(b.id, name, price, qty);
  return getBay(db, b.id);
}
export function updateItem(db, id, itemId, body) {
  const b = row(db, id); needOpen(b);
  const it = db.prepare('SELECT * FROM bay_items WHERE id=? AND bay_id=?').get(Number(itemId), b.id);
  if (!it) throw notFound('آیتم پیدا نشد');
  const qty = int(body.qty, 'تعداد', { min: 0, max: 999 });
  if (qty === 0) db.prepare('DELETE FROM bay_items WHERE id=?').run(it.id);
  else db.prepare('UPDATE bay_items SET qty=? WHERE id=?').run(qty, it.id);
  return getBay(db, b.id);
}
export function removeItem(db, id, itemId) { return updateItem(db, id, itemId, { qty: 0 }); }
export function setDiscount(db, id, body) {
  const b = row(db, id); needOpen(b);
  const v = getBay(db, b.id), d = num(body.amount, 'تخفیف', { min: 0 });
  if (d > v.services + 0.005) throw bad('VALIDATION', 'تخفیف نمی‌تواند از مجموع خدمات بیشتر باشد');
  db.prepare('UPDATE bays SET discount=? WHERE id=?').run(money(d), b.id);
  return getBay(db, b.id);
}
/** Save the whole order screen at once: items + discount + vehicle. */
export function replaceOrder(db, id, body) {
  const b = row(db, id); needOpen(b);
  if (!Array.isArray(body.items) || body.items.length > 200) throw bad('VALIDATION', 'فهرست خدمات نادرست است');
  const items = body.items.map(i => ({ name: str(i.name, 'نام خدمت', { required: true, max: 80 }), price: num(i.price, 'قیمت', { min: 0 }), qty: int(i.qty, 'تعداد', { min: 1, max: 999 }) }));
  const services = money(items.reduce((a, i) => a + i.price * i.qty, 0));
  const discount = body.discount === undefined ? 0 : Math.min(num(body.discount, 'تخفیف', { min: 0 }), services);
  const cls = body.vehicle && body.vehicle.cls ? pickOne(body.vehicle.cls, CLASS_KEYS, 'نوع وسیله') : b.veh_cls;
  const plate = body.vehicle && body.vehicle.plate !== undefined ? str(body.vehicle.plate, 'مدل موتر', { max: 30 }) : b.plate;
  tx(db, () => {
    db.prepare('DELETE FROM bay_items WHERE bay_id=?').run(b.id);
    for (const i of items) db.prepare('INSERT INTO bay_items(bay_id,name,price,qty) VALUES(?,?,?,?)').run(b.id, i.name, i.price, i.qty);
    db.prepare('UPDATE bays SET discount=?, veh_cls=?, plate=? WHERE id=?').run(money(discount), cls, plate, b.id);
  });
  return getBay(db, b.id);
}
export function complete(db, id) {
  const b = row(db, id); needOpen(b);
  db.prepare("UPDATE bays SET status='done' WHERE id=?").run(b.id);
  return getBay(db, b.id);
}
export function cancel(db, id) {
  const b = row(db, id); needOpen(b);
  tx(db, () => resetBay(db, b.id));
  return getBay(db, b.id);
}

/** Pay a bill. amount omitted = full payment. Less than total = remainder becomes a customer due (customer required). */
export function pay(db, id, body, agent = '') {
  const b = row(db, id); needOpen(b);
  const v = view(db, b);
  if (!v.items.length) throw bad('NO_ITEMS', 'برای این بل خدمتی ثبت نشده است');
  const total = v.total;
  const received = body.amount === undefined ? total : Math.min(num(body.amount, 'مبلغ دریافتی', { min: 0 }), total);
  const credit = money(total - received);
  if (credit > 0.005 && !v.customer) throw bad('CUSTOMER_REQUIRED', 'برای باقی‌گذاشتن بقایا، مشتری را اضافه کنید');
  const now = clock.now();
  return tx(db, () => {
    const pid = db.prepare(`INSERT INTO payments(invoice_no,kind,name,veh_cls,plate,customer_id,started_at,paid_at,day,svc,discount,total,credit,pay,method,items_json,agent)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(v.billNo, 'bill', v.name, b.veh_cls, b.plate, b.customer_id, b.started_at, now.toISOString(), dayOf(now),
      v.services, v.discount, total, credit > 0.005 ? credit : 0, money(received), 'Cash', JSON.stringify(v.items.map(i => [i.name, i.qty, i.lineTotal])), agent).lastInsertRowid;
    if (credit > 0.005) db.prepare('INSERT INTO dues(invoice_no,customer_id,bill_date,name,plate,total,paid,last_payment_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(v.billNo, b.customer_id, b.started_at, v.name, b.plate, total, money(received), received > 0 ? now.toISOString() : null);
    resetBay(db, b.id);
    return { paymentId: Number(pid), invoiceNo: v.billNo, total, received: money(received), credit: credit > 0.005 ? credit : 0 };
  });
}
