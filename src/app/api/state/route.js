import { route } from '@/lib/http';
import { snapshot } from '@/lib/services/state';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => snapshot(db));
