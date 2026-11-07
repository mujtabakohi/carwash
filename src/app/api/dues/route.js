import { route } from '@/lib/http';
import { listDues } from '@/lib/services/dues';
export const dynamic = 'force-dynamic';
export const GET = route(({ db }) => listDues(db));
