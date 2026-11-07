import { str, phone } from '../validate.js';

export function upsertCustomer(db, c) {
  const first = str(c.first, 'نام', { required: true, max: 40 }), last = str(c.last, 'تخلص', { max: 40 }), ph = phone(c.phone);
  const ex = db.prepare('SELECT id FROM customers WHERE phone=?').get(ph);
  if (ex) { db.prepare('UPDATE customers SET first=?, last=? WHERE id=?').run(first, last, ex.id); return ex.id; }
  return db.prepare('INSERT INTO customers(first,last,phone) VALUES(?,?,?)').run(first, last, ph).lastInsertRowid;
}
export const customerById = (db, id) => (id ? db.prepare('SELECT id,first,last,phone FROM customers WHERE id=?').get(id) || null : null);

export function searchCustomers(db, q = '') {
  const like = `%${String(q).trim()}%`;
  return db.prepare("SELECT id,first,last,phone FROM customers WHERE ? = '%%' OR phone LIKE ? OR first LIKE ? OR last LIKE ? ORDER BY first LIMIT 50").all(like, like, like, like);
}
