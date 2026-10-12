export interface ItemInput { description: string; quantity: number; unitPrice: number; taxRate: number }
export interface CalculatedItem extends ItemInput { lineSubtotal: number; lineTax: number; lineTotal: number }
function fraction(value: number): [bigint, bigint] {
  const [coefficient, exponent = '0'] = value.toString().split('e')
  const [whole, decimals = ''] = coefficient.split('.')
  const power = decimals.length - Number(exponent)
  return power >= 0 ? [BigInt(whole + decimals), 10n ** BigInt(power)] : [BigInt(whole + decimals) * 10n ** BigInt(-power), 1n]
}
function rounded(n: bigint, d: bigint) {
  const result = Number((n * 2n + d) / (2n * d))
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large')
  return result
}
export function calculateQuote(items: ItemInput[], discount = 0) {
  if (!Number.isSafeInteger(discount) || discount < 0) throw new Error('Discount must be nonnegative integer cents')
  const lines: CalculatedItem[] = items.map(item => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0 || !Number.isFinite(item.taxRate) || item.taxRate < 0) throw new Error('Invalid quantity, unit price or tax rate')
    const [q, qd] = fraction(item.quantity)
    const [t, td] = fraction(item.taxRate)
    const lineSubtotal = rounded(q * BigInt(item.unitPrice), qd)
    const lineTax = rounded(BigInt(lineSubtotal) * t, td * 100n)
    const lineTotal = lineSubtotal + lineTax
    if (!Number.isSafeInteger(lineTotal)) throw new Error('Amount is too large')
    return { ...item, lineSubtotal, lineTax, lineTotal }
  })
  const subtotal = lines.reduce((sum, item) => sum + item.lineSubtotal, 0)
  const tax = lines.reduce((sum, item) => sum + item.lineTax, 0)
  if (!Number.isSafeInteger(subtotal + tax)) throw new Error('Amount is too large')
  if (discount > subtotal + tax) throw new Error('Discount exceeds quote value')
  return { items: lines, subtotal, tax, discount, total: subtotal + tax - discount }
}
