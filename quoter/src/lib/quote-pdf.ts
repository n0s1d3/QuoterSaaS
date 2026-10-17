import { inspectLogo, validateLogo } from './raster.ts'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Branding, QuoteDetail } from './types.ts'
import { formatMoney } from './money.ts'
import { statuses } from './statuses.ts'
import { resolveQuoteTemplate } from './quote-templates.ts'

type Color = [number, number, number]
function rgb(hex: string): Color {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)) as Color
}
function ink(color: Color): Color {
  const linear=color.map(channel=>{const c=channel/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4})
  return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722>0.179?[15,20,30]:[255,255,255]
}

/** Generate from persisted server totals; never recalculate or mutate the quote. */
export function createQuotePdf(quote: QuoteDetail, brand: Branding, diagnostic: (event: string, detail: string) => void = () => {}) {
  const template=resolveQuoteTemplate(brand.quoteTemplate)
  const lateral=template==='sidebar', minimal=template==='minimal', corporate=template==='corporate'
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false })
  doc.setProperties({ title: `Cotización ${quote.quoteNumber}`, author: brand.name, subject: `Cotización para ${quote.customer.name}` })
  const primary=rgb(brand.primaryColor), accent=rgb(brand.accentColor), dark:Color=[21,24,34], text:Color=[36,42,51]
  const left=lateral?78:14, width=196-left
  doc.setFont('helvetica', 'bold'); doc.setFontSize(lateral?13:18)
  const allNameLines: string[] = doc.splitTextToSize(brand.name.replace(/\s+/g, ' ').trim(), lateral?44:brand.logo?108:145)
  const nameLines = allNameLines.slice(0, 2)
  doc.setFont('helvetica','normal');doc.setFontSize(lateral?8:9)
  const contacts=[brand.taxId?`NIT: ${brand.taxId}`:null,brand.address,brand.phone,brand.contactEmail].filter(Boolean).join('\n')
  const allContactLines:string[]=doc.splitTextToSize(contacts,lateral?44:brand.logo?108:145)
  const contactLines = allContactLines.slice(0, 5)
  const continuedDetails = [...allNameLines.slice(2), ...allContactLines.slice(5)].join('\n')
  const contactStart=18+(nameLines.length-1)*7+6
  const bandBottom=Math.min(70,Math.max(43,contactStart+contactLines.length*4.5+6))
  const headerBottom=lateral?50:corporate?bandBottom+27:Math.min(70,Math.max(50,contactStart+contactLines.length*4.5+8))
  let logo: { width: number; height: number } | undefined
  if (brand.logo) {
    // Invalid images cause a visible generation error rather than a silently missing logo.
    inspectLogo(brand.logo)
    const properties = doc.getImageProperties(brand.logo)
    diagnostic('pdf.logo.decodificado', JSON.stringify({ width: properties.width, height: properties.height, format: properties.fileType }))
    const scale = Math.min(28 / properties.width, 28 / properties.height)
    logo = { width: properties.width * scale, height: properties.height * scale }
  }
  const headedPages = new Set<number>()
  function image(x:number,y:number){if(brand.logo&&logo){doc.addImage(brand.logo,x,y,logo.width,logo.height);diagnostic('pdf.logo.incrustado',`Página ${doc.getCurrentPageInfo().pageNumber}; ${logo.width.toFixed(1)} × ${logo.height.toFixed(1)} mm`)}}
  function header() {
    const page = doc.getCurrentPageInfo().pageNumber
    if (headedPages.has(page)) return
    headedPages.add(page)
    if(lateral){
      doc.setFillColor(...accent);doc.rect(0,0,65,297,'F')
      doc.setFillColor(...primary);doc.rect(0,0,4,297,'F')
      image(12,14)
      const y=brand.logo?54:24
      doc.setTextColor(...ink(accent));doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(nameLines,12,y)
      doc.setFont('helvetica','normal');doc.setFontSize(8);if(contactLines.length)doc.text(contactLines,12,y+nameLines.length*6+5)
      doc.setDrawColor(...primary);doc.line(12,252,53,252)
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('TU COTIZACIÓN',12,261)
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(quote.quoteNumber,12,268)
    }else{
      if(corporate){
        doc.setFillColor(...dark);doc.rect(0,0,210,bandBottom,'F')
        doc.setFillColor(...primary);doc.lines([[111,0],[5,5],[-116,0],[0,-5]],0,bandBottom,[1,1],'F',true)
        doc.setFillColor(...accent);doc.rect(116,bandBottom,94,1,'F')
      }else if(!minimal){
        doc.setFillColor(...accent);doc.rect(0,0,210,headerBottom-3,'F')
        doc.setFillColor(...primary);doc.rect(0,0,210,3,'F')
      }
      image(corporate?164:14,12)
      const x=corporate?14:brand.logo?48:14
      doc.setTextColor(...(corporate?[255,255,255] as Color:minimal?text:ink(accent)))
      doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(nameLines,x,18)
      doc.setFont('helvetica','normal');doc.setFontSize(9);if(contactLines.length)doc.text(contactLines,x,contactStart)
    }
    doc.setTextColor(...text);doc.setFont('helvetica','bold');doc.setFontSize(corporate?17:10)
    const titleY=corporate?bandBottom+14:16
    doc.text('COTIZACIÓN',corporate?14:196,titleY,{align:corporate?'left':'right'})
    doc.setFontSize(corporate?12:14);doc.text(quote.quoteNumber,196,corporate?titleY:24,{align:'right'})
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(statuses[quote.status]||quote.status,196,corporate?titleY+7:32,{align:'right'})
    if(minimal){doc.setDrawColor(...primary);doc.setLineWidth(0.5);doc.line(14,headerBottom-4,196,headerBottom-4)}
  }
  const common = {
    margin: { top: headerBottom, bottom: corporate?25:18, left, right: 14 },
    styles: { font: 'helvetica', fontSize: lateral?8:10, cellPadding: lateral?2:3, textColor: text, overflow: 'linebreak' as const },
    willDrawPage: header,
  }
  const lastY=()=> (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  // Long accepted business details stay in a paginated body, outside the repeating header.
  let contentStart=headerBottom
  if(continuedDetails){
    autoTable(doc,{...common,startY:contentStart,theme:'plain',head:[['DATOS DE LA EMPRESA (CONTINUACIÓN)']],body:[[continuedDetails]],headStyles:{textColor:text,fontStyle:'bold'}})
    contentStart=lastY()+6
  }
  const customer=quote.customer
  const customerText=[customer.name,customer.company,customer.phone,customer.email,customer.address,customer.taxId?`NIT: ${customer.taxId}`:null].filter(Boolean).join('\n')
  autoTable(doc,{
    ...common,startY:contentStart,theme:'plain',head:[['CLIENTE','FECHAS']],
    body:[[customerText,`Emisión: ${quote.issueDate}\nVálida hasta: ${quote.expiryDate||'Sin vencimiento'}\nMoneda: GTQ`]],
    columnStyles:{0:{cellWidth:lateral?width*0.5:118}},headStyles:{textColor:text,fontStyle:'bold'},
  })
  autoTable(doc,{
    ...common,startY:lastY()+6,theme:'striped',head:[['Descripción','Cantidad','Precio unitario','Importe']],
    body:quote.items.map(item=>[item.description+`\nUnidad: ${item.unit||'unidad'}`+(item.duration?` · Tiempo: ${item.duration}`:'')+(item.validUntil?`\nVigencia: ${item.validUntil}`:''),String(item.quantity),formatMoney(item.unitPrice),formatMoney(item.lineTotal)]),
    headStyles:{fillColor:corporate?dark:primary,textColor:corporate?[255,255,255]:ink(primary),fontSize:lateral?7:10},
    alternateRowStyles:{fillColor:minimal?[241,242,244]:[246,248,247]},
    columnStyles:{0:{cellWidth:lateral?54:88},1:{cellWidth:lateral?16:22,halign:'right'},2:{cellWidth:lateral?24:36,halign:'right'},3:{cellWidth:lateral?24:36,halign:'right'}},
  })
  const totals=[['Subtotal',formatMoney(quote.subtotal)],...(quote.tax?[['Impuestos anteriores',formatMoney(quote.tax)]]:[]),['Descuento',formatMoney(quote.discount)],...(quote.surcharge?[['Adicional por facturación',formatMoney(quote.surcharge)]]:[]),['TOTAL',formatMoney(quote.total)]]
  autoTable(doc,{
    ...common,startY:lastY()+6,margin:{...common.margin,left:lateral?90:106},theme:'plain',pageBreak:'avoid',
    body:totals,columnStyles:{1:{halign:'right'}},
    didParseCell:cell=>{if(cell.row.index===totals.length-1){cell.cell.styles.fontStyle='bold';cell.cell.styles.fillColor=corporate?dark:minimal?primary:accent;cell.cell.styles.textColor=ink(corporate?dark:minimal?primary:accent)}},
  })
  if(quote.paymentTerms)autoTable(doc,{...common,startY:lastY()+8,theme:'plain',head:[['CONDICIONES DE PAGO']],body:[[quote.paymentTerms]],headStyles:{textColor:text}})
  const pages=doc.getNumberOfPages()
  for(let page=1;page<=pages;page++){
    doc.setPage(page)
    if(corporate){doc.setFillColor(...dark);doc.rect(0,280,210,17,'F');doc.setFillColor(...primary);doc.rect(0,278,210,2,'F')}
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...(corporate?[255,255,255] as Color:[110,120,114] as Color))
    doc.text(`${quote.quoteNumber} · Página ${page} de ${pages}`,196,289,{align:'right'})
  }
  return doc
}
export async function downloadQuotePdf(quote: QuoteDetail, brand: Branding, diagnostic: (event: string, detail: string) => void = () => {}) {
  await validateLogo(brand.logo)
  createQuotePdf(quote,brand,diagnostic).save(`${quote.quoteNumber.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`)
}
