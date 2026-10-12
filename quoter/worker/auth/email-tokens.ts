import { HttpError } from '../http'
import { digest,passwordHash,randomToken } from './session'
export async function issueToken(db:D1Database,userId:string,purpose:'verify'|'reset') {
 const token=randomToken(),now=Math.floor(Date.now()/1000),expiry=now+(purpose==='verify'?86400:1800)
 await db.batch([db.prepare('DELETE FROM account_tokens WHERE expires_at<=? OR used_at IS NOT NULL').bind(now),db.prepare('INSERT INTO account_tokens (token_hash,user_id,purpose,expires_at) VALUES (?,?,?,?)').bind(await digest(token),userId,purpose,expiry)])
 return token
}
export async function consumeToken(db:D1Database,token:unknown,purpose:'verify'|'reset',password?:unknown) {
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(400,'Enlace inválido o vencido. Solicita uno nuevo')
 if(purpose==='reset'&&(typeof password!=='string'||password.length<12||password.length>128))throw new HttpError(400,'La contraseña debe tener entre 12 y 128 caracteres')
 const hash=await digest(token),now=Math.floor(Date.now()/1000)
 const user=await db.prepare('SELECT user_id AS userId FROM account_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>?').bind(hash,purpose,now).first<{userId:string}>()
 if(!user)throw new HttpError(400,'Enlace inválido o vencido. Solicita uno nuevo')
 const consumption=randomToken()
 const condition='SELECT user_id FROM account_tokens WHERE token_hash=? AND consumption_id=?'
 let update:D1PreparedStatement
 if(purpose==='reset') {const salt=randomToken(),passwordDigest=await passwordHash(password as string,salt);update=db.prepare(`UPDATE users SET password_hash=?,password_salt=? WHERE id=(${condition})`).bind(passwordDigest,salt,hash,consumption)}
 else update=db.prepare(`UPDATE users SET email_verified_at=CURRENT_TIMESTAMP WHERE id=(${condition})`).bind(hash,consumption)
 const consumedAt=Math.floor(Date.now()/1000)
 const statements=[db.prepare('UPDATE account_tokens SET used_at=?,consumption_id=? WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>?').bind(consumedAt,consumption,hash,purpose,consumedAt),update]
 if(purpose==='reset')statements.push(db.prepare(`DELETE FROM sessions WHERE user_id=(${condition})`).bind(hash,consumption))
 statements.push(db.prepare('UPDATE account_tokens SET used_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM account_tokens t WHERE t.token_hash=? AND t.consumption_id=?)').bind(consumedAt,user.userId,purpose,hash,consumption))
 const result=await db.batch(statements)
 if(!result[0].meta.changes)throw new HttpError(400,'Enlace inválido o vencido. Solicita uno nuevo')
}
