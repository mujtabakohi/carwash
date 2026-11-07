import { route } from '@/lib/http';
import { listInvestors, replaceInvestors } from '@/lib/services/investors';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => ({ investors: listInvestors(db) }));
export const PUT = route(({ db, body }) => ({ investors: replaceInvestors(db, body) }));
