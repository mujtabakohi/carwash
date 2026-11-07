import { route, created } from '@/lib/http';
import { setup } from '@/lib/services/account';
import { cookieHeader } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, body }) => {
  const r = setup(db, body);
  return created({ user: r.user, token: r.token }, { 'Set-Cookie': cookieHeader(r.token) });
}, { auth: false });
