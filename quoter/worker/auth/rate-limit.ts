import { HttpError } from '../http'
import { digest } from './session'
export async function limit(db:D1Database,key:string,max:number,windowSeconds=900,message='Demasiados intentos. Espera 15 minutos e intenta nuevamente') {
 const now=Math.floor(Date.now()/1000)
 await db.prepare('DELETE FROM auth_limits WHERE expires_at<=?').bind(now).run()
 const result=await db.prepare('INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(await digest(key),now+windowSeconds,now,now).first<{attempts:number}>()
 if(result&&result.attempts>max)throw new HttpError(429,message,windowSeconds)
}
