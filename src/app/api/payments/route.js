import { route } from '@/lib/http';
import { listPayments } from '@/lib/services/payments';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => ({ payments: listPayments(db, query) }));
