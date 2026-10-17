import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { base,testAccount } from './auth-client.mjs'
import { localStateArgs } from './local-state.mjs'
const local=localStateArgs()
const owner=await testAccount(),other=await testAccount(),org=owner.user.organizationId
const execute=sql=>{const r=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db',...local,'--command',sql,'--json'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout);return JSON.parse(r.stdout).flatMap(entry=>entry.results||[])}
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
const initial=await call(owner,'/subscription');assert.equal(initial.status,'trial');assert.equal(initial.daysRemaining,7);assert.ok(initial.trialExpiresAt>Math.floor(Date.now()/1000)+604700)
const customer=await call(owner,'/customers',{name:'Cliente con vigencia'},'POST',201),item=await call(owner,'/catalog',{name:'Servicio',unit:'hora',category:'Servicio',unitPrice:100,staleAfterDays:90},'POST',201)
const input={customerId:customer.id,issueDate:'2026-10-14',items:[{description:'Servicio',quantity:1,unitPrice:100,catalogItemId:item.id}]},quote=await call(owner,'/quotes',input,'POST',201),trash=await call(owner,'/quotes',input,'POST',201)
await call(owner,'/quotes/'+trash.id,{},'DELETE');const backup=await call(owner,'/backups/export'),preview=await call(owner,'/backups/preview',{backup}),brand=await call(owner,'/branding')
execute(`UPDATE organizations SET trial_expires_at=unixepoch()-1,paid_until=NULL WHERE id='${org}'`)
assert.equal((await call(owner,'/subscription')).status,'expired')
for(const [path,data,method] of [['/customers',{name:'No permitido'},'POST'],['/quotes',input,'POST'],['/quotes/'+quote.id,input,'PUT'],['/quotes/'+quote.id,{status:'accepted'},'PATCH'],['/quotes/'+quote.id,{},'DELETE'],['/quotes/'+quote.id+'/duplicate',{},'POST'],['/catalog',{name:'No permitido'},'POST'],['/catalog/'+item.id,{...item,active:true},'PUT'],['/catalog/'+item.id,{},'DELETE'],['/branding',brand,'PUT'],['/team/invitations',{email:other.email,role:'viewer'},'POST'],['/trash/'+trash.id+'/restore',{},'POST'],['/backups/restore',{backup,token:preview.token,confirm:true},'POST'],['/plans',{planId:'pro'},'PATCH']])assert.equal((await call(owner,path,data,method,403)).code,'SUBSCRIPTION_EXPIRED')
for(const path of ['/quotes','/quotes/'+quote.id,'/customers','/catalog','/branding','/team','/plans','/trash','/history','/backups/export','/dashboard'])await call(owner,path)
assert.equal((await call(owner,'/quotes/'+quote.id)).status,'draft');assert.equal((await call(other,'/subscription')).status,'trial')
// Database enforcement still rejects writes when called directly, without the HTTP guard.
const blocked=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db',...local,'--command',`UPDATE quotes SET notes='blocked' WHERE id='${quote.id}'`,'--json'],{encoding:'utf8'});assert.notEqual(blocked.status,0);assert.ok((blocked.stderr+blocked.stdout).includes('QUOTER_SUBSCRIPTION_EXPIRED'))
const activate=(reference)=>{const r=spawnSync(process.execPath,['scripts/activate-plan.mjs','--business',org,'--plan','2','--reference',reference,'--operator','operator@example.com'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout)}
const first='subscription-'+randomUUID();activate(first);let active=await call(owner,'/subscription');assert.equal(active.status,'active');assert.ok(active.paidUntil>Math.floor(Date.now()/1000)+27*86400);const until=active.paidUntil
activate(first);assert.equal((await call(owner,'/subscription')).paidUntil,until)
activate(first+'-renew');active=await call(owner,'/subscription');assert.ok(active.paidUntil>until+27*86400)
await call(owner,'/quotes/'+quote.id,{status:'accepted'},'PATCH');await call(owner,'/quotes/'+quote.id,{status:'draft'},'PATCH')
// Guatemala calendar months clamp Jan 31 to Feb 28 and retain the local time.
const jan=Date.parse('2030-01-31T22:30:00-06:00')/1000,expected=Date.parse('2030-02-28T22:30:00-06:00')/1000
execute(`UPDATE organizations SET paid_until=${jan},trial_expires_at=0 WHERE id='${org}'`);activate(first+'-calendar');assert.equal((await call(owner,'/subscription')).paidUntil,expected)
const paymentPlan=await call(owner,'/plans');assert.equal(paymentPlan.activations.length,3);assert.equal(paymentPlan.activations[0].periodStart,jan);assert.equal(paymentPlan.activations[0].periodEnd,expected)
// An expired destination cannot accept a still-valid invitation, even from a paid source business.
const invitation=await call(owner,'/team/invitations',{email:other.email,role:'editor'},'POST',201),token=new URLSearchParams(new URL(invitation.previewUrl).hash.slice(1)).get('token')
execute(`UPDATE organizations SET paid_until=unixepoch()-1,trial_expires_at=0 WHERE id='${org}'`);assert.equal((await call(other,'/invitations/accept',{token},'POST',403)).code,'SUBSCRIPTION_EXPIRED')
assert.equal((await call(owner,'/team')).invitations.length,1);activate(first+'-late');await call(other,'/invitations/accept',{token});assert.equal((await call(other,'/subscription')).status,'active')
assert.equal((await other.request(base+'/api/plans')).status,403)
// Import cannot modify subscription fields.
backup.business.paid_until=9999999999;backup.business.trial_expires_at=9999999999;const review=await call(owner,'/backups/preview',{backup});const before=(await call(owner,'/subscription')).paidUntil;await call(owner,'/backups/restore',{backup,token:review.token,confirm:true,updateProfile:true});assert.equal((await call(owner,'/subscription')).paidUntil,before)
console.log('Subscriptions passed: 7-day trial, expiry/write guards, safe read/export access, database enforcement, manual renewal/idempotency, calendar clamp, destination invitation protection and backup isolation.')
