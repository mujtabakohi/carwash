import { route } from '@/lib/http';
import { checkin } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const POST = route(({ db, params, body }) => checkin(db, params.id, body));
