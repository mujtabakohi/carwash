import { notFound, conflict, bad } from '../errors.js';
import { str, num, day as vDay } from '../validate.js';
import { clock } from '../clock.js';
import { dayOf, jLabel } from '../jalali.js';

const shape = (e) => ({ id: e.id, title: e.title, day: e.day, jalaliDay: jLabel(e.day), amount: e.amount, type: e.type, description: e.description });

export const listTypes = (db) => db.prepare('SELECT id,name FROM expense_types ORDER BY id').all();
export function addType(db, body) {
  const name = str(body.name, 'نام نوع', { required: true, max: 40 });
  if (db.prepare('SELECT 1 FROM expense_types WHERE name=?').get(name)) throw conflict('DUPLICATE', 'این نوع از قبل وجود دارد');
  db.prepare('INSERT INTO expense_types(name) VALUES(?)').run(name);
  return listTypes(db);
}
export function removeType(db, id) {
  const t = db.prepare('SELECT * FROM expense_types WHERE id=?').get(Number(id));
  if (!t) throw notFound('نوع پیدا نشد');
  if (db.prepare('SELECT 1 FROM expenses WHERE type=?').get(t.name)) throw conflict('IN_USE', `«${t.name}» در یک مصرف استفاده شده و حذف شده نمی‌تواند`);
  db.prepare('DELETE FROM expense_types WHERE id=?').run(t.id);
  return listTypes(db);
}

function clean(db, b) {
  const type = str(b.type, 'نوع مصرف', { required: true, max: 40 });
  // A brand-new type typed on the expense form is created automatically.
  if (!db.prepare('SELECT 1 FROM expense_types WHERE name=?').get(type)) db.prepare('INSERT INTO expense_types(name) VALUES(?)').run(type);
  return {
    title: str(b.title, 'عنوان', { required: true, max: 80 }),
    day: b.date === undefined ? dayOf(clock.now()) : vDay(b.date, 'تاریخ مصرف'),
    amount: num(b.amount, 'مبلغ', { gt: 0 }), type, description: str(b.description, 'توضیحات', { max: 300 }),
  };
}
export function listExpenses(db, q = {}) {
  const from = q.from ? vDay(q.from, 'از تاریخ') : '0000-00-00', to = q.to ? vDay(q.to, 'تا تاریخ') : '9999-12-31';
  const rows = db.prepare('SELECT * FROM expenses WHERE day BETWEEN ? AND ? ORDER BY day DESC, id DESC').all(from, to).map(shape);
  return { total: rows.reduce((a, e) => a + e.amount, 0), expenses: rows };
}
export function createExpense(db, body) {
  const e = clean(db, body);
  const id = db.prepare('INSERT INTO expenses(title,day,amount,type,description,created_at) VALUES(?,?,?,?,?,?)').run(e.title, e.day, e.amount, e.type, e.description, clock.now().toISOString()).lastInsertRowid;
  return shape(db.prepare('SELECT * FROM expenses WHERE id=?').get(id));
}
export function updateExpense(db, id, body) {
  const cur = db.prepare('SELECT * FROM expenses WHERE id=?').get(Number(id));
  if (!cur) throw notFound('مصرف پیدا نشد');
  const e = clean(db, { title: cur.title, date: cur.day, amount: cur.amount, type: cur.type, description: cur.description, ...body });
  db.prepare('UPDATE expenses SET title=?, day=?, amount=?, type=?, description=? WHERE id=?').run(e.title, e.day, e.amount, e.type, e.description, cur.id);
  return shape(db.prepare('SELECT * FROM expenses WHERE id=?').get(cur.id));
}
export function deleteExpense(db, id) {
  if (!db.prepare('DELETE FROM expenses WHERE id=?').run(Number(id)).changes) throw notFound('مصرف پیدا نشد');
}
