/** Decode and reduce to a PNG that fits D1 while preserving transparency. */
export async function normalizeLogo(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image(); image.src = url; await image.decode()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d'); if (!context) throw new Error('No se pudo procesar la imagen')
    let maxDimension = 640
    while (maxDimension >= 64) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/png')
      if (data.length <= 400000) return { data, width: canvas.width, height: canvas.height }
      maxDimension = Math.floor(maxDimension * 0.8)
    }
    throw new Error('No se pudo reducir el logo. Selecciona otra imagen.')
  } finally { URL.revokeObjectURL(url) }
}
