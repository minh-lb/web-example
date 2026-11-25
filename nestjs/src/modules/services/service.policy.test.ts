import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceInput } from './service.policy';
test('service validation',()=>{const s={name:'AB',description:'12345',category:'Coaching',durationMinutes:15,price:1,color:'indigo',active:true};assert.equal(serviceInput(s).duration_minutes,15);assert.deepEqual(serviceInput({active:false},true),{active:false});for(const bad of [{active:'true'},{price:0},{durationMinutes:241},{name:'a'}])assert.throws(()=>serviceInput({...s,...bad}));});
