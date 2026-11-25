import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition,demoFailures,validDate,serviceInput,bookingInput,today } from './policy';
test('booking transition matrix',()=>{for(const a of ['CONFIRMED','COMPLETED','CANCELED'])for(const b of ['CONFIRMED','COMPLETED','CANCELED'])assert.equal(canTransition(a,b),a===b||a==='CONFIRMED');assert.equal(canTransition('CONFIRMED','INVALID'),false);});
test('scenario attempts',()=>{assert.equal(demoFailures('success'),0);assert.equal(demoFailures('retry'),2);assert.equal(demoFailures('fail'),3);assert.throws(()=>demoFailures('other'));});
test('strict calendar',()=>{assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2027-02-29'),false);assert.equal(validDate('2027-04-31'),false);});
test('booking validation',()=>{const b={serviceId:1,date:today(1),timeSlot:'09:00',customerName:'Jo',customerEmail:'jo@example.com',customerPhone:'12345678'};assert.equal(bookingInput(b).notes,'');for(const bad of [{serviceId:0},{date:today(-1)},{timeSlot:'12:00'},{customerName:' '},{customerEmail:'bad'},{customerPhone:'123'},{notes:'x'.repeat(501)}])assert.throws(()=>bookingInput({...b,...bad}));});
test('service validation',()=>{const s={name:'AB',description:'12345',category:'Coaching',durationMinutes:15,price:1,color:'indigo',active:true};assert.equal(serviceInput(s).duration_minutes,15);assert.deepEqual(serviceInput({active:false},true),{active:false});for(const bad of [{active:'true'},{price:0},{durationMinutes:241},{name:'a'}])assert.throws(()=>serviceInput({...s,...bad}));});
