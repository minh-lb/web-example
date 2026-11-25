import { fail } from '../../common/http-error';
export type Actor = { email: string; role: 'admin' | 'staff' };
export function admin(actor: Actor): void { if (actor.role !== 'admin') fail(403, 'Admin access required'); }
