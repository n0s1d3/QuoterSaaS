import type { QuoteSummary } from './types.ts'
function clean(value:string){return value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()}
export function quoteExpiry(q:QuoteSummary,date:string){
 if(!q.expiryDate||!['draft','sent'].includes(q.status))return ''
 if(q.expiryDate<date)return 'Cotización vencida'
 return (Date.parse(q.expiryDate)-Date.parse(date))/86400000<=7?'Vence en los próximos 7 días':''
}
export function filterQuotes(quotes:QuoteSummary[],filters:{search:string;status:string;from:string;to:string;expired:boolean},date:string){return quotes.filter(q=>(filters.status==='all'||q.status===filters.status)&&clean(`${q.quoteNumber} ${q.customerName}`).includes(clean(filters.search.trim()))&&(!filters.from||q.issueDate>=filters.from)&&(!filters.to||q.issueDate<=filters.to)&&(!filters.expired||quoteExpiry(q,date)==='Cotización vencida'))}
