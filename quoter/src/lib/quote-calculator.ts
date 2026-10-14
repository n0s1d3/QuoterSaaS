export interface ItemInput { description: string; quantity: number; unitPrice: number; taxRate: number; catalogItemId?: string | null; unit?: string; duration?: string | null; validUntil?: string | null }
export interface CalculatedItem extends ItemInput { lineSubtotal: number; lineTax: number; lineTotal: number }
function fraction(value: number): [bigint, bigint] {
  const [coefficient, exponent = '0'] = value.toString().split('e')
  const [whole, decimals = ''] = coefficient.split('.')
  const power = decimals.length - Number(exponent)
  return power >= 0 ? [BigInt(whole + decimals), 10n ** BigInt(power)] : [BigInt(whole + decimals) * 10n ** BigInt(-power), 1n]
}
function rounded(n: bigint, d: bigint) {
  const result = Number((n * 2n + d) / (2n * d))
  if (!Number.isSafeInteger(result)) throw new Error('El importe es demasiado grande')
  return result
}
export interface Surcharge { type: 'none' | 'fixed' | 'percent'; value: number }
export function calculateQuote(items: ItemInput[], discount = 0, additional: Surcharge = {type:'none',value:0}) {
  if (!Number.isSafeInteger(discount) || discount < 0) throw new Error('El descuento debe ser un importe no negativo en centavos')
  const lines: CalculatedItem[] = items.map(item => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0 || !Number.isFinite(item.taxRate) || item.taxRate < 0) throw new Error('Cantidad, precio unitario o tasa de impuesto inválidos')
    const [q, qd] = fraction(item.quantity)
    const [t, td] = fraction(item.taxRate)
    const lineSubtotal = rounded(q * BigInt(item.unitPrice), qd)
    const lineTax = rounded(BigInt(lineSubtotal) * t, td * 100n)
    const lineTotal = lineSubtotal + lineTax
    if (!Number.isSafeInteger(lineTotal)) throw new Error('El importe es demasiado grande')
    return { ...item, lineSubtotal, lineTax, lineTotal }
  })
  const subtotal = lines.reduce((sum, item) => sum + item.lineSubtotal, 0)
  const tax = lines.reduce((sum, item) => sum + item.lineTax, 0)
  if (!Number.isSafeInteger(subtotal + tax)) throw new Error('El importe es demasiado grande')
  if (discount > subtotal + tax) throw new Error('El descuento supera el valor de la cotización')
  if (!['none','fixed','percent'].includes(additional.type) || !Number.isSafeInteger(additional.value) || additional.value < 0 || (additional.type === 'percent' && additional.value > 1000000)) throw new Error('Adicional por facturación inválido')
  const base = subtotal + tax - discount
  const surcharge = additional.type === 'fixed' ? additional.value : additional.type === 'percent' ? rounded(BigInt(base) * BigInt(additional.value),10000n) : 0
  if (!Number.isSafeInteger(base + surcharge)) throw new Error('El importe es demasiado grande')
  return { items: lines, subtotal, tax, discount, surcharge, total: base + surcharge }
}
