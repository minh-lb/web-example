import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { WorkerModule } from './worker.module';
import { DatabaseModule } from './database/database.module';
import { Database } from './database/database.service';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BookingsService } from './modules/bookings/bookings.service';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ServicesModule } from './modules/services/services.module';
import { QueueModule } from './modules/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
const metadata = (module: Function, key: string): unknown[] => Reflect.getMetadata(key, module) || [];
test('root module composes feature modules without registering their providers again', () => {
  assert.deepEqual(metadata(AppModule,MODULE_METADATA.IMPORTS),[DatabaseModule,ServicesModule,BookingsModule,DashboardModule,QueueModule,HealthModule,CustomersModule]);
  assert.deepEqual(metadata(AppModule,MODULE_METADATA.PROVIDERS),[]);
  assert.deepEqual(metadata(DatabaseModule,MODULE_METADATA.EXPORTS),[Database]);
  assert.deepEqual(metadata(BookingsModule,MODULE_METADATA.EXPORTS),[BookingsService]);
  assert.ok(metadata(DashboardModule,MODULE_METADATA.IMPORTS).includes(BookingsModule));
  for (const feature of [ServicesModule,BookingsModule,DashboardModule,QueueModule,CustomersModule]) {
    assert.ok(metadata(feature,MODULE_METADATA.IMPORTS).includes(AuthModule));
    assert.ok(!metadata(feature,MODULE_METADATA.PROVIDERS).includes(Database));
  }
  assert.deepEqual(metadata(WorkerModule,MODULE_METADATA.IMPORTS),[DatabaseModule]);
  assert.deepEqual(metadata(WorkerModule,MODULE_METADATA.CONTROLLERS),[]);
});
