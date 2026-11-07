import { bad } from '../errors.js';
import { str, num } from '../validate.js';
import { tx } from '../db.js';

export function getCatalog(db) {
  const cats = db.prepare('SELECT id,name,emoji FROM catalog_categories ORDER BY sort,id').all();
  const items = db.prepare('SELECT id,category_id,name,price FROM catalog_items ORDER BY sort,id').all();
  return cats.map(c => ({ id: c.id, name: c.name, emoji: c.emoji, items: items.filter(i => i.category_id === c.id).map(i => ({ id: i.id, name: i.name, price: i.price })) }));
}

/** Replace the whole price list: [{name, emoji, items:[{name, price}]}] */
export function replaceCatalog(db, body) {
  if (!Array.isArray(body.categories) || body.categories.length > 50) throw bad('VALIDATION', 'فهرست دسته‌ها نادرست است');
  const cats = body.categories.map(c => ({
    name: str(c.name, 'نام دسته', { required: true, max: 60 }), emoji: str(c.emoji, 'ایموجی', { max: 8 }),
    items: (Array.isArray(c.items) ? c.items : []).slice(0, 300).map(i => ({ name: str(i.name, 'نام خدمت', { required: true, max: 80 }), price: num(i.price, 'قیمت', { min: 0 }) })),
  }));
  tx(db, () => {
    db.prepare('DELETE FROM catalog_items').run(); db.prepare('DELETE FROM catalog_categories').run();
    cats.forEach((c, ci) => {
      const id = db.prepare('INSERT INTO catalog_categories(name,emoji,sort) VALUES(?,?,?)').run(c.name, c.emoji, ci).lastInsertRowid;
      c.items.forEach((i, ii) => db.prepare('INSERT INTO catalog_items(category_id,name,price,sort) VALUES(?,?,?,?)').run(id, i.name, i.price, ii));
    });
  });
  return getCatalog(db);
}
