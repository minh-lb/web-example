import { Injectable } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { Input, id, page, string, validDate } from '../../common/validation';
import { fail } from '../../common/http-error';
import { Actor } from '../auth/actor';
import { bookingInput, BOOKING_STATUSES } from './booking.policy';
@Injectable()
export class BookingsService {
  constructor(private readonly repo: BookingsRepository) {}
  bookings(q:Input){return this.repo.bookings(page(q.page),string(q.search).trim(),string(q.status),q.sort==='oldest');}
  createBooking(b:Input,a:Actor){return this.repo.createBooking(bookingInput(b),a.email);}
  changeBooking(raw:string,b:Input){const bookingId=id(raw,'Invalid booking');if(typeof b.status !== 'string' || !BOOKING_STATUSES.includes(b.status))fail(400,'Invalid status');return this.repo.changeBooking(bookingId,b.status);}
  availability(q:Input){const serviceId=id(q.serviceId,'Select a service');if(!validDate(q.date))fail(400,'Choose a valid date');return this.repo.availability(serviceId,q.date);}
  async summary() { return { bookings: await this.repo.recent(), totalBookings: await this.repo.total(), upcoming: await this.repo.upcoming() }; }
}
