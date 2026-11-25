import { Row } from '../../database/database.service';
import { iso } from '../../common/date-format';
import { serviceData } from '../services/service.mapper';
export const bookingColumns = 'b.*, s.slug AS s_slug,s.name AS s_name,s.description AS s_description,s.category AS s_category,s.duration_minutes AS s_duration_minutes,s.price AS s_price,s.color AS s_color,s.active AS s_active,s.created_at AS s_created_at,(SELECT COUNT(*) FROM bookings WHERE service_id=s.id) AS s_bookings_count,c.name AS c_name,c.email AS c_email,c.phone AS c_phone';
export const bookingJoin = ' FROM bookings b JOIN services s ON s.id=b.service_id JOIN customers c ON c.id=b.customer_id';
export function bookingData(r:Row) {
  return {id:Number(r.id),reference:r.reference,serviceId:Number(r.service_id),customerId:Number(r.customer_id),date:r.date,timeSlot:r.time_slot,status:r.status,notes:r.notes,createdBy:r.created_by,createdAt:iso(r.created_at),updatedAt:iso(r.updated_at),
    service:serviceData({id:r.service_id,...Object.fromEntries(Object.entries(r).filter(([k])=>k.startsWith('s_')).map(([k,v])=>[k.slice(2),v]))}),
    customer:{id:Number(r.customer_id),name:r.c_name,email:r.c_email,phone:r.c_phone}};
}
