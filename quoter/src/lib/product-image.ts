import { inspectLogo,validateRaster } from './raster.ts'
export const productImageLimit=60000
export const quoteImageLimit=500000
export function inspectProductImage(value:string){
 if(value.length>productImageLimit)throw new Error('La imagen del producto supera 60 KB. Selecciónala de nuevo para optimizarla.')
 const info=inspectLogo(value)
 if(info.width>640||info.height>640)throw new Error('La imagen del producto supera 640 píxeles por lado')
 return info
}
export async function validateProductImage(value:string|null|undefined){if(value)await validateRaster(inspectProductImage(value))}
