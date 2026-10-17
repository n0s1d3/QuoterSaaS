let context: { id: string; organizationId: string } | null = null
export function setApiContext(user: { id: string; organizationId: string } | null) { context = user }
export interface ApiOptions { signal?: AbortSignal; timeoutMs?: number }
export class ApiError extends Error {
  status: number
  code?: string
  requestId?: string
  challengeRequired: boolean
  constructor(message: string, status = 0, details: { code?: string; requestId?: string; challengeRequired?: boolean } = {}) {
    super(message + (details.requestId && status >= 500 ? ` Referencia: ${details.requestId}.` : ''))
    this.name = 'ApiError'; this.status = status; this.code = details.code; this.requestId = details.requestId; this.challengeRequired = details.challengeRequired === true
  }
}
async function request<T>(path: string, data: unknown, method: string, options: ApiOptions, read: (response: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; controller.abort() }, options.timeoutMs ?? 30000)
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel, { once: true })
  if (options.signal?.aborted) cancel()
  let status = 0, requestId: string | undefined
  try {
    const headers = new Headers()
    if (data !== undefined) headers.set('Content-Type', 'application/json')
    if (context && !path.startsWith('/auth/')) {
      headers.set('X-Quoter-User', context.id)
      if (!path.startsWith('/businesses') && !path.startsWith('/invitations/') && !path.startsWith('/admin/')) headers.set('X-Quoter-Business', context.organizationId)
    }
    const response = await fetch(`/api${path}`, { cache: 'no-store', credentials: 'same-origin', headers, signal: controller.signal, ...(data === undefined ? {} : { method, body: JSON.stringify(data) }) })
    status = response.status
    const reference = response.headers.get('X-Request-ID')
    requestId = reference && /^[a-zA-Z0-9_-]{1,80}$/.test(reference) ? reference : undefined
    if (!response.ok) {
      let result: Record<string, unknown> = {}
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        try { const parsed: unknown = await response.json(); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) result = parsed as Record<string, unknown> } catch { /* Do not expose proxy HTML or malformed response bodies. */ }
      }
      if (result.code === 'ACCESS_CHANGED') window.dispatchEvent(new Event('quoter-business-context-changed'))
      if (result.code === 'SUBSCRIPTION_EXPIRED' || result.code === 'BUSINESS_SUSPENDED') window.dispatchEvent(new Event('quoter-subscription-changed'))
      if (result.code === 'PLAN_LIMIT') window.dispatchEvent(new Event('quoter-usage-changed'))
      if (status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('quoter-session-expired'))
      if (status === 409 && result.error === 'El negocio activo cambió. Recarga antes de continuar') window.dispatchEvent(new Event('quoter-business-context-changed'))
      throw new ApiError(typeof result.error === 'string' ? result.error : `No se pudo completar la solicitud (HTTP ${status}). Intenta nuevamente.`, status, { code: typeof result.code === 'string' ? result.code : undefined, requestId, challengeRequired: result.challengeRequired === true })
    }
    const value = await read(response)
    if (data !== undefined && /^\/(quotes|catalog|team|backups|plans|trash|invitations)(?:[/?]|$)/.test(path)) window.dispatchEvent(new Event('quoter-usage-changed'))
    return value
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted) throw new ApiError(timedOut ? 'La solicitud tardó demasiado. Comprueba el resultado antes de volver a guardar.' : 'Solicitud cancelada.', status, { code: timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_CANCELLED', requestId })
    throw new ApiError(status ? 'El servidor devolvió una respuesta no válida. Intenta nuevamente.' : 'No se pudo conectar con el servidor. Comprueba tu conexión antes de volver a guardar.', status, { code: status ? 'INVALID_RESPONSE' : 'CONNECTION_FAILED', requestId })
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel) }
}
export async function api<T>(path: string, data?: unknown, method = 'POST', options: ApiOptions = {}): Promise<T> {
  return request(path, data, method, options, response => {
    if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Unexpected content type')
    return response.json()
  })
}
export async function downloadApi(path: string, filename: string, options: ApiOptions = {}) {
  const blob = await request(path, undefined, 'GET', { timeoutMs: 120000, ...options }, response => response.blob())
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
