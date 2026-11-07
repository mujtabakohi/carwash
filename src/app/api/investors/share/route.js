import { route } from '@/lib/http';
import { monthShare } from '@/lib/services/investors';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => monthShare(db, query));
