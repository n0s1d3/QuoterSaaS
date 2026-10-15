import { verifyPassword,type PasswordEnvironment } from './passwords.ts'
import { digest,type Account } from './session.ts'
import { limit } from './rate-limit.ts'
import { HttpError } from '../http.ts'
export const adminGate='EXISTS(SELECT 1 FROM platform_admin p JOIN users u ON u.email=p.email WHERE u.id=? AND u.suspended_at IS NULL AND u.email_verified_at IS NOT NULL AND u.password_hash=?)'
export async function requirePlatformAdmin(db:D1Database,user:Account){
 const master=await db.prepare('SELECT u.password_hash AS hash,u.password_salt AS salt FROM platform_admin p JOIN users u ON u.email=p.email WHERE u.id=? AND u.email_verified_at IS NOT NULL AND u.suspended_at IS NULL').bind(user.id).first<{hash:string;salt:string}>()
 if(!master)throw new HttpError(403,'Acceso exclusivo de la cuenta maestra')
 return master
}
export async function confirmAdmin(db:D1Database,user:Account,password:unknown,master:{hash:string;salt:string},env:PasswordEnvironment={}){
 await limit(db,`platform-password:${user.id}`,10)
 if(typeof password!=='string'||password.length>128||!await verifyPassword(password,master.salt,master.hash,env))throw new HttpError(403,'Confirma tu contraseña para aplicar cambios administrativos')
 await db.prepare('DELETE FROM auth_limits WHERE key=?').bind(await digest(`platform-password:${user.id}`)).run()
}
