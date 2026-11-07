import { route } from '@/lib/http';
import { updateExpense, deleteExpense } from '@/lib/services/expenses';
export const dynamic = 'force-dynamic';
export const PUT = route(({ db, params, body }) => updateExpense(db, params.id, body));
export const PATCH = PUT;
export const DELETE = route(({ db, params }) => { deleteExpense(db, params.id); return { ok: true }; });
