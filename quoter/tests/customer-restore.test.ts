import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveCustomers } from '../worker/db/customer-restore.ts'
const customer=(id:string,email:string|null='a@example.com')=>({id,name:'Ana',company:null,email,phone:null,tax_id:null,address:null})
test('restore reuses full matching profile, consolidates legacy copies and retains distinct contacts',()=>{
 const own=[customer('original'),customer('old-copy'),customer('homonym','other@example.com')]
 const result=resolveCustomers([customer('source')],own,new Map([['source','stable']]),new Map())
 assert.equal(result.maps.get('source'),'old-copy')
 assert.deepEqual([...result.duplicates],[['original','old-copy']])
})
test('explicit original identity wins; repeated imported copies in a backup share one target',()=>{
 const original=customer('original'),copy=customer('copy')
 const result=resolveCustomers([copy,original],[original,customer('legacy')],new Map([['copy','stable'],['original','original']]),new Map())
 assert.equal(result.maps.get('copy'),'original');assert.equal(result.maps.get('original'),'original');assert.equal(result.duplicates.get('legacy'),'original')
})
test('aliases preserve identity after contact changes and reject conflicting updates to one destination',()=>{
 const incoming=customer('source','updated@example.com')
 assert.equal(resolveCustomers([incoming],[customer('original')],new Map([['source','stable']]),new Map([['source','original']])).maps.get('source'),'original')
 assert.throws(()=>resolveCustomers([incoming,customer('original')],[customer('original')],new Map([['source','stable'],['original','original']]),new Map([['source','original']])),/datos diferentes/)
})
test('identical new backup profiles share one stable destination without deleting unrelated customers',()=>{
 const result=resolveCustomers([customer('a'),customer('b')],[customer('homonym','other@example.com')],new Map([['a','stable-a'],['b','stable-b']]),new Map())
 assert.equal(result.maps.get('a'),result.maps.get('b'));assert.equal(result.duplicates.size,0)
})

test('a new source copy reuses an explicit customer even when restoring changed contact data',()=>{
 const incoming=[customer('new-copy','updated@example.com'),customer('original','updated@example.com')]
 const result=resolveCustomers(incoming,[customer('original')],new Map([['original','original'],['new-copy','stable']]),new Map())
 assert.equal(result.maps.get('new-copy'),'original')
})
