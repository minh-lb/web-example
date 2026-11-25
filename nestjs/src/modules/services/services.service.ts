import { Injectable } from '@nestjs/common';
import { ServicesRepository } from './services.repository';
import { Input, id, page, string } from '../../common/validation';
import { Actor, admin } from '../auth/actor';
import { fail } from '../../common/http-error';
import { serviceInput } from './service.policy';
@Injectable()
export class ServicesService {
  constructor(private readonly repo: ServicesRepository) {}
  services(q:Input,a:Actor){return this.repo.services(page(q.page),Math.min(50,page(q.limit,6)),string(q.search).trim(),string(q.category),a.role!=='admin'||q.active==='true');}
  async detail(raw:string,a:Actor){const service=await this.repo.service(id(raw,'Invalid service'));if(a.role!=='admin'&&!service.active)fail(404,'Service not found');return service;}
  createService(b:Input,a:Actor){admin(a);return this.repo.createService(serviceInput(b));}
  updateService(raw:string,b:Input,a:Actor){admin(a);return this.repo.updateService(id(raw,'Invalid service'),serviceInput(b,true));}
  async archiveService(raw:string,a:Actor){admin(a);await this.repo.updateService(id(raw,'Invalid service'),{active:false});return {success:true};}
}
