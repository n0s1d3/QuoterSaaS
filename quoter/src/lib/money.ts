export function formatMoney(cents: number, currency = 'GTQ') {
  const amount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
  return `${currency === 'GTQ' ? 'Q' : currency} ${amount}`
}
export function toCents(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value)) throw new Error('Usa un importe no negativo con un máximo de dos decimales')
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error('El importe es demasiado grande')
  return cents
}
