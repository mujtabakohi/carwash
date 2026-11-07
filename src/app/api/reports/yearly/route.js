import { route } from '@/lib/http';
import { yearly } from '@/lib/services/reports';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => yearly(db, query));
