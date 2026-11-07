import { route } from '@/lib/http';
import { complete } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body }) => complete(db, params.id, body));
