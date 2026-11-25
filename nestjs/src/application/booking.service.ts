import { Injectable } from '@nestjs/common';
import { Repository } from '../infrastructure/repository';
import { bookingInput, serviceInput, validDate, id, page, fail, BOOKING_STATUSES, JOB_STATUSES } from '../domain/policy';

export type Actor = { email:string; role:'admin'|'staff' };
type Input=Record<string,any>;
const string=(v:unknown)=>typeof v==='string'?v:'';
const admin=(actor:Actor)=>{if(actor.role!=='admin') fail(403,'Admin access required');};
@Injectable()
export class BookingService {
  constructor(private readonly repo:Repository) {}
  services(q:Input,a:Actor){return this.repo.services(page(q.page),Math.min(50,page(q.limit,6)),string(q.search).trim(),string(q.category),a.role!=='admin'||q.active==='true');}
  createService(b:Input,a:Actor){admin(a);return this.repo.createService(serviceInput(b));}
  updateService(raw:string,b:Input,a:Actor){admin(a);return this.repo.updateService(id(raw,'Invalid service'),serviceInput(b,true));}
  async archiveService(raw:string,a:Actor){admin(a);await this.repo.updateService(id(raw,'Invalid service'),{active:false});return {success:true};}
  bookings(q:Input){return this.repo.bookings(page(q.page),string(q.search).trim(),string(q.status),q.sort==='oldest');}
  createBooking(b:Input,a:Actor){return this.repo.createBooking(bookingInput(b),a.email);}
  changeBooking(raw:string,b:Input){const bookingId=id(raw,'Invalid booking');if(!BOOKING_STATUSES.includes(b.status))fail(400,'Invalid status');return this.repo.changeBooking(bookingId,b.status);}
  availability(q:Input){const serviceId=id(q.serviceId,'Select a service');if(!validDate(q.date))fail(400,'Choose a valid date');return this.repo.availability(serviceId,q.date);}
  dashboard(){return this.repo.dashboard();}
  queue(q:Input,a:Actor){admin(a);const status=(string(q.status)||'ALL').toUpperCase();if(![...JOB_STATUSES,'ALL'].includes(status))fail(400,'Invalid queue filters');return this.repo.queue(status,page(q.page));}
  enqueue(b:Input,a:Actor){admin(a);return this.repo.enqueue(b.scenario);}
  retry(raw:string,b:Input,a:Actor){admin(a);const jobId=id(raw,'Invalid job ID');if(b.action!=='retry')fail(400,'Invalid action');return this.repo.retry(jobId);}
}
