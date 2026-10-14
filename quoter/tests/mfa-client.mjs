import { createHmac } from 'node:crypto'
export function codeFor(secret,step=Math.floor(Date.now()/30000)){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0;const bytes=[]
 for(const c of secret){value=(value<<5)|alphabet.indexOf(c);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255)}}
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15
 return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')
}
export async function enroll(call,user){const setup=await call(user,'/security/admin-mfa',{action:'setup',currentPassword:user.password});const confirmed=await call(user,'/security/admin-mfa',{action:'confirm',currentPassword:user.password,code:codeFor(setup.secret)});return {...setup,...confirmed}}
