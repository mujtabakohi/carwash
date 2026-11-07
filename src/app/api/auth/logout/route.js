import { route, withHeaders } from '@/lib/http';
import { clearCookieHeader } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = route(() => withHeaders({ ok: true }, { 'Set-Cookie': clearCookieHeader() }), { auth: false });
