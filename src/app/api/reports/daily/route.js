import { route } from '@/lib/http';
import { daily } from '@/lib/services/reports';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => daily(db, query));
