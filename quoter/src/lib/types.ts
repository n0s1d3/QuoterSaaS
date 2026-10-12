import type { CalculatedItem } from './quote-calculator'
export interface Customer { id: string; name: string; company: string | null; phone: string | null; email: string | null; taxId: string | null; address: string | null }
export interface Branding { taxId?: string | null; address?: string | null; phone?: string | null; contactEmail?: string | null; paymentTerms?: string | null; name: string; logo: string | null; primaryColor: string; accentColor: string }
export interface QuoteSummary { preview?: string; itemCount?: number; id: string; quoteNumber: string; customerName: string; status: string; issueDate: string; expiryDate?: string | null; subtotal: number; tax: number; discount: number; total: number }
export interface QuoteDetail extends QuoteSummary { paymentTerms?: string | null; surcharge?: number; surchargeType?: 'none' | 'fixed' | 'percent'; surchargeValue?: number; branding?: Branding | null; brandingCapturedAt?: string | null; customer: Customer; expiryDate: string | null; notes: string | null; items: CalculatedItem[] }

export interface CatalogItem { id: string; name: string; description: string | null; category: string; unit: string; unitPrice: number; duration: string | null; validUntil: string | null; reviewedAt: string; staleAfterDays: number; active: number; soldQuantity?: number }
