export const quoteTermsLimit = 12000
export const conditionFields = [
 {key:'paymentDeadline',label:'Plazo de pago',max:500,placeholder:'50% de anticipo y saldo contra entrega.',group:'Pagos'},
 {key:'paymentMethods',label:'Métodos de pago disponibles',max:500,placeholder:'Transferencia bancaria, efectivo…',group:'Pagos'},
 {key:'bankTransfer',label:'Transferencia bancaria',max:1500,placeholder:'Titular de la cuenta, tipo, número y banco.',group:'Pagos'},
 {key:'deliveryTime',label:'Tiempo de entrega',max:500,placeholder:'Entre 24 y 48 horas posteriores a la confirmación del pedido.',group:'Entrega y envío'},
 {key:'shippingPrice',label:'Precio de envío',max:500,placeholder:'Costo según ubicación o retiro en tienda.',group:'Entrega y envío'},
 {key:'departmentShipping',label:'Envíos a departamentos',max:500,placeholder:'Cargo Expreso — Q40.00',group:'Entrega y envío'},
 {key:'warranty',label:'Garantía',max:1000,placeholder:'30 días por desperfectos de fábrica. Aplican términos de garantía.',group:'Garantía y validez'},
 {key:'validityText',label:'Texto de validez',max:500,placeholder:'Esta cotización es válida por 15 días desde su emisión.',group:'Garantía y validez'},
 {key:'warrantyPolicy',label:'Política de garantía y devoluciones',max:4000,placeholder:'Exclusiones, procedimiento de reclamo, accesorios, caja, revisión técnica y costos de envío.',group:'Garantía y validez'},
 {key:'advisorName',label:'Asesor',max:200,placeholder:'Nombre de quien atiende la cotización.',group:'Asesor'},
 {key:'advisorEmail',label:'Correo del asesor',max:254,placeholder:'asesor@tunegocio.com',group:'Asesor'},
] as const
export type QuoteConditions = { [K in typeof conditionFields[number]['key']]?:string|null } & {validityDays?:number|null}
export function normalizeQuoteConditions(value:unknown):QuoteConditions|null {
 if(value==null)return null
 if(typeof value!=='object'||Array.isArray(value))throw new Error('Condiciones de cotización inválidas')
 const input=value as Record<string,unknown>,result:QuoteConditions={}
 for(const field of conditionFields){const text=input[field.key];if(text!=null&&typeof text!=='string'||typeof text==='string'&&text.length>field.max)throw new Error(`${field.label}: máximo ${field.max} caracteres`);result[field.key]=typeof text==='string'?text.trim()||null:null}
 const days=input.validityDays
 if(days!=null&&(!Number.isSafeInteger(days)||(days as number)<1||(days as number)>3650))throw new Error('La validez debe estar entre 1 y 3650 días')
 result.validityDays=days==null?null:days as number
 if(result.advisorEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.advisorEmail))throw new Error('Correo del asesor inválido')
 return result
}
export function composeQuoteTerms(paymentTerms?:string|null,conditions?:QuoteConditions|null){
 const parts=paymentTerms?.trim()?[paymentTerms.trim()]:[]
 for(const field of conditionFields){const text=conditions?.[field.key]||(field.key==='validityText'&&conditions?.validityDays?`Esta cotización es válida por ${conditions.validityDays} días desde su emisión.`:'');if(text)parts.push(`${field.key==='validityText'?'Validez':field.label}: ${text}`)}
 const result=parts.join('\n\n')
 if(result.length>quoteTermsLimit)throw new Error(`Las condiciones completas superan ${quoteTermsLimit} caracteres`)
 return result||null
}
export function quoteExpiryDate(issueDate:string,days?:number|null){if(!days)return null;const date=new Date(issueDate+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
export const warrantyPolicyExample = 'La garantía excluye productos consumibles, producto descartable, desgaste normal de piezas consumibles, daños resultantes de uso indebido (golpes, quebraduras, rayones considerables o derrame de líquido), accidentes, desastres naturales, modificaciones, reparaciones no autorizadas u otras causas que no sean defecto de materiales y de fabricación. Debe revisar el estado y funcionamiento de su producto al momento de recibirlo. Los reclamos por producto golpeado, incompleto, que no encienda o con mal funcionamiento deben presentarse en un periodo no mayor a 2 días después de recibido. Para cubrir la garantía, el producto debe retornarse con accesorios y caja en buen estado. Todos nuestros productos se revisan y prueban en bodega antes del despacho. "Negocio" se reserva el derecho a limitar o negar las devoluciones. Todo uso de garantía está sujeto a revisión por nuestro equipo de servicio técnico. "Negocio" se reserva el derecho de modificar sus políticas de cambio en cualquier momento sin previo aviso. En ningún caso la responsabilidad de "Negocio" excederá del monto efectivamente pagado por el cliente por la compra del producto. No se reintegra el costo de envío.'

/** Interpret a short label at the start of a line; URLs and times remain values. */
export function quoteTermSections(value:string){
 const sections:{title:string|null;text:string}[]=[]
 let title:string|null=null,lines:string[]=[]
 const flush=()=>{const text=lines.join('\n').trim();if(title||text)sections.push({title,text})}
 for(const line of value.split(/\r?\n/)){
  const colon=line.indexOf(':'),candidate=colon>=0?line.slice(0,colon).trim():'',rest=colon>=0?line.slice(colon+1):''
  const heading=candidate.length>0&&candidate.length<=100&&/\p{L}/u.test(candidate)&&!rest.startsWith('//')&&!/^(?:https?|ftp|mailto|tel|data)$/i.test(candidate)&&!/^\S+\.[a-z]{2,}$/i.test(candidate)
  if(heading){flush();title=candidate;lines=[rest.trimStart()]}
  else lines.push(line)
 }
 flush();return sections
}
