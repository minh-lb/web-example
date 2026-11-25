import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository, private readonly bookings: BookingsService) {}

  async dashboard() {
    return { ...await this.bookings.summary(), activeServices: await this.repo.activeServices(), clients: await this.repo.clients() };
  }
}
