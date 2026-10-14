export class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }
export function text(value: unknown, name: string, required = false, max = 1000): string | null {
  if (value == null || value === '') { if (required) throw new HttpError(400, `El campo ${name} es obligatorio`); return null }
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new HttpError(400, `El campo ${name} no es válido`)
  return value.trim() || null
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  let data: unknown
  try { data = await request.json() } catch { throw new HttpError(400, 'JSON inválido') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Se esperaba un objeto JSON')
  return data as Record<string, unknown>
}
