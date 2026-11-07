import { route } from '@/lib/http';
import { updateItem, removeItem } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const PATCH = route(({ db, params, body }) => updateItem(db, params.id, params.itemId, body));
export const DELETE = route(({ db, params }) => removeItem(db, params.id, params.itemId));
