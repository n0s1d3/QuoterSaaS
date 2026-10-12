/** Decode first, then normalize to PNG so the browser and PDF use identical pixels. */
export async function normalizeLogo(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image(); image.src = url; await image.decode()
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d'); if (!context) throw new Error('No se pudo procesar la imagen')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/png')
    if (data.length > 400000) throw new Error('La imagen procesada es demasiado grande. Usa un logo más sencillo.')
    return { data, width: canvas.width, height: canvas.height }
  } finally { URL.revokeObjectURL(url) }
}
