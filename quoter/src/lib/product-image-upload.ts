import { inspectRaster,validateRaster } from './raster'
import { productImageLimit } from './product-image'
/** Local normalization strips metadata and bounds the image before upload. */
export async function normalizeProductImage(file:File){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Usa PNG, JPEG o WebP de hasta 10 MB.')
 await validateRaster(inspectRaster(new Uint8Array(await file.arrayBuffer()),8192,16777216))
 const url=URL.createObjectURL(file)
 try{
  const image=new Image();image.src=url;await image.decode()
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('No se pudo procesar la imagen')
  for(let dimension=480;dimension>=64;dimension=Math.floor(dimension*.8)){
   const scale=Math.min(1,dimension/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));context.drawImage(image,0,0,canvas.width,canvas.height)
   const png=canvas.toDataURL('image/png');if(png.length<=productImageLimit)return png
   context.globalCompositeOperation='destination-over';context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.globalCompositeOperation='source-over'
   const jpeg=canvas.toDataURL('image/jpeg',.8);if(jpeg.length<=productImageLimit)return jpeg
  }
  throw new Error('No se pudo optimizar la imagen. Selecciona otra foto.')
 }finally{URL.revokeObjectURL(url)}
}
