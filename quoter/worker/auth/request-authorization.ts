import { cookieToken,digest,type Account } from './session.ts'
/** Revalidate the live session and privileges in the same transaction as database writes. */
export async function requestDatabase(db:D1Database,request:Request,user:Account,path:string){
 const scope=path.startsWith('/api/admin/')?3:path.startsWith('/api/backups/')||path==='/api/history'||path.startsWith('/api/trash')||path.startsWith('/api/team')||path==='/api/plans'||path==='/api/branding'&&request.method!=='GET'||request.method==='DELETE'?2:request.method==='GET'||path.startsWith('/api/invitations/')||path.startsWith('/api/businesses')||path==='/api/diagnostics'?0:1
 const tokenHash=await digest(cookieToken(request)!)
 const originals=new WeakMap<object,D1PreparedStatement>()
 const batch=async <T>(statements:D1PreparedStatement[])=>{
  const id=crypto.randomUUID()
  const result=await db.batch<T>([db.prepare('INSERT INTO request_write_guards(id,token_hash,user_id,organization_id,scope) VALUES(?,?,?,?,?)').bind(id,tokenHash,user.id,user.organizationId,scope),...statements.map(statement=>originals.get(statement)||statement),db.prepare('DELETE FROM request_write_guards WHERE id=?').bind(id)])
  return result.slice(1,-1)
 }
 const wrap=(statement:D1PreparedStatement,write=false):D1PreparedStatement=>{
  const proxy=new Proxy(statement,{get(target,key){
   if(key==='bind')return (...values:unknown[])=>wrap(target.bind(...values),write)
   if(write&&key==='first')return async(column?:string)=>{const row=(await batch([target]))[0].results[0];return row?column===undefined?row:(row as Record<string,unknown>)[column]:null}
   if(write&&key==='all')return async()=> (await batch([target]))[0]
   if(write&&key==='raw')return ()=>{throw new Error('Use batch for mutations returning raw results')}
   if(key==='run')return async()=> (await batch([target]))[0]
   const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value
  }});originals.set(proxy,statement);return proxy
 }
 return new Proxy(db,{get(target,key){if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql),!/^\s*SELECT\b/i.test(sql));if(key==='batch')return batch;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}})
}
