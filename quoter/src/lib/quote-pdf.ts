import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Branding, QuoteDetail } from './types.ts'
import { formatMoney } from './money.ts'
import { statuses } from './statuses.ts'

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
}

/** Generate from persisted server totals; never recalculate or mutate the quote. */
export function createQuotePdf(quote: QuoteDetail, brand: Branding) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false })
  doc.setProperties({ title: `Cotización ${quote.quoteNumber}`, author: brand.name, subject: `Cotización para ${quote.customer.name}` })
  const primary = rgb(brand.primaryColor)
  const accent = rgb(brand.accentColor)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  const nameLines: string[] = doc.splitTextToSize(brand.name, brand.logo ? 108 : 145)
  const headerBottom = Math.max(42, 16 + nameLines.length * 7) + 8
  let logo: { width: number; height: number } | undefined
  if (brand.logo) {
    // Invalid images cause a visible download error rather than a silently missing logo.
    const properties = doc.getImageProperties(brand.logo)
    const scale = Math.min(28 / properties.width, 28 / properties.height)
    logo = { width: properties.width * scale, height: properties.height * scale }
  }
  const headedPages = new Set<number>()
  function header() {
    const page = doc.getCurrentPageInfo().pageNumber
    if (headedPages.has(page)) return
    headedPages.add(page)
    doc.setFillColor(...accent); doc.rect(0, 0, 210, headerBottom - 3, 'F')
    doc.setFillColor(...primary); doc.rect(0, 0, 210, 3, 'F')
    if (brand.logo && logo) doc.addImage(brand.logo, 14, 12, logo.width, logo.height)
    doc.setTextColor(...primary); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
    doc.text(nameLines, brand.logo ? 48 : 14, 18)
    doc.setFontSize(10); doc.text('COTIZACIÓN', 196, 16, { align: 'right' })
    doc.setFontSize(14); doc.text(quote.quoteNumber, 196, 24, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(statuses[quote.status] || quote.status, 196, 32, { align: 'right' })
  }
  const common = {
    margin: { top: headerBottom, bottom: 18, left: 14, right: 14 },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, textColor: [36, 52, 46] as [number, number, number], overflow: 'linebreak' as const },
    willDrawPage: header,
  }
  const customer = quote.customer
  const customerText = [customer.name, customer.company, customer.phone, customer.email, customer.address, customer.taxId ? `NIT: ${customer.taxId}` : null].filter(Boolean).join('\n')
  autoTable(doc, {
    ...common, startY: headerBottom, theme: 'plain',
    head: [['CLIENTE', 'FECHAS']],
    body: [[customerText, `Emisión: ${quote.issueDate}\nVálida hasta: ${quote.expiryDate || 'Sin vencimiento'}\nMoneda: GTQ`]],
    columnStyles: { 0: { cellWidth: 118 } },
    headStyles: { textColor: primary, fontStyle: 'bold' },
  })
  const lastY = () => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  autoTable(doc, {
    ...common, startY: lastY() + 6, theme: 'striped',
    head: [['Descripción', 'Cantidad', 'Precio unitario', 'Importe']],
    body: quote.items.map(item => [item.description, String(item.quantity), formatMoney(item.unitPrice), formatMoney(item.lineTotal)]),
    headStyles: { fillColor: primary, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 248, 247] },
    columnStyles: { 0: { cellWidth: 88 }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 36, halign: 'right' }, 3: { cellWidth: 36, halign: 'right' } },
  })
  const totals = [['Subtotal', formatMoney(quote.subtotal)], ...(quote.tax ? [['Impuestos anteriores', formatMoney(quote.tax)]] : []), ['Descuento', formatMoney(quote.discount)], ['TOTAL', formatMoney(quote.total)]]
  autoTable(doc, {
    ...common, startY: lastY() + 6, margin: { ...common.margin, left: 106 }, theme: 'plain', pageBreak: 'avoid',
    body: totals, columnStyles: { 1: { halign: 'right' } },
    didParseCell: cell => { if (cell.row.index === totals.length - 1) { cell.cell.styles.fontStyle = 'bold'; cell.cell.styles.fillColor = accent; cell.cell.styles.textColor = primary } },
  })
  if (quote.notes) autoTable(doc, {
    ...common, startY: lastY() + 8, theme: 'plain', head: [['NOTAS Y CONDICIONES']], body: [[quote.notes]], headStyles: { textColor: primary },
  })
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 120, 114)
    doc.text(`${quote.quoteNumber} · Página ${page} de ${pages}`, 196, 289, { align: 'right' })
  }
  return doc
}

export function downloadQuotePdf(quote: QuoteDetail, brand: Branding) {
  createQuotePdf(quote, brand).save(`${quote.quoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`)
}
