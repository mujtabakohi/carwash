import { route } from '@/lib/http';
import { cancel } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body }) => cancel(db, params.id, body));
