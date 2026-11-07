import { route } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = route(({ user }) => ({ user: { id: user.id, name: user.name, username: user.username } }));
