import { route } from '@/lib/http';
import { getSettings, updateSettings } from '@/lib/services/settings';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => getSettings(db));
export const PUT = route(({ db, body }) => updateSettings(db, body));
