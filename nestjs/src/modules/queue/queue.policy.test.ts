import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoFailures } from './queue.policy';
test('scenario attempts',()=>{assert.equal(demoFailures('success'),0);assert.equal(demoFailures('retry'),2);assert.equal(demoFailures('fail'),3);assert.throws(()=>demoFailures('other'));});
