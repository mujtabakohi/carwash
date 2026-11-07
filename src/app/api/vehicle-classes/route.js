import { route } from '@/lib/http';
import { vehicleClasses } from '@/lib/services/settings';
export const dynamic = 'force-dynamic';
export const GET = route(() => vehicleClasses());
