import { fail } from '../../common/http-error';
import { id, today, validDate, emailValid, str } from '../../common/validation';
export const TIMES = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];
export const BOOKING_STATUSES = ['CONFIRMED','COMPLETED','CANCELED'];
export function canTransition(current: string, next: string) {
  return BOOKING_STATUSES.includes(next) && (current === next || current === 'CONFIRMED');
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
