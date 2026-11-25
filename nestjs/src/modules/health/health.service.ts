import { Injectable } from '@nestjs/common';
import { Database } from '../../database/database.service';
import { fail } from '../../common/http-error';

@Injectable()
export class HealthService {
  constructor(private readonly db: Database) {}

  async health() {
    try {
      await this.db.rows('SELECT COUNT(*) FROM services');
      return { status: 'ok', database: process.env.DB_DATABASE?.endsWith('_test') ? 'test' : 'dev' };
    } catch { return fail(503, 'Backend unavailable'); }
  }
}
