import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionState } from '../src/lib/subscription.ts'
test('trial ends at the exact timestamp and remains readable after expiry',()=>{
 assert.equal(subscriptionState(1000,null,999).status,'trial');assert.equal(subscriptionState(1000,null,999).daysRemaining,1)
 assert.equal(subscriptionState(1000,null,1000).canWrite,false);assert.equal(subscriptionState(1000,null,1001).status,'expired')
})
test('paid validity controls the subscription without silently renewing the trial',()=>{
 assert.equal(subscriptionState(1000,2000,1500).status,'active');assert.equal(subscriptionState(1000,2000,2000).status,'expired');assert.equal(subscriptionState(null,null,0).canWrite,false)
 assert.equal(subscriptionState(3000,2000,2001).canWrite,false)
})
