import { route } from '@/lib/http';
import { updateVehicle } from '@/lib/services/bays';
export const dynamic = 'force-dynamic';
export const PUT = route(({ db, params, body }) => updateVehicle(db, params.id, body));
