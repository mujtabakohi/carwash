import { route } from '@/lib/http';
import { replaceOrder } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const PUT = route(({ db, params, body }) => replaceOrder(db, params.id, body));
