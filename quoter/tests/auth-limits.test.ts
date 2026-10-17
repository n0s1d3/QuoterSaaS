import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { attempts,limit,loginLimit } from '../worker/auth/rate-limit.ts'
import { guardMaintenance,newSession } from '../worker/auth/session.ts'
import { issueToken } from '../worker/auth/email-tokens.ts'

function fixture(){
 const sql=new DatabaseSync(':memory:')
 sql.exec('CREATE TABLE auth_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,organization_id TEXT,expires_at INTEGER); CREATE TABLE users(id TEXT PRIMARY KEY,organization_id TEXT,password_hash TEXT,suspended_at TEXT); CREATE TABLE account_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT,purpose TEXT,expires_at INTEGER,used_at INTEGER);')
 sql.exec(readFileSync(new URL('../migrations/0018_auth_cleanup.sql',import.meta.url),'utf8'))
 function prepare(query:string,values:unknown[]=[]){return {bind:(...parameters:unknown[])=>prepare(query,parameters),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...values as []).changes)}}),first:async()=>sql.prepare(query).get(...values as [])||null}}
 const db={prepare,batch:async(statements:{run:()=>Promise<unknown>}[])=>{sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}} as unknown as D1Database
 return {sql,db}
}
const publicEnv={TURNSTILE_SITE_KEY:'site-key',TURNSTILE_SECRET_KEY:'secret-key'}
const login=(ip:string,url='https://quoter.example')=>new Request(url+'/api/auth/login',{method:'POST',headers:{'CF-Connecting-IP':ip}})
test('distributed email attempts require a login challenge without blocking another IP',async()=>{
 const {db,sql}=fixture(),original=globalThis.fetch
 try{
  for(let i=0;i<10;i++)assert.equal(await loginLimit(db,login('192.0.2.1'),'owner@example.com',undefined,publicEnv),null)
  await assert.rejects(()=>loginLimit(db,login('192.0.2.1'),'owner@example.com',undefined,publicEnv),error=>(error as {status:number}).status===429)
  const challenge=await loginLimit(db,login('192.0.2.2'),'owner@example.com',undefined,publicEnv)
  assert.equal(challenge?.status,403);assert.deepEqual(await challenge!.json(),{error:'Completa la verificación de seguridad para iniciar sesión',code:'LOGIN_CHALLENGE_REQUIRED',challengeRequired:true})
  let calls=0
  globalThis.fetch=async(_input,init)=>{calls++;const form=init!.body as FormData;assert.equal(form.get('response'),'valid-proof');assert.equal(form.get('remoteip'),'192.0.2.2');return Response.json({success:true,hostname:'quoter.example',action:'quoter_login'})}
  assert.equal(await loginLimit(db,login('192.0.2.2'),'owner@example.com','valid-proof',publicEnv),null);assert.equal(calls,1)
  globalThis.fetch=async()=>Response.json({success:true,hostname:'quoter.example',action:'quoter_recovery'})
  await assert.rejects(()=>loginLimit(db,login('192.0.2.2'),'owner@example.com','wrong-action',publicEnv),error=>(error as {status:number}).status===403)
 }finally{globalThis.fetch=original;sql.close()}
})
test('IP budget still bounds attempts across different emails; local preview never needs a public proof',async()=>{
 const {db,sql}=fixture()
 try{
  for(let i=0;i<100;i++)assert.equal(await loginLimit(db,login('192.0.2.3'),`target-${i}@example.com`,undefined,publicEnv),null)
  await assert.rejects(()=>loginLimit(db,login('192.0.2.3'),'extra@example.com',undefined,publicEnv),error=>(error as {status:number}).status===429)
  for(let i=0;i<11;i++)await loginLimit(db,login(`192.0.2.${20+i}`,'http://localhost:5173'),'local@example.com',undefined,{EMAIL_MODE:'preview'})
 }finally{sql.close()}
})
test('expiry cleanups use indexes, retain active credentials and reclaim bounded batches',async()=>{
 const {db,sql}=fixture(),now=Math.floor(Date.now()/1000)
 try{
  sql.prepare('INSERT INTO users VALUES(?,?,?,NULL)').run('owner','business','hash')
  for(let i=0;i<300;i++){
   sql.prepare('INSERT INTO auth_limits VALUES(?,1,?)').run(`expired-limit-${i}`,now-1)
   sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(`expired-session-${i}`,'owner','business',now-1)
   sql.prepare('INSERT INTO account_tokens VALUES(?,?,?,?,NULL)').run(`expired-token-${i}`,'owner','verify',now-1)
   sql.prepare('INSERT INTO account_tokens VALUES(?,?,?,?,?)').run(`used-token-${i}`,'owner','verify',now+1000,now-1)
  }
  sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('active-session','owner','business',now+1000)
  assert.equal(await attempts(db,'fresh'),1)
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM auth_limits WHERE expires_at<=?').get(now)!.n,200)
  await newSession(login('192.0.2.1'),db,'owner','hash')
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires_at<=?').get(now)!.n,200)
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash='active-session'").get()!.n,1)
  await issueToken(db,'owner','reset')
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM account_tokens WHERE expires_at<=?').get(now)!.n,200)
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM account_tokens WHERE used_at IS NOT NULL').get()!.n,200)
  for(const [table,column,index] of [['auth_limits','expires_at','idx_auth_limits_expiry'],['sessions','expires_at','idx_sessions_expiry'],['account_tokens','expires_at','idx_account_tokens_expiry'],['account_tokens','used_at','idx_account_tokens_used']]){
   const condition=column==='used_at'?'used_at IS NOT NULL':'expires_at<=0'
   assert.ok(sql.prepare(`EXPLAIN QUERY PLAN SELECT * FROM ${table} WHERE ${condition} ORDER BY ${column} LIMIT 100`).all().some(row=>String(row.detail).includes(index)))
  }
  await assert.rejects(()=>limit(db,'bounded-key',0),error=>(error as {status:number}).status===429)
 }finally{sql.close()}
})
test('maintenance allows reads and account access but rejects business and security configuration writes',async()=>{
 for(const path of ['/api/quotes','/api/admin/overview','/api/health'])await guardMaintenance(new Request('https://quoter.example'+path),'true')
 for(const path of ['/api/auth/login','/api/auth/logout','/api/auth/forgot-password','/api/auth/reset-password','/api/auth/verify-email','/api/auth/resend-verification'])await guardMaintenance(new Request('https://quoter.example'+path,{method:'POST'}),'true')
 const post=(path:string,data:unknown)=>new Request('https://quoter.example'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
 await guardMaintenance(post('/api/security/admin-mfa',{action:'verify',code:'123456'}),'true')
 for(const [path,data] of [['/api/auth/register',{}],['/api/quotes',{}],['/api/backups/import',{}],['/api/businesses/switch',{}],['/api/security/admin-mfa',{action:'setup'}],['/api/security/admin-mfa',{action:'confirm'}]])await assert.rejects(()=>guardMaintenance(post(path as string,data),'true'),error=>(error as {status:number}).status===503)
 await guardMaintenance(post('/api/quotes',{}),undefined)
})
