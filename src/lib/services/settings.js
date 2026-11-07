import { str } from '../validate.js';
import { VEHICLE_CLASSES } from '../schema.js';

export function getSettings(db) {
  const o = {}; for (const r of db.prepare('SELECT key,value FROM settings').all()) o[r.key] = r.value;
  return { biz: o.biz, addr: o.addr, tel: o.tel };
}
export function updateSettings(db, body) {
  const cur = getSettings(db);
  const next = {
    biz: body.biz === undefined ? cur.biz : str(body.biz, 'نام کارواش', { required: true, max: 60 }),
    addr: body.addr === undefined ? cur.addr : str(body.addr, 'آدرس', { max: 120 }),
    tel: body.tel === undefined ? cur.tel : str(body.tel, 'شماره تماس', { max: 30 }),
  };
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(next)) up.run(k, v);
  return next;
}
export const vehicleClasses = () => VEHICLE_CLASSES;
