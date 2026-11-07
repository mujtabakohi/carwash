import { route, withHeaders } from '@/lib/http';
import { changePassword } from '@/lib/services/account';
import { cookieHeader } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, body, user }) => {
  const r = changePassword(db, user.id, body);
  return withHeaders({ user: r.user, token: r.token }, { 'Set-Cookie': cookieHeader(r.token) });
});
