import { route } from '@/lib/http';
import { setCustomer } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const PUT = route(({ db, params, body }) => setCustomer(db, params.id, body));
export const DELETE = route(({ db, params }) => setCustomer(db, params.id, null));
