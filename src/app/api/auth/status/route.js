import { route } from '@/lib/http';
import { tokenFromRequest, readToken } from '@/lib/auth';
import { status } from '@/lib/services/account';
export const dynamic = 'force-dynamic';
export const GET = route(({ db, request }) => {
  const p = readToken(tokenFromRequest(request));
  const user = p && db.prepare('SELECT id,name,username,pass_ver FROM users WHERE id=?').get(p.uid);
  return status(db, user && user.pass_ver === p.pv ? user : null);
}, { auth: false });
