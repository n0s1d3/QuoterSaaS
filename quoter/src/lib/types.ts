import type { CalculatedItem } from './quote-calculator'
export interface Customer { id: string; name: string; company: string | null; phone: string | null; email: string | null; taxId: string | null; address: string | null }
export interface QuoteSummary { id: string; quoteNumber: string; customerName: string; status: string; issueDate: string; subtotal: number; tax: number; discount: number; total: number }
export interface QuoteDetail extends QuoteSummary { customer: Customer; expiryDate: string | null; notes: string | null; items: CalculatedItem[] }
