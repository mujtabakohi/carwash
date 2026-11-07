import { route, created } from '@/lib/http';
import { listBays, addBay } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => ({ bays: listBays(db) }));
export const POST = route(({ db, body }) => created(addBay(db, body)));
