import { HttpException } from '@nestjs/common';

export const TIMES = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];
export const BOOKING_STATUSES = ['CONFIRMED','COMPLETED','CANCELED'];
export const JOB_STATUSES = ['PENDING','PROCESSING','COMPLETED','FAILED'];
export function fail(status: number, error: string): never { throw new HttpException({ error }, status); }
export function canTransition(current: string, next: string) {
  return BOOKING_STATUSES.includes(next) && (current === next || current === 'CONFIRMED');
}
export function demoFailures(scenario: string): number {
  switch (scenario) { case 'success': return 0; case 'retry': return 2; case 'fail': return 3; default: return fail(400,'Invalid demo scenario'); }
}
export function today(offset = 0): string {
  const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0,10);
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}
export function positive(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))) return 0;
  const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
export function id(value: unknown, message: string): number { return positive(value) || fail(400,message); }
export function page(value: unknown, fallback = 1) { return Math.min(positive(value) || fallback, 100000000); }
export function emailValid(value: unknown): value is string { return typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function str(value: unknown, min: number, max: number, short: string, long: string): string {
  if (typeof value !== 'string' || value.trim().length < min) return fail(400,short);
  const v = value.trim(); if (v.length > max) return fail(400,long); return v;
}
export function bookingInput(body: Record<string, unknown>) {
  const serviceId = id(body.serviceId,'Select a service');
  if (!validDate(body.date)) fail(400,'Choose a valid date');
  if (body.date < today()) fail(400,'Choose today or a future date');
  if (typeof body.timeSlot !== 'string' || !TIMES.includes(body.timeSlot)) fail(400,'Choose an available time');
  const customerName = str(body.customerName,2,100,'Enter a customer name','Customer name may not exceed 100 characters');
  if (!emailValid(body.customerEmail)) fail(400,'Enter a valid email');
  const customerPhone = str(body.customerPhone,8,20,'Enter a phone number','Phone may not exceed 20 characters');
  const notes = body.notes == null || body.notes === '' ? '' : str(body.notes,0,500,'Invalid notes','Notes may not exceed 500 characters');
  return { serviceId,date:body.date,timeSlot:body.timeSlot,customerName,customerEmail:body.customerEmail,customerPhone,notes };
}
export function serviceInput(body: Record<string, unknown>, partial = false): Record<string, string|number|boolean> {
  const result: Record<string,string|number|boolean> = {};
  const validators: Record<string,(v:unknown)=>string|number|boolean> = {
    name: v => str(v,2,80,'Enter a service name','Name may not exceed 80 characters'),
    description: v => str(v,5,300,'Describe this service','Description may not exceed 300 characters'),
    category: v => typeof v === 'string' && ['Consultation','Wellness','Coaching'].includes(v) ? v : fail(400,'Invalid category'),
    durationMinutes: v => positive(v) >= 15 && positive(v) <= 240 ? positive(v) : fail(400,'Invalid duration'),
    price: v => positive(v) && positive(v) <= 4294967295 ? positive(v) : fail(400,'Price must be greater than zero'),
    color: v => typeof v === 'string' && ['indigo','rose','amber','cyan','emerald','violet'].includes(v) ? v : fail(400,'Invalid color'),
    active: v => typeof v === 'boolean' ? v : v === 0 || v === 1 || v === '0' || v === '1' ? Number(v) === 1 : fail(400,'Invalid active flag'),
  };
  for (const [key, validate] of Object.entries(validators)) if (!partial || Object.hasOwn(body,key)) result[key === 'durationMinutes' ? 'duration_minutes' : key] = validate(body[key]);
  return result;
}
