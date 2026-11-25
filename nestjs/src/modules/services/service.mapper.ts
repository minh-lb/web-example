import { iso } from '../../common/date-format';
export function serviceData(r:Record<string,any>) {
  return {id:Number(r.id),slug:r.slug,name:r.name,description:r.description,category:r.category,durationMinutes:Number(r.duration_minutes),price:Number(r.price),color:r.color,active:Boolean(r.active),createdAt:iso(r.created_at),_count:{bookings:Number(r.bookings_count)}};
}
