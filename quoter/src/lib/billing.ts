/** Published subscription tariffs, in GTQ cents; payment verification remains manual. */
export const billingPeriods = [
  { months: 1, label: '1 mes', discountBps: 0 },
  { months: 3, label: '3 meses', discountBps: 500 },
  { months: 6, label: '6 meses', discountBps: 1000 },
  { months: 12, label: '12 meses', discountBps: 1500 },
] as const
export type BillingMonths = typeof billingPeriods[number]['months']
export const monthlyPrices: Readonly<Record<string, number>> = { gratis: 4900, pro: 8900, negocio: 14900 }
export function isBillingMonths(value: unknown): value is BillingMonths {
  return billingPeriods.some(period => period.months === value)
}
export function billingOffer(planId: string, months: BillingMonths) {
  const monthlyPriceCents = monthlyPrices[planId]
  const period = billingPeriods.find(period => period.months === months)
  if (!Number.isSafeInteger(monthlyPriceCents) || !period) throw new Error('Plan o periodo de pago inválido')
  const listPriceCents = monthlyPriceCents * months
  const totalCents = Math.round(listPriceCents * (10000 - period.discountBps) / 10000)
  return { months, currency: 'GTQ' as const, monthlyPriceCents, listPriceCents, discountBps: period.discountBps, totalCents, savingsCents: listPriceCents - totalCents }
}
