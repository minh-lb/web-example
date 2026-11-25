import { Injectable } from '@nestjs/common';
import { Input, id, page, string } from '../../common/validation';
import { Actor, admin } from '../auth/actor';
import { CustomersRepository } from './customers.repository';
import { customerUpdate } from './customer.policy';

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}
  list(q: Input, actor: Actor) {
    admin(actor);
    return this.repo.list(page(q.page), Math.min(page(q.limit, 20), 50), string(q.search).trim());
  }
  detail(raw: string, actor: Actor) {
    admin(actor);
    return this.repo.detail(id(raw, 'Invalid customer ID'));
  }
  update(raw: string, body: unknown, actor: Actor) {
    admin(actor);
    return this.repo.update(id(raw, 'Invalid customer ID'), customerUpdate(body));
  }
}
