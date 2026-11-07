import { route } from '@/lib/http';
import { removeType } from '@/lib/services/expenses';
export const dynamic = 'force-dynamic';
export const DELETE = route(({ db, params }) => ({ types: removeType(db, params.id) }));
