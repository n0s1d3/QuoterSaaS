export class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }
export function text(value: unknown, name: string, required = false, max = 1000): string | null {
  if (value == null || value === '') { if (required) throw new HttpError(400, `${name} is required`); return null }
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new HttpError(400, `${name} is invalid`)
  return value.trim() || null
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  let data: unknown
  try { data = await request.json() } catch { throw new HttpError(400, 'Invalid JSON') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Expected a JSON object')
  return data as Record<string, unknown>
}
