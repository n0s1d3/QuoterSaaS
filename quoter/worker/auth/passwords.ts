import { equalHashes,passwordHash } from './session.ts'
export const passwordIterations=600000
export async function newPasswordHash(password:string,salt:string){return `pbkdf2-sha256$${passwordIterations}$${await passwordHash(password,salt,passwordIterations)}`}
export function legacyPasswordHash(stored:string){return /^[a-f0-9]{64}$/.test(stored)}
export async function verifyPassword(password:string,salt:string,stored:string){
 if(legacyPasswordHash(stored))return equalHashes(await passwordHash(password,salt,100000),stored)
 const match=/^pbkdf2-sha256\$600000\$([a-f0-9]{64})$/.exec(stored)
 if(!match)return false
 return equalHashes(await passwordHash(password,salt,passwordIterations),match[1])
}
