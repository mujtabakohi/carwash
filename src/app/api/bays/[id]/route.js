import { route } from '@/lib/http';
import { getBay, removeBay } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, params }) => getBay(db, params.id));
export const DELETE = route(({ db, params }) => { removeBay(db, params.id); return { ok: true }; });
