import type { Account } from '../auth/session'
export function auditStatement(db:D1Database,user:Account,action:string,quoteId:string|null=null,detail:Record<string,unknown>={},gate?:{sql:string;values:unknown[]}) {
 return db.prepare(`INSERT INTO audit_events(id,organization_id,quote_id,action,actor_user_id,actor_email,detail) SELECT ?,?,?,?,?,?,? ${gate?`WHERE ${gate.sql}`:''}`).bind(crypto.randomUUID(),user.organizationId,quoteId,action,user.id,user.email,JSON.stringify(detail),...(gate?.values||[]))
}
