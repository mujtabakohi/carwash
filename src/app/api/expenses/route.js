import { route, created } from '@/lib/http';
import { listExpenses, createExpense } from '@/lib/services/expenses';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, query }) => listExpenses(db, query));
export const POST = route(({ db, body }) => created(createExpense(db, body)));
