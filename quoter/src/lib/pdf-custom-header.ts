import type {jsPDF} from 'jspdf'
import type {Branding} from './types'
import type {CustomQuoteLayout} from './custom-layout'
/** Size the content first; a chosen minimum height may never clip visible data. */
export function customHeaderGeometry(doc:jsPDF,brand:Branding,layout:CustomQuoteLayout,logo?:{width:number;height:number}){
 const padding=layout.headerPaddingMm,x=14+(logo&&layout.logoPosition==='left'?layout.logoSizeMm+6:0)
 const textWidth=182-(logo?layout.logoSizeMm+6:0)
 doc.setFont('helvetica','bold');doc.setFontSize(layout.nameFontSize)
 const allNames:string[]=layout.showBusinessName?doc.splitTextToSize(brand.name.replace(/\s+/g,' ').trim(),textWidth):[]
 const nameLines=allNames.slice(0,2),nameLineHeight=layout.nameFontSize*1.2/doc.internal.scaleFactor
 const contacts=[layout.showTaxId&&brand.taxId?`NIT: ${brand.taxId}`:null,layout.showAddress?brand.address:null,layout.showPhone?brand.phone:null,layout.showEmail?brand.contactEmail:null].filter(Boolean).join('\n')
 doc.setFont('helvetica','normal');doc.setFontSize(layout.contactFontSize)
 const allContacts:string[]=contacts?doc.splitTextToSize(contacts,textWidth):[],contactLines=allContacts.slice(0,5),contactLineHeight=layout.contactFontSize*1.25/doc.internal.scaleFactor
 const nameY=padding+layout.nameFontSize/doc.internal.scaleFactor
 const contactY=padding+nameLines.length*nameLineHeight+(nameLines.length&&contactLines.length?2:0)+layout.contactFontSize/doc.internal.scaleFactor
 const textHeight=nameLines.length*nameLineHeight+(nameLines.length&&contactLines.length?2:0)+contactLines.length*contactLineHeight
 const bandBottom=Math.max(layout.headerMinHeightMm,padding*2+Math.max(logo?.height||0,textHeight))
 return{x,nameY,contactY,nameLines,contactLines,nameLineHeight,contactLineHeight,bandBottom,logoX:layout.logoPosition==='left'?14:196-(logo?.width||0),logoY:padding,bodyTop:bandBottom+15+layout.sectionGapMm,continuedDetails:[...allNames.slice(2),...allContacts.slice(5)].join('\n')}
}
