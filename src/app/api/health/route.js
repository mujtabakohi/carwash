import { route } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => ({ ok: true, time: new Date().toISOString(), bays: db.prepare('SELECT COUNT(*) c FROM bays').get().c }), { auth: false });
