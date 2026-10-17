import type { QuoteSummary } from './types.ts'
export function dashboardReminders(metrics:{expired:QuoteSummary[];upcoming:QuoteSummary[]}){
  const expiredSlots=Math.min(metrics.expired.length,metrics.upcoming.length?Math.max(2,4-metrics.upcoming.length):4)
  const expired=metrics.expired.slice(0,expiredSlots).map(quote=>({quote,label:'Vencida'})),upcoming=metrics.upcoming.slice(0,4-expiredSlots).map(quote=>({quote,label:`Vence ${quote.expiryDate}`}))
  return Array.from({length:Math.max(expired.length,upcoming.length)},(_,i)=>[expired[i],upcoming[i]].filter(Boolean)).flat()
}
export function dashboardMetrics(quotes: QuoteSummary[], date: string) {
  const pending = quotes.filter(q => ['draft', 'sent'].includes(q.status))
  const expired = pending.filter(q => !!q.expiryDate && q.expiryDate < date)
  const upcoming = pending.filter(q => q.expiryDate && q.expiryDate >= date && (Date.parse(q.expiryDate) - Date.parse(date)) / 86400000 <= 7)
  const accepted = quotes.filter(q => q.status === 'accepted')
  const potential = pending.filter(q => !q.expiryDate || q.expiryDate >= date)
  const month = new Date(`${date.slice(0, 7)}-01T00:00:00Z`)
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(month)
    start.setUTCMonth(start.getUTCMonth() - 5 + index)
    const key = start.toISOString().slice(0, 7)
    return { key, label: new Intl.DateTimeFormat('es-GT', { month: 'short', timeZone: 'UTC' }).format(start), accepted: accepted.filter(q => q.issueDate.startsWith(key)).reduce((sum, q) => sum + q.total, 0), potential: potential.filter(q => q.issueDate.startsWith(key)).reduce((sum, q) => sum + q.total, 0) }
  })
  const categories = new Map<string, number>()
  for (const quote of quotes) for (const category of new Set(quote.categories?.length ? quote.categories : ['Sin categoría'])) categories.set(category, (categories.get(category) || 0) + 1)
  return {
    acceptedTotal: accepted.reduce((sum, q) => sum + q.total, 0),
    potentialTotal: potential.reduce((sum, q) => sum + q.total, 0),
    acceptedCount: accepted.length, potentialCount: potential.length,
    months, categories: [...categories].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    expired, upcoming: upcoming.sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!)), drafts: pending.filter(q => q.status === 'draft'),
  }
}
