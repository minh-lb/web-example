import { HttpException } from '@nestjs/common';
export function fail(status: number, error: string): never { throw new HttpException({ error }, status); }
