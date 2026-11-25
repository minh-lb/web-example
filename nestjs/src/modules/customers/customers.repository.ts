import { Injectable } from '@nestjs/common';
import { Database, Sql } from '../../database/database.service';
import { iso } from '../../common/date-format';
import { fail } from '../../common/http-error';
import { CustomerUpdate } from './customer.policy';

const columns = 'c.id,c.name,c.email,c.phone,c.created_at,c.updated_at,(SELECT COUNT(*) FROM bookings b WHERE b.customer_id=c.id) AS bookings_count';
function customerData(row: Record<string, any>) {
  return { id: Number(row.id), name: row.name, email: row.email, phone: row.phone, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), _count: { bookings: Number(row.bookings_count) } };
}

@Injectable()
export class CustomersRepository {
  constructor(private readonly db: Database) {}

  async list(page: number, size: number, search: string) {
    const where = search ? ' WHERE (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)' : '';
    const args = search ? Array(3).fill('%' + search + '%') : [];
    const total = await this.db.count('SELECT COUNT(*) AS total FROM customers c' + where, args);
    const items = (await this.db.rows('SELECT ' + columns + ' FROM customers c' + where + ' ORDER BY c.id DESC LIMIT ? OFFSET ?', [...args, size, (page - 1) * size])).map(customerData);
    return { items, total, page, pageSize: size };
  }

  async detail(id: number, c?: Sql) {
    const [row] = await this.db.rows('SELECT ' + columns + ' FROM customers c WHERE c.id=?', [id], c);
    return row ? customerData(row) : fail(404, 'Customer not found');
  }

  async update(id: number, input: CustomerUpdate) {
    try {
      return await this.db.transaction(async c => {
        const [row] = await this.db.rows('SELECT id FROM customers WHERE id=? FOR UPDATE', [id], c);
        if (!row) fail(404, 'Customer not found');
        await this.db.write('UPDATE customers SET ? WHERE id=?', [{ ...input, updated_at: new Date() }, id], c);
        return this.detail(id, c);
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') fail(409, 'Customer email already exists');
      throw error;
    }
  }
}
