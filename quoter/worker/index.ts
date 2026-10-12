import { catalog } from './routes/catalog'
import { branding } from './routes/branding'
import { customers } from './routes/customers'
import { quotes } from './routes/quotes'
import { demoOrganization } from './db/organizations'
import { HttpError } from './http'
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/$/, '')
    try {
      if (!path.startsWith('/api/')) return new Response(null, { status: 404 })
      if (path !== '/api/catalog' && !/^\/api\/catalog\/[^/]+$/.test(path) && path !== '/api/branding' && path !== '/api/customers' && path !== '/api/quotes' && !/^\/api\/quotes\/[^/]+$/.test(path)) throw new HttpError(404, 'Route not found')
      const org = await demoOrganization(env.DB)
      if (path === '/api/catalog' || path.startsWith('/api/catalog/')) return await catalog(request, env.DB, org, path.startsWith('/api/catalog/') ? decodeURIComponent(path.slice(13)) : undefined)
      if (path === '/api/branding') return await branding(request, env.DB, org)
      if (path === '/api/customers') return await customers(request, env.DB, org)
      return await quotes(request, env.DB, org, path.startsWith('/api/quotes/') ? decodeURIComponent(path.slice(12)) : undefined)
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status })
      console.error('API failure', error)
      return Response.json({ error: 'Unable to complete the request' }, { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
