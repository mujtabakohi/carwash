import { route } from '@/lib/http';
import { setDiscount } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const PUT = route(({ db, params, body }) => setDiscount(db, params.id, body));
