import { adminMfa,requireMfa } from './routes/admin-mfa'
import { requestDatabase } from './auth/request-authorization'
import { platformAdmin } from './routes/platform-admin'
import { businessSubscription,requireSubscription,expiredMessage,suspendedMessage } from './auth/subscription'
import { plans } from './routes/plans'
import { dashboard } from './routes/dashboard'
import { dataHistory } from './routes/data-history'
import { backups } from './routes/backups'
import { diagnostics } from './routes/diagnostics'
import { permissions } from './auth/permissions'
import { team, businesses, acceptInvitation, previewInvitation } from './routes/team'
import type { EmailEnvironment } from './auth/environment'
import { catalog } from './routes/catalog'
import { branding } from './routes/branding'
import { customers } from './routes/customers'
import { quotes } from './routes/quotes'
import { account, guardMutation } from './auth/session'
import { auth } from './routes/auth'
import { guardTransport,HttpError } from './http'
export default {
  async fetch(request, env, context) {
    const response = await handle(request, env, context)
    const headers = new Headers(response.headers)
    headers.set("Cache-Control", "no-store")
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("Referrer-Policy", "no-referrer")
    headers.set("X-Frame-Options","DENY")
    headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()")
    if (response.status === 429) headers.set("Retry-After", "900")
    return new Response(response.body, { status: response.status, headers })
  },
} satisfies ExportedHandler<Env>

async function handle(request: Request, env: Env & EmailEnvironment & {MFA_ENCRYPTION_KEY?:string}, context: ExecutionContext) {
    const path = new URL(request.url).pathname.replace(/\/$/, '')
    try {
      if (!path.startsWith('/api/')) return new Response(null, { status: 404 })
      guardTransport(request)
      guardMutation(request)
      if (path.startsWith('/api/auth/')) return await auth(request, env.DB, path, env, context)
      const user = await account(request, env.DB)
      if (!user.emailVerified) throw new HttpError(403,'Verifica tu correo antes de usar el negocio')
      const expectedUser=request.headers.get('X-Quoter-User'),expectedBusiness=request.headers.get('X-Quoter-Business')
      if(expectedUser&&expectedUser!==user.id)throw new HttpError(401,'La cuenta activa cambió. Inicia sesión nuevamente')
      const db=await requestDatabase(env.DB,request,user,path)
      if(path==='/api/security/admin-mfa')return await adminMfa(request,db,user,env.MFA_ENCRYPTION_KEY)
      if(path.startsWith('/api/admin/')){await requireMfa(db,user,request);return await platformAdmin(request,db,user,path)}
      if(path==='/api/invitations/preview')return await previewInvitation(request,db,user)
      if(path==='/api/invitations/accept')return await acceptInvitation(request,db,user)
      if(path.startsWith('/api/businesses'))return await businesses(request,db,user,path)
      if(expectedBusiness&&expectedBusiness!==user.organizationId)throw new HttpError(409,'El negocio activo cambió. Recarga antes de continuar')
      if(path==='/api/subscription'&&request.method==='GET')return Response.json(await businessSubscription(db,user.organizationId))
      if(!['GET','HEAD'].includes(request.method)&&path!=='/api/diagnostics'&&path!=='/api/backups/preview')await requireSubscription(db,user.organizationId)
      if(path==='/api/plans')return await plans(request,db,user,env)
      if(path==='/api/diagnostics')return await diagnostics(request,db,user)
      if(path==='/api/history'||path.startsWith('/api/trash')||/^\/api\/quotes\/[^/]+\/history$/.test(path))return await dataHistory(request,db,user,path)
      if(path.startsWith('/api/backups/'))return await backups(request,db,user,path)
      if(path==='/api/dashboard')return await dashboard(request,db,user.organizationId)
      permissions(user,request,path)
      if(path.startsWith('/api/team'))return await team(request,db,user,path,env)
      if (path !== '/api/catalog' && !/^\/api\/catalog\/[^/]+$/.test(path) && path !== '/api/branding' && path !== '/api/customers' && path !== '/api/quotes' && !/^\/api\/quotes\/[^/]+(?:\/duplicate)?$/.test(path)) throw new HttpError(404, 'Ruta no encontrada')
      const org = user.organizationId
      if (path === '/api/catalog' || path.startsWith('/api/catalog/')) return await catalog(request, db, org, path.startsWith('/api/catalog/') ? decodeURIComponent(path.slice(13)) : undefined)
      if (path === '/api/branding') return await branding(request, db, org)
      if (path === '/api/customers') return await customers(request, db, org)
      return await quotes(request, db, org, path.startsWith('/api/quotes/') ? decodeURIComponent(path.slice(12).split('/')[0]) : undefined, path.endsWith('/duplicate'),user)
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message,...(error.message===expiredMessage?{code:'SUBSCRIPTION_EXPIRED'}:error.message===suspendedMessage?{code:'BUSINESS_SUSPENDED'}:{}) }, { status: error.status })
      const message=String(error)
      if(message.includes('QUOTER_BUSINESS_SUSPENDED'))return Response.json({error:suspendedMessage,code:'BUSINESS_SUSPENDED'},{status:403})
      if(message.includes('QUOTER_SUBSCRIPTION_EXPIRED'))return Response.json({error:expiredMessage,code:'SUBSCRIPTION_EXPIRED'},{status:403})
      if(message.includes('QUOTER_MFA_REQUIRED'))return Response.json({error:'Verifica el segundo factor para entrar en Administración'},{status:403})
      if(message.includes('QUOTER_SESSION_REVOKED'))return Response.json({error:'Tu sesión fue revocada. Inicia sesión nuevamente'},{status:401})
      if(message.includes('QUOTER_ACCESS_CHANGED'))return Response.json({error:'Tus permisos cambiaron. Recarga antes de continuar',code:'ACCESS_CHANGED'},{status:403})
      const resource=message.includes('QUOTER_LIMIT_QUOTES')?'quotes':message.includes('QUOTER_LIMIT_CATALOG')?'catalog':message.includes('QUOTER_LIMIT_MEMBERS')?'members':null
      if(resource){const label=resource==='quotes'?'cotizaciones activas':resource==='catalog'?'partidas activas del catálogo':'integrantes e invitaciones pendientes';return Response.json({error:`Alcanzaste el límite de ${label} de tu plan. El propietario puede consultar los cupos en Plan y uso.`,code:'PLAN_LIMIT',resource},{status:409})}
      console.error('API failure',{category:'unexpected',errorType:error instanceof Error&&['Error','TypeError','RangeError','SyntaxError'].includes(error.name)?error.name:'Error',requestId:crypto.randomUUID()})
      return Response.json({ error: 'No se pudo completar la solicitud' }, { status: 500 })
    }
}