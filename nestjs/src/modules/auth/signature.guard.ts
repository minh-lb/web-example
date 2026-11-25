import { CanActivate, ExecutionContext, Injectable, RawBodyRequest } from '@nestjs/common';
import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Actor } from './actor';
import { emailValid } from '../../common/validation';
import { fail } from '../../common/http-error';

export type SignedRequest = RawBodyRequest<Request> & { actor:Actor };
export function signature(secret:string,timestamp:string,method:string,path:string,body:Buffer|string,email:string,role:string) {
  return createHmac('sha256',secret).update([timestamp,method,path,createHash('sha256').update(body).digest('hex'),email,role].join('\n')).digest('hex');
}
@Injectable()
export class SignatureGuard implements CanActivate {
  canActivate(context:ExecutionContext):boolean {
    const req=context.switchToHttp().getRequest<SignedRequest>();
    const secret=process.env.INTERNAL_API_SECRET||'';
    const ts=req.get('X-Frontend-Timestamp')||'', email=req.get('X-Frontend-Identity')||'', role=req.get('X-Frontend-Role')||'', supplied=req.get('X-Frontend-Signature')||'';
    if(secret.length<24||!/^\d+$/.test(ts)||Math.abs(Date.now()/1000-Number(ts))>60||!emailValid(email)||(role!=='admin'&&role!=='staff')||! /^[a-f0-9]{64}$/.test(supplied)) fail(401,'Unauthorized');
    const expected=signature(secret,ts,req.method,req.originalUrl,req.rawBody||'',email,role);
    if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(supplied,'hex')))fail(401,'Unauthorized');
    req.actor={email,role};return true;
  }
}
