import { getSettings } from './settings.js';
import { getCatalog } from './catalog.js';
import { listBays } from './bays.js';
import { shape as shapePayment } from './payments.js';
import { listDues } from './dues.js';
import { listExpenses, listTypes } from './expenses.js';
import { listInvestors } from './investors.js';
import { vehicleClasses } from './settings.js';

/** Everything the POS screen needs, in one request (a single-shop data set is small). */
export function snapshot(db) {
  const customers = db.prepare('SELECT id,first,last,phone FROM customers ORDER BY first').all();
  const payments = db.prepare('SELECT * FROM payments ORDER BY id DESC').all().map(p => shapePayment(db, p));
  return {
    settings: getSettings(db), vehicleClasses: vehicleClasses(), catalog: getCatalog(db), bays: listBays(db),
    payments, dues: listDues(db).dues, expenses: listExpenses(db).expenses, expenseTypes: listTypes(db).map(t => t.name),
    investors: listInvestors(db), customers,
  };
}
