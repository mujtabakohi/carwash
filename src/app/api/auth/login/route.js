import { route, withHeaders } from '@/lib/http';
import { login } from '@/lib/services/account';
import { cookieHeader } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, body, request }) => {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const r = login(db, body, ip);
  return withHeaders({ user: r.user, token: r.token }, { 'Set-Cookie': cookieHeader(r.token) });
}, { auth: false });
