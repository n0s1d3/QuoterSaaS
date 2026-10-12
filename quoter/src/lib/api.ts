export async function api<T>(path: string, data?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(`/api${path}`, data === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}
