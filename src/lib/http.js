import { NextResponse } from 'next/server';
import { ApiError } from './errors.js';
import { getDb } from './db.js';
import { requireUser } from './auth.js';

/**
 * Wrap a route handler: opens the DB, checks login, parses JSON body, converts errors to JSON.
 * handler({ request, params, query, body, db, user }) -> data | { data, status, headers }
 */
export function route(handler, { auth = true } = {}) {
  return async (request, ctx = {}) => {
    try {
      const db = getDb();
      const user = auth ? requireUser(db, request) : null;
      const params = (await ctx.params) || {};
      const query = Object.fromEntries(new URL(request.url).searchParams);
      let body = {};
      if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
        const text = await request.text();
        if (text) { try { body = JSON.parse(text); } catch { throw new ApiError(400, 'BAD_JSON', 'بدنهٔ درخواست باید JSON باشد'); } }
      }
      const out = await handler({ request, params, query, body, db, user });
      if (out && out.__raw) return new NextResponse(out.body, { status: out.status || 200, headers: out.headers });
      const res = NextResponse.json(out && out.__status ? out.data : out ?? { ok: true }, { status: out?.__status || 200 });
      if (out?.headers) for (const [k, v] of Object.entries(out.headers)) res.headers.append(k, v);
      return res;
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: 'خطای داخلی سرور' } }, { status: 500 });
    }
  };
}
export const created = (data, headers) => ({ __status: 201, data, headers });
export const withHeaders = (data, headers) => ({ __status: 200, data, headers });
