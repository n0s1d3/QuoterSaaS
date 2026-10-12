import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import BrandDiagnostics from '../components/BrandDiagnostics'
import { brandLog, brandMetadata } from '../lib/brand-diagnostics'
import { normalizeLogo } from '../lib/logo'
import { api } from '../lib/api'
import type { Branding } from '../lib/types'
export default function BrandSettings() {
  const [brand, setBrand] = useState<Branding | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [readingLogo, setReadingLogo] = useState(false)
  useEffect(() => { api<Branding>('/branding').then(b => { setBrand(b); brandLog('marca.cargada', brandMetadata(b)) }).catch(e => { setMessage(e.message); brandLog('marca.carga.error', e.message) }) }, [])
  async function logo(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 280000) { setMessage('Usa PNG, JPEG o WebP de hasta 280 KB.'); brandLog('logo.rechazado', JSON.stringify({ type: file.type, bytes: file.size, reason: 'Formato o tamaño no permitido' })); return }
    setReadingLogo(true); setMessage('Cargando logo…')
    brandLog('logo.seleccionado', JSON.stringify({ type: file.type, bytes: file.size }))
    try {
      const normalized = await normalizeLogo(file)
      setBrand(b => b && ({ ...b, logo: normalized.data }))
      brandLog('logo.normalizado', JSON.stringify({ width: normalized.width, height: normalized.height, characters: normalized.data.length }))
      setMessage('Logo listo. Pulsa Guardar marca para aplicarlo a tus PDF.')
    } catch (error) { const message = (error as Error).message; setMessage(message); brandLog('logo.lectura.error', message) }
    finally { setReadingLogo(false) }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); if (readingLogo || saving || !brand) return
    setSaving(true); brandLog('marca.guardado.inicio', brandMetadata(brand))
    try {
      const saved = await api<Branding>('/branding', brand, 'PUT')
      const verified = await api<Branding>('/branding')
      if (verified.logo !== brand.logo || verified.name !== brand.name || verified.primaryColor !== brand.primaryColor || verified.accentColor !== brand.accentColor) throw new Error('La marca guardada no coincide con la enviada. Revisa el registro.')
      setBrand(verified); brandLog('marca.guardado.verificado', brandMetadata(saved)); setMessage('Marca guardada. Se aplicará automáticamente a nuevas cotizaciones; actualiza las existentes desde su detalle.')
    } catch(e) { setMessage((e as Error).message); brandLog('marca.guardado.error', (e as Error).message) } finally { setSaving(false) }
  }
  return <><h1>Mi negocio</h1><p>Personaliza la marca que se utilizará en tus cotizaciones y documentos PDF.</p>{message && <p role="status">{message}</p>}{brand && <form onSubmit={save} className="panel"><div className="fields"><label>Nombre del negocio<input required value={brand.name} onChange={e => setBrand({ ...brand, name: e.target.value })} /></label><label>Color principal<input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} /></label><label>Color secundario<input type="color" value={brand.accentColor} onChange={e => setBrand({ ...brand, accentColor: e.target.value })} /></label><label>Logo<input type="file" disabled={readingLogo || saving} accept="image/png,image/jpeg,image/webp" onChange={e => { void logo(e.target.files?.[0]) }} /></label></div>{brand.logo && <><img className="business-logo" src={brand.logo} alt="Logo del negocio" onLoad={() => brandLog("logo.vista.cargada", brandMetadata(brand))} onError={() => brandLog("logo.vista.error", brandMetadata(brand))} /><button type="button" className="subtle" onClick={() => setBrand({ ...brand, logo: null })}>Quitar logo</button></>}<div className="brand-preview" style={{ borderColor: brand.primaryColor, background: brand.accentColor }}><strong style={{ color: brand.primaryColor }}>{brand.name}</strong><p>Cotización · Q-0001</p><p>Vista previa de tu marca</p></div><button disabled={saving || readingLogo}>{readingLogo ? 'Cargando logo…' : saving ? 'Guardando…' : 'Guardar marca'}</button></form>}<BrandDiagnostics /></>
}
