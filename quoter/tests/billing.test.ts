import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readdirSync,readFileSync } from 'node:fs'
import { billingOffer,isBillingMonths } from '../src/lib/billing.ts'
function fixture(){const db=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));db.exec("INSERT INTO organizations(id,name,slug) VALUES('billing','Billing','billing')");return db}
function activate(db:DatabaseSync,reference:string,months:number,tariff:number|null=null){db.prepare("INSERT INTO plan_activations(id,organization_id,plan_id,payment_reference,operator_email,duration_months,tariff_cents) VALUES(?,'billing','gratis',?,'operator@example.com',?,?) ON CONFLICT(payment_reference) DO NOTHING").run(reference,reference,months,tariff)}
test('published tariffs apply 0/5/10/15 percent discounts with integer cents and exact savings',()=>{
 for(const [plan,prices] of [['gratis',[4900,13965,26460,49980]],['pro',[8900,25365,48060,90780]],['negocio',[14900,42465,80460,151980]]] as const){
  for(const [i,months] of ([1,3,6,12] as const).entries()){const offer=billingOffer(plan,months);assert.equal(offer.totalCents,prices[i]);assert.equal(offer.totalCents+offer.savingsCents,offer.listPriceCents);assert.ok(Number.isSafeInteger(offer.totalCents))}
 }
 for(const value of [0,2,4,24,'12',12.5,null,undefined])assert.equal(isBillingMonths(value),false)
 assert.throws(()=>billingOffer('unknown',1))
})
test('calendar periods clamp once, preserve Guatemala local time and remain idempotent',()=>{
 const db=fixture();try{
  for(const [start,months,end] of [['2030-01-31T22:30:00-06:00',1,'2030-02-28T22:30:00-06:00'],['2030-01-31T22:30:00-06:00',3,'2030-04-30T22:30:00-06:00'],['2030-08-31T22:30:00-06:00',6,'2031-02-28T22:30:00-06:00'],['2032-02-29T08:00:00-06:00',12,'2033-02-28T08:00:00-06:00']] as const){
   const timestamp=Date.parse(start)/1000;db.prepare("UPDATE organizations SET paid_until=?,trial_expires_at=0 WHERE id='billing'").run(timestamp)
   const ref='calendar-'+months;activate(db,ref,months,12345)
   const record=db.prepare('SELECT period_start,period_end,duration_months,tariff_cents FROM plan_activations WHERE id=?').get(ref)!
   assert.equal(record.period_start,timestamp);assert.equal(record.period_end,Date.parse(end)/1000);assert.equal(record.duration_months,months);assert.equal(record.tariff_cents,12345)
   activate(db,ref,months,12345);assert.equal(db.prepare("SELECT paid_until FROM organizations WHERE id='billing'").get()?.paid_until,record.period_end)
  }
  assert.throws(()=>activate(db,'bad-months',2),/CHECK constraint/)
  assert.throws(()=>activate(db,'bad-tariff',1,-1),/CHECK constraint/)
 }finally{db.close()}
})
test('migration preserves historical dates and leaves unknown historical tariffs empty',()=>{
 const db=new DatabaseSync(':memory:');try{
  const dir=new URL('../migrations/',import.meta.url)
  for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')&&n<'0022').sort())db.exec(readFileSync(new URL(name,dir),'utf8'))
  db.exec("INSERT INTO organizations(id,name,slug) VALUES('legacy','Legacy','legacy'); INSERT INTO plan_activations(id,organization_id,plan_id,payment_reference,operator_email) VALUES('legacy-payment','legacy','gratis','legacy-ref','operator@example.com')")
  const before=db.prepare("SELECT period_start,period_end FROM plan_activations WHERE id='legacy-payment'").get()
  db.exec(readFileSync(new URL('0022_billing_periods.sql',dir),'utf8'))
  const row=db.prepare("SELECT period_start,period_end,duration_months,tariff_cents FROM plan_activations WHERE id='legacy-payment'").get()!
  assert.equal(row.period_start,before?.period_start);assert.equal(row.period_end,before?.period_end);assert.equal(row.duration_months,1);assert.equal(row.tariff_cents,null)
 }finally{db.close()}
})
