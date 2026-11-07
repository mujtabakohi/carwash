// Database schema + first-run seed. No driver import here, so it can be tested with any SQLite wrapper.
export const VEHICLE_CLASSES = [
  { key: 'bike', emoji: '🏍️', label: 'موترسایکل' },
  { key: 'rickshaw', emoji: '🛺', label: 'ریکشا' },
  { key: 'sedan', emoji: '🚗', label: 'موتر' },
];
export const vehicleLabel = (k) => (VEHICLE_CLASSES.find(v => v.key === k) || { label: 'وسیله' }).label;

const DEFAULT_CATALOG = [
  { name: 'شستشو', emoji: '🚿', items: [['شستشوی بیرونی',100],['شستشوی کامل موتر (داخل و بیرون)',150],['شستشوی جیپ / 4WD',250],['شستشوی موتر لوکس',300],['شستشوی موترسایکل',50],['ریکشا',100],['شستشوی انجن',150],['شستشوی زیر موتر',100]] },
  { name: 'داخل موتر', emoji: '🧽', items: [['پاک‌کاری داخلی',100],['پاک‌کاری قالین',200],['شستشوی چوکی با شمپو',500]] },
  { name: 'جلا و مراقبت', emoji: '✨', items: [['پالش و موم',500]] },
  { name: 'غذا و نوشیدنی', emoji: '🥫', items: [['انرژی الکوزی',50],['انرژی هیت',40],['جینسنگ',70],['کاراباو',70],['ریدبول',100],['مانستر',100],['بتری',50],['گوریلا',80],['انرژی اتک',40]] },
];
const DEFAULT_EXPENSE_TYPES = ['آب و برق','شمپو و مواد کیمیاوی','معاشات','کرایه','ترمیم وسایل','سایر'];

export function migrate(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
    pass_hash TEXT NOT NULL, pass_ver INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY, value INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS catalog_categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL, emoji TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS catalog_items(
    id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL, price REAL NOT NULL, sort INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS customers(
    id INTEGER PRIMARY KEY, first TEXT NOT NULL DEFAULT '', last TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS bays(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, kind TEXT NOT NULL DEFAULT 'wash' CHECK(kind IN ('wash','detail')),
    status TEXT NOT NULL DEFAULT 'free' CHECK(status IN ('free','run','done')),
    veh_cls TEXT, plate TEXT NOT NULL DEFAULT '', bill_no INTEGER, started_at TEXT,
    discount REAL NOT NULL DEFAULT 0, customer_id INTEGER REFERENCES customers(id));
  CREATE TABLE IF NOT EXISTS bay_items(
    id INTEGER PRIMARY KEY, bay_id INTEGER NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
    name TEXT NOT NULL, price REAL NOT NULL, qty INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS payments(
    id INTEGER PRIMARY KEY, invoice_no INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('bill','due')),
    name TEXT NOT NULL, veh_cls TEXT, plate TEXT NOT NULL DEFAULT '', customer_id INTEGER REFERENCES customers(id),
    started_at TEXT, paid_at TEXT NOT NULL, day TEXT NOT NULL,
    svc REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0, pay REAL NOT NULL DEFAULT 0, method TEXT NOT NULL DEFAULT 'Cash',
    items_json TEXT NOT NULL DEFAULT '[]', agent TEXT NOT NULL DEFAULT '');
  CREATE INDEX IF NOT EXISTS idx_payments_day ON payments(day);
  CREATE TABLE IF NOT EXISTS dues(
    invoice_no INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
    bill_date TEXT NOT NULL, name TEXT NOT NULL, plate TEXT NOT NULL DEFAULT '',
    total REAL NOT NULL, paid REAL NOT NULL DEFAULT 0, last_payment_at TEXT);
  CREATE TABLE IF NOT EXISTS expense_types(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS expenses(
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, day TEXT NOT NULL, amount REAL NOT NULL,
    type TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_expenses_day ON expenses(day);
  CREATE TABLE IF NOT EXISTS investors(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, share REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
  `);

  const seeded = db.prepare("SELECT value FROM settings WHERE key='seeded'").get();
  if (seeded) return;
  const run = (fn) => { db.exec('BEGIN'); try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } };
  run(() => {
    const set = db.prepare('INSERT INTO settings(key,value) VALUES(?,?)');
    set.run('biz', 'کارواش مزار'); set.run('addr', 'مزار شریف، افغانستان'); set.run('tel', '+93 700 000 000'); set.run('seeded', '1');
    db.prepare('INSERT INTO counters(name,value) VALUES(?,?)').run('bill', 64327);
    for (let i = 1; i <= 6; i++) db.prepare("INSERT INTO bays(name,kind) VALUES(?, 'wash')").run('بل ' + i);
    DEFAULT_CATALOG.forEach((c, ci) => {
      const id = db.prepare('INSERT INTO catalog_categories(name,emoji,sort) VALUES(?,?,?)').run(c.name, c.emoji, ci).lastInsertRowid;
      c.items.forEach(([n, p], ii) => db.prepare('INSERT INTO catalog_items(category_id,name,price,sort) VALUES(?,?,?,?)').run(id, n, p, ii));
    });
    DEFAULT_EXPENSE_TYPES.forEach(n => db.prepare('INSERT INTO expense_types(name) VALUES(?)').run(n));
    db.prepare('INSERT INTO investors(name,share,amount,sort) VALUES(?,?,?,?)').run('سرمایه‌گذار 1', 50, 0, 0);
    db.prepare('INSERT INTO investors(name,share,amount,sort) VALUES(?,?,?,?)').run('سرمایه‌گذار 2', 50, 0, 1);
  });
}
