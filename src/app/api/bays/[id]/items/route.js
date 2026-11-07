import { route, created } from '@/lib/http';
import { addItem } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body }) => created(addItem(db, params.id, body)));
