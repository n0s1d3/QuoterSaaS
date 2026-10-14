import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const directory=new URL('../migrations/',import.meta.url)
function baseline(){const db=new DatabaseSync(':memory:');for(const file of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort()){if(file.startsWith('0016_'))break;db.exec(readFileSync(new URL(file,directory),'utf8'))}return db}
const auth=readFileSync(new URL('0016_atomic_request_authorization.sql',directory),'utf8'),mfa=readFileSync(new URL('0017_admin_mfa.sql',directory),'utf8')
test('security migrations install after partial table creation and preserve session/MFA rejection',()=>{
 const db=baseline();try{
 // A failed remote request may have already created the table while leaving the migration pending.
 db.exec(auth.slice(0,auth.indexOf('CREATE TRIGGER')));db.exec(auth);db.exec(auth);db.exec(mfa)
 const row=db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name IN('request_authorization','admin_mfa_write_guard','admin_mfa_reset')").get()!;assert.equal(row.count,3)
 assert.throws(()=>db.exec("INSERT INTO request_write_guards VALUES('probe','missing','missing','missing',0)"),/QUOTER_SESSION_REVOKED/)
 assert.throws(()=>db.exec("INSERT INTO request_write_guards VALUES('probe','missing','missing','missing',3)"),/QUOTER_MFA_REQUIRED|QUOTER_SESSION_REVOKED/)
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM request_write_guards').get()!.count,0)
 db.exec(`INSERT INTO organizations(id,name,slug) VALUES('org','Migration fixture','migration-fixture');
 INSERT INTO users(id,organization_id,email,password_hash,password_salt,email_verified_at) VALUES('user','org','migration-fixture@example.com','hash','salt',CURRENT_TIMESTAMP);
 INSERT INTO memberships(user_id,organization_id,role) VALUES('user','org','viewer');
 INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES('session','user','org',unixepoch()+3600);`)
 db.exec("INSERT INTO request_write_guards VALUES('read','session','user','org',0)")
 assert.throws(()=>db.exec("INSERT INTO request_write_guards VALUES('write','session','user','org',1)"),/QUOTER_ACCESS_CHANGED/)
 db.exec("UPDATE memberships SET role='owner' WHERE user_id='user'; INSERT INTO platform_admin(id,email) VALUES(1,'migration-fixture@example.com')")
 assert.throws(()=>db.exec("INSERT INTO request_write_guards VALUES('admin','session','user','org',3)"),/QUOTER_MFA_REQUIRED/)
 db.exec("INSERT INTO admin_mfa(user_id,version,sealed_secret,enabled_at) VALUES('user','v','sealed',CURRENT_TIMESTAMP); UPDATE sessions SET mfa_factor_version='v',mfa_verified_until=unixepoch()+1800 WHERE token_hash='session'; INSERT INTO request_write_guards VALUES('admin','session','user','org',3)")
 db.exec("DELETE FROM admin_mfa WHERE user_id='user'")
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get()!.count,0)
 assert.equal(db.prepare("SELECT COUNT(*) AS count FROM platform_audit WHERE action='mfa.reset'").get()!.count,1)

 }finally{db.close()}
})
test('pending security triggers avoid CASE END boundaries inside their bodies',()=>{for(const sql of [auth,mfa])assert.ok(!/\bCASE\b/i.test(sql))})
