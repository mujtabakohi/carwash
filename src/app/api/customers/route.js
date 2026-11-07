import { route } from '@/lib/http';
import { searchCustomers } from '@/lib/services/customers';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => ({ customers: searchCustomers(db, query.q) }));
