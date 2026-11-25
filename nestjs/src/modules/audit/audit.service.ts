import { Injectable } from '@nestjs/common';
import { Input } from '../../common/validation';
import { Actor, admin } from '../auth/actor';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}
  list(query: Input, actor: Actor) {
    admin(actor);
    return this.repo.list(query);
  }
}
