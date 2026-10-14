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
import { HttpError } from './http'
export default {
  async fetch(request, env, context) {
    const response = await handle(request, env, context)
    const headers = new Headers(response.headers)
    headers.set("Cache-Control", "no-store")
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("Referrer-Policy", "no-referrer")
    if (response.status === 429) headers.set("Retry-After", "900")
    return new Response(response.body, { status: response.status, headers })
  },
} satisfies ExportedHandler<Env>

async function handle(request: Request, env: Env & EmailEnvironment, context: ExecutionContext) {
    const path = new URL(request.url).pathname.replace(/\/$/, '')
    try {
      if (!path.startsWith('/api/')) return new Response(null, { status: 404 })
      guardMutation(request)
      if (path.startsWith('/api/auth/')) return await auth(request, env.DB, path, env, context)
      const user = await account(request, env.DB)
      if (!user.emailVerified) throw new HttpError(403,'Verifica tu correo antes de usar el negocio')
      const expectedUser=request.headers.get('X-Quoter-User'),expectedBusiness=request.headers.get('X-Quoter-Business')
      if(expectedUser&&expectedUser!==user.id)throw new HttpError(401,'La cuenta activa cambió. Inicia sesión nuevamente')
      if(path==='/api/invitations/preview')return await previewInvitation(request,env.DB,user)
      if(path==='/api/invitations/accept')return await acceptInvitation(request,env.DB,user)
      if(path.startsWith('/api/businesses'))return await businesses(request,env.DB,user,path)
      if(expectedBusiness&&expectedBusiness!==user.organizationId)throw new HttpError(409,'El negocio activo cambió. Recarga antes de continuar')
      if(path==='/api/diagnostics')return await diagnostics(request,env.DB,user)
      permissions(user,request,path)
      if(path.startsWith('/api/team'))return await team(request,env.DB,user,path,env)
      if (path !== '/api/catalog' && !/^\/api\/catalog\/[^/]+$/.test(path) && path !== '/api/branding' && path !== '/api/customers' && path !== '/api/quotes' && !/^\/api\/quotes\/[^/]+(?:\/duplicate)?$/.test(path)) throw new HttpError(404, 'Route not found')
      const org = user.organizationId
      if (path === '/api/catalog' || path.startsWith('/api/catalog/')) return await catalog(request, env.DB, org, path.startsWith('/api/catalog/') ? decodeURIComponent(path.slice(13)) : undefined)
      if (path === '/api/branding') return await branding(request, env.DB, org)
      if (path === '/api/customers') return await customers(request, env.DB, org)
      return await quotes(request, env.DB, org, path.startsWith('/api/quotes/') ? decodeURIComponent(path.slice(12).split('/')[0]) : undefined, path.endsWith('/duplicate'))
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status })
      console.error('API failure', error)
      return Response.json({ error: 'Unable to complete the request' }, { status: 500 })
    }
}