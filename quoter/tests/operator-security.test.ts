import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,existsSync,statSync,chmodSync,symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'

test('pepper provisioning cannot replace an existing remote key or create a clone key',()=>{
 const temp=mkdtempSync(join(tmpdir(),'quoter-provision-proof-')),script=resolve('scripts/provision-password-pepper.mjs')
 try{
  mkdirSync(join(temp,'node_modules/wrangler/bin'),{recursive:true})
  writeFileSync(join(temp,'node_modules/wrangler/bin/wrangler.js'),`const fs=require('node:fs'),a=process.argv.slice(2);fs.appendFileSync('calls',a.join(' ')+'\\n');if(a[1]==='list')console.log(process.env.REMOTE_KEYS||'[]');else{fs.writeFileSync('uploaded',fs.readFileSync(0));console.log('DO_NOT_PRINT_PROVIDER_LOG');}`)
  const invoke=(args:string[]=[],keys='[ {"name":"PASSWORD_PEPPER"} ]')=>spawnSync(process.execPath,[script,...args],{cwd:temp,encoding:'utf8',env:{...process.env,REMOTE_KEYS:keys}})
  const clone=invoke();assert.notEqual(clone.status,0);assert.ok(!existsSync(join(temp,'.env.password-pepper.production.local')));assert.ok(!existsSync(join(temp,'uploaded')))
  assert.notEqual(invoke(['--initialize']).status,0);assert.ok(!existsSync(join(temp,'uploaded')))
  const absent=invoke([], '[]');assert.notEqual(absent.status,0);assert.ok(!existsSync(join(temp,'.env.password-pepper.production.local')))
  const first=invoke(['--initialize'],'[]');assert.equal(first.status,0,first.stderr);assert.ok(!first.stdout.includes('DO_NOT_PRINT_PROVIDER_LOG'))
  const key=readFileSync(join(temp,'.env.password-pepper.production.local'),'utf8').trim();assert.match(key,/^[a-f0-9]{64}$/);assert.equal(readFileSync(join(temp,'uploaded'),'utf8'),key)
  rmSync(join(temp,'uploaded'));const existing=invoke();assert.equal(existing.status,0);assert.ok(!existsSync(join(temp,'uploaded')));assert.equal(readFileSync(join(temp,'.env.password-pepper.production.local'),'utf8').trim(),key);assert.ok(!existing.stdout.includes(key))
  // Preserve the same local key even after a failed initial upload/retry.
  assert.equal(invoke(['--initialize'],'[]').status,0);assert.equal(readFileSync(join(temp,'uploaded'),'utf8'),key)
 }finally{rmSync(temp,{recursive:true,force:true})}
})
test('local setup preserves existing secrets and hardens existing POSIX modes',()=>{
 const temp=mkdtempSync(join(tmpdir(),'quoter-private-proof-')),vars=join(temp,'.dev.vars')
 try{
  writeFileSync(vars,'EXISTING=private-fixture\nPASSWORD_PEPPER='+ 'a'.repeat(64)+'\n',{mode:0o644})
  for(const file of ['scripts/configure-password-pepper.mjs','scripts/configure-local-mfa.mjs']){
   chmodSync(vars,0o644);const result=spawnSync(process.execPath,[resolve(file)],{cwd:temp,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.ok(!result.stdout.includes('private-fixture'));if(process.platform!=='win32')assert.equal(statSync(vars).mode&0o777,0o600)
  }
  const original=readFileSync(vars,'utf8');assert.ok(original.includes('EXISTING=private-fixture'));assert.match(original,/PASSWORD_PEPPER=a{64}/);assert.match(original,/MFA_ENCRYPTION_KEY=[a-f0-9]{64}/)
  assert.equal(spawnSync(process.execPath,[resolve('scripts/configure-local-mfa.mjs')],{cwd:temp,encoding:'utf8'}).status,0);assert.equal(readFileSync(vars,'utf8'),original)
 }finally{rmSync(temp,{recursive:true,force:true})}
})
test('local secret generators reject dangling links before writing a key',{skip:process.platform==='win32'},()=>{
 const temp=mkdtempSync(join(tmpdir(),'quoter-private-link-')),target=join(temp,'should-not-exist')
 try{
  symlinkSync(target,join(temp,'.dev.vars'))
  for(const file of ['scripts/configure-password-pepper.mjs','scripts/configure-local-mfa.mjs']){const result=spawnSync(process.execPath,[resolve(file)],{cwd:temp,encoding:'utf8'});assert.notEqual(result.status,0);assert.ok(!existsSync(target))}
 }finally{rmSync(temp,{recursive:true,force:true})}
})
