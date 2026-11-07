import { route } from '@/lib/http';
import { monthly } from '@/lib/services/reports';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => monthly(db, query));
