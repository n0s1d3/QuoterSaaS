import { HttpError } from '../http.ts'
import { equalHashes,passwordHash } from './session.ts'
export interface PasswordEnvironment {PASSWORD_PEPPER?:string}
export const passwordIterations=100000
const prefix='pbkdf2-sha256-peppered$100000$v1$'
async function preparedPassword(password:string,salt:string,env:PasswordEnvironment){
 if(!env.PASSWORD_PEPPER||!/^[a-f0-9]{64}$/i.test(env.PASSWORD_PEPPER)){console.error('Password configuration unavailable',{requiredSecret:'PASSWORD_PEPPER'});throw new HttpError(503,'El acceso a cuentas no está disponible temporalmente')}
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(env.PASSWORD_PEPPER.match(/../g)!,byte=>parseInt(byte,16)),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const result=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`quoter-password-v1\0${salt}\0${password}`))
 return Array.from(new Uint8Array(result),byte=>byte.toString(16).padStart(2,'0')).join('')
}
export async function newPasswordHash(password:string,salt:string,env:PasswordEnvironment={}){return prefix+await passwordHash(await preparedPassword(password,salt,env),salt,passwordIterations)}
export function legacyPasswordHash(stored:string){return /^[a-f0-9]{64}$/.test(stored)}
export function needsPasswordUpgrade(stored:string){return !stored.startsWith(prefix)}
export async function verifyPassword(password:string,salt:string,stored:string,env:PasswordEnvironment={}){
 if(legacyPasswordHash(stored))return equalHashes(await passwordHash(password,salt,100000),stored)
 const current=/^pbkdf2-sha256-peppered\$100000\$v1\$([a-f0-9]{64})$/.exec(stored)
 if(current)return equalHashes(await passwordHash(await preparedPassword(password,salt,env),salt,passwordIterations),current[1])
 const previous=/^pbkdf2-sha256\$600000\$([a-f0-9]{64})$/.exec(stored)
 if(!previous)return false
 try{return equalHashes(await passwordHash(password,salt,600000),previous[1])}catch(error){if(/iteration|PBKDF2|OperationError|NotSupportedError/i.test(String(error))){console.error('Password runtime compatibility',{format:'pbkdf2-600000',action:'password-reset-required'});throw new HttpError(503,'Esta cuenta necesita restablecer la contraseña para este servidor. Usa Recuperar contraseña.')}throw error}
}
