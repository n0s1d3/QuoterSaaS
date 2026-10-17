import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readdirSync,readFileSync } from 'node:fs'
import { isPlanDowngrade } from '../src/lib/plans.ts'

function fixture(){
 const db=new DatabaseSync(':memory:')
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'))
 db.exec("INSERT INTO organizations(id,name,slug) VALUES('paid','Paid','paid')")
 return db
}
function activate(db:DatabaseSync,id:string,plan:string){db.prepare("INSERT INTO plan_activations(id,organization_id,plan_id,payment_reference,operator_email) VALUES(?,'paid',?,?,'operator@example.com') ON CONFLICT(payment_reference) DO NOTHING").run(id,plan,id)}
test('early paid downgrade is rejected atomically and cannot consume its payment reference',()=>{
 const db=fixture()
 try{
  const until=Math.floor(Date.now()/1000)+60*86400
  db.prepare("UPDATE organizations SET plan_id='negocio',paid_until=? WHERE id='paid'").run(until)
  assert.throws(()=>activate(db,'downgrade','gratis'),/QUOTER_PLAN_DOWNGRADE_ACTIVE/)
  assert.deepEqual({...db.prepare("SELECT plan_id,paid_until FROM organizations WHERE id='paid'").get()},{plan_id:'negocio',paid_until:until})
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM plan_activations WHERE id='downgrade'").get()?.n,0)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE id='downgrade'").get()?.n,0)
  db.exec("UPDATE organizations SET paid_until=unixepoch()-1,trial_expires_at=0 WHERE id='paid'")
  activate(db,'downgrade','gratis')
  assert.equal(db.prepare("SELECT plan_id FROM organizations WHERE id='paid'").get()?.plan_id,'gratis')
 }finally{db.close()}
})
test('same-tier renewal preserves paid time, upgrade is immediate, and replay remains idempotent',()=>{
 const db=fixture()
 try{
  const until=Math.floor(Date.now()/1000)+60*86400
  db.prepare("UPDATE organizations SET plan_id='pro',paid_until=? WHERE id='paid'").run(until)
  activate(db,'renew','pro')
  assert.equal(db.prepare("SELECT period_start FROM plan_activations WHERE id='renew'").get()?.period_start,until)
  const renewed=Number(db.prepare("SELECT paid_until FROM organizations WHERE id='paid'").get()?.paid_until)
  assert.ok(renewed>until+27*86400)
  activate(db,'upgrade','negocio')
  assert.equal(db.prepare("SELECT plan_id FROM organizations WHERE id='paid'").get()?.plan_id,'negocio')
  assert.equal(db.prepare("SELECT period_start FROM plan_activations WHERE id='upgrade'").get()?.period_start,renewed)
  const upgraded=Number(db.prepare("SELECT paid_until FROM organizations WHERE id='paid'").get()?.paid_until)
  activate(db,'renew','pro')
  assert.equal(db.prepare("SELECT paid_until FROM organizations WHERE id='paid'").get()?.paid_until,upgraded)
  assert.equal(db.prepare("SELECT plan_id FROM organizations WHERE id='paid'").get()?.plan_id,'negocio')
 }finally{db.close()}
})
test('capacity comparison detects any reduced quota rather than relying on plan IDs',()=>{
 const current={id:'a',name:'A',quoteLimit:25,catalogLimit:15,memberLimit:3}
 assert.equal(isPlanDowngrade(current,{...current,id:'b',quoteLimit:50,catalogLimit:25,memberLimit:1}),true)
 assert.equal(isPlanDowngrade(current,{...current,id:'b',quoteLimit:50}),false)
})
