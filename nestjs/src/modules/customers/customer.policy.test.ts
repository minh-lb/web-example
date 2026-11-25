import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { customerUpdate } from './customer.policy';

test('customer contact patch validates and normalizes supplied fields', () => {
  assert.deepEqual(customerUpdate({ name: '  Jane Doe ', phone: ' 0901234567 ' }), { name: 'Jane Doe', phone: '0901234567' });
  assert.deepEqual(customerUpdate({ email: 'jane@example.com' }), { email: 'jane@example.com' });
});
test('customer patch rejects empty, malformed and unknown fields', () => {
  for (const body of [null, [], {}, { name: 'x' }, { email: 'bad' }, { phone: '1' }, { name: 'Jane', id: 5 }, { email: null }]) {
    assert.throws(() => customerUpdate(body), (e: unknown) => e instanceof HttpException && e.getStatus() === 400);
  }
});
