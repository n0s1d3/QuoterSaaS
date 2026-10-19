import { test } from 'node:test'
import assert from 'node:assert/strict'
import { finance } from '../docs/lanzamiento/modelo-financiero.mjs'
const base={months:12,discount:15,refund:3,mix1:70,mix2:20,mix3:10,price1:49,price2:89,price3:149,workers:5,email:0,domain:15,backup:3,monitor:0,fx:7.7,marketing:300,extra:0,operations:3,commercial:4,hourly:40,onboardings:0,onboardingMinutes:20,support:15,paymentMinutes:3,feePercent:0,feeFixed:0,tax:12}
test('annual planning separates advance cash from monthly recognition and amortizes payment handling',()=>{
 const model=finance(base)
 assert.ok(Math.abs(model.nominal-56.95)<0.00001)
 assert.ok(Math.abs(model.variableTime-10.1666666667)<0.00001)
 assert.equal(model.economicBreakEven,17);assert.equal(model.cashBreakEven,8)
 assert.ok(Math.abs(model.portfolio(10).initialCohortCash-6834)<0.00001)
 assert.ok(Math.abs(model.portfolio(10).gross-569.5)<0.00001)
 assert.ok(Math.abs(model.portfolio(10).economic-(-259.6639880952381))<0.00001)
 assert.equal(finance({...base,email:20}).economicBreakEven,21)
 assert.equal(finance({...base,mix1:100,mix2:0,mix3:0}).economicBreakEven,26)
 assert.equal(finance({...base,email:20,mix1:100,mix2:0,mix3:0}).economicBreakEven,32)
})
test('refunds reduce contribution, external fees remain on original receipts, and onboarding stays a current expense',()=>{
 const clean=finance({...base,refund:0}),loss=finance({...base,refund:100})
 assert.equal(loss.economicBreakEven,null)
 assert.ok(clean.economicContribution>finance(base).economicContribution)
 const fees=finance({...base,feePercent:2,feeFixed:12,onboardings:3})
 assert.ok(Math.abs(fees.cashContribution-(finance(base).cashContribution-56.95*0.02-1))<0.00001)
 assert.equal(fees.onboarding,40)
 assert.throws(()=>finance({...base,months:2}));assert.throws(()=>finance({...base,refund:101}));assert.throws(()=>finance({...base,mix1:0,mix2:0,mix3:0}))
})
