import { route } from '@/lib/http';
import { pay } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body, user }) => pay(db, params.id, body, user.name));
