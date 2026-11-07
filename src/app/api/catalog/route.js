import { route } from '@/lib/http';
import { getCatalog, replaceCatalog } from '@/lib/services/catalog';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => ({ categories: getCatalog(db) }));
export const PUT = route(({ db, body }) => ({ categories: replaceCatalog(db, body) }));
