import { route } from '@/lib/http';
import { payDue } from '@/lib/services/dues';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body, user }) => payDue(db, params.invoice, body, user.name));
