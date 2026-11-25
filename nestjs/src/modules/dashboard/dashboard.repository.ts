import { Injectable } from '@nestjs/common';
import { Database } from '../../database/database.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly db: Database) {}

  activeServices() { return this.db.count('SELECT COUNT(*) AS total FROM services WHERE active=1'); }
  clients() { return this.db.count('SELECT COUNT(*) AS total FROM customers'); }
}
