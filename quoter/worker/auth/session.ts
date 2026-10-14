import { HttpError } from '../http.ts'
const encoder = new TextEncoder()
function hex(bytes: ArrayBuffer | Uint8Array) { return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), byte=>byte.toString(16).padStart(2,'0')).join('') }
export function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32))) }
export async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value))) }
export async function passwordHash(password: string, salt: string) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits'])
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256))
}
export function equalHashes(a: string,b: string) { let diff=a.length ^ b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0 }
function cookieName(request: Request) { return new URL(request.url).protocol==='https:'?'__Host-quoter_session':'quoter_session' }
export function cookieToken(request: Request) { const name=cookieName(request);const value=(request.headers.get('Cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1);return value&&/^[a-f0-9]{64}$/.test(value)?value:null }
export function sessionCookie(request: Request, token: string, maxAge = 604800) { return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}` }
export interface Account { id: string; email: string; organizationId: string; organizationName: string; emailVerified: boolean; role:'owner'|'editor'|'viewer';isPlatformAdmin?:boolean }
export async function account(request: Request,db:D1Database) {
 const token=cookieToken(request)
 if(!token)throw new HttpError(401,'Inicia sesión para continuar')
 const user=await db.prepare('SELECT u.id,u.email,(u.email_verified_at IS NOT NULL) AS emailVerified,m.role,EXISTS(SELECT 1 FROM platform_admin p WHERE p.email=u.email AND u.email_verified_at IS NOT NULL) AS isPlatformAdmin,s.organization_id AS organizationId,o.name AS organizationName FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.organization_id=s.organization_id JOIN organizations o ON o.id=s.organization_id WHERE s.token_hash=? AND s.expires_at>? AND u.suspended_at IS NULL').bind(await digest(token),Math.floor(Date.now()/1000)).first<Account>()
 if(!user)throw new HttpError(401,'Tu sesión venció. Inicia sesión nuevamente')
 return {...user,emailVerified:!!user.emailVerified,isPlatformAdmin:!!user.isPlatformAdmin}
}
export async function newSession(request:Request,db:D1Database,userId:string,expectedHash?:string) {
 const token=randomToken(),expires=Math.floor(Date.now()/1000)+604800
 const existing=cookieToken(request)
 const statements=[db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(Math.floor(Date.now()/1000)),db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,organization_id) SELECT ?,id,?,organization_id FROM users WHERE id=? AND suspended_at IS NULL AND (? IS NULL OR password_hash=?)').bind(await digest(token),expires,userId,expectedHash||null,expectedHash||null)]
 if(existing)statements.unshift(db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(existing)))
 const result=await db.batch(statements)
 if(!result[result.length-1].meta.changes)throw new HttpError(401,'Correo o contraseña incorrectos')
 return sessionCookie(request,token)
}
export function guardMutation(request:Request) {
 if(['GET','HEAD','OPTIONS'].includes(request.method))return
 if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new HttpError(403,'Origen de solicitud no permitido')
 const origin=request.headers.get('Origin')
 if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Origen de solicitud no permitido')
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw new HttpError(415,'Usa application/json')
}
