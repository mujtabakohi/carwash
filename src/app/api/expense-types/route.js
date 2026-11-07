import { route, created } from '@/lib/http';
import { listTypes, addType } from '@/lib/services/expenses';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => ({ types: listTypes(db) }));
export const POST = route(({ db, body }) => created({ types: addType(db, body) }));
