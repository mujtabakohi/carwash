import { route } from '@/lib/http';
import { getPayment } from '@/lib/services/payments';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, params }) => getPayment(db, params.id));
