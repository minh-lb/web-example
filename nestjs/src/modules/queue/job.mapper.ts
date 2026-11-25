import { Row } from '../../database/database.service';
import { iso } from '../../common/date-format';
export const jobJoin = ' FROM background_jobs j LEFT JOIN bookings b ON b.id=j.booking_id';
export function jobData(r:Row) {
  return {id:Number(r.id),type:r.type,bookingId:r.booking_id==null?null:Number(r.booking_id),booking:r.reference?{reference:r.reference}:null,status:r.status,attempts:Number(r.attempts),maxAttempts:Number(r.max_attempts),failUntilAttempt:Number(r.fail_until_attempt),lastError:r.last_error,result:r.result,completedAt:iso(r.completed_at),createdAt:iso(r.created_at)};
}
