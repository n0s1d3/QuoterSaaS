export const layoutNumberFields = [
 {key:'headerMinHeightMm',label:'Altura mínima del encabezado (mm)',min:18,max:70,unit:'mm'},
 {key:'headerPaddingMm',label:'Margen vertical del encabezado (mm)',min:4,max:18,unit:'mm'},
 {key:'logoSizeMm',label:'Tamaño del logo (mm)',min:12,max:45,unit:'mm'},
 {key:'nameFontSize',label:'Tamaño del nombre (pt)',min:10,max:24,unit:'pt'},
 {key:'contactFontSize',label:'Tamaño de los datos (pt)',min:7,max:11,unit:'pt'},
 {key:'sectionGapMm',label:'Separación antes del cliente (mm)',min:0,max:12,unit:'mm'},
 {key:'bodyFontSize',label:'Tamaño del contenido (pt)',min:8,max:11,unit:'pt'},
] as const
export const layoutVisibilityFields = [
 {key:'showLogo',label:'Mostrar logo'},
 {key:'showBusinessName',label:'Mostrar nombre del negocio'},
 {key:'showTaxId',label:'Mostrar NIT'},
 {key:'showAddress',label:'Mostrar dirección'},
 {key:'showPhone',label:'Mostrar teléfono'},
 {key:'showEmail',label:'Mostrar correo'},
] as const
export interface CustomQuoteLayout {
 baseTemplate:'default'|'minimal'|'corporate';logoPosition:'left'|'right';
 headerMinHeightMm:number;headerPaddingMm:number;logoSizeMm:number;nameFontSize:number;contactFontSize:number;sectionGapMm:number;bodyFontSize:number;
 showLogo:boolean;showBusinessName:boolean;showTaxId:boolean;showAddress:boolean;showPhone:boolean;showEmail:boolean;
}
export const compactQuoteLayout:CustomQuoteLayout={baseTemplate:'corporate',logoPosition:'right',headerMinHeightMm:30,headerPaddingMm:5,logoSizeMm:24,nameFontSize:16,contactFontSize:8,sectionGapMm:3,bodyFontSize:10,showLogo:true,showBusinessName:true,showTaxId:true,showAddress:true,showPhone:true,showEmail:true}
export function normalizeCustomLayout(value:unknown):CustomQuoteLayout|null{
 if(value==null)return null
 if(typeof value!=='object'||Array.isArray(value))throw new Error('Diseño personalizado inválido')
 const input=value as Record<string,unknown>,result={...compactQuoteLayout}
 if(input.baseTemplate!==undefined){if(!['default','minimal','corporate'].includes(input.baseTemplate as string))throw new Error('Estilo base personalizado inválido');result.baseTemplate=input.baseTemplate as CustomQuoteLayout['baseTemplate']}
 if(input.logoPosition!==undefined){if(!['left','right'].includes(input.logoPosition as string))throw new Error('Posición del logo inválida');result.logoPosition=input.logoPosition as CustomQuoteLayout['logoPosition']}
 for(const field of layoutNumberFields){const number=input[field.key];if(number===undefined)continue;if(typeof number!=='number'||!Number.isFinite(number)||number<field.min||number>field.max)throw new Error(`${field.label}: usa un valor entre ${field.min} y ${field.max}`);result[field.key]=number}
 for(const field of layoutVisibilityFields){const state=input[field.key];if(state===undefined)continue;if(typeof state!=='boolean')throw new Error(`${field.label}: usa una opción válida`);result[field.key]=state}
 return result
}
export function resolveCustomLayout(value:unknown):CustomQuoteLayout{return normalizeCustomLayout(value)||{...compactQuoteLayout}}
