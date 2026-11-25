const mutations = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const names: Record<string,string> = {
  'POST /api/bookings':'CreateBooking',
  'PATCH /api/bookings/:id':'ChangeBookingStatus',
  'PATCH /api/customers/:id':'UpdateCustomer',
  'POST /api/services':'CreateService',
  'PATCH /api/services/:id':'UpdateService',
  'DELETE /api/services/:id':'ArchiveService',
  'POST /api/queue':'EnqueueJob',
  'PATCH /api/queue/:id':'RetryJob',
};

export function resolveAuditEvent(method: string, route: unknown, handler: string) {
  if (!mutations.has(method) || typeof route !== 'string') return null;
  const path = route.replace(/\/+$/, '');
  const match = /^\/api\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(path);
  if (!match || ['audit-logs','health','auth'].includes(match[1])) return null;
  return {
    eventSource: match[1].slice(0,64),
    eventName: (names[method+' '+path] || method+'_'+handler).slice(0,64),
  };
}
